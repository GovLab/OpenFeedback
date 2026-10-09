# Backend: container image in ECR, run by App Runner, talking to the private
# databases through a VPC connector. Secrets are injected as env vars.

resource "aws_ecr_repository" "backend" {
  name                 = "${local.name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

resource "random_password" "staff" {
  length  = 20
  special = false
}

resource "random_password" "session_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name        = "openfeedback/${var.environment}/app"
  description = "OpenFeedback database credentials and staff login"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    POSTGRES_HOST      = aws_db_instance.postgres.address
    POSTGRES_PORT      = tostring(aws_db_instance.postgres.port)
    POSTGRES_DB        = aws_db_instance.postgres.db_name
    POSTGRES_USER      = aws_db_instance.postgres.username
    POSTGRES_PASSWORD  = random_password.postgres.result
    AWS_NEO4J_URI      = "bolt://${aws_instance.neo4j.private_ip}:7687"
    AWS_NEO4J_USERNAME = "neo4j"
    AWS_NEO4J_PASSWORD = random_password.neo4j.result
    STAFF_PASSWORD     = random_password.staff.result
    SESSION_SECRET     = random_password.session_secret.result
  })
}

# The OpenAI key is set by hand so it never lands in Terraform state:
#   aws secretsmanager put-secret-value --secret-id openfeedback/dev/openai-api-key --secret-string sk-...
resource "aws_secretsmanager_secret" "openai" {
  name        = "openfeedback/${var.environment}/openai-api-key"
  description = "OpenAI API key for OpenFeedback (plain string)"
}

resource "aws_secretsmanager_secret_version" "openai_placeholder" {
  secret_id     = aws_secretsmanager_secret.openai.id
  secret_string = "REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_iam_role" "apprunner_ecr" {
  name = "${local.name}-apprunner-ecr"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

resource "aws_iam_role" "apprunner_instance" {
  name = "${local.name}-apprunner-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "apprunner_secrets" {
  name = "read-app-secrets"
  role = aws_iam_role.apprunner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = [aws_secretsmanager_secret.app.arn, aws_secretsmanager_secret.openai.arn]
    }]
  })
}

resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${local.name}-connector"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.app_connector.id]
}

resource "aws_apprunner_auto_scaling_configuration_version" "main" {
  auto_scaling_configuration_name = "${local.name}-scaling"
  min_size                        = 1
  max_size                        = var.app_runner_max_instances
}

locals {
  app_secret_keys = [
    "POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD",
    "AWS_NEO4J_URI", "AWS_NEO4J_USERNAME", "AWS_NEO4J_PASSWORD",
    "STAFF_PASSWORD", "SESSION_SECRET",
  ]
  frontend_url = "https://main.${aws_amplify_app.frontend.default_domain}"
}

resource "aws_apprunner_service" "backend" {
  service_name                   = "${local.name}-backend"
  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.main.arn

  source_configuration {
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = "8080"

        runtime_environment_variables = {
          APP_ENV              = "production"
          CORS_ALLOWED_ORIGINS = local.frontend_url
        }

        runtime_environment_secrets = merge(
          { for key in local.app_secret_keys : key => "${aws_secretsmanager_secret.app.arn}:${key}::" },
          { OPENAI_API_KEY = aws_secretsmanager_secret.openai.arn },
        )
      }
    }
  }

  instance_configuration {
    cpu               = var.app_runner_cpu
    memory            = var.app_runner_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol = "HTTP"
    path     = "/health"
  }

  depends_on = [
    aws_iam_role_policy_attachment.apprunner_ecr,
    aws_iam_role_policy.apprunner_secrets,
    aws_secretsmanager_secret_version.app,
    aws_secretsmanager_secret_version.openai_placeholder,
    aws_route_table_association.private,
  ]
}

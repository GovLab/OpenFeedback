# ==============================================================================
# AWS APP RUNNER - FASTAPI BACKEND SERVICE
# ==============================================================================

resource "aws_apprunner_service" "backend" {
  service_name = "${var.project_name}-backend"

  source_configuration {
    authentication_configuration {
      connection_arn = var.github_connection_arn
    }

    code_repository {
      repository_url = var.github_repo_url

      source_code_version {
        type  = "BRANCH"
        value = var.github_branch
      }

      code_configuration {
        configuration_source = "REPOSITORY"
      }

      source_directory = "/backend/"
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu               = var.app_runner_cpu
    memory            = var.app_runner_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    protocol            = "TCP"
    path                = "/"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  network_configuration {
    ingress_configuration {
      is_publicly_accessible = true
    }
  }

  tags = {
    Name = "${var.project_name}-backend"
  }

  depends_on = [
    aws_iam_role_policy.apprunner_secrets,
    aws_db_instance.postgresql,
    aws_instance.neo4j
  ]
}


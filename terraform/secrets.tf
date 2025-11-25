# ==============================================================================
# SECRETS MANAGER
# ==============================================================================

# Random suffix to ensure unique secret name
resource "random_id" "secret_suffix" {
  byte_length = 4
}

# Secrets Manager Secret
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.project_name}-secrets"
  description = "OpenPermit application secrets"

  tags = {
    Name = "${var.project_name}-secrets"
  }
}

# Secret Version with all application secrets
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    OPENAI_API_KEY     = var.openai_api_key
    AWS_NEO4J_URI      = "bolt://${aws_eip.neo4j.public_dns}:7687"
    AWS_NEO4J_USERNAME = "neo4j"
    AWS_NEO4J_PASSWORD = var.neo4j_password
    POSTGRES_HOST      = aws_db_instance.postgresql.address
    POSTGRES_PORT      = "5432"
    POSTGRES_DB        = var.rds_database_name
    POSTGRES_USER      = var.rds_username
    POSTGRES_PASSWORD  = var.rds_password
  })
}


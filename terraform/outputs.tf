# ==============================================================================
# NETWORK OUTPUTS
# ==============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = local.vpc_id
}

# ==============================================================================
# EC2 OUTPUTS
# ==============================================================================

output "neo4j_instance_id" {
  description = "Neo4j EC2 instance ID"
  value       = aws_instance.neo4j.id
}

output "neo4j_public_ip" {
  description = "Neo4j EC2 public IP (Elastic IP)"
  value       = aws_eip.neo4j.public_ip
}

output "neo4j_public_dns" {
  description = "Neo4j EC2 public DNS"
  value       = aws_eip.neo4j.public_dns
}

output "neo4j_browser_url" {
  description = "Neo4j Browser URL"
  value       = "http://${aws_eip.neo4j.public_dns}:7474"
}

output "neo4j_bolt_url" {
  description = "Neo4j Bolt connection URL"
  value       = "bolt://${aws_eip.neo4j.public_dns}:7687"
}

# ==============================================================================
# RDS OUTPUTS
# ==============================================================================

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgresql.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL address"
  value       = aws_db_instance.postgresql.address
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.postgresql.db_name
}

output "rds_connection_string" {
  description = "PostgreSQL connection command (password in Secrets Manager)"
  value       = "psql -h ${aws_db_instance.postgresql.address} -U ${aws_db_instance.postgresql.username} -d ${aws_db_instance.postgresql.db_name}"
}

# ==============================================================================
# SECRETS MANAGER OUTPUTS
# ==============================================================================

output "secrets_manager_arn" {
  description = "Secrets Manager ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "secrets_manager_name" {
  description = "Secrets Manager secret name"
  value       = aws_secretsmanager_secret.app_secrets.name
}

# ==============================================================================
# APP RUNNER OUTPUTS
# ==============================================================================

output "apprunner_service_id" {
  description = "App Runner service ID"
  value       = aws_apprunner_service.backend.service_id
}

output "apprunner_service_arn" {
  description = "App Runner service ARN"
  value       = aws_apprunner_service.backend.arn
}

output "github_connection_arn" {
  description = "GitHub connection ARN (created automatically)"
  value       = aws_codestarconnections_connection.github.arn
}

output "github_connection_status" {
  description = "GitHub connection status - PENDING means you need to authorize it in AWS Console"
  value       = aws_codestarconnections_connection.github.connection_status
}

output "apprunner_service_url" {
  description = "App Runner service URL"
  value       = "https://${aws_apprunner_service.backend.service_url}"
}

output "backend_api_url" {
  description = "Backend API URL (full)"
  value       = "https://${aws_apprunner_service.backend.service_url}/api"
}

# ==============================================================================
# AMPLIFY OUTPUTS
# ==============================================================================

output "amplify_app_id" {
  description = "Amplify app ID"
  value       = aws_amplify_app.frontend.id
}

output "amplify_default_domain" {
  description = "Amplify default domain"
  value       = aws_amplify_app.frontend.default_domain
}

output "frontend_url" {
  description = "Frontend URL"
  value       = "https://${var.github_branch}.${aws_amplify_app.frontend.default_domain}"
}

# ==============================================================================
# SECURITY GROUP OUTPUTS
# ==============================================================================

output "neo4j_security_group_id" {
  description = "Neo4j security group ID"
  value       = aws_security_group.neo4j.id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "apprunner_security_group_id" {
  description = "App Runner security group ID"
  value       = aws_security_group.apprunner_outbound.id
}

# ==============================================================================
# SUMMARY OUTPUT
# ==============================================================================

output "deployment_summary" {
  description = "Summary of deployed infrastructure"
  value       = <<-EOT
╔═══════════════════════════════════════════════════════════════════════╗
║                    OpenPermit Infrastructure Summary                  ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  FRONTEND (Amplify):                                                 ║
║    URL: https://${var.github_branch}.${aws_amplify_app.frontend.default_domain}
║                                                                       ║
║  BACKEND (App Runner):                                               ║
║    URL: https://${aws_apprunner_service.backend.service_url}
║    API: https://${aws_apprunner_service.backend.service_url}/api
║                                                                       ║
║  NEO4J DATABASE (EC2):                                               ║
║    Browser: http://${aws_eip.neo4j.public_dns}:7474
║    Bolt:    bolt://${aws_eip.neo4j.public_dns}:7687
║    SSH:     ssh -i <key>.pem ec2-user@${aws_eip.neo4j.public_ip}
║                                                                       ║
║  POSTGRESQL (RDS):                                                   ║
║    Endpoint: ${aws_db_instance.postgresql.address}:5432
║    Database: ${aws_db_instance.postgresql.db_name}
║                                                                       ║
║  SECRETS:                                                            ║
║    Manager: ${aws_secretsmanager_secret.app_secrets.name}
║                                                                       ║
║  NEXT STEPS:                                                         ║
║    1. Wait 5-10 minutes for App Runner to deploy                    ║
║    2. Check Neo4j installation: ssh to EC2 and verify                ║
║    3. Run schema: psql -h ${aws_db_instance.postgresql.address} -U postgres -d ${aws_db_instance.postgresql.db_name} -f schema.sql
║    4. Test frontend: Open the Amplify URL                           ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOT
}



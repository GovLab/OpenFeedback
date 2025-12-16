# URLs
output "frontend_url" {
  value = "https://${var.github_branch}.${aws_amplify_app.frontend.default_domain}"
}

output "backend_url" {
  value = "https://${aws_apprunner_service.backend.service_url}"
}

output "neo4j_browser" {
  value = "http://${aws_eip.neo4j.public_dns}:7474"
}

output "neo4j_bolt" {
  value = "bolt://${aws_eip.neo4j.public_dns}:7687"
}

# Connection Info
output "rds_endpoint" {
  value = aws_db_instance.postgresql.endpoint
}

output "neo4j_ssh" {
  value = "ssh -i <key>.pem ec2-user@${aws_eip.neo4j.public_ip}"
}

output "secrets_arn" {
  value = aws_secretsmanager_secret.app_secrets.arn
}

# Summary
output "summary" {
  value = <<-EOT

  ══════════════════════════════════════════════════════
  OpenPermit Test Deployment
  ══════════════════════════════════════════════════════
  Frontend:  https://${var.github_branch}.${aws_amplify_app.frontend.default_domain}
  Backend:   https://${aws_apprunner_service.backend.service_url}
  Neo4j:     http://${aws_eip.neo4j.public_dns}:7474
  Postgres:  ${aws_db_instance.postgresql.endpoint}
  Secrets:   ${aws_secretsmanager_secret.app_secrets.name}
  ══════════════════════════════════════════════════════
  EOT
}

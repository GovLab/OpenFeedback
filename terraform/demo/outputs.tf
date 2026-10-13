output "frontend_url" {
  value = local.frontend_url
}

output "backend_url" {
  value = "https://${aws_apprunner_service.backend.service_url}"
}

output "amplify_app_id" {
  value = aws_amplify_app.frontend.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "apprunner_service_arn" {
  value = aws_apprunner_service.backend.arn
}

output "app_secret_name" {
  description = "STAFF_PASSWORD lives here"
  value       = aws_secretsmanager_secret.app.name
}

output "openai_secret_name" {
  value = aws_secretsmanager_secret.openai.name
}

output "neo4j_shell" {
  value = "aws ssm start-session --region ${var.aws_region} --target ${aws_instance.neo4j.id}"
}

output "aws_region" {
  value = var.aws_region
}

output "topic" {
  value = var.topic
}

output "show_sample_data_notice" {
  value = var.show_sample_data_notice
}

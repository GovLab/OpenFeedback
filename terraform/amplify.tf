# ==============================================================================
# AWS AMPLIFY - NEXT.JS FRONTEND HOSTING
# ==============================================================================

resource "aws_amplify_app" "frontend" {
  name       = var.project_name
  repository = var.github_repo_url

  access_token = var.amplify_github_token

  build_spec = <<-EOT
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - .next/cache/**/*
          - node_modules/**/*
    appRoot: frontend
EOT

  environment_variables = {
    NEXT_PUBLIC_API_URL       = "https://${aws_apprunner_service.backend.service_url}"
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
    AMPLIFY_DIFF_DEPLOY       = "false"
    _LIVE_UPDATES             = "[{\"name\":\"Next.js version\",\"pkg\":\"next-version\",\"type\":\"internal\",\"version\":\"latest\"},{\"name\":\"Node.js version\",\"pkg\":\"node\",\"type\":\"nvm\",\"version\":\"22\"}]"
  }

  platform = "WEB_COMPUTE"

  tags = {
    Name = "${var.project_name}-frontend"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = var.github_branch

  enable_auto_build = true

  framework = "Next.js - SSR"
  stage     = upper(var.environment)
}


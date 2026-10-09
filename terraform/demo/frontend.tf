# Static front end on Amplify Hosting. No repo connection: deploy.sh uploads the
# built files directly, so no GitHub token is needed.

resource "aws_amplify_app" "frontend" {
  name     = local.name
  platform = "WEB"

  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/404.html"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"
  stage       = "PRODUCTION"
}

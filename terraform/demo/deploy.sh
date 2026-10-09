#!/bin/bash
# Build and deploy OpenFeedback: infrastructure, backend image, static front end.
#   ./deploy.sh            full deploy
#   ./deploy.sh frontend   rebuild and upload the front end only
set -euo pipefail

cd "$(dirname "$0")"
REPO_ROOT="$(cd ../.. && pwd)"
REGION="${REGION:-us-east-1}"  # keep in sync with var.aws_region

tf_out() { terraform output -raw "$1"; }

deploy_backend() {
  echo "==> Creating container registry"
  terraform apply -auto-approve -input=false -target=aws_ecr_repository.backend

  local repo
  repo="$(tf_out ecr_repository_url)"
  echo "==> Building and pushing backend image"
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${repo%%/*}"
  docker build --platform linux/amd64 -t "$repo:latest" "$REPO_ROOT/backend"
  docker push "$repo:latest"

  echo "==> Applying infrastructure"
  terraform apply -auto-approve -input=false

  echo "==> Rolling out latest image"
  local arn
  arn="$(tf_out apprunner_service_arn)"
  aws apprunner start-deployment --region "$REGION" --service-arn "$arn" >/dev/null
  until [ "$(aws apprunner describe-service --region "$REGION" --service-arn "$arn" --query Service.Status --output text)" = "RUNNING" ]; do
    sleep 15
  done
}

deploy_frontend() {
  local app_id api_url zip job
  app_id="$(tf_out amplify_app_id)"
  api_url="$(tf_out backend_url)"

  echo "==> Building front end against $api_url"
  (cd "$REPO_ROOT/frontend" && npm ci && NEXT_PUBLIC_API_URL="$api_url" npm run build)

  zip="$(mktemp -d)/site.zip"
  (cd "$REPO_ROOT/frontend/out" && zip -qr "$zip" .)

  echo "==> Uploading to Amplify"
  read -r job upload_url < <(aws amplify create-deployment --region "$REGION" --app-id "$app_id" --branch-name main \
    --query '[jobId,zipUploadUrl]' --output text)
  curl -sf -T "$zip" "$upload_url"
  aws amplify start-deployment --region "$REGION" --app-id "$app_id" --branch-name main --job-id "$job" >/dev/null
  until status="$(aws amplify get-job --region "$REGION" --app-id "$app_id" --branch-name main --job-id "$job" --query job.summary.status --output text)" \
    && [[ "$status" =~ ^(SUCCEED|FAILED|CANCELLED)$ ]]; do
    sleep 5
  done
  echo "Front end deploy: $status"
  [ "$status" = "SUCCEED" ]
}

terraform init -input=false >/dev/null
if [ "${1:-}" != "frontend" ]; then
  deploy_backend
fi
deploy_frontend

echo
echo "Front end: $(tf_out frontend_url)"
echo "Back end:  $(tf_out backend_url)"
echo "Staff password: aws secretsmanager get-secret-value --region $REGION --secret-id $(tf_out app_secret_name) --query SecretString --output text | jq -r .STAFF_PASSWORD"

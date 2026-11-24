#!/bin/bash
# Build and deploy OpenFeedback: infrastructure, backend image, static front end.
#   ./deploy.sh            full deploy
#   ./deploy.sh frontend   rebuild and upload the front end only
set -euo pipefail

cd "$(dirname "$0")"
REPO_ROOT="$(cd ../.. && pwd)"
REGION="${REGION:-us-east-1}"  # keep in sync with var.aws_region

tf_out() { terraform output -raw "$1"; }

# Wait for one App Runner operation to finish; fail unless it succeeded.
# A rejected update rolls back and leaves the service RUNNING on the old
# settings, so RUNNING alone does not mean the change went live.
wait_for_operation() {
  local arn="$1" op_id="$2" what="$3" status
  until status="$(aws apprunner list-operations --region "$REGION" --service-arn "$arn" \
      --query "OperationSummaryList[?Id=='$op_id'].Status | [0]" --output text)" \
    && [[ "$status" =~ ^(SUCCEEDED|FAILED|ROLLBACK_SUCCEEDED|ROLLBACK_FAILED)$ ]]; do
    sleep 15
  done
  echo "App Runner $what: $status"
  if [ "$status" != "SUCCEEDED" ]; then
    echo "ERROR: App Runner $what did not go live. See the service and application logs under /aws/apprunner/ in CloudWatch." >&2
    return 1
  fi
}

latest_operation() {
  aws apprunner list-operations --region "$REGION" --service-arn "$1" --max-results 1 \
    --query 'OperationSummaryList[0].[Id,Type]' --output text
}

deploy_backend() {
  echo "==> Creating container registry"
  terraform apply -auto-approve -input=false -target=aws_ecr_repository.backend

  local repo
  repo="$(tf_out ecr_repository_url)"
  echo "==> Building and pushing backend image"
  aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${repo%%/*}"
  docker build --platform linux/amd64 -t "$repo:latest" "$REPO_ROOT/backend"
  docker push "$repo:latest"

  # Roll out the new image before applying setting changes. App Runner applies
  # a settings update to the image it last deployed, so a new setting that
  # needs new code (a new TOPIC, say) would crash on the old image and roll back.
  local arn op_id op_type before
  arn="$(terraform output -raw apprunner_service_arn 2>/dev/null || true)"
  if [[ "$arn" == arn:* ]]; then
    echo "==> Rolling out latest image"
    op_id="$(aws apprunner start-deployment --region "$REGION" --service-arn "$arn" --query OperationId --output text)"
    wait_for_operation "$arn" "$op_id" "image rollout"
    before="$op_id"
  fi

  echo "==> Applying infrastructure"
  terraform apply -auto-approve -input=false

  # Check the settings update, if the apply made one, actually went live
  arn="$(tf_out apprunner_service_arn)"
  read -r op_id op_type < <(latest_operation "$arn")
  if [ "$op_id" != "${before:-}" ]; then
    wait_for_operation "$arn" "$op_id" "$op_type"
  fi
}

deploy_frontend() {
  local app_id api_url topic sample_notice zip job
  app_id="$(tf_out amplify_app_id)"
  api_url="$(tf_out backend_url)"
  # Read outputs here: inside the build subshell the cwd is frontend/, which has no state
  topic="$(tf_out topic)"
  sample_notice="$(tf_out show_sample_data_notice)"

  echo "==> Building front end ($topic) against $api_url"
  (cd "$REPO_ROOT/frontend" && npm ci && \
    NEXT_PUBLIC_API_URL="$api_url" \
    NEXT_PUBLIC_TOPIC="$topic" \
    NEXT_PUBLIC_SAMPLE_DATA_NOTICE="$sample_notice" \
    npm run build)

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

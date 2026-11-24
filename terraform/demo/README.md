# OpenFeedback on AWS (demo)

Everything runs in `us-east-1` and is tagged `Project=openfeedback`, `Environment=dev`, `Owner=burnes-center`.

```
Browser → Amplify (static site) → App Runner (FastAPI) ─┬→ RDS PostgreSQL   (private subnet)
                                         │               └→ Neo4j on EC2     (private subnet)
                                         └→ NAT instance → OpenAI
```

- **Front end:** a static export of the Next.js app on Amplify Hosting. There's no Next.js server to patch.
- **API:** a container image in ECR, run by App Runner with at most 2 instances.
- **Databases:** in private subnets with no public address. Only the App Runner VPC connector's security group can reach them.
- **Outbound internet** (OpenAI calls, package installs) goes through a `t4g.micro` NAT instance, which costs about $6/month instead of the ~$33/month for a managed NAT gateway.
- **Secrets:** Terraform generates every password and stores it in Secrets Manager. App Runner injects them as environment variables. The OpenAI key is the one secret Terraform never sees.

Rough cost: about $45/month (RDS ~$14, Neo4j EC2 ~$15, App Runner ~$8 idle, NAT ~$6, public IP ~$4).

## Prerequisites
- AWS CLI signed in to the AWS account you want to deploy to
- Terraform 1.5+, Docker, Node 20+, `jq`

## Deploy
```bash
./deploy.sh
```

It creates the ECR repo, builds and pushes the backend image, applies the rest of the infrastructure, rolls App Runner onto the new image, then builds the front end and uploads it to Amplify. Run it again any time to ship changes. If only the front end changed, run `./deploy.sh frontend`.

### One-time: set the OpenAI key
Terraform creates `openfeedback/dev/openai-api-key` with a placeholder. Put the real key in yourself, then roll the API so it picks the key up:

```bash
aws secretsmanager put-secret-value --region us-east-1 \
  --secret-id openfeedback/dev/openai-api-key --secret-string 'sk-...'
aws apprunner start-deployment --region us-east-1 \
  --service-arn "$(terraform output -raw apprunner_service_arn)"
```

## Topic and demo data
`var.topic` (default `housing`; also `parks` or `permits`) sets the back end's `TOPIC` and the front end's wording. `var.show_sample_data_notice` (default `true`) labels the dashboard "Sample Data". After changing either one, run `./deploy.sh`.

To load the parks demo data (about 40 items, roughly 5 minutes, under $1 of OpenAI usage):
```bash
STAFF_PASSWORD="$(aws secretsmanager get-secret-value --region us-east-1 --secret-id openfeedback/dev/app --query SecretString --output text | jq -r .STAFF_PASSWORD)" \
  python3 ../../backend/seed/seed_demo.py --api "$(terraform output -raw backend_url)" \
  --config ../../backend/seed/parks_config.json --config-notes "Parks & playgrounds demo" \
  --feedback ../../backend/seed/parks_feedback.json
```

To remove a single item (spam, a test entry), staff can call `DELETE /api/feedback/<id>`.

## Staff dashboard password
```bash
aws secretsmanager get-secret-value --region us-east-1 \
  --secret-id openfeedback/dev/app --query SecretString --output text | jq -r .STAFF_PASSWORD
```

To change it, edit `STAFF_PASSWORD` in that secret and run `aws apprunner start-deployment` as above. Note that the next `terraform apply` will set it back. For a lasting change, taint `random_password.staff` instead.

## Shell access to Neo4j
There's no SSH. Use Session Manager:
```bash
$(terraform output -raw neo4j_shell)
```

## State
Terraform state is kept locally in this folder and is git-ignored. It contains the generated database passwords, so treat it like a secret. Whoever deploys next needs this state file, or should move it to an S3 backend first.

## Tear down
```bash
terraform destroy
```
RDS takes a final snapshot (`openfeedback-dev-postgres-final`) before it's deleted.

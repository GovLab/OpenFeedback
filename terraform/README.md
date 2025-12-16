# OpenPermit Deployment Guide

Deploy OpenPermit to AWS using Terraform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [One-Time Setup](#one-time-setup)
4. [Deploy](#deploy)
5. [Verify Deployment](#verify-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Day-to-Day Operations](#day-to-day-operations)
8. [Costs](#costs)
9. [Clean Up](#clean-up)

---

## Architecture Overview

### How the Services Connect

```
User → Amplify (Frontend) → App Runner (API) → PostgreSQL (RDS)
                                    ↓
                              Neo4j (EC2)
```

### Service Breakdown

| Service | What It Does | Cost |
|---------|--------------|------|
| **Amplify** | Hosts the Next.js website. Auto-deploys when you push to GitHub. | ~$5/mo |
| **App Runner** | Runs the FastAPI backend. Auto-scales, auto-heals. | ~$50/mo |
| **RDS PostgreSQL** | Stores structured data (permits, users, applications). | ~$15/mo |
| **EC2 Neo4j** | Graph database for relationships between entities. | ~$15/mo |
| **Secrets Manager** | Stores passwords and API keys securely. | ~$1/mo |

**Total: ~$90/month**

---

## Service Configuration Details

### App Runner (Backend API)

Runs the FastAPI backend from your GitHub repository.

| Setting | Default | Description |
|---------|---------|-------------|
| `app_runner_cpu` | `1024` | CPU units (1024 = 1 vCPU) |
| `app_runner_memory` | `2048` | Memory in MB (2048 = 2 GB) |
| `github_repo_url` | — | Your GitHub repository URL |
| `github_branch` | `main` | Branch to deploy |
| `github_connection_arn` | — | AWS GitHub connection (see Setup Step 4) |

**How it works:**
- Pulls code from `backend/` directory in your repo
- Uses `apprunner.yaml` for build configuration
- Auto-deploys on every push to your branch
- Auto-scales from 1 to 25 instances based on traffic
- Health check: `GET /stats` every 5 seconds

**Environment variables** (injected from Secrets Manager):
- `OPENAI_API_KEY` - OpenAI API key
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `AWS_NEO4J_URI`, `AWS_NEO4J_USERNAME`, `AWS_NEO4J_PASSWORD`

---

### Amplify (Frontend)

Hosts the Next.js frontend from your GitHub repository.

| Setting | Default | Description |
|---------|---------|-------------|
| `amplify_github_token` | — | GitHub Personal Access Token with `repo` scope |
| `github_repo_url` | — | Your GitHub repository URL |
| `github_branch` | `main` | Branch to deploy |

**How it works:**
- Pulls code from `frontend/` directory (monorepo setup)
- Runs `npm ci` then `npm run build`
- Deploys as Next.js SSR (Server-Side Rendering)
- Auto-deploys on every push to your branch
- Uses Node.js 22

**Environment variables** (set in Amplify):
- `NEXT_PUBLIC_API_URL` - Backend API URL (update after deploy!)
- `AMPLIFY_MONOREPO_APP_ROOT` - Set to `frontend`

**After deployment**, update the API URL:
```bash
# Get your backend URL
terraform output -raw backend_url

# Update in AWS Console: Amplify → App → Environment variables
# Set NEXT_PUBLIC_API_URL to your backend URL
# Then redeploy
```

---

### EC2 Neo4j (Graph Database)

Runs Neo4j Community Edition on an EC2 instance.

| Setting | Default | Description |
|---------|---------|-------------|
| `ec2_instance_type` | `t3.small` | Instance type (2 vCPU, 2 GB RAM) |
| `ec2_key_name` | — | SSH key pair name |
| `neo4j_password` | — | Neo4j admin password |

**Instance specs:**
- AMI: Amazon Linux 2023 (latest)
- Storage: 30 GB gp3 EBS volume
- Elastic IP: Static public IP address

**Ports:**
| Port | Protocol | Access | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP only | SSH access |
| 7474 | TCP | Your IP only | Neo4j Browser (web UI) |
| 7687 | TCP | Public | Bolt protocol (API connections) |

**Access Neo4j Browser:**
```
http://<neo4j_public_ip>:7474
Username: neo4j
Password: <your neo4j_password>
```

**SSH into the instance:**
```bash
ssh -i openpermit-key.pem ec2-user@$(terraform output -raw neo4j_public_ip)
```

**Useful commands on the instance:**
```bash
sudo systemctl status neo4j    # Check status
sudo systemctl restart neo4j   # Restart
sudo journalctl -u neo4j -f    # View logs
```

---

### RDS PostgreSQL (Relational Database)

Managed PostgreSQL database for structured data.

| Setting | Default | Description |
|---------|---------|-------------|
| `rds_instance_class` | `db.t4g.micro` | Instance class (2 vCPU, 1 GB RAM) |
| `rds_allocated_storage` | `20` | Storage in GB |
| `rds_engine_version` | `17.6` | PostgreSQL version |
| `rds_database_name` | `OpenPermit` | Database name |
| `rds_username` | `postgres` | Admin username |
| `rds_password` | — | Admin password |

**Features enabled:**
- Storage: gp3 SSD (encrypted at rest)
- Backups: 7-day retention
- Multi-AZ: Disabled (single AZ for cost savings)
- Public access: Yes (protected by security group)

**Connect to the database:**
```bash
psql -h <rds_endpoint> -U postgres -d OpenPermit
```

**Port:** 5432 (PostgreSQL default)

---

### Secrets Manager

Stores all sensitive credentials securely.

**Stored secrets:**
| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `AWS_NEO4J_URI` | `bolt://<neo4j_ip>:7687` |
| `AWS_NEO4J_USERNAME` | `neo4j` |
| `AWS_NEO4J_PASSWORD` | Your Neo4j password |
| `POSTGRES_HOST` | RDS endpoint |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_DB` | `OpenPermit` |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | Your RDS password |

**View secrets in AWS Console:**
AWS Console → Secrets Manager → `openpermit-secrets`

**Access via CLI:**
```bash
aws secretsmanager get-secret-value --secret-id openpermit-secrets --query SecretString --output text | jq
```

---

### Security Groups

Network firewall rules for each service.

**Neo4j Security Group (`openpermit-neo4j-sg`):**
| Port | Source | Purpose |
|------|--------|---------|
| 22 | Your IP | SSH |
| 7474 | Your IP | Neo4j Browser |
| 7687 | 0.0.0.0/0 | Bolt (App Runner needs public access) |

**RDS Security Group (`openpermit-rds-sg`):**
| Port | Source | Purpose |
|------|--------|---------|
| 5432 | 0.0.0.0/0 | PostgreSQL (password protected) |

**Update your IP if it changes:**
```bash
# Get new IP
curl https://ipinfo.io/ip

# Update terraform.tfvars
your_ip_address = "NEW_IP/32"

# Apply changes
terraform apply
```

---

## Directory Structure

```
terraform/
├── README.md                    # This guide
├── terraform.tfvars.example     # Example configuration (copy to prod/ or test/)
├── prod/                        # Production environment
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── app.tf                   # App Runner + Amplify
│   ├── neo4j.tf                 # EC2 instance
│   ├── rds.tf                   # PostgreSQL database
│   ├── secrets.tf               # Secrets Manager
│   ├── terraform.tfvars         # Your prod config (gitignored)
│   └── user-data/
│       └── neo4j-install.sh
└── test/                        # Test environment
    ├── (same structure as prod/)
    └── terraform.tfvars         # Your test config (gitignored)
```

**Choose your environment:**
- Use `test/` for development and testing
- Use `prod/` for production deployment

---

## Prerequisites

You need these before starting:

- [ ] AWS Account with admin access
- [ ] GitHub Account  
- [ ] OpenAI API Key
- [ ] Terraform installed
- [ ] AWS CLI installed and configured

---

## One-Time Setup

Complete these steps once before your first deployment.

### Step 1: Install Terraform and AWS CLI

**Windows (PowerShell as Admin):**
```powershell
choco install terraform awscli
```

**Mac:**
```bash
brew install terraform awscli
```

**Linux:**
```bash
# Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Verify both installed:**
```bash
terraform --version
aws --version
```

---

### Step 2: Configure AWS CLI

```bash
aws configure
```

Enter when prompted:
```
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region: us-east-2
Default output: json
```

**Where to get AWS keys:**
1. AWS Console → IAM → Users → Your User
2. Security credentials tab → Create access key
3. Select "CLI" → Create → Copy both keys

**Verify it works:**
```bash
aws sts get-caller-identity
```
Should show your account ID.

---

### Step 3: Create EC2 Key Pair

This lets you SSH into the Neo4j server.

```bash
aws ec2 create-key-pair --key-name openpermit-key --query 'KeyMaterial' --output text > openpermit-key.pem
```

**Mac/Linux only:**
```bash
chmod 400 openpermit-key.pem
```

**Verify:**
```bash
aws ec2 describe-key-pairs --key-names openpermit-key
```

---

### Step 4: Create GitHub Connection for App Runner

App Runner needs permission to pull code from GitHub.

1. Go to: **AWS Console → App Runner → GitHub connections**
   - Direct link: https://console.aws.amazon.com/apprunner/home#/connections
2. Click **Add new**
3. Connection name: `github-connection`
4. Click **Install another** to authorize AWS Connector for GitHub
5. Complete the GitHub authorization
6. **Copy the Connection ARN** - looks like:
   ```
   arn:aws:apprunner:us-east-2:123456789:connection/github-connection/abc123
   ```

Save this ARN for the next section.

---

### Step 5: Create GitHub Personal Access Token

Amplify needs this to pull your frontend code.

1. Go to: https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Fill in:
   - Note: `OpenPermit`
   - Expiration: 90 days
   - Scopes: ✅ **repo** (check the main box)
4. Click **Generate token**
5. **Copy the token immediately** - starts with `ghp_`

Save this token for the next section.

---

## Deploy

### Step 1: Navigate to Your Environment

Choose test (for development) or prod (for production):

```bash
cd terraform/test    # For testing
# OR
cd terraform/prod    # For production
```

---

### Step 2: Create Your Configuration File

Copy the example and edit it:

```bash
cp ../terraform.tfvars.example terraform.tfvars
```

Open `terraform.tfvars` in your editor and fill in these values:

```hcl
# Your current IP address (add /32 at the end)
# Get it with: curl https://ipinfo.io/ip
your_ip_address = "YOUR_IP_HERE/32"        # Example: "203.0.113.42/32"

# From Setup Step 3
ec2_key_name = "openpermit-key"

# From Setup Step 4
github_connection_arn = "arn:aws:apprunner:us-east-2:..."

# From Setup Step 5
amplify_github_token = "ghp_..."

# Generate strong passwords with: openssl rand -base64 32
neo4j_password = "GENERATE_A_STRONG_PASSWORD"
rds_password   = "GENERATE_ANOTHER_STRONG_PASSWORD"

# Your OpenAI API key
openai_api_key = "sk-proj-..."

# Your GitHub repository
github_repo_url = "https://github.com/YOUR_USERNAME/OpenPermit"
github_branch   = "main"
```

---

### Step 3: Initialize Terraform

```bash
terraform init
```

**Expected:** "Terraform has been successfully initialized!"

**If you see errors:** Jump to [Troubleshooting → Terraform Init Fails](#terraform-init-fails)

---

### Step 4: Preview What Will Be Created

```bash
terraform plan
```

**Expected:** Shows ~15-20 resources to be created, ends with "Plan: X to add, 0 to change, 0 to destroy."

**If you see errors:** Check your terraform.tfvars values.

---

### Step 5: Deploy Everything

```bash
terraform apply
```

Type `yes` when prompted.

**Takes 10-15 minutes.** Breakdown:
- RDS PostgreSQL: ~7 minutes
- Neo4j EC2: ~3 minutes  
- App Runner: ~5 minutes
- Amplify: ~2 minutes

---

### Step 6: Get Your URLs

```bash
terraform output
```

You'll see:
- `frontend_url` - Your website
- `backend_url` - API endpoint
- `neo4j_browser_url` - Neo4j web interface
- `rds_endpoint` - PostgreSQL connection string

---

### Step 7: Initialize the Database Schema

**Install psql if needed:**
- Windows: `choco install postgresql`
- Mac: `brew install libpq ; brew link --force libpq`
- Linux: `sudo apt install postgresql-client`

**Run the schema:**

Mac/Linux:
```bash
PGPASSWORD="your_rds_password" psql -h $(terraform output -raw rds_endpoint | cut -d: -f1) -U postgres -d OpenPermit -f ../../backend/schema.sql
```

Windows PowerShell:
```powershell
$env:PGPASSWORD = "your_rds_password"
$rds = (terraform output -raw rds_endpoint) -split ":" | Select-Object -First 1
psql -h $rds -U postgres -d OpenPermit -f ../../backend/schema.sql
```

**Expected:** Multiple `CREATE TABLE` and `CREATE INDEX` statements.

---

## Verify Deployment

### Check the Frontend (Amplify)

1. Get URL: `terraform output -raw frontend_url`
2. Open in browser
3. Should see your application

**Note:** First build takes 5-10 minutes. Check progress at AWS Console → Amplify.

---

### Check the Backend (App Runner)

```bash
curl $(terraform output -raw backend_url)/stats
```

**Expected:** JSON response

**Or visit:** `<backend_url>/docs` for the API documentation.

---

### Check Neo4j

1. Get URL: `terraform output -raw neo4j_browser_url`
2. Open in browser
3. Login with:
   - Username: `neo4j`
   - Password: your `neo4j_password` from config

---

### Check PostgreSQL

```bash
PGPASSWORD="your_rds_password" psql -h $(terraform output -raw rds_endpoint | cut -d: -f1) -U postgres -d OpenPermit -c "\dt"
```

**Expected:** List of tables.

---

## Troubleshooting

### Terraform Init Fails

**Error: "Failed to install provider"**
```bash
rm -rf .terraform .terraform.lock.hcl
terraform init
```

**Error: "No valid credential sources found"**
```bash
aws sts get-caller-identity
# If this fails, run: aws configure
```

---

### Terraform Apply Fails

**Error: "InvalidKeyPair.NotFound"**

Your EC2 key pair doesn't exist.

```bash
# Check if it exists
aws ec2 describe-key-pairs --key-names openpermit-key

# If not, create it
aws ec2 create-key-pair --key-name openpermit-key --query 'KeyMaterial' --output text > openpermit-key.pem
```

---

**Error: "GitHub connection not found" or "PENDING_VALIDATION"**

1. Go to: AWS Console → App Runner → GitHub connections
2. If status is "Pending validation", click **Complete handshake**
3. If connection doesn't exist, create a new one (Setup Step 4)
4. Update `github_connection_arn` in terraform.tfvars

---

**Error: "Invalid CIDR block"**

Your IP address format is wrong.

```bash
# Get your current IP
curl https://ipinfo.io/ip

# Update terraform.tfvars with format: X.X.X.X/32
# Example: your_ip_address = "203.0.113.42/32"
```

---

### Frontend Not Loading (Amplify)

**Step 1: Check build status**
```bash
aws amplify list-jobs --app-id $(terraform output -raw amplify_app_id) --branch-name main --query 'jobSummaries[0].status'
```

- `SUCCEED` = Build finished
- `PENDING` or `RUNNING` = Still building (wait)
- `FAILED` = See Step 2

**Step 2: If build failed, check logs**

Go to: AWS Console → Amplify → Your App → Click the failed build → View logs

**Common causes:**
- `NEXT_PUBLIC_API_URL` not set → Check Amplify environment variables
- npm install failed → Check package.json

**Step 3: Trigger a new build**
```bash
aws amplify start-job --app-id $(terraform output -raw amplify_app_id) --branch-name main --job-type RELEASE
```

---

### Backend Not Working (App Runner)

**Step 1: Check service status**
```bash
aws apprunner describe-service --service-arn $(terraform output -raw apprunner_service_arn) --query 'Service.Status'
```

- `RUNNING` = Healthy
- `OPERATION_IN_PROGRESS` = Still deploying (wait 5 min)
- `CREATE_FAILED` = See Step 2

**Step 2: Check logs**
```bash
aws logs tail /aws/apprunner/openpermit-backend --follow --region us-east-2
```

**Common causes:**
- Import error → Check Python dependencies
- Cannot connect to database → Check security groups
- Missing environment variable → Check Secrets Manager

**Step 3: Redeploy**
```bash
aws apprunner start-deployment --service-arn $(terraform output -raw apprunner_service_arn)
```

---

### Database Connection Timeout (RDS)

**Step 1: Check RDS is available**
```bash
aws rds describe-db-instances --db-instance-identifier openpermit-postgres --query 'DBInstances[0].DBInstanceStatus'
```

Should be `available`. If `creating`, wait 5 more minutes.

**Step 2: Check your IP hasn't changed**
```bash
curl https://ipinfo.io/ip
```

If different from terraform.tfvars, update it and run:
```bash
terraform apply
```

**Step 3: Check security group**
```bash
aws ec2 describe-security-groups --filters "Name=group-name,Values=*rds*" --query 'SecurityGroups[0].IpPermissions'
```

Your IP should be in the allowed list.

---

### Neo4j Not Accessible

**Step 1: Check EC2 instance is running**
```bash
aws ec2 describe-instances --filters "Name=tag:Name,Values=*neo4j*" --query 'Reservations[0].Instances[0].State.Name'
```

Should be `running`.

**Step 2: Check Neo4j service**
```bash
ssh -i openpermit-key.pem ec2-user@$(terraform output -raw neo4j_public_ip)
sudo systemctl status neo4j
```

**Step 3: If Neo4j isn't running, start it**
```bash
sudo systemctl start neo4j
sudo systemctl status neo4j
```

**Step 4: Check logs for errors**
```bash
sudo journalctl -u neo4j -n 50
```

**Step 5: Reset password if login fails**
```bash
sudo neo4j-admin dbms set-initial-password YOUR_NEW_PASSWORD
sudo systemctl restart neo4j
```

---

## Day-to-Day Operations

### Updating Your Code

Push to GitHub and both services auto-deploy:

```bash
git add .
git commit -m "your changes"
git push origin main
```

- Backend (App Runner): ~5 minutes
- Frontend (Amplify): ~3 minutes

### Manual Redeploy

**Backend:**
```bash
aws apprunner start-deployment --service-arn $(terraform output -raw apprunner_service_arn)
```

**Frontend:**
```bash
aws amplify start-job --app-id $(terraform output -raw amplify_app_id) --branch-name main --job-type RELEASE
```

### Updating Infrastructure

```bash
# Edit terraform.tfvars or *.tf files
terraform plan    # Preview changes
terraform apply   # Apply changes
```

### SSH to Neo4j Server

```bash
ssh -i openpermit-key.pem ec2-user@$(terraform output -raw neo4j_public_ip)
```

### View Logs

```bash
# App Runner
aws logs tail /aws/apprunner/openpermit-backend --follow --region us-east-2

# Neo4j (SSH first)
ssh -i openpermit-key.pem ec2-user@$(terraform output -raw neo4j_public_ip)
sudo journalctl -u neo4j -f
```

---

## Costs

### Monthly Breakdown

| Service | Cost | Save Money |
|---------|------|------------|
| App Runner | ~$50 | Pause when not using |
| RDS PostgreSQL | ~$15 | Stop during breaks |
| EC2 Neo4j | ~$15 | Stop instance |
| Amplify | ~$5 | — |
| **Total** | **~$90** | |

### Stop Services to Save Money

```bash
# Stop Neo4j
aws ec2 stop-instances --instance-ids $(terraform output -raw neo4j_instance_id)

# Stop RDS
aws rds stop-db-instance --db-instance-identifier openpermit-postgres

# Resume later
aws ec2 start-instances --instance-ids $(terraform output -raw neo4j_instance_id)
aws rds start-db-instance --db-instance-identifier openpermit-postgres
```

---

## Clean Up

### Delete Everything

```bash
terraform destroy
```

Type `yes` to confirm. This removes all resources and stops billing.

### Delete Specific Resources

```bash
# Just Neo4j
terraform destroy -target=aws_instance.neo4j -target=aws_eip.neo4j

# Just RDS
terraform destroy -target=aws_db_instance.postgres
```

---

## File Reference

Each environment (prod/ and test/) contains:

| File | Purpose |
|------|---------|
| `main.tf` | Provider config, VPC, security groups |
| `variables.tf` | Input variables |
| `terraform.tfvars` | Your configuration values |
| `neo4j.tf` | Neo4j EC2 instance |
| `rds.tf` | PostgreSQL database |
| `app.tf` | App Runner (backend) + Amplify (frontend) |
| `secrets.tf` | Secrets Manager |
| `outputs.tf` | URLs and endpoints |
| `user-data/neo4j-install.sh` | Neo4j installation script |

---

## Quick Reference

```bash
# Navigate to environment
cd terraform/test   # or terraform/prod

# Initialize
terraform init

# Preview changes
terraform plan

# Deploy
terraform apply

# Get outputs
terraform output

# Destroy
terraform destroy

# View resource state
terraform state list
terraform show
```

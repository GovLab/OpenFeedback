# 🚀 OpenPermit - Deploy to AWS in 15 Minutes

Complete Infrastructure as Code to deploy OpenPermit on AWS using Terraform.

## 📋 What Gets Created

- **EC2 Instance** - Neo4j graph database (t3.small, 20GB)
- **RDS PostgreSQL** - Relational database (db.t4g.micro, 20GB)
- **App Runner** - FastAPI backend service (auto-scales)
- **Amplify** - Next.js frontend hosting (auto-deploys)
- **Secrets Manager** - Secure credential storage
- **VPC & Security** - Network isolation and security groups

**Estimated Cost:** ~$90/month (~$3/day for testing)

## 🏗️ Architecture Modes

### Simple Mode (Default) - $90/month
- Default VPC with public subnets
- Public databases (security group protected)
- App Runner with default networking
- **Use for:** Dev, Testing, MVP

### Secure Mode - $122/month (+$32)
- Custom VPC with private subnets
- NAT Gateway for App Runner
- Private databases
- **Use for:** Production, Sensitive data

**Switch modes:** Set `enable_nat_gateway = true` in terraform.tfvars

---

## ✅ Prerequisites

- [ ] AWS Account with admin access
- [ ] GitHub Account
- [ ] OpenAI API key
- [ ] Terraform installed
- [ ] AWS CLI configured

## 🔧 Setup (One-Time)

### 1. Install Tools

**Windows:**
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

### 2. Configure AWS

```bash
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region: us-east-2
# Default output: json
```

### 3. Create EC2 Key Pair

```bash
aws ec2 create-key-pair \
  --key-name openfeedback-key \
  --query 'KeyMaterial' \
  --output text > openfeedback-key.pem

# Mac/Linux only
chmod 400 openfeedback-key.pem
```

### 4. Get GitHub Connection ARN

1. Go to AWS Console → **App Runner** → Create service
2. Choose "Source code repository" → **GitHub**
3. Click **"Add new"** → Authorize AWS
4. **Copy the Connection ARN** (looks like: `arn:aws:apprunner:us-east-2:123456:connection/...`)
5. Cancel (don't create the service)

### 5. Create GitHub Token

1. GitHub → Settings → Developer settings → **Personal access tokens** → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: "OpenPermit"
4. Scope: ✅ **repo** (full control)
5. Generate token → **Copy it** (starts with `ghp_`)

---

## 🚀 Deploy Infrastructure

### Step 1: Configure

```bash
cd terraform/

# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
code terraform.tfvars   # or nano, vim, notepad
```

**Fill in these values:**

```hcl
# Get your IP automatically
your_ip_address = "<run: curl https://ipinfo.io/ip>/32"

# From setup steps above
ec2_key_name         = "openfeedback-key"
github_connection_arn = "arn:aws:apprunner:us-east-2:..."
amplify_github_token  = "ghp_..."

# Generate strong passwords
neo4j_password = "<run: openssl rand -base64 32>"
rds_password   = "<run: openssl rand -base64 32>"

# Your OpenAI key
openai_api_key = "sk-proj-..."

# Repository (update if using your fork)
github_repo_url = "https://github.com/ShadowMasterAJ/OpenPermit"
github_branch   = "main"
```

### Step 2: Initialize

```bash
terraform init
```

### Step 3: Preview

```bash
terraform plan
```

Review what will be created. Should show ~30 resources.

### Step 4: Deploy

```bash
terraform apply
```

Type `yes` when prompted.

**⏱️ Takes 10-15 minutes** - Go grab coffee ☕

### Step 5: Get Your URLs

```bash
terraform output deployment_summary
```

You'll get:
- **Frontend URL** - Your application
- **Backend API URL** - API endpoint
- **Neo4j Browser URL** - Graph database UI
- **PostgreSQL endpoint** - Database connection

### Step 6: Initialize Database

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(terraform output -raw rds_address)

# Run schema (enter rds_password when prompted)
psql -h $RDS_ENDPOINT -U postgres -d OpenPermit -f ../backend/schema.sql
```

---

## 🎉 You're Live!

Access your application:
- **Frontend:** Check `terraform output frontend_url`
- **API Docs:** `<backend_url>/docs`
- **Neo4j Browser:** Check `terraform output neo4j_browser_url` (user: neo4j)

### Test It

```bash
# Test API
curl $(terraform output -raw backend_api_url)/stats

# Test Neo4j (from Neo4j browser)
MATCH (n) RETURN count(n);
```

---

## 🔄 Making Changes

### Update Application Code

```bash
git add .
git commit -m "Update feature"
git push origin main

# App Runner and Amplify auto-deploy in 5-10 minutes
```

### Update Infrastructure

```bash
# Modify *.tf files or terraform.tfvars
terraform plan    # Preview changes
terraform apply   # Apply changes
```

### Manually Trigger Deployment

```bash
# Redeploy backend
aws apprunner start-deployment \
  --service-arn $(terraform output -raw apprunner_service_arn)

# Redeploy frontend  
aws amplify start-job \
  --app-id $(terraform output -raw amplify_app_id) \
  --branch-name main \
  --job-type RELEASE
```

---

## 📁 Project Structure

The Terraform configuration is modular:

```
terraform/
├── data.tf              # AWS data sources
├── locals.tf            # Computed values
├── network.tf           # VPC, subnets, NAT
├── security_groups.tf   # Firewall rules
├── neo4j.tf             # Graph database
├── rds.tf               # PostgreSQL
├── secrets.tf           # Secrets Manager
├── iam.tf               # IAM roles
├── apprunner.tf         # Backend service
├── amplify.tf           # Frontend hosting
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── versions.tf          # Provider versions
└── terraform.tfvars     # Your config (gitignored)
```

See [MODULES.md](MODULES.md) for detailed documentation.

---

## 🐛 Troubleshooting

### "GitHub connection not authorized"
- AWS Console → App Runner → Connections → Update → Re-authorize

### "EC2 key pair not found"
- Run: `aws ec2 describe-key-pairs --key-names openfeedback-key`
- If not found, create it again (Step 3)

### "RDS connection timeout"
- Wait 5 more minutes (RDS takes time)
- Check your IP: `curl https://ipinfo.io/ip`
- Update terraform.tfvars if IP changed → `terraform apply`

### "App Runner deployment failed"
- Check logs: AWS Console → App Runner → Service → Logs
- Or: `aws logs tail /aws/apprunner/openfeedback-backend --follow`

### "Amplify build failed"
- AWS Console → Amplify → App → Build history
- Check if backend URL is correct in environment variables

### Check Logs

```bash
# App Runner logs
aws logs tail /aws/apprunner/openfeedback-backend --follow --region us-east-2

# RDS connection
psql -h $(terraform output -raw rds_address) -U postgres -d OpenPermit

# Neo4j status (SSH first)
ssh -i openfeedback-key.pem ec2-user@$(terraform output -raw neo4j_public_ip)
sudo systemctl status neo4j
```

---

## 💰 Cost Management

### Current Costs

```bash
# View in AWS Console
open https://console.aws.amazon.com/cost-management/home

# Or via CLI
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Cost Breakdown

| Resource | Cost/Month | How to Reduce |
|----------|------------|---------------|
| App Runner | ~$50 | Pause during off-hours |
| RDS | ~$15 | Stop when not testing |
| EC2 Neo4j | ~$15 | Stop instance |
| Amplify | ~$5 | Delete unused apps |
| NAT Gateway | $0-32 | Disable NAT (use simple mode) |
| **Total** | **~$90** | **~$3/day for testing** |

### Save Money

**For testing (stop when done):**
```bash
# Stop Neo4j
aws ec2 stop-instances --instance-ids $(terraform output -raw neo4j_instance_id)

# Stop RDS (takes snapshot first)
aws rds stop-db-instance --db-instance-identifier openfeedback-postgres

# Resume when needed
aws ec2 start-instances --instance-ids $(terraform output -raw neo4j_instance_id)
aws rds start-db-instance --db-instance-identifier openfeedback-postgres
```

**For long breaks (delete everything):**
```bash
terraform destroy
# Type 'yes' to confirm
```

---

## 🗑️ Clean Up

### Destroy Everything

```bash
# Preview what will be deleted
terraform plan -destroy

# Delete all resources
terraform destroy

# Type 'yes' to confirm
```

This removes **ALL** AWS resources and stops billing.

### Destroy Specific Resources

```bash
# Just Neo4j
terraform destroy -target=aws_instance.neo4j -target=aws_eip.neo4j

# Just RDS
terraform destroy -target=aws_db_instance.postgresql
```

---

## 📝 Common Commands

```bash
# Format code
terraform fmt

# Validate syntax
terraform validate

# Show current state
terraform show

# List all resources
terraform state list

# Refresh outputs
terraform refresh
terraform output

# Target specific resource
terraform apply -target=aws_instance.neo4j
```

---

## 🔐 Security Best Practices

✅ **Already Implemented:**
- Secrets in AWS Secrets Manager (encrypted at rest)
- IAM roles with least privilege
- Security groups restrict network access
- RDS encryption enabled
- HTTPS/TLS for all services

⚠️ **You Should Do:**
1. Change default passwords (use: `openssl rand -base64 32`)
2. Restrict `your_ip_address` to your actual IP (not 0.0.0.0/0)
3. Enable MFA on AWS account
4. For production, use `enable_nat_gateway = true`
5. Enable CloudWatch alarms for monitoring

---

## 🎓 Next Steps

Once deployed:

1. **Test the app** - Submit feedback through frontend
2. **Explore Neo4j** - Query graph relationships
3. **Check PostgreSQL** - View structured data
4. **Monitor logs** - CloudWatch insights
5. **Set up backups** - Automated RDS snapshots
6. **Add custom domain** - Route53 + ACM
7. **Enable WAF** - Web application firewall
8. **Multi-environment** - Dev/staging/prod workspaces

---

## 📚 Additional Resources

- [Modular Architecture](MODULES.md) - Detailed file structure
- [Terraform AWS Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [App Runner Guide](https://docs.aws.amazon.com/apprunner/)
- [Neo4j Docs](https://neo4j.com/docs/)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)

---

## 🆘 Need Help?

1. Check error message carefully
2. Run `terraform plan` to see what changed
3. Check AWS Console for resource status
4. Review CloudWatch logs
5. Verify security group rules
6. Confirm secrets are correctly set

**Common Issues:** All covered in Troubleshooting section above ↑

---

**Ready to deploy?** Start with Setup Step 1! 🚀

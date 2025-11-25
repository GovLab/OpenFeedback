# 📦 Terraform Modules Structure

The Terraform configuration has been refactored into **modular files** for better organization and maintainability.

## 📁 File Structure

```
terraform/
├── main.tf              # Main entry point (minimal, just documentation)
├── data.tf              # Data sources (AMIs, VPCs, account info)
├── locals.tf            # Local values and computed variables
├── network.tf           # VPC, subnets, IGW, NAT, route tables
├── security_groups.tf   # All security groups
├── neo4j.tf             # EC2 instance for Neo4j
├── rds.tf               # PostgreSQL RDS database
├── secrets.tf           # AWS Secrets Manager
├── iam.tf               # IAM roles and policies
├── apprunner.tf         # App Runner service (FastAPI backend)
├── amplify.tf           # Amplify app (Next.js frontend)
├── variables.tf         # Input variable declarations
├── outputs.tf           # Output values
├── versions.tf          # Terraform and provider versions
├── terraform.tfvars     # Your configuration values (gitignored)
└── user-data/
    └── neo4j-install.sh # Neo4j installation script
```

## 🎯 What Changed?

### Before: Monolithic Structure

- **main.tf** (656 lines) - Everything in one file

### After: Modular Structure

- **main.tf** (19 lines) - Entry point with documentation
- **data.tf** (44 lines) - Data sources
- **locals.tf** (18 lines) - Local values
- **network.tf** (214 lines) - Network infrastructure
- **security_groups.tf** (108 lines) - Security groups
- **neo4j.tf** (37 lines) - Neo4j EC2 instance
- **rds.tf** (56 lines) - PostgreSQL database
- **secrets.tf** (31 lines) - Secrets Manager
- **iam.tf** (48 lines) - IAM roles and policies
- **apprunner.tf** (67 lines) - App Runner service
- **amplify.tf** (48 lines) - Amplify frontend

**Total: 11 focused, single-purpose files**

## 📚 Module Descriptions

### Core Configuration Files

#### `main.tf`

- Main entry point
- Contains documentation about the structure
- Intentionally minimal - just references other files

#### `data.tf`

- AWS VPC data source
- Availability zones
- Amazon Linux 2023 AMI
- Default VPC subnets
- Current AWS account info

#### `locals.tf`

- VPC ID (default or custom)
- Public subnet IDs
- Private subnet IDs
- Computed values used across modules

### Infrastructure Modules

#### `network.tf` - Network Infrastructure

**Resources:**

- VPC (if not using default)
- Internet Gateway
- Public subnets (2x)
- Private subnets (3x)
- Public route table + associations
- NAT Gateway + Elastic IP (optional)
- Private route table + associations (optional)

**Use Case:** All networking components in one place

#### `security_groups.tf` - Network Security

**Resources:**

- App Runner security group (outbound)
- Neo4j security group (SSH, Browser, Bolt)
- RDS security group (PostgreSQL)

**Use Case:** Centralized security rules

#### `neo4j.tf` - Graph Database

**Resources:**

- EC2 instance (Amazon Linux 2023)
- Elastic IP for static address
- User data script for Neo4j installation

**Use Case:** Neo4j graph database on EC2

#### `rds.tf` - Relational Database

**Resources:**

- RDS PostgreSQL instance
- DB subnet group
- Backup and monitoring configuration

**Use Case:** PostgreSQL database for structured data

#### `secrets.tf` - Secrets Management

**Resources:**

- Secrets Manager secret
- Secret version with all credentials
- Random suffix for unique naming

**Use Case:** Centralized secrets storage

#### `iam.tf` - Access Control

**Resources:**

- App Runner instance role
- Secrets Manager access policy

**Use Case:** IAM permissions for services

#### `apprunner.tf` - Backend Service

**Resources:**

- App Runner service
- GitHub source configuration
- Instance configuration (CPU, memory)
- Health check configuration

**Use Case:** FastAPI backend deployment

#### `amplify.tf` - Frontend Hosting

**Resources:**

- Amplify app
- Amplify branch
- Build specification
- Environment variables

**Use Case:** Next.js frontend hosting

## 🔄 How It Works

Terraform automatically loads all `.tf` files in the directory and treats them as a single configuration. The modular structure is purely for organization - functionally, it's identical to the previous monolithic file.

### Benefits of Modular Structure

1. **Easier to Navigate** - Find resources quickly by file name
2. **Better Collaboration** - Multiple people can work on different modules
3. **Cleaner Git Diffs** - Changes are isolated to specific files
4. **Easier Maintenance** - Update one component without scrolling through 600+ lines
5. **Better Understanding** - Each file has a clear, single purpose
6. **Easier Testing** - Can target specific modules for testing

## 🚀 Usage

The workflow remains **exactly the same**:

```bash
# Initialize (first time only)
terraform init

# Validate configuration
terraform validate

# Preview changes
terraform plan

# Deploy
terraform apply

# Destroy
terraform destroy
```

### Working with Specific Resources

```bash
# Format all files
terraform fmt

# Validate specific file (they're all validated together)
terraform validate

# Target specific resource
terraform apply -target=aws_instance.neo4j
terraform destroy -target=aws_db_instance.postgresql

# Show resource from specific module
terraform show aws_apprunner_service.backend
```

## 🔍 Finding Resources

| What You Need         | File to Check        |
| --------------------- | -------------------- |
| Network issues        | `network.tf`         |
| Security rules        | `security_groups.tf` |
| Neo4j not connecting  | `neo4j.tf`           |
| Database issues       | `rds.tf`             |
| Secrets not working   | `secrets.tf`         |
| Permission errors     | `iam.tf`             |
| Backend API down      | `apprunner.tf`       |
| Frontend not building | `amplify.tf`         |
| Variables not working | `variables.tf`       |
| Outputs missing       | `outputs.tf`         |

## 💡 Tips

### Modifying Resources

**Before (monolithic):**

- Open main.tf (656 lines)
- Search for the resource
- Scroll through multiple sections
- Make changes

**After (modular):**

- Open the specific file (30-200 lines)
- Resource is right there
- Make changes
- Done!

### Adding New Resources

1. Identify which file it belongs in (or create new file)
2. Add the resource
3. Run `terraform fmt` to format
4. Run `terraform plan` to preview

### Example: Add CloudWatch Alarm for RDS

```hcl
# Add to rds.tf
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project_name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is too high"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgresql.id
  }
}
```

## 🔄 Migration Notes

If you have an existing Terraform state, **no migration is needed**. The state doesn't care about file organization - resources are referenced by their type and name, which haven't changed.

### Backwards Compatible

All resource names and references are **identical** to the previous monolithic structure:

- `aws_instance.neo4j` → Still in state as `aws_instance.neo4j`
- `aws_db_instance.postgresql` → Still `aws_db_instance.postgresql`
- etc.

### No State Changes Required

```bash
# This will show zero changes (if nothing else changed)
terraform plan
# Output: No changes. Your infrastructure matches the configuration.
```

## 📝 Best Practices

1. **Keep files focused** - One concern per file
2. **Use clear names** - File name should indicate contents
3. **Add comments** - Document complex logic
4. **Group related resources** - Keep dependencies together
5. **Use consistent formatting** - Run `terraform fmt` regularly

---

**Questions?** Check the main [README.md](README.md) or [QUICKSTART.md](QUICKSTART.md)

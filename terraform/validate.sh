#!/bin/bash
#==============================================================================
# Terraform Pre-Flight Validation Script
# Run this before terraform apply to catch common issues
#==============================================================================

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         OpenPermit Terraform Pre-Flight Checks                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Terraform installed
echo -n "Checking Terraform... "
if command -v terraform &> /dev/null; then
    VERSION=$(terraform version | head -n1)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗${NC} Terraform not found!"
    echo "Install from: https://www.terraform.io/downloads"
    exit 1
fi

# Check AWS CLI installed
echo -n "Checking AWS CLI... "
if command -v aws &> /dev/null; then
    VERSION=$(aws --version | cut -d' ' -f1)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗${NC} AWS CLI not found!"
    echo "Install from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
echo -n "Checking AWS credentials... "
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✓${NC} Account: $ACCOUNT"
else
    echo -e "${RED}✗${NC} AWS credentials not configured!"
    echo "Run: aws configure"
    exit 1
fi

# Check terraform.tfvars exists
echo -n "Checking terraform.tfvars... "
if [ -f "terraform.tfvars" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗${NC} Not found!"
    echo "Copy terraform.tfvars.example to terraform.tfvars and fill in values"
    exit 1
fi

# Check required variables in terraform.tfvars
echo
echo "Validating terraform.tfvars contents..."

check_var() {
    VAR_NAME=$1
    VAR_DESC=$2
    
    if grep -q "^$VAR_NAME\s*=" terraform.tfvars; then
        VALUE=$(grep "^$VAR_NAME\s*=" terraform.tfvars | cut -d'=' -f2 | tr -d ' "')
        if [ "$VALUE" = "your-"* ] || [ "$VALUE" = "ACCOUNT"* ]; then
            echo -e "  ${YELLOW}⚠${NC} $VAR_NAME: Needs to be filled in"
            return 1
        else
            echo -e "  ${GREEN}✓${NC} $VAR_NAME: Set"
            return 0
        fi
    else
        echo -e "  ${RED}✗${NC} $VAR_NAME: Missing"
        return 1
    fi
}

VALIDATION_FAILED=0

check_var "your_ip_address" "Your IP address" || VALIDATION_FAILED=1
check_var "ec2_key_name" "EC2 key pair name" || VALIDATION_FAILED=1
check_var "neo4j_password" "Neo4j password" || VALIDATION_FAILED=1
check_var "rds_password" "PostgreSQL password" || VALIDATION_FAILED=1
check_var "github_connection_arn" "GitHub connection ARN" || VALIDATION_FAILED=1
check_var "openai_api_key" "OpenAI API key" || VALIDATION_FAILED=1
check_var "amplify_github_token" "GitHub token" || VALIDATION_FAILED=1

if [ $VALIDATION_FAILED -eq 1 ]; then
    echo
    echo -e "${RED}Validation failed!${NC} Please update terraform.tfvars"
    exit 1
fi

# Check EC2 key pair exists
echo
echo -n "Checking EC2 key pair... "
KEY_NAME=$(grep "^ec2_key_name" terraform.tfvars | cut -d'=' -f2 | tr -d ' "')
if aws ec2 describe-key-pairs --key-names "$KEY_NAME" &> /dev/null; then
    echo -e "${GREEN}✓${NC} $KEY_NAME exists"
else
    echo -e "${RED}✗${NC} Key pair '$KEY_NAME' not found in AWS!"
    echo "Create it in AWS Console or:"
    echo "  aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > $KEY_NAME.pem"
    exit 1
fi

# Initialize Terraform if needed
echo
if [ ! -d ".terraform" ]; then
    echo "Running terraform init..."
    terraform init
else
    echo -e "${GREEN}✓${NC} Terraform already initialized"
fi

# Validate Terraform configuration
echo
echo "Validating Terraform configuration..."
if terraform validate; then
    echo -e "${GREEN}✓${NC} Configuration is valid"
else
    echo -e "${RED}✗${NC} Configuration has errors!"
    exit 1
fi

# Format check
echo
echo "Checking Terraform formatting..."
if terraform fmt -check -recursive; then
    echo -e "${GREEN}✓${NC} Formatting is correct"
else
    echo -e "${YELLOW}⚠${NC} Files need formatting. Run: terraform fmt -recursive"
fi

# Estimate cost
echo
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Estimated Monthly Cost                     ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  App Runner (2GB, 720hrs)      ~$50                           ║"
echo "║  RDS t4g.micro                 ~$15                           ║"
echo "║  EC2 t3.small                  ~$15                           ║"
echo "║  Amplify                       ~$5                            ║"
echo "║  Secrets Manager               ~$0.40                         ║"
echo "║  Data Transfer                 ~$5                            ║"

if grep -q "enable_nat_gateway\s*=\s*true" terraform.tfvars; then
    echo "║  NAT Gateway                   ~$32                           ║"
    echo "║  ------------------------------------------------------------ ║"
    echo "║  TOTAL:                        ~$122/month                   ║"
else
    echo "║  ------------------------------------------------------------ ║"
    echo "║  TOTAL:                        ~$90/month                    ║"
fi
echo "╚═══════════════════════════════════════════════════════════════╝"

echo
echo -e "${GREEN}✓ All checks passed!${NC}"
echo
echo "Ready to deploy. Run:"
echo "  terraform plan    # Preview changes"
echo "  terraform apply   # Deploy infrastructure"
echo



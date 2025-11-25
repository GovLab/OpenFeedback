#==============================================================================
# Terraform Pre-Flight Validation Script (PowerShell)
# Run this before terraform apply to catch common issues
#==============================================================================

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         OpenPermit Terraform Pre-Flight Checks                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$AllChecksPassed = $true

# Check Terraform installed
Write-Host "Checking Terraform... " -NoNewline
try {
    $tfVersion = terraform version | Select-Object -First 1
    Write-Host "✓ $tfVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Terraform not found!" -ForegroundColor Red
    Write-Host "Install from: https://www.terraform.io/downloads"
    $AllChecksPassed = $false
}

# Check AWS CLI installed
Write-Host "Checking AWS CLI... " -NoNewline
try {
    $awsVersion = (aws --version 2>&1).Split(' ')[0]
    Write-Host "✓ $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found!" -ForegroundColor Red
    Write-Host "Install from: https://aws.amazon.com/cli/"
    $AllChecksPassed = $false
}

# Check AWS credentials
Write-Host "Checking AWS credentials... " -NoNewline
try {
    $account = aws sts get-caller-identity --query Account --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Account: $account" -ForegroundColor Green
    } else {
        throw "Failed"
    }
} catch {
    Write-Host "✗ AWS credentials not configured!" -ForegroundColor Red
    Write-Host "Run: aws configure"
    $AllChecksPassed = $false
}

# Check terraform.tfvars exists
Write-Host "Checking terraform.tfvars... " -NoNewline
if (Test-Path "terraform.tfvars") {
    Write-Host "✓ Found" -ForegroundColor Green
} else {
    Write-Host "✗ Not found!" -ForegroundColor Red
    Write-Host "Copy terraform.tfvars.example to terraform.tfvars and fill in values"
    $AllChecksPassed = $false
}

# Check required variables in terraform.tfvars
Write-Host ""
Write-Host "Validating terraform.tfvars contents..."

function Check-Var {
    param($VarName)
    
    $content = Get-Content terraform.tfvars -Raw
    if ($content -match "$VarName\s*=\s*`"([^`"]+)`"") {
        $value = $matches[1]
        if ($value -like "your-*" -or $value -like "ACCOUNT*") {
            Write-Host "  ⚠ $VarName : Needs to be filled in" -ForegroundColor Yellow
            return $false
        } else {
            Write-Host "  ✓ $VarName : Set" -ForegroundColor Green
            return $true
        }
    } else {
        Write-Host "  ✗ $VarName : Missing" -ForegroundColor Red
        return $false
    }
}

if (Test-Path "terraform.tfvars") {
    $allVarsSet = $true
    $allVarsSet = (Check-Var "your_ip_address") -and $allVarsSet
    $allVarsSet = (Check-Var "ec2_key_name") -and $allVarsSet
    $allVarsSet = (Check-Var "neo4j_password") -and $allVarsSet
    $allVarsSet = (Check-Var "rds_password") -and $allVarsSet
    $allVarsSet = (Check-Var "github_connection_arn") -and $allVarsSet
    $allVarsSet = (Check-Var "openai_api_key") -and $allVarsSet
    $allVarsSet = (Check-Var "amplify_github_token") -and $allVarsSet
    
    if (-not $allVarsSet) {
        Write-Host ""
        Write-Host "Validation failed! Please update terraform.tfvars" -ForegroundColor Red
        $AllChecksPassed = $false
    }
}

# Check EC2 key pair exists
Write-Host ""
Write-Host "Checking EC2 key pair... " -NoNewline
if (Test-Path "terraform.tfvars") {
    $content = Get-Content terraform.tfvars -Raw
    if ($content -match 'ec2_key_name\s*=\s*"([^"]+)"') {
        $keyName = $matches[1]
        try {
            aws ec2 describe-key-pairs --key-names $keyName 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ $keyName exists" -ForegroundColor Green
            } else {
                Write-Host "✗ Key pair '$keyName' not found in AWS!" -ForegroundColor Red
                Write-Host "Create it in AWS Console or run:"
                Write-Host "  aws ec2 create-key-pair --key-name $keyName --query 'KeyMaterial' --output text > $keyName.pem"
                $AllChecksPassed = $false
            }
        } catch {
            Write-Host "✗ Failed to check key pair" -ForegroundColor Red
            $AllChecksPassed = $false
        }
    }
}

# Initialize Terraform if needed
Write-Host ""
if (-not (Test-Path ".terraform")) {
    Write-Host "Running terraform init..."
    terraform init
} else {
    Write-Host "✓ Terraform already initialized" -ForegroundColor Green
}

# Validate Terraform configuration
Write-Host ""
Write-Host "Validating Terraform configuration..."
terraform validate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Configuration is valid" -ForegroundColor Green
} else {
    Write-Host "✗ Configuration has errors!" -ForegroundColor Red
    $AllChecksPassed = $false
}

# Format check
Write-Host ""
Write-Host "Checking Terraform formatting..."
terraform fmt -check -recursive | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Formatting is correct" -ForegroundColor Green
} else {
    Write-Host "⚠ Files need formatting. Run: terraform fmt -recursive" -ForegroundColor Yellow
}

# Estimate cost
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Estimated Monthly Cost                     ║" -ForegroundColor Cyan
Write-Host "╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  App Runner (2GB, 720hrs)      ~`$50                           ║" -ForegroundColor Cyan
Write-Host "║  RDS t4g.micro                 ~`$15                           ║" -ForegroundColor Cyan
Write-Host "║  EC2 t3.small                  ~`$15                           ║" -ForegroundColor Cyan
Write-Host "║  Amplify                       ~`$5                            ║" -ForegroundColor Cyan
Write-Host "║  Secrets Manager               ~`$0.40                         ║" -ForegroundColor Cyan
Write-Host "║  Data Transfer                 ~`$5                            ║" -ForegroundColor Cyan

if (Test-Path "terraform.tfvars") {
    $content = Get-Content terraform.tfvars -Raw
    if ($content -match 'enable_nat_gateway\s*=\s*true') {
        Write-Host "║  NAT Gateway                   ~`$32                           ║" -ForegroundColor Cyan
        Write-Host "║  ------------------------------------------------------------ ║" -ForegroundColor Cyan
        Write-Host "║  TOTAL:                        ~`$122/month                   ║" -ForegroundColor Cyan
    } else {
        Write-Host "║  ------------------------------------------------------------ ║" -ForegroundColor Cyan
        Write-Host "║  TOTAL:                        ~`$90/month                    ║" -ForegroundColor Cyan
    }
}
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
if ($AllChecksPassed) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to deploy. Run:"
    Write-Host "  terraform plan    # Preview changes" -ForegroundColor Yellow
    Write-Host "  terraform apply   # Deploy infrastructure" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "✗ Some checks failed. Please fix the issues above." -ForegroundColor Red
    exit 1
}



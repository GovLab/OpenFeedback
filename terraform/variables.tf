# ==============================================================================
# GENERAL VARIABLES
# ==============================================================================

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "openpermit"
}

variable "your_ip_address" {
  description = "Your IP address for SSH/Neo4j browser access (e.g., 203.0.113.10/32)"
  type        = string
}

# ==============================================================================
# NETWORK VARIABLES
# ==============================================================================

variable "use_default_vpc" {
  description = "Use default VPC (true) or create new VPC (false)"
  type        = bool
  default     = true
}

variable "vpc_cidr" {
  description = "CIDR block for VPC if creating new"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for VPC egress (costs $32/month, required for VPC mode App Runner)"
  type        = bool
  default     = false
}

# ==============================================================================
# EC2 (NEO4J) VARIABLES
# ==============================================================================

variable "ec2_instance_type" {
  description = "EC2 instance type for Neo4j"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_name" {
  description = "EC2 SSH key pair name (must exist in AWS)"
  type        = string
}

variable "neo4j_password" {
  description = "Password for Neo4j database (will be set during installation)"
  type        = string
  sensitive   = true
}

# ==============================================================================
# RDS (POSTGRESQL) VARIABLES
# ==============================================================================

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "17.6"
}

variable "rds_database_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "OpenPermit"
}

variable "rds_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "postgres"
}

variable "rds_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ for RDS (production only, costs 2x)"
  type        = bool
  default     = false
}

variable "rds_publicly_accessible" {
  description = "Make RDS publicly accessible (simple mode)"
  type        = bool
  default     = true
}

# ==============================================================================
# APP RUNNER VARIABLES
# ==============================================================================

variable "github_repo_url" {
  description = "GitHub repository URL"
  type        = string
  default     = "https://github.com/ShadowMasterAJ/OpenPermit"
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  type        = string
  default     = "main"
}

variable "github_connection_arn" {
  description = "AWS App Runner GitHub connection ARN (must be created manually first)"
  type        = string
}

variable "app_runner_cpu" {
  description = "App Runner CPU units (1024 = 1 vCPU)"
  type        = string
  default     = "1024"
}

variable "app_runner_memory" {
  description = "App Runner memory in MB"
  type        = string
  default     = "2048"
}

variable "openai_api_key" {
  description = "OpenAI API key for backend"
  type        = string
  sensitive   = true
}

# ==============================================================================
# AMPLIFY VARIABLES
# ==============================================================================

variable "amplify_github_token" {
  description = "GitHub personal access token for Amplify (needs repo permissions)"
  type        = string
  sensitive   = true
}

# ==============================================================================
# SECRETS MANAGER VARIABLES
# ==============================================================================

# Note: Secrets Manager is always created - no option to use existing secrets



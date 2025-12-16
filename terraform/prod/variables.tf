# General
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "openpermit"
}

variable "your_ip_address" {
  description = "Your IP for SSH/Neo4j browser access (e.g., 203.0.113.10/32)"
  type        = string
}

# EC2 (Neo4j)
variable "ec2_instance_type" {
  description = "EC2 instance type for Neo4j"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_name" {
  description = "EC2 SSH key pair name"
  type        = string
}

variable "neo4j_password" {
  description = "Neo4j database password"
  type        = string
  sensitive   = true
}

# RDS (PostgreSQL)
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "RDS storage in GB"
  type        = number
  default     = 20
}

variable "rds_engine_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "17.6"
}

variable "rds_database_name" {
  description = "Database name"
  type        = string
  default     = "OpenPermit"
}

variable "rds_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "rds_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# App Runner
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
  description = "AWS App Runner GitHub connection ARN"
  type        = string
}

variable "app_runner_cpu" {
  description = "App Runner CPU (1024 = 1 vCPU)"
  type        = string
  default     = "1024"
}

variable "app_runner_memory" {
  description = "App Runner memory in MB"
  type        = string
  default     = "2048"
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

# Amplify
variable "amplify_github_token" {
  description = "GitHub token for Amplify (needs repo permissions)"
  type        = string
  sensitive   = true
}

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "openfeedback"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "burnes-center"
    }
  }
}

locals {
  name = "openfeedback-${var.environment}"
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ssm_parameter" "al2023_x86" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_ssm_parameter" "al2023_arm" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

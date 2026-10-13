variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  description = "dev or prod, per the Burnes AWS tag standard"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod."
  }
}

variable "vpc_cidr" {
  type    = string
  default = "10.60.0.0/16"
}

variable "neo4j_instance_type" {
  type    = string
  default = "t3.small"
}

variable "rds_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "app_runner_cpu" {
  type    = string
  default = "512"
}

variable "app_runner_memory" {
  type    = string
  default = "1024"
}

variable "app_runner_max_instances" {
  description = "Caps cost if the public form gets hammered"
  type        = number
  default     = 2
}

variable "topic" {
  description = "Which topic profile the app runs: permits or parks"
  type        = string
  default     = "parks"

  validation {
    condition     = contains(["permits", "parks"], var.topic)
    error_message = "topic must be permits or parks."
  }
}

variable "show_sample_data_notice" {
  description = "Label the dashboard as sample data (for demos with made-up feedback)"
  type        = bool
  default     = true
}

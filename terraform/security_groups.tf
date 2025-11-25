# ==============================================================================
# SECURITY GROUPS
# ==============================================================================

# Security Group for App Runner (outbound traffic)
resource "aws_security_group" "apprunner_outbound" {
  name        = "${var.project_name}-apprunner-outbound"
  description = "Security group for App Runner outbound traffic"
  vpc_id      = local.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "${var.project_name}-apprunner-sg"
  }
}

# Security Group for Neo4j EC2
resource "aws_security_group" "neo4j" {
  name        = "${var.project_name}-neo4j"
  description = "Security group for Neo4j on EC2"
  vpc_id      = local.vpc_id

  # SSH from your IP
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.your_ip_address]
    description = "SSH from your IP"
  }

  # Neo4j Browser from your IP
  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [var.your_ip_address]
    description = "Neo4j Browser from your IP"
  }

  # Neo4j Bolt from anywhere (App Runner has dynamic IPs)
  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Neo4j Bolt protocol from App Runner"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "${var.project_name}-neo4j-sg"
  }
}

# Security Group for RDS PostgreSQL
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = local.vpc_id

  # PostgreSQL from App Runner
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.apprunner_outbound.id]
    description     = "PostgreSQL from App Runner"
  }

  # PostgreSQL from anywhere (if publicly accessible)
  dynamic "ingress" {
    for_each = var.rds_publicly_accessible ? [1] : []
    content {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "PostgreSQL from internet (publicly accessible)"
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}


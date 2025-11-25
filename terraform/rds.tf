# ==============================================================================
# RDS POSTGRESQL DATABASE
# ==============================================================================

# DB Subnet Group (requires 2+ subnets in different AZs)
resource "aws_db_subnet_group" "main" {
  name = "${var.project_name}-db-subnet-group"
  subnet_ids = var.use_default_vpc ? data.aws_subnets.default[0].ids : [
    aws_subnet.private_a[0].id,
    aws_subnet.private_b[0].id,
    aws_subnet.private_c[0].id
  ]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgresql" {
  identifier     = "${var.project_name}-postgres"
  engine         = "postgres"
  engine_version = var.rds_engine_version
  instance_class = var.rds_instance_class

  # Storage configuration
  allocated_storage = var.rds_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  # Database configuration
  db_name  = var.rds_database_name
  username = var.rds_username
  password = var.rds_password

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = var.rds_publicly_accessible
  multi_az               = var.rds_multi_az

  # Backup configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]
  performance_insights_enabled    = true

  # Snapshot configuration
  skip_final_snapshot       = true
  final_snapshot_identifier = "${var.project_name}-postgres-final-snapshot"

  tags = {
    Name = "${var.project_name}-postgres"
  }
}


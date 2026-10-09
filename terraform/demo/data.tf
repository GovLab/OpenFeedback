# PostgreSQL (RDS) and Neo4j (EC2), both private. Only the App Runner VPC
# connector's security group can reach them.

resource "random_password" "postgres" {
  length           = 32
  override_special = "!#%^*-_=+"
}

resource "random_password" "neo4j" {
  length  = 32
  special = false
}

resource "aws_security_group" "app_connector" {
  name        = "${local.name}-app-connector"
  description = "App Runner VPC connector"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-app-connector" }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "PostgreSQL, reachable only from the app"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_connector.id]
    description     = "PostgreSQL from App Runner"
  }

  tags = { Name = "${local.name}-rds" }
}

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "postgres" {
  identifier     = "${local.name}-postgres"
  engine         = "postgres"
  engine_version = "17"
  instance_class = var.rds_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "openfeedback"
  username = "openfeedback"
  password = random_password.postgres.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period   = 7
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name}-postgres-final"
  deletion_protection       = false

  tags = { Name = "${local.name}-postgres" }
}

resource "aws_security_group" "neo4j" {
  name        = "${local.name}-neo4j"
  description = "Neo4j, reachable only from the app"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 7687
    to_port         = 7687
    protocol        = "tcp"
    security_groups = [aws_security_group.app_connector.id]
    description     = "Neo4j Bolt from App Runner"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-neo4j" }
}

resource "aws_instance" "neo4j" {
  ami                    = data.aws_ssm_parameter.al2023_x86.value
  instance_type          = var.neo4j_instance_type
  subnet_id              = aws_subnet.private[0].id
  vpc_security_group_ids = [aws_security_group.neo4j.id]
  iam_instance_profile   = aws_iam_instance_profile.ssm.name

  user_data = templatefile("${path.module}/user-data/neo4j.sh", {
    neo4j_password = random_password.neo4j.result
  })
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_tokens = "required"
  }

  tags = { Name = "${local.name}-neo4j" }

  # User data needs the NAT route to download Neo4j
  depends_on = [aws_route_table_association.private]

  lifecycle {
    ignore_changes = [ami]
  }
}

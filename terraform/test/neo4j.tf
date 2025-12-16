# Neo4j EC2 Instance
resource "aws_instance" "neo4j" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = var.ec2_instance_type
  key_name      = var.ec2_key_name

  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.neo4j.id]

  user_data = base64encode(templatefile("${path.module}/user-data/neo4j-install.sh", {
    neo4j_password = var.neo4j_password
  }))

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project_name}-neo4j"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_eip" "neo4j" {
  instance = aws_instance.neo4j.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-neo4j-eip"
  }
}

# Neo4j Security Group
resource "aws_security_group" "neo4j" {
  name        = "${var.project_name}-neo4j"
  description = "Security group for Neo4j on EC2"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.your_ip_address]
    description = "SSH from your IP"
  }

  ingress {
    from_port   = 7474
    to_port     = 7474
    protocol    = "tcp"
    cidr_blocks = [var.your_ip_address]
    description = "Neo4j Browser from your IP"
  }

  ingress {
    from_port   = 7687
    to_port     = 7687
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Neo4j Bolt (App Runner has dynamic IPs)"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-neo4j-sg"
  }
}

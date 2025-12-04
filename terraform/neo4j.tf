# ==============================================================================
# EC2 INSTANCE - NEO4J GRAPH DATABASE
# ==============================================================================

resource "aws_instance" "neo4j" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = var.ec2_instance_type
  key_name      = var.ec2_key_name

  subnet_id              = local.public_subnet_ids[0]
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

# Elastic IP for Neo4j (ensures static IP address)
resource "aws_eip" "neo4j" {
  instance = aws_instance.neo4j.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-neo4j-eip"
  }
}


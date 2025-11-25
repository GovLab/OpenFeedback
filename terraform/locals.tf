# ==============================================================================
# LOCAL VALUES
# ==============================================================================

locals {
  vpc_id = var.use_default_vpc ? data.aws_vpc.default[0].id : aws_vpc.main[0].id

  # Get default VPC subnets or create new ones
  public_subnet_ids = var.use_default_vpc ? data.aws_subnets.default[0].ids : [
    aws_subnet.public_a[0].id,
    aws_subnet.public_c[0].id
  ]

  private_subnet_ids = var.use_default_vpc ? [] : [
    aws_subnet.private_a[0].id,
    aws_subnet.private_b[0].id,
    aws_subnet.private_c[0].id
  ]
}


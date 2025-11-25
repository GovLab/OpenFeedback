# ==============================================================================
# NETWORK - VPC, SUBNETS, IGW, NAT GATEWAY
# ==============================================================================

# Create new VPC (if not using default)
resource "aws_vpc" "main" {
  count = var.use_default_vpc ? 0 : 1

  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  count = var.use_default_vpc ? 0 : 1

  vpc_id = aws_vpc.main[0].id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# ==============================================================================
# PUBLIC SUBNETS
# ==============================================================================

resource "aws_subnet" "public_a" {
  count = var.use_default_vpc ? 0 : 1

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, 0)
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-a"
  }
}

resource "aws_subnet" "public_c" {
  count = var.use_default_vpc ? 0 : 1

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, 2)
  availability_zone       = data.aws_availability_zones.available.names[2]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-c"
  }
}

# ==============================================================================
# PRIVATE SUBNETS
# ==============================================================================

resource "aws_subnet" "private_a" {
  count = var.use_default_vpc ? 0 : 1

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 128)
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "${var.project_name}-private-a"
  }
}

resource "aws_subnet" "private_b" {
  count = var.use_default_vpc ? 0 : 1

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 129)
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "${var.project_name}-private-b"
  }
}

resource "aws_subnet" "private_c" {
  count = var.use_default_vpc ? 0 : 1

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 130)
  availability_zone = data.aws_availability_zones.available.names[2]

  tags = {
    Name = "${var.project_name}-private-c"
  }
}

# ==============================================================================
# ROUTE TABLES - PUBLIC
# ==============================================================================

resource "aws_route_table" "public" {
  count = var.use_default_vpc ? 0 : 1

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public_a" {
  count = var.use_default_vpc ? 0 : 1

  subnet_id      = aws_subnet.public_a[0].id
  route_table_id = aws_route_table.public[0].id
}

resource "aws_route_table_association" "public_c" {
  count = var.use_default_vpc ? 0 : 1

  subnet_id      = aws_subnet.public_c[0].id
  route_table_id = aws_route_table.public[0].id
}

# ==============================================================================
# NAT GATEWAY (Optional - for VPC mode)
# ==============================================================================

resource "aws_eip" "nat" {
  count = var.enable_nat_gateway && !var.use_default_vpc ? 1 : 0

  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway && !var.use_default_vpc ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public_a[0].id

  tags = {
    Name = "${var.project_name}-nat-gateway"
  }

  depends_on = [aws_internet_gateway.main]
}

# ==============================================================================
# ROUTE TABLES - PRIVATE (with NAT Gateway)
# ==============================================================================

resource "aws_route_table" "private" {
  count = var.enable_nat_gateway && !var.use_default_vpc ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[0].id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "private_a" {
  count = var.enable_nat_gateway && !var.use_default_vpc ? 1 : 0

  subnet_id      = aws_subnet.private_a[0].id
  route_table_id = aws_route_table.private[0].id
}

resource "aws_route_table_association" "private_b" {
  count = var.enable_nat_gateway && !var.use_default_vpc ? 1 : 0

  subnet_id      = aws_subnet.private_b[0].id
  route_table_id = aws_route_table.private[0].id
}

resource "aws_route_table_association" "private_c" {
  count = var.enable_nat_gateway && !var.use_default_vpc ? 1 : 0

  subnet_id      = aws_subnet.private_c[0].id
  route_table_id = aws_route_table.private[0].id
}


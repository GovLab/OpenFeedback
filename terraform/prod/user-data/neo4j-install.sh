#!/bin/bash
#==============================================================================
# Neo4j Installation Script for Amazon Linux 2023
# This script installs and configures Neo4j Community Edition
#==============================================================================

set -e

# Update system
echo "Updating system packages..."
dnf update -y

# Install Java 17 (required for Neo4j 5.x)
echo "Installing Java 17..."
dnf install -y java-17-amazon-corretto

# Add Neo4j repository
echo "Adding Neo4j repository..."
rpm --import https://debian.neo4j.com/neotechnology.gpg.key

cat <<EOF > /etc/yum.repos.d/neo4j.repo
[neo4j]
name=Neo4j RPM Repository
baseurl=https://yum.neo4j.com/stable/5
enabled=1
gpgcheck=1
EOF

# Install Neo4j
echo "Installing Neo4j Community Edition..."
dnf install -y neo4j-5.15.0

# Configure Neo4j
echo "Configuring Neo4j..."
NEO4J_CONF="/etc/neo4j/neo4j.conf"

# Allow connections from any address
sed -i 's/#server.default_listen_address=0.0.0.0/server.default_listen_address=0.0.0.0/' $NEO4J_CONF

# Set initial password
echo "Setting Neo4j password..."
neo4j-admin dbms set-initial-password '${neo4j_password}'

# Enable Neo4j service
echo "Enabling and starting Neo4j service..."
systemctl enable neo4j
systemctl start neo4j

# Wait for Neo4j to start
echo "Waiting for Neo4j to start..."
sleep 30

# Check Neo4j status
systemctl status neo4j

# Create a marker file to indicate installation is complete
echo "Neo4j installation completed at $(date)" > /var/log/neo4j-install-complete.txt

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Neo4j Installation Completed Successfully!        ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Version: Neo4j 5.15.0                                     ║"
echo "║  Browser: http://<public-ip>:7474                          ║"
echo "║  Bolt:    bolt://<public-ip>:7687                          ║"
echo "║  Username: neo4j                                           ║"
echo "║  Password: Set via Terraform variable                      ║"
echo "║                                                            ║"
echo "║  Service commands:                                         ║"
echo "║    systemctl status neo4j                                  ║"
echo "║    systemctl restart neo4j                                 ║"
echo "║    journalctl -u neo4j -f  (view logs)                     ║"
echo "╚════════════════════════════════════════════════════════════╝"



#!/bin/bash
# Install Neo4j 5 LTS Community on Amazon Linux 2023
set -euo pipefail

# The NAT instance may still be booting; wait until outbound internet works
for _ in $(seq 1 60); do
  curl -sf --max-time 5 -o /dev/null https://yum.neo4j.com/ && break
  sleep 10
done

dnf install -y java-21-amazon-corretto-headless

cat > /etc/yum.repos.d/neo4j.repo <<'REPO'
[neo4j]
name=Neo4j RPM Repository
baseurl=https://yum.neo4j.com/stable/5
enabled=1
gpgcheck=1
gpgkey=https://debian.neo4j.com/neotechnology.gpg.key
REPO

NEO4J_ACCEPT_LICENSE_AGREEMENT=yes dnf install -y 'neo4j-5.26.*'

CONF=/etc/neo4j/neo4j.conf
sed -i 's/^#server.default_listen_address=0.0.0.0/server.default_listen_address=0.0.0.0/' "$CONF"
cat >> "$CONF" <<'MEM'
server.memory.heap.initial_size=512m
server.memory.heap.max_size=512m
server.memory.pagecache.size=256m
MEM

neo4j-admin dbms set-initial-password '${neo4j_password}'
systemctl enable --now neo4j
echo "Neo4j installed $(date)" > /var/log/neo4j-install-complete.txt

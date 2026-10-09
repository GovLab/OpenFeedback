#!/bin/bash
# Turn this instance into a NAT for the private subnets
set -euo pipefail

dnf install -y iptables-services
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/90-nat.conf
sysctl --system

IFACE=$(ip route show default | awk '{print $5; exit}')
iptables -t nat -A POSTROUTING -o "$IFACE" -j MASQUERADE
iptables -F FORWARD
service iptables save
systemctl enable --now iptables

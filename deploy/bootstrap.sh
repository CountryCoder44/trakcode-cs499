#!/bin/bash
# EC2 user data (Ubuntu 24.04): one-time server setup on first boot.
# Docker + Compose + Buildx, the AWS CLI, 2 GB swap, and the data directory.
# Deploys themselves come later through SSM (deploy/remote-deploy.sh); there is
# no SSH access to this server.
set -eux

# Swap: builds (npm ci, vite, tsc) and g++ compiles can spike past 2 GB of RAM.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

snap install aws-cli --classic

mkdir -p /srv/trakcode/mongo /srv/trakcode/releases
# The mongo image runs as uid 999.
chown 999:999 /srv/trakcode/mongo

# Security patches install themselves (Ubuntu default), reboot not automatic.
echo "bootstrap complete" > /srv/trakcode/BOOTSTRAPPED

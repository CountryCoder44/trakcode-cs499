#!/usr/bin/env bash
# Runs ON the server (sent via SSM Run Command). Pulls a release bundle and the
# production env file from the private deploy bucket, then (re)builds and starts
# the containers. Safe to re-run; each run is a new release directory.
#
#   bash remote-deploy.sh <bucket> [release-key]
set -euo pipefail

BUCKET="$1"
KEY="${2:-releases/latest.tar.gz}"
REGION="us-east-2"
ROOT="/srv/trakcode"

mkdir -p "$ROOT/releases" "$ROOT/mongo"

aws s3 cp "s3://$BUCKET/secrets/env.production" "$ROOT/env.production" --region "$REGION" --only-show-errors
chmod 600 "$ROOT/env.production"

REL="$ROOT/releases/$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$REL"
aws s3 cp "s3://$BUCKET/$KEY" - --region "$REGION" --only-show-errors | tar -xz -C "$REL"
ln -sfn "$REL" "$ROOT/current"

cd "$ROOT/current"
docker compose -f deploy/docker-compose.yml --env-file "$ROOT/env.production" up -d --build --remove-orphans
docker image prune -f >/dev/null
# Build cache grows by a few GB per release on a 20 GB disk; keep only recent layers.
docker builder prune -f --filter until=72h >/dev/null

# Keep the three newest releases.
ls -1dt "$ROOT"/releases/* | tail -n +4 | xargs -r rm -rf

docker compose -f deploy/docker-compose.yml --env-file "$ROOT/env.production" ps

#!/usr/bin/env bash
# One-command production deploy. Run from the repo root on your own machine
# (Git Bash on Windows is fine):
#
#   bash deploy/deploy.sh
#
# What it does:
#   1. Checks you're on release/staging with everything committed and pushed.
#   2. Packages that commit (git archive) and uploads it to the private deploy
#      bucket as releases/latest.tar.gz.
#   3. Tells the server (via SSM, no SSH) to verify the upload's checksum, run
#      deploy/remote-deploy.sh from that release, then deploy/healthcheck.sh.
#   4. Waits for it to finish and checks https://trakcode.com/health.
#
# Needs the AWS CLI with the "trakcode" profile (override with AWS_PROFILE).
# Skip the branch/clean/pushed checks with --force (not recommended).
set -euo pipefail

# CAPSTONE COPY: deploying from this copy is disabled. The bucket and instance
# above are placeholders, and this copy must never be pushed to AWS.
echo "deploy.sh is disabled in the capstone copy of TrakCode." >&2
exit 1

PROFILE="${AWS_PROFILE:-trakcode}"
REGION="us-east-2"
BUCKET="<deploy-bucket>"
INSTANCE="<instance-id>"
BRANCH="release/staging"
KEY="releases/latest.tar.gz"
SITE="https://trakcode.com"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

# Norton re-signs HTTPS traffic on this machine; trust its root as well.
if [ -f "$HOME/.aws/windows-trusted-roots.pem" ]; then
  export AWS_CA_BUNDLE="$HOME/.aws/windows-trusted-roots.pem"
  CURL_CA=(--cacert "$HOME/.aws/windows-trusted-roots.pem")
else
  CURL_CA=()
fi
aws_() { aws --profile "$PROFILE" --region "$REGION" "$@"; }
# The server's output contains non-ASCII characters (✓, emoji); without this the
# Windows AWS CLI crashes printing them ("'charmap' codec can't encode").
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8

cd "$(git rev-parse --show-toplevel)"

# ---- 1. what are we shipping? ----
if [ "$FORCE" -eq 0 ]; then
  current="$(git branch --show-current)"
  [ "$current" = "$BRANCH" ] || { echo "On '$current', not $BRANCH. Switch branches (or pass --force)."; exit 1; }
  [ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Uncommitted changes. Commit them first (or pass --force)."; exit 1; }
  git fetch -q origin "$BRANCH"
  [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH")" ] || { echo "HEAD isn't pushed to origin/$BRANCH. Push first (or pass --force)."; exit 1; }
fi
COMMIT="$(git rev-parse --short HEAD)"
echo "Deploying $COMMIT: $(git log -1 --format=%s)"

# ---- 2. package + upload ----
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git archive --format=tar.gz -o "$TMP/release.tar.gz" HEAD
SHA="$(sha256sum "$TMP/release.tar.gz" | cut -c1-64)"
echo "Uploading $(du -h "$TMP/release.tar.gz" | cut -f1) (sha256 ${SHA:0:12}...)"
# On this machine the CLI sometimes drops the last chunk of the upload and
# still exits 0 (Norton interferes with the HTTPS connection), leaving S3 with
# the previous release. So confirm via the object's sha256 metadata and retry.
UPLOADED_SHA=""
for attempt in 1 2 3; do
  aws_ s3 cp "$TMP/release.tar.gz" "s3://$BUCKET/$KEY" --only-show-errors --metadata "commit=$COMMIT,sha256=$SHA" || true
  UPLOADED_SHA="$(aws_ s3api head-object --bucket "$BUCKET" --key "$KEY" --query Metadata.sha256 --output text 2>/dev/null || true)"
  [ "$UPLOADED_SHA" = "$SHA" ] && break
  echo "Upload attempt $attempt didn't land in S3; retrying."
done
if [ "$UPLOADED_SHA" != "$SHA" ]; then
  echo "Upload failed 3 times: S3 has sha256 ${UPLOADED_SHA:0:12}..., expected ${SHA:0:12}... Nothing was deployed."
  exit 1
fi

# ---- 3. deploy on the server ----
# SSM runs these lines as one script under sh (not bash), so keep them plain.
REMOTE_LINES=(
  "set -e"
  "aws s3 cp s3://$BUCKET/$KEY /tmp/release.tar.gz --region $REGION --only-show-errors"
  "echo '$SHA  /tmp/release.tar.gz' | sha256sum -c -"
  "tar -xzOf /tmp/release.tar.gz deploy/remote-deploy.sh > /tmp/remote-deploy.sh"
  "rm -f /tmp/release.tar.gz"
  "bash /tmp/remote-deploy.sh $BUCKET $KEY"
  "bash /srv/trakcode/current/deploy/healthcheck.sh"
)
PARAMS="$(printf '%s\n' "${REMOTE_LINES[@]}" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const commands = s.split("\n").filter(Boolean);
    console.log(JSON.stringify({ commands, executionTimeout: ["3600"] }));
  });')"
CMD_ID="$(aws_ ssm send-command --instance-ids "$INSTANCE" --document-name AWS-RunShellScript \
  --comment "deploy $COMMIT" --timeout-seconds 3600 --parameters "$PARAMS" --query Command.CommandId --output text)"
echo "Server is building (SSM command $CMD_ID). This usually takes 5-10 minutes."

# ---- 4. wait + verify ----
STATUS="Pending"
for _ in $(seq 1 180); do
  sleep 10
  STATUS="$(aws_ ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query Status --output text 2>/dev/null || echo Pending)"
  case "$STATUS" in Pending|InProgress|Delayed) printf '.' ;; *) break ;; esac
done
echo
echo "--- server output (tail) ---"
aws_ ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query StandardOutputContent --output text | tail -n 30
if [ "$STATUS" != "Success" ]; then
  echo "--- server errors ---"
  aws_ ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE" --query StandardErrorContent --output text | tail -n 30
  echo "Deploy FAILED ($STATUS)."
  exit 1
fi

for _ in 1 2 3 4 5 6; do
  if curl -fsS "${CURL_CA[@]}" "$SITE/health" >/dev/null 2>&1; then
    echo "Deployed $COMMIT. $SITE/health is OK, build $(curl -fsS "${CURL_CA[@]}" "$SITE/version.json")."
    exit 0
  fi
  sleep 5
done
echo "Deploy finished on the server, but $SITE/health isn't answering yet. Check the site."
exit 1

#!/usr/bin/env bash
#
# Deploy the library-of-leng UI to AWS Amplify Hosting.
#
# This app is NOT git-connected in Amplify (see inf/amplify.tf) - there is
# no auto-build-on-push. Instead this script builds the Vite app locally,
# zips the output, and pushes it to Amplify via the AWS CLI's "manual
# deployment" flow:
#
#   1. vite build                              -> src/ui/dist
#   2. aws amplify create-deployment           -> jobId + a presigned S3 URL
#   3. curl --upload-file  (zip -> presigned URL)
#   4. aws amplify start-deployment            -> kicks off the deploy
#   5. poll `aws amplify get-job` until it succeeds or fails
#
# Requires: aws CLI (configured/logged in), node/npm, zip, curl, jq, terraform
# (terraform is only used to look up the Amplify app id automatically;
# pass --app-id to skip that).

set -euo pipefail

# ── Argument parsing ─────────────────────────────────────────────────
SKIP_BUILD=false
APP_ID="${AMPLIFY_APP_ID:-}"
BRANCH="${AMPLIFY_BRANCH:-main}"
REGION="${AWS_REGION:-us-east-1}"
POLL_TIMEOUT_SECONDS=300

usage() {
    cat <<'EOF'
Deploy the library-of-leng UI to AWS Amplify Hosting.

Usage:
  scripts/deploy-ui.sh                  build + deploy to the "main" branch
  scripts/deploy-ui.sh --skip-build     redeploy the existing src/ui/dist as-is
  scripts/deploy-ui.sh --branch main    override the Amplify branch
  scripts/deploy-ui.sh --app-id xxxxx   override the Amplify app id
  scripts/deploy-ui.sh --region us-east-1   override the AWS region

Requires: aws CLI (configured/logged in), node/npm, zip, curl, jq, terraform
(terraform is only used to look up the Amplify app id automatically;
pass --app-id to skip that).
EOF
    exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-build) SKIP_BUILD=true; shift ;;
        --app-id) APP_ID="$2"; shift 2 ;;
        --branch) BRANCH="$2"; shift 2 ;;
        --region) REGION="$2"; shift 2 ;;
        -h|--help) usage 0 ;;
        *) echo "Unknown argument: $1" >&2; usage 1 ;;
    esac
done

# ── Paths ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UI_DIR="$REPO_ROOT/src/ui"
INF_DIR="$REPO_ROOT/inf"
DIST_DIR="$UI_DIR/dist"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
die()  { printf '\033[1;31mError:\033[0m %s\n' "$1" >&2; exit 1; }

# ── Sanity checks ────────────────────────────────────────────────────
for cmd in aws zip curl jq npm; do
    command -v "$cmd" >/dev/null 2>&1 || die "'$cmd' is required but not found on PATH."
done

aws sts get-caller-identity >/dev/null 2>&1 \
    || die "AWS CLI is not authenticated. Run 'aws configure' or set up your credentials first."

# ── Resolve the Amplify app id ───────────────────────────────────────
if [[ -z "$APP_ID" ]]; then
    command -v terraform >/dev/null 2>&1 \
        || die "terraform not found; pass --app-id explicitly instead."

    log "Looking up Amplify app id from Terraform state (inf/amplify_app_id output)..."
    APP_ID="$(cd "$INF_DIR" && terraform output -raw amplify_app_id 2>/dev/null)" \
        || die "Couldn't read the amplify_app_id Terraform output. Pass --app-id <id> instead, or run 'terraform init' in inf/ first."
fi

[[ -n "$APP_ID" ]] || die "No Amplify app id resolved."

log "Deploying to Amplify app '$APP_ID', branch '$BRANCH' (region $REGION)"

# ── Build ────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == true ]]; then
    log "Skipping build (--skip-build); using existing $DIST_DIR"
    [[ -d "$DIST_DIR" ]] || die "$DIST_DIR does not exist. Run without --skip-build first."
else
    log "Installing dependencies and building the UI..."
    (cd "$UI_DIR" && npm install --no-audit --no-fund && npm run build)
fi

# ── Zip the build output ─────────────────────────────────────────────
# -u: generate a unique path without creating the file, so we can safely
# append a .zip suffix (zip itself will create the file).
ZIP_PATH="$(mktemp -u -t library-of-leng-ui-deploy).zip"
cleanup() { rm -f "$ZIP_PATH"; }
trap cleanup EXIT

log "Zipping $DIST_DIR..."
(cd "$DIST_DIR" && zip -rq "$ZIP_PATH" . -x ".*")

# ── Create the deployment and upload the zip ────────────────────────
log "Requesting a new deployment..."
DEPLOYMENT_JSON="$(aws amplify create-deployment \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --region "$REGION")"

JOB_ID="$(jq -r '.jobId' <<<"$DEPLOYMENT_JSON")"
UPLOAD_URL="$(jq -r '.zipUploadUrl' <<<"$DEPLOYMENT_JSON")"

[[ -n "$JOB_ID" && "$JOB_ID" != "null" ]] || die "create-deployment did not return a jobId."

log "Uploading build artifact (job $JOB_ID)..."
HTTP_STATUS="$(curl -s -o /dev/null -w '%{http_code}' -X PUT -T "$ZIP_PATH" "$UPLOAD_URL")"
[[ "$HTTP_STATUS" == "200" ]] || die "Upload failed with HTTP status $HTTP_STATUS."

log "Starting deployment..."
aws amplify start-deployment \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --job-id "$JOB_ID" \
    --region "$REGION" >/dev/null

# ── Poll for completion ──────────────────────────────────────────────
log "Waiting for the deployment to finish (timeout: ${POLL_TIMEOUT_SECONDS}s)..."
ELAPSED=0
STATUS="PENDING"

while [[ "$STATUS" != "SUCCEED" && "$STATUS" != "FAILED" ]]; do
    if (( ELAPSED >= POLL_TIMEOUT_SECONDS )); then
        die "Timed out after ${POLL_TIMEOUT_SECONDS}s waiting for job $JOB_ID. Check the Amplify console for status."
    fi

    sleep 5
    ELAPSED=$((ELAPSED + 5))

    STATUS="$(aws amplify get-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH" \
        --job-id "$JOB_ID" \
        --region "$REGION" \
        --query 'job.summary.status' \
        --output text)"

    echo "    [$ELAPSED s] status: $STATUS"
done

if [[ "$STATUS" == "FAILED" ]]; then
    die "Deployment job $JOB_ID failed. Check the Amplify console for logs."
fi

# ── Done ─────────────────────────────────────────────────────────────
DOMAIN="$(aws amplify get-app --app-id "$APP_ID" --region "$REGION" --query 'app.defaultDomain' --output text 2>/dev/null || true)"

log "Deployment succeeded!"
if [[ -n "$DOMAIN" && "$DOMAIN" != "None" ]]; then
    echo "    https://${BRANCH}.${DOMAIN}"
fi

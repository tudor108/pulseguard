#!/usr/bin/env bash
set -euo pipefail

# Required env vars:
#   GCP_PROJECT_ID
# Optional env vars:
#   GCP_REGION (default: us-central1)
#   CLOUD_RUN_SERVICE (default: pulseguard-app)
#   IMAGE_REPO (default: pulseguard)
#   IMAGE_TAG (default: latest)
#   CORS_ORIGIN (default: *)
#   API_BASE_URL (default: empty)
#   AI_AGENT_ENDPOINT (default: empty)
#   AI_AGENT_API_KEY (default: empty)
#   AI_AGENT_MODEL (default: empty)
#   CLOUD_RUN_MEMORY (default: 1Gi)
#   CLOUD_RUN_CPU (default: 1)
#   CLOUD_RUN_CONCURRENCY (default: 60)
#   CLOUD_RUN_MIN_INSTANCES (default: 0)
#   CLOUD_RUN_MAX_INSTANCES (default: 3)
#   CLOUD_RUN_TIMEOUT (default: 300)

if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  echo "Error: GCP_PROJECT_ID is required."
  exit 1
fi

GCP_REGION="${GCP_REGION:-us-central1}"
CLOUD_RUN_SERVICE="${CLOUD_RUN_SERVICE:-pulseguard-app}"
IMAGE_REPO="${IMAGE_REPO:-pulseguard}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CORS_ORIGIN="${CORS_ORIGIN:-*}"
USE_AI_SECRET="${USE_AI_SECRET:-false}"
CLOUD_RUN_MEMORY="${CLOUD_RUN_MEMORY:-1Gi}"
CLOUD_RUN_CPU="${CLOUD_RUN_CPU:-1}"
CLOUD_RUN_CONCURRENCY="${CLOUD_RUN_CONCURRENCY:-60}"
CLOUD_RUN_MIN_INSTANCES="${CLOUD_RUN_MIN_INSTANCES:-0}"
CLOUD_RUN_MAX_INSTANCES="${CLOUD_RUN_MAX_INSTANCES:-3}"
CLOUD_RUN_TIMEOUT="${CLOUD_RUN_TIMEOUT:-300}"

IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${IMAGE_REPO}/${CLOUD_RUN_SERVICE}:${IMAGE_TAG}"

echo "Using image: ${IMAGE_URI}"

gcloud config set project "${GCP_PROJECT_ID}"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

if ! gcloud artifacts repositories describe "${IMAGE_REPO}" --location="${GCP_REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${IMAGE_REPO}" \
    --repository-format=docker \
    --location="${GCP_REGION}" \
    --description="Docker repository for PulseGuard"
fi

gcloud builds submit --tag "${IMAGE_URI}" .

DEPLOY_ARGS=(
  run deploy "${CLOUD_RUN_SERVICE}"
  --image "${IMAGE_URI}"
  --region "${GCP_REGION}"
  --platform managed
  --allow-unauthenticated
  --port 8080
  --memory "${CLOUD_RUN_MEMORY}"
  --cpu "${CLOUD_RUN_CPU}"
  --concurrency "${CLOUD_RUN_CONCURRENCY}"
  --min-instances "${CLOUD_RUN_MIN_INSTANCES}"
  --max-instances "${CLOUD_RUN_MAX_INSTANCES}"
  --timeout "${CLOUD_RUN_TIMEOUT}"
  --cpu-boost
  --set-env-vars "NODE_ENV=production,CORS_ORIGIN=${CORS_ORIGIN},API_BASE_URL=${API_BASE_URL:-},AI_AGENT_ENDPOINT=${AI_AGENT_ENDPOINT:-},AI_AGENT_MODEL=${AI_AGENT_MODEL:-}"
)

if [[ "${USE_AI_SECRET}" == "true" ]]; then
  DEPLOY_ARGS+=(--set-secrets "AI_AGENT_API_KEY=AI_AGENT_API_KEY:latest")
fi

gcloud "${DEPLOY_ARGS[@]}"

SERVICE_URL="$(gcloud run services describe "${CLOUD_RUN_SERVICE}" --region "${GCP_REGION}" --format='value(status.url)')"
echo ""
echo "Deployment complete."
echo "Live URL: ${SERVICE_URL}"
echo "Health URL: ${SERVICE_URL}/health"

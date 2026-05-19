param(
  [string]$ProjectId = "project-73d1e32a-8e68-4750-93c",
  [string]$Region = "us-central1",
  [string]$Repository = "pulseguard",
  [string]$Service = "pulseguard-app",
  [string]$Tag = "",
  [string]$CorsOrigin = "*",
  [string]$ApiBaseUrl = "",
  [string]$AiAgentEndpoint = "https://cbai127-resource.services.ai.azure.com/openai/v1/",
  [string]$AiAgentModel = "Llama-4-Maverick-17B-128E-Instruct-FP8",
  [string]$AiAgentSecretName = "AI_AGENT_API_KEY"
)

$ErrorActionPreference = "Stop"

if (-not $Tag) {
  $Tag = (git rev-parse --short HEAD).Trim()
}

$image = "$Region-docker.pkg.dev/$ProjectId/$Repository/$Service:$Tag"

Write-Host "Using image: $image"

gcloud config set project $ProjectId
gcloud auth configure-docker "$Region-docker.pkg.dev"

docker build -t $image .
docker push $image

gcloud run deploy $Service `
  --image $image `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 2Gi `
  --cpu 2 `
  --concurrency 50 `
  --min-instances 0 `
  --max-instances 2 `
  --timeout 300 `
  --cpu-boost `
  --set-env-vars "NODE_ENV=production,CORS_ORIGIN=$CorsOrigin,API_BASE_URL=$ApiBaseUrl,AI_AGENT_ENDPOINT=$AiAgentEndpoint,AI_AGENT_MODEL=$AiAgentModel" `
  --set-secrets "AI_AGENT_API_KEY=$AiAgentSecretName`:latest"

gcloud run services describe $Service --region $Region --format="value(status.url)"

param(
  [string]$ProjectId = "project-73d1e32a-8e68-4750-93c",
  [string]$Region = "us-central1",
  [string]$Repository = "pulseguard",
  [string]$Dataset = "pulseguard_ops"
)

$ErrorActionPreference = "Stop"

gcloud config set project $ProjectId

gcloud services enable `
  artifactregistry.googleapis.com `
  pubsub.googleapis.com `
  bigquery.googleapis.com `
  aiplatform.googleapis.com `
  container.googleapis.com `
  cloudbuild.googleapis.com `
  iamcredentials.googleapis.com

if (-not (gcloud artifacts repositories describe $Repository --location=$Region 2>$null)) {
  gcloud artifacts repositories create $Repository `
    --repository-format=docker `
    --location=$Region `
    --description="PulseGuard AI platform containers"
}

$topics = @(
  "pulseguard.telemetry.v1",
  "pulseguard.predictions.v1",
  "pulseguard.alerts.v1",
  "pulseguard.interventions.v1"
)

foreach ($topic in $topics) {
  if (-not (gcloud pubsub topics describe $topic 2>$null)) {
    gcloud pubsub topics create $topic
  }
}

if (-not (gcloud pubsub subscriptions describe "pulseguard.telemetry.gateway.v1" 2>$null)) {
  gcloud pubsub subscriptions create "pulseguard.telemetry.gateway.v1" `
    --topic "pulseguard.telemetry.v1" `
    --ack-deadline 30 `
    --message-retention-duration 7d
}

if (-not (bq --location=$Region show --dataset "$ProjectId`:$Dataset" 2>$null)) {
  bq --location=$Region mk --dataset "$ProjectId`:$Dataset"
}

Write-Host "PulseGuard platform base resources are ready."


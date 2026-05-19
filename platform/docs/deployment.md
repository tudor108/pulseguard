# Deployment Strategy

## One-Time Setup

```powershell
powershell -ExecutionPolicy Bypass -File .\platform\infra\setup-gcp-platform.ps1
bq query --use_legacy_sql=false < .\platform\infra\bigquery-ddl.sql
```

Create a GKE Autopilot cluster:

```powershell
gcloud container clusters create-auto pulseguard-autopilot `
  --region us-central1 `
  --release-channel regular
```

Configure Workload Identity IAM bindings for the Kubernetes service accounts:

```powershell
gcloud iam service-accounts create pulseguard-telemetry
gcloud iam service-accounts create pulseguard-gateway
gcloud iam service-accounts create pulseguard-ml

gcloud projects add-iam-policy-binding project-73d1e32a-8e68-4750-93c `
  --member="serviceAccount:pulseguard-telemetry@project-73d1e32a-8e68-4750-93c.iam.gserviceaccount.com" `
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding project-73d1e32a-8e68-4750-93c `
  --member="serviceAccount:pulseguard-gateway@project-73d1e32a-8e68-4750-93c.iam.gserviceaccount.com" `
  --role="roles/pubsub.subscriber"
```

## Build And Deploy Platform Services

```powershell
gcloud builds submit --config .\platform\cloudbuild\cloudbuild-platform.yaml .
```

For faster iteration, build locally:

```powershell
$PROJECT_ID="project-73d1e32a-8e68-4750-93c"
$REGION="us-central1"
$REPO="pulseguard"
$TAG=(git rev-parse --short HEAD).Trim()

docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/telemetry-generator:$TAG" .\platform\services\telemetry-generator
docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/realtime-gateway:$TAG" .\platform\services\realtime-gateway
docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/ml-inference:$TAG" .\platform\services\ml-inference

docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/telemetry-generator:$TAG"
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/realtime-gateway:$TAG"
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/ml-inference:$TAG"
```

Update image tags in Kubernetes or use `latest` for hackathon/demo iteration:

```powershell
kubectl apply -k .\platform\k8s
```

## Scaling Strategy

- `telemetry-generator`: scale staff count before replicas. Multiple replicas can simulate separate hospitals if seeded differently.
- `realtime-gateway`: scale by WebSocket connections and Pub/Sub backlog. Use Redis for fanout once replicas exceed one active UI stream node.
- `ml-inference`: scale by CPU and latency. Keep p95 under 250 ms for online inference.
- Pub/Sub: use dead-letter topics for malformed events.
- BigQuery: partition by event date and cluster by department/staff_id to control query cost.

## Production Hardening

- Use Binary Authorization for signed images.
- Use private GKE nodes and private service connect where possible.
- Add Cloud Armor in front of public gateway endpoints.
- Move staff identity mapping outside analytics datasets.
- Add DLP checks and retention policies.
- Add model cards and review gates before promotion.
- Add alert fatigue monitoring so the system does not overload coordinators.

## Shadow And Canary Serving

Apply shadow serving for a candidate model:

```powershell
kubectl apply -f .\platform\k8s\ml-inference-shadow.yaml
```

The gateway can mirror requests to `http://ml-inference-shadow:8091` and log candidate predictions without showing them in the UI.

Apply canary serving:

```powershell
kubectl apply -f .\platform\k8s\ml-inference-canary.yaml
```

For precise traffic splitting, use Istio, Gateway API, or a gateway-level routing policy. Plain Kubernetes Services are not sufficient for weighted traffic by themselves.

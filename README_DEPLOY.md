# Google Cloud Run Deployment (Low Cost + Future AI Ready)

## 1) What this project is (auto-detected)
- Frontend: React 19 + TanStack Router/Start + Vite
- Backend: TanStack Start server runtime (SSR + server handlers)
- Build output: `dist/client` + `dist/server`
- Runtime model for Cloud Run: single Node container (SSR + API in one service)

This is the cheapest safe option right now and avoids overengineering.

## 2) Why single container now
- You currently have mostly frontend and small backend.
- One Cloud Run service keeps deploys simple and cheap.
- Cloud Run scales to zero when idle.
- Later, AI-agent services can be added with minimal change (new env vars + optional separate worker service).

## 3) Files added for deployment
- `Dockerfile`
- `.dockerignore`
- `.env.example`
- `deploy.sh`
- `cloudbuild.yaml`
- `scripts/cloud-run-server.mjs`
- `scripts/generate-qr.sh`

Also updated:
- `src/server.ts` with:
  - `/health` endpoint
  - optional CORS headers via `CORS_ORIGIN`
  - `OPTIONS` preflight handling
- `package.json` with start/deploy scripts

## 4) Environment variables
Use env vars, not hardcoded values:
- `PORT` (Cloud Run provides this automatically)
- `CORS_ORIGIN` (example: `*` or your domain)
- `API_BASE_URL`
- `AI_AGENT_ENDPOINT`
- `AI_AGENT_MODEL`
- `AI_AGENT_API_KEY` (recommended from Secret Manager)

Copy example:
```bash
cp .env.example .env
```

## 5) One-time Google Cloud setup
Replace placeholders:
- `YOUR_PROJECT_ID`
- `us-central1` if needed

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud auth configure-docker us-central1-docker.pkg.dev

gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

gcloud artifacts repositories create pulseguard \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repo for PulseGuard"
```

Optional (future AI key):
```bash
echo -n "YOUR_AI_KEY" | gcloud secrets create AI_AGENT_API_KEY --data-file=-
# If secret already exists:
# echo -n "YOUR_AI_KEY" | gcloud secrets versions add AI_AGENT_API_KEY --data-file=-
```

## 6) Deploy command (automated)
```bash
export GCP_PROJECT_ID=YOUR_PROJECT_ID
export GCP_REGION=us-central1
export CLOUD_RUN_SERVICE=pulseguard-app
export IMAGE_REPO=pulseguard
export IMAGE_TAG=latest
export CORS_ORIGIN="*"
export API_BASE_URL=""
export AI_AGENT_ENDPOINT=""
export AI_AGENT_MODEL=""
export USE_AI_SECRET=false

bash ./deploy.sh
```

If you want to inject `AI_AGENT_API_KEY` from Secret Manager:
```bash
export USE_AI_SECRET=true
bash ./deploy.sh
```

## 7) Manual deploy commands (exact sequence)
```bash
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/pulseguard/pulseguard-app:latest .

gcloud run deploy pulseguard-app \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/pulseguard/pulseguard-app:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars NODE_ENV=production,CORS_ORIGIN=*,API_BASE_URL=,AI_AGENT_ENDPOINT=,AI_AGENT_MODEL=
```

Get public URL:
```bash
gcloud run services describe pulseguard-app \
  --region us-central1 \
  --format='value(status.url)'
```

Health check:
```bash
curl "$(gcloud run services describe pulseguard-app --region us-central1 --format='value(status.url)')/health"
```

## 8) QR code generation for sharing
After you have the live URL:
```bash
bash ./scripts/generate-qr.sh "https://YOUR_CLOUD_RUN_URL" qrcode.png
```

If `qrencode` is missing, install first:
- Ubuntu/Debian: `sudo apt-get install qrencode`
- macOS: `brew install qrencode`
- Windows: `winget install qrencode.qrencode`

## 9) Future redeploy flow (when adding AI agents/backend)
For every new push:
1. Commit and push code.
2. Re-run:
   ```bash
   export GCP_PROJECT_ID=YOUR_PROJECT_ID
   bash ./deploy.sh
   ```
3. If new env vars are needed, add them in `deploy.sh` (`--set-env-vars`).
4. If new secrets are needed, create in Secret Manager and set `USE_AI_SECRET=true`.

No architecture rewrite is required for your next AI features.

## 10) Cost-minimizing settings already used
- Cloud Run `min-instances=0` (scale to zero)
- Single service/container
- Small baseline resources (`1 vCPU`, `512Mi`)
- No always-on VM
- No managed DB/proxy added by default

## 11) Security notes
- Keep secrets in Secret Manager, not in repo.
- Restrict `CORS_ORIGIN` to your domain in production when possible.
- Keep Cloud Run public only if needed (`--allow-unauthenticated` is currently enabled for app sharing).


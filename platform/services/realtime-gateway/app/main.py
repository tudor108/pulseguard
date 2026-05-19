from __future__ import annotations

import base64
import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import pubsub_v1
from pydantic import BaseModel


class PubSubMessage(BaseModel):
    message: dict[str, Any]
    subscription: str | None = None


class ConnectionManager:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active.discard(websocket)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for websocket in self.active:
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)


app = FastAPI(title="PulseGuard Realtime Gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()
latest_by_staff: dict[str, dict[str, Any]] = {}
latest_predictions: dict[str, dict[str, Any]] = {}
alerts: list[dict[str, Any]] = []
ml_url = os.getenv("ML_INFERENCE_URL", "http://ml-inference:8091").rstrip("/")
shadow_ml_url = os.getenv("SHADOW_ML_INFERENCE_URL", "").rstrip("/")
redis_url = os.getenv("REDIS_URL", "").strip()
http_client = httpx.AsyncClient(timeout=8)
redis_client: redis.Redis | None = None
subscriber_client: pubsub_v1.SubscriberClient | None = None
subscriber_future = None


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "realtime-gateway",
        "connections": len(manager.active),
        "staff_tracked": len(latest_by_staff),
    }


@app.on_event("startup")
async def startup() -> None:
    global redis_client
    if redis_url:
        redis_client = redis.from_url(redis_url, decode_responses=True)

    subscription = os.getenv("PUBSUB_SUBSCRIPTION", "").strip()
    if not subscription:
        return

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
    subscription_path = subscription if subscription.startswith("projects/") else f"projects/{project_id}/subscriptions/{subscription}"
    loop = asyncio.get_running_loop()

    def callback(message) -> None:
        try:
            event = json.loads(message.data.decode("utf-8"))
            future = asyncio.run_coroutine_threadsafe(process_event(event), loop)
            future.result(timeout=20)
            message.ack()
        except Exception:
            message.nack()

    global subscriber_client, subscriber_future
    subscriber_client = pubsub_v1.SubscriberClient()
    subscriber_future = subscriber_client.subscribe(subscription_path, callback=callback)


@app.on_event("shutdown")
async def shutdown() -> None:
    if subscriber_future:
        subscriber_future.cancel()
    if subscriber_client:
        subscriber_client.close()
    if redis_client:
        await redis_client.aclose()
    await http_client.aclose()


@app.post("/v1/telemetry")
async def receive_telemetry(event: dict[str, Any]) -> dict[str, Any]:
    return await process_event(event)


@app.post("/v1/pubsub/telemetry")
async def receive_pubsub_telemetry(payload: PubSubMessage) -> dict[str, Any]:
    data = payload.message.get("data")
    if not data:
        raise HTTPException(status_code=400, detail="Missing Pub/Sub message.data")
    event = json.loads(base64.b64decode(data).decode("utf-8"))
    result = await process_event(event)
    return {"ok": True, "result": result}


@app.get("/v1/staff/latest")
def staff_latest() -> list[dict[str, Any]]:
    return list(latest_by_staff.values())


@app.get("/v1/departments/heatmap")
def departments_heatmap() -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in latest_by_staff.values():
        grouped.setdefault(item["telemetry"]["department"], []).append(item)

    heatmap = []
    for department, rows in grouped.items():
        signals = [row["telemetry"]["signals"] for row in rows]
        predictions = [row.get("prediction", {}) for row in rows]
        heatmap.append(
            {
                "department": department,
                "staff_count": len(rows),
                "avg_burnout_probability": round(avg([p.get("burnout_probability", 0) for p in predictions]), 4),
                "avg_fatigue_index": round(avg([s["fatigue_index"] for s in signals]), 1),
                "avg_stress_index": round(avg([s["stress_index"] for s in signals]), 1),
                "avg_patient_pressure_index": round(avg([s["patient_pressure_index"] for s in signals]), 1),
                "critical_count": sum(1 for p in predictions if p.get("risk_level") == "critical"),
            }
        )
    return sorted(heatmap, key=lambda row: row["avg_burnout_probability"], reverse=True)


@app.get("/v1/alerts")
def list_alerts() -> list[dict[str, Any]]:
    return alerts[-100:][::-1]


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "snapshot", "staff": list(latest_by_staff.values()), "alerts": alerts[-50:]})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def process_event(event: dict[str, Any]) -> dict[str, Any]:
    staff_id = event.get("staff_id")
    if not staff_id:
        raise HTTPException(status_code=400, detail="Missing staff_id")

    prediction = await predict(event)
    await mirror_shadow_prediction(event)
    envelope = {"type": "telemetry.prediction", "telemetry": event, "prediction": prediction}
    latest_by_staff[staff_id] = envelope
    latest_predictions[staff_id] = prediction
    await cache_latest_state(staff_id, envelope)

    alert = maybe_alert(event, prediction)
    if alert:
        alerts.append(alert)
        envelope["alert"] = alert

    await manager.broadcast(envelope)
    return {"ok": True, "staff_id": staff_id, "risk_level": prediction.get("risk_level")}


async def cache_latest_state(staff_id: str, envelope: dict[str, Any]) -> None:
    if not redis_client:
        return
    encoded = json.dumps(envelope)
    await redis_client.set(f"pulseguard:staff:{staff_id}", encoded, ex=3600)
    await redis_client.publish("pulseguard.telemetry", encoded)


async def mirror_shadow_prediction(event: dict[str, Any]) -> None:
    if not shadow_ml_url:
        return
    try:
        response = await http_client.post(f"{shadow_ml_url}/v1/predict/burnout", json={"telemetry": event, "history": []})
        response.raise_for_status()
        shadow_payload = {
            "type": "shadow.prediction",
            "staff_id": event.get("staff_id"),
            "champion_url": ml_url,
            "shadow_url": shadow_ml_url,
            "prediction": response.json(),
        }
        if redis_client:
            await redis_client.publish("pulseguard.shadow_predictions", json.dumps(shadow_payload))
    except Exception:
        return


async def predict(event: dict[str, Any]) -> dict[str, Any]:
    try:
        response = await http_client.post(f"{ml_url}/v1/predict/burnout", json={"telemetry": event, "history": []})
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        signals = event.get("signals", {})
        probability = min(
            0.98,
            max(
                0.02,
                signals.get("burnout_probability", 0.35)
                + signals.get("fatigue_index", 0) / 1000
                + signals.get("sleep_debt_hours", 0) / 100,
            ),
        )
        return {
            "staff_id": event.get("staff_id"),
            "department": event.get("department"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model_version": f"gateway-fallback:{type(exc).__name__}",
            "burnout_probability": round(probability, 4),
            "fatigue_forecast_6h": signals.get("fatigue_index", 0),
            "fatigue_forecast_24h": min(100, signals.get("fatigue_index", 0) + 8),
            "workload_forecast_24h": signals.get("patient_pressure_index", 0),
            "anomaly_score": 0.0,
            "is_anomaly": event.get("operational_context", {}).get("anomaly_type") is not None,
            "risk_level": "critical" if probability >= 0.82 else "high" if probability >= 0.64 else "moderate" if probability >= 0.42 else "low",
            "top_drivers": [],
            "recommendations": [],
        }


def maybe_alert(event: dict[str, Any], prediction: dict[str, Any]) -> dict[str, Any] | None:
    risk_level = prediction.get("risk_level")
    anomaly_type = event.get("operational_context", {}).get("anomaly_type")
    if risk_level not in {"high", "critical"} and not anomaly_type:
        return None

    return {
        "alert_id": f"alert_{event.get('event_id')}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "staff_id": event.get("staff_id"),
        "department": event.get("department"),
        "severity": "critical" if risk_level == "critical" or anomaly_type else "warning",
        "title": "Burnout risk escalation" if not anomaly_type else f"Telemetry anomaly: {anomaly_type}",
        "risk_level": risk_level,
        "burnout_probability": prediction.get("burnout_probability"),
        "primary_driver": prediction.get("top_drivers", [{}])[0].get("name") if prediction.get("top_drivers") else anomaly_type,
    }


def avg(values: list[float]) -> float:
    clean = [float(value) for value in values if value is not None]
    if not clean:
        return 0.0
    return sum(clean) / len(clean)

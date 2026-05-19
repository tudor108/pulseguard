from __future__ import annotations

import json
import os
from typing import Protocol

import httpx
from google.cloud import pubsub_v1

from .schemas import TelemetryEvent


class Publisher(Protocol):
    async def publish(self, event: TelemetryEvent) -> None:
        ...


class StdoutPublisher:
    async def publish(self, event: TelemetryEvent) -> None:
        print(event.model_dump_json())


class HttpPublisher:
    def __init__(self, url: str) -> None:
        self.url = url
        self.client = httpx.AsyncClient(timeout=10)

    async def publish(self, event: TelemetryEvent) -> None:
        response = await self.client.post(self.url, json=json.loads(event.model_dump_json()))
        response.raise_for_status()


class PubSubPublisher:
    def __init__(self, topic_path: str | None = None) -> None:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "")
        topic_name = os.getenv("PUBSUB_TOPIC", "pulseguard.telemetry.v1")
        self.topic_path = topic_path or (
            topic_name if topic_name.startswith("projects/") else f"projects/{project_id}/topics/{topic_name}"
        )
        self.publisher = pubsub_v1.PublisherClient()

    async def publish(self, event: TelemetryEvent) -> None:
        data = event.model_dump_json().encode("utf-8")
        future = self.publisher.publish(
            self.topic_path,
            data,
            department=event.department,
            role=event.role,
            event_version=event.event_version,
        )
        future.result(timeout=30)


def build_publisher(sink: str, http_url: str | None = None) -> Publisher:
    if sink == "stdout":
        return StdoutPublisher()
    if sink == "http":
        if not http_url:
            raise ValueError("--http-url is required when --sink http")
        return HttpPublisher(http_url)
    if sink == "pubsub":
        return PubSubPublisher()
    raise ValueError(f"Unsupported sink: {sink}")


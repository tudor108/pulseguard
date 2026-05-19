from __future__ import annotations

import argparse
import asyncio
import os
from datetime import datetime, timezone

from .digital_twin import build_staff_roster
from .publishers import build_publisher
from .simulation_engine import HospitalSimulationEngine


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PulseGuard synthetic wearable telemetry generator")
    parser.add_argument("--sink", choices=["stdout", "http", "pubsub"], default=os.getenv("SINK", "stdout"))
    parser.add_argument("--http-url", default=os.getenv("HTTP_URL"))
    parser.add_argument("--interval-seconds", type=float, default=float(os.getenv("INTERVAL_SECONDS", "2")))
    parser.add_argument("--staff-per-department", type=int, default=int(os.getenv("STAFF_PER_DEPARTMENT", "16")))
    parser.add_argument("--load-intensity", type=float, default=float(os.getenv("LOAD_INTENSITY", "0.82")))
    parser.add_argument("--seed", type=int, default=int(os.getenv("SIM_SEED", "42")))
    parser.add_argument("--max-events", type=int, default=int(os.getenv("MAX_EVENTS", "0")))
    return parser.parse_args()


async def run() -> None:
    args = parse_args()
    publisher = build_publisher(args.sink, args.http_url)
    roster = build_staff_roster(args.staff_per_department, seed=args.seed)
    engine = HospitalSimulationEngine(roster, seed=args.seed)
    emitted = 0

    print(
        f"PulseGuard telemetry generator started: staff={len(roster)} sink={args.sink} interval={args.interval_seconds}s",
        flush=True,
    )

    while True:
        now = datetime.now(timezone.utc)
        events = engine.step(now, args.load_intensity)
        tasks = [publisher.publish(event) for event in events]
        await asyncio.gather(*tasks)
        emitted += len(events)
        if args.max_events and emitted >= args.max_events:
            break
        await asyncio.sleep(args.interval_seconds)


if __name__ == "__main__":
    asyncio.run(run())

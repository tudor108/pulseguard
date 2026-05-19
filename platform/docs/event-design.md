# Event Design

## Kafka-Style Envelope

Pub/Sub messages should follow a stable envelope:

```json
{
  "event_id": "evt_...",
  "event_type": "pulseguard.telemetry.recorded",
  "event_version": "1.0",
  "occurred_at": "2026-05-18T12:15:00Z",
  "producer": "telemetry-generator",
  "correlation_id": "shift_staff_icu_007_20260518_day",
  "partition_key": "staff_icu_007",
  "payload": {}
}
```

## Partitioning

- staff-level streams partition by `staff_id`.
- department aggregate streams partition by `department`.
- intervention and alert streams partition by `department` to preserve escalation order.

## Compatibility

- Additive fields only within a version.
- Breaking changes require a new topic suffix, such as `.v2`.
- Consumers must ignore unknown fields.
- Store raw event JSON for replay and backfills.

## Dead Letter Handling

Malformed events go to:

- `pulseguard.telemetry.deadletter.v1`
- `pulseguard.predictions.deadletter.v1`
- `pulseguard.alerts.deadletter.v1`

Dead-letter events should include parse error, schema version, producer, and original payload hash.


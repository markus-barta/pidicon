# BACKLOG-045: Per-Device MQTT Override

**Status**: Not Started | **Priority**: P1 (Important)
**Effort**: 6-8 hours | **Risk**: Medium (security, UI complexity)

## Goal

- Depends on global MQTT secrets store (Build #772).
- Required for mixed-environment setups (multiple brokers, custom auth).
- Must ensure per-device overrides remain encrypted at rest.

## Tasks

1. Extend device schema/config UI to capture optional MQTT overrides (host/port/credentials/TLS).
2. Persist overrides securely (reuse secrets store or per-device envelope).
3. Update `MqttService` and device adapter to use override when present.
4. Provide merge strategy and validation in Web UI + API.
5. Document fallback rules (device override → global → defaults).
6. Add tests (unit & Playwright) covering override set/reset flows.
   **Related**: BACKLOG-021 (Multi-broker support), Build #772 (Global MQTT settings).

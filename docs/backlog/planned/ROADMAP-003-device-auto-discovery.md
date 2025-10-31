# ROADMAP-003: Device Auto-Discovery

**Status**: Not Started | **Priority**: P2 (Nice to Have)
**Effort**: 5-8 hours | **Risk**: Medium (network scanning)

## User Story

As a user, I want devices to be automatically discovered on my network, so that I don't have to manually enter IP addresses and device information.

## Goal

Automatically detect pixel displays on the network
**Features**:

- Pixoo device discovery (mDNS/SSDP)
- AWTRIX device discovery (MQTT broker scan)
- Network scanner for unknown devices
- "Add Discovered Device" button in Web UI
- Auto-detect device type and capabilities

## Tasks

1. Implement mDNS scanner for Pixoo
2. Implement MQTT discovery for AWTRIX
3. Create discovery service (`lib/services/discovery-service.js`)
4. Add REST API endpoint `/api/devices/discover`
5. Add "Discover Devices" button to Web UI
6. Show discovered devices in modal with "Add" button
   **Security**:

- Only scan local network (192.168.x.x, 10.x.x.x)
- User must manually approve before adding device
- No automatic configuration changes

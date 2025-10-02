# Scripts Directory

## Utility scripts for testing, building, and deployment

---

## 📋 Scripts Index

### **Build & Version Management**

- **`build-version.js`** - Generates `version.json` with build metadata
  - Reads `package.json` for SemVer
  - Counts Git commits for build number
  - Extracts Git commit hash and branch
  - Creates timestamped build metadata

### **Deployment**

- **`deploy-server.sh`** - Server deployment script
  - Deploys to production server
  - Requires POSIX-compliant bash

### **Test Harnesses**

- **`test_harness.fish`** - Fish shell test runner for local development
- **`test_multi_device.fish`** - Multi-device testing script

### **Live Testing Scripts**

- **`live_test_draw_animated.js`** - Tests animated drawing on real device
- **`live_test_gate.js`** - Gating mechanism for live tests
- **`live_test_harness.js`** - Live test orchestration
- **`live_test_perf_once.js`** - Single performance test run
- **`live_test_perf_repeat.js`** - Repeated performance tests
- **`live_test_perf_restart.js`** - Performance tests with daemon restart

### **Component Tests**

- **`test_config_validator.js`** - Config validation tests
- **`test_graphics_engine.js`** - Graphics engine tests
- **`test_power_price.js`** - Power price scene tests
- **`test_scene_framework.js`** - Scene framework tests
- **`test_scenes_smoke.js`** - Smoke tests for all scenes
- **`test_scheduler.js`** - Scheduler tests
- **`test_unified_api.js`** - Unified API tests

---

## 🎯 Usage

### **Building Version Metadata**

```bash
# Generate version.json
node scripts/build-version.js

# Automatically run before commits (via git hooks)
npm run build:version
```

### **Running Tests**

```bash
# Smoke test all scenes
node scripts/test_scenes_smoke.js

# Test specific components
node scripts/test_graphics_engine.js
node scripts/test_config_validator.js

# Live tests (requires real device)
node scripts/live_test_perf_once.js
```

### **Deployment**

```bash
# Deploy to server
bash scripts/deploy-server.sh

# Note: Requires proper SSH keys and permissions
```

---

## 🐟 Shell Standards

### **Server Scripts** (`.sh`)

- **Shebang**: `#!/usr/bin/env bash`
- **POSIX-compliant**: For NixOS server compatibility
- **Location**: `scripts/*.sh`

### **Interactive Scripts** (`.fish`)

- **Shebang**: `#!/usr/bin/env fish`
- **Local development**: Preferred for dev machines
- **Fallback**: Use bash if fish unavailable

---

## 🧪 Testing Workflow

### **Local Testing**

```bash
# 1. Use mock driver (fast, no conflicts)
DRIVER=mock node daemon.js

# 2. Run smoke tests
node scripts/test_scenes_smoke.js

# 3. Test specific scenes
node scripts/test_power_price.js
```

### **Live Testing**

```bash
# 1. Deploy to server
git push origin main

# 2. Wait for Watchtower deployment

# 3. Verify build matches
# Check /home/pixoo/<ip>/scene/state for buildNumber

# 4. Run live tests
node scripts/live_test_perf_once.js

# 5. Record results in docs/BACKLOG.md
```

See [../STANDARDS.md](../STANDARDS.md#testing-protocol) for complete protocol.

---

## 📚 Script Categories

### **Build Scripts**

- Generate version metadata
- Pre-commit automation
- CI/CD integration

### **Test Scripts**

- **Unit**: Component-level tests
- **Smoke**: Quick validation of all scenes
- **Live**: Real device testing
- **Performance**: Frametime and rendering benchmarks

### **Deployment Scripts**

- Server deployment
- Docker build helpers
- Environment setup

---

## 🔒 Security Notes

- **No secrets in scripts**: Use environment variables
- **SSH keys**: Required for deployment scripts
- **Permissions**: Some scripts require specific user permissions
- **Server access**: Live tests require access to MQTT broker

---

## 📝 Adding New Scripts

### **Naming Convention**

```text
test_<component>.js          # Component tests
live_test_<feature>.js       # Live device tests
deploy_<target>.sh           # Deployment scripts
build_<artifact>.js          # Build scripts
```

### **Script Template**

```javascript
#!/usr/bin/env node
/**
 * @fileoverview [Description]
 * @author [Name] ([initials]) with assistance from Cursor AI
 */

'use strict';

// Script implementation
```

### **Shell Script Template**

```bash
#!/usr/bin/env bash
# Description: [Purpose]
# Author: [Name] ([initials])

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Script implementation
```

---

## ✅ Best Practices

1. **Exit codes**: 0 for success, non-zero for failure
2. **Error handling**: Use try/catch, check exit codes
3. **Logging**: Clear output for debugging
4. **Documentation**: Header comment explaining purpose
5. **Portability**: POSIX-compliant for server scripts

---

## 🔗 Related Documentation

- [../STANDARDS.md](../STANDARDS.md) - Development standards
- [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Deployment guide
- [../docs/VERSIONING.md](../docs/VERSIONING.md) - Version strategy

---

**Status**: ✅ Active development  
**Last Updated**: 2025-09-30

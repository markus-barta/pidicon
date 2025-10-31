# Version System Audit

**Date**: 2025-10-31
**Status**: ✅ All systems operational

---

## What's Documented vs What's Implemented

| Feature                         | Documented | Implemented | Status  |
| ------------------------------- | ---------- | ----------- | ------- |
| **Build number auto-increment** | ✅         | ✅          | Working |
| **scripts/build-version.js**    | ✅         | ✅          | Working |
| **version.json generation**     | ✅         | ✅          | Working |
| **CI/CD integration**           | ✅         | ✅          | Working |
| **Docker tags (build #)**       | ✅         | ✅          | Working |
| **Docker tags (semver)**        | ✅         | ✅          | Working |
| **Web UI footer display**       | ✅         | ✅          | Working |
| **Pixoo startup scene**         | ✅         | ✅          | Working |
| **MQTT state messages**         | ✅         | ✅          | Working |
| **MQTT /ok metrics**            | ✅         | ✅          | Working |
| **Daemon startup logs**         | ✅         | ✅          | Working |
| **GitHub Pages publish**        | ✅         | ✅          | Working |

---

## Implementation Details

### ✅ Build Version Script

**File**: `scripts/build-version.js`

- Reads git commit count: `git rev-list --count HEAD`
- Gets short commit hash: `git rev-parse --short HEAD`
- Gets full commit hash: `git rev-parse HEAD`
- Reads semantic version from `package.json`
- Generates `version.json` with all metadata
- Handles CI/CD environment variables

### ✅ Version Info Display

**Daemon Logs** (`daemon.js` line 337):

```javascript
`Version: ${versionInfo.version}, Build: #${versionInfo.buildNumber}, Commit: ${versionInfo.gitCommit}`;
```

**Web UI Footer** (`web/frontend/src/components/AppFooter.vue`):

- Displays: `gitCommit (Build #buildNumber)`
- Clickable link to GitHub commit
- Auto-checks GitHub Pages for updates
- Shows "New version available" if behind

**Pixoo Startup Scene** (`scenes/pixoo/startup.js`):

- Line 154: `PIDICON v${versionInfo.version}`
- Line 163: `Build:${buildNumber}`
- Line 171: `Commit:${gitCommit}`
- Updates every second with live clock

### ✅ MQTT Integration

**Scene State** (`lib/services/scene-service.js` line 481-483):

```javascript
version: this.versionInfo.version,
buildNumber: this.versionInfo.buildNumber,
gitCommit: this.versionInfo.gitCommit,
```

**Frame Metrics** (`lib/commands/state-command-handler.js` line 157-159):

```javascript
version: this.versionInfo.version,
buildNumber: this.versionInfo.buildNumber,
gitCommit: this.versionInfo.gitCommit,
```

**System Status** (`lib/services/system-service.js` line 120-122):

```javascript
version: this.versionInfo.version,
buildNumber: this.versionInfo.buildNumber,
gitCommit: this.versionInfo.gitCommit,
```

### ✅ CI/CD Pipeline

**File**: `.github/workflows/build.yml`

- Line 45: Gets build number from git
- Line 47: Runs `npm run build:version`
- Line 62: Tags Docker image with build number
- Line 102: Publishes version.json to GitHub Pages

**Docker Tags Created**:

- Build number: `pidicon:900`
- Commit hash: `pidicon:ecc3651`
- Branch: `pidicon:main`
- Latest: `pidicon:latest`
- Semantic (on tag): `pidicon:v3.2.0`

---

## Files Involved

| File                                        | Purpose                   | Auto-generated? |
| ------------------------------------------- | ------------------------- | --------------- |
| `package.json`                              | Semantic version (source) | No              |
| `version.json`                              | Build metadata            | Yes             |
| `scripts/build-version.js`                  | Generator                 | No              |
| `daemon.js`                                 | Logs version on startup   | No              |
| `lib/deployment-tracker.js`                 | Reads version.json        | No              |
| `scenes/pixoo/startup.js`                   | Displays on Pixoo         | No              |
| `web/frontend/src/components/AppFooter.vue` | Web UI display            | No              |
| `lib/services/scene-service.js`             | MQTT state                | No              |
| `lib/services/system-service.js`            | System status API         | No              |
| `.github/workflows/build.yml`               | CI/CD pipeline            | No              |

---

## Current Discrepancy Explained

**Your Current State**:

- `package.json`: `"version": "3.2.0"`
- `version.json`: `"buildNumber": 900`
- `deploymentId`: `"v3.1.0-pre-scene-manager"`
- README badge: `v3.2.0`

**Why It Looks Weird**:

- You're developing **v3.2.0** features (target release)
- Last build was **#900** (commits on main)
- Deployment ID is **v3.1.0-pre-scene-manager** (old tag, should update)
- Web UI shows **#901 vs #898** (local ahead of GitHub)

**Is This a Problem?** No! This is normal during development:

- Build numbers increment with every commit (automatic)
- Semantic version stays at 3.2.0 until you release (manual)
- DeploymentId is just a marker (doesn't affect functionality)

**What Should You Do?**

1. Keep developing normally (build numbers will increment)
2. When ready to release v3.2.0:
   - Run `npm version patch` (or minor/major)
   - Run `npm run build:version`
   - Update README badge line 13
   - Push with tags: `git push --tags`
3. Update deploymentId in version.json to match (optional):

```json
"deploymentId": "v3.2.0"
```

---

## Everything Is Working

✅ Build numbers auto-increment  
✅ Version info displayed everywhere  
✅ CI/CD generates and publishes metadata  
✅ Docker images properly tagged  
✅ Web UI shows current build  
✅ Pixoo displays build on screen  
✅ MQTT messages include version  
✅ Logs show full version info

**Conclusion**: The version system is fully implemented and working as documented.
The apparent mismatch is just normal dev vs release state.

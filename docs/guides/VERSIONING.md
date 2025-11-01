# Deployment & Version Management

**TL;DR**: Build numbers auto-increment with every commit. Semantic versions are manual for releases.
Docker deployment via CI/CD is fully automated with Watchtower. Show build numbers to users (they're comparable). Show semantic versions for marketing.

---

## 🚀 Automated Deployment

### Quick Start

Push to `main` branch → CI/CD builds and deploys automatically → Watchtower updates your container within minutes.

### Pipeline Flow

1. **GitHub Actions CI/CD**: Triggered on every push to `main`
   - Runs tests
   - Publishes version.json to GitHub Pages (~40s async deployment)
   - Builds Docker image in parallel (takes 3-4 minutes)
   - Tags with build number and git commit hash
   - Pushes to GitHub Container Registry
   - Pages is live well before Docker completes (no race condition)

2. **Watchtower-Pixoo Service**: On-demand container monitoring
   - Monitors pidicon container for image updates
   - Checks every 5 seconds when running
   - Pulls and restarts daemon automatically
   - Stops after update or timeout

3. **Husky Pre-commit Hook**: Prevents excessive CI builds
   - Triggers watchtower before committing
   - Runs for maximum 5 minutes
   - Ensures container updates during development

### Watchtower Configuration

```yaml
watchtower-pixoo:
  image: containrrr/watchtower:latest
  container_name: watchtower-pixoo
  restart: unless-stopped
  command: --interval 5 --label-enable --scope pixoo
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:rw
  environment:
    - 'WATCHTOWER_CLEANUP=true'
    - 'WATCHTOWER_DEBUG=true'
```

### Manual Docker Deployment

If needed, you can deploy manually:

```bash
# Build
docker build -t pidicon:local .

# Run
docker run --rm -d --name pidicon \
  -e MOSQITTO_HOST_MS24=your_broker_host \
  -e MOSQITTO_USER_MS24=your_mqtt_user \
  -e MOSQITTO_PASS_MS24=your_mqtt_pass \
  -e PIXOO_DEVICE_TARGETS="192.168.1.159=real" \
  pidicon:local
```

For production setup, see `other-code/server basics/docker-compose.yml`.

### Deployment Verification

After deployment, the startup scene displays:

- Build number (from `version.json`)
- Git commit hash
- Current timestamp

```bash
# Trigger startup scene to verify
mosquitto_pub -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'
```

---

## The Four Numbers

### 1. Semantic Version (`v3.2.0`)

**What**: Marketing/release version following semver (major.minor.patch)

**Represents**: Public releases with breaking changes / features / fixes

**Location**: `package.json` → `"version": "3.2.0"`

**Why**: Easy communication ("We're on version 3"), standard package versioning

**Show**:

- README badges
- GitHub releases
- Docker tags (for releases)
- Documentation references

**Count up**: Manually before releasing

```bash
npm version major  # Breaking change: 3.2.0 → 4.0.0
npm version minor  # New feature:    3.2.0 → 3.3.0
npm version patch  # Bug fix:        3.2.0 → 3.2.1
```

### 2. Build Number (`#900`)

**What**: Auto-incremented counter from git commit count

**Represents**: Every single commit in the repo (monotonically increasing)

**Location**: `version.json` → `"buildNumber": 900`

**Why**: Unique identifier, easy comparison ("Is build 901 newer than 898? Yes!")

**Show**:

- Web UI footer: `ecc3651 (Build #900)`
- Pixoo startup scene: `Build:900`
- Logs: `Version: 3.2.0, Build: #900`
- MQTT messages: `"buildNumber": 900`
- Docker tags: `pidicon:900`

**Count up**: Automatically via `npm run build:version`

- Reads `git rev-list --count HEAD`
- Updates `version.json`
- Runs in: CI/CD, pre-commit hooks, manual build

### 3. Git Commit (`ecc3651`)

**What**: Short git SHA (first 7 characters)

**Represents**: Exact code state for this build

**Location**: `version.json` → `"gitCommit": "ecc3651"`

**Why**: Link to specific commit, debugging, traceability

**Show**:

- Web UI footer (clickable to GitHub): `ecc3651 (Build #900)`
- Pixoo startup scene: `Commit:ecc3651`
- Logs: `commit ecc3651`
- MQTT messages: `"gitCommit": "ecc3651"`

**Count up**: Automatic with every `git commit`

### 4. Deployment ID (`v3.1.0-pre-scene-manager`)

**What**: Human-readable deployment phase marker

**Represents**: Current development phase or release tag

**Location**: `version.json` → `"deploymentId": "v3.1.0-pre-scene-manager"`

**Why**: Track what's running where (dev vs prod), identify work-in-progress builds

**Show**:

- Logs (internal)
- `version.json` only (not shown to users)

**Count up**: Manually set in `version.json` when starting new development phase

---

## What's Actually Implemented

✅ **Build version script**: `scripts/build-version.js` reads git info and generates `version.json`

✅ **Automatic build number**: From `git rev-list --count HEAD`

✅ **CI/CD integration**: GitHub Actions runs build script, publishes to GitHub Pages

✅ **Docker tags**: Both semantic (`v3.2.0`) and build number (`900`) tags created

✅ **Web UI display**: Footer shows `gitCommit (Build #buildNumber)` with GitHub link

✅ **Startup scene**: Pixoo displays build number, version, commit on device

✅ **MQTT state**: All messages include `version`, `buildNumber`, `gitCommit`

✅ **Logs**: Daemon startup logs full version info

---

## Where to Show What

| Location                | Show This              | Example                                                       |
| ----------------------- | ---------------------- | ------------------------------------------------------------- |
| **README Badge**        | Semantic version       | `v3.2.0`                                                      |
| **Web UI Footer**       | Commit + build         | `ecc3651 (Build #900)`                                        |
| **Pixoo Startup**       | Version, build, commit | `PIDICON v3.2.0 / Build:900 / Commit:ecc3651`                 |
| **Docker Tags**         | Both (separate tags)   | `pidicon:v3.2.0` + `pidicon:900` + `pidicon:latest`           |
| **Logs (startup)**      | All three              | `Version: 3.2.0, Build: #900, Commit: ecc3651`                |
| **MQTT `/scene/state`** | All three              | `{"version":"3.2.0","buildNumber":900,"gitCommit":"ecc3651"}` |
| **MQTT `/ok` metrics**  | All three              | `{"version":"3.2.0","buildNumber":900,"gitCommit":"ecc3651"}` |

---

## How They Work Together

```text
Developer makes commit #900 (ecc3651)
         ↓
npm run build:version → Updates version.json locally
         ↓
git push → Triggers CI/CD
         ↓
CI/CD runs build-version.js → Fresh version.json with build #900
         ↓
Publish to GitHub Pages → Starts async deployment (~40s to complete)
         ↓
Docker build → Starts immediately (takes 3-4 minutes)
         ├→ GitHub Pages goes live after 40s
         └→ Docker completes after 3-4 min
         ↓
Docker images tagged: pidicon:900, pidicon:ecc3651, pidicon:latest
         ↓
Deploy container → Pixoo shows "Build:900"
```

---

## Understanding Version States

### Development vs Production

During active development, you'll see different version numbers in different places:

| Location                 | What It Shows                 | Why                                               |
| ------------------------ | ----------------------------- | ------------------------------------------------- |
| **Local `version.json`** | Last generated build number   | Only updates when you run `npm run build:version` |
| **Git commit count**     | True current build number     | `git rev-list --count HEAD`                       |
| **Running daemon**       | Build baked into Docker image | From when container was built                     |
| **GitHub Pages**         | Latest CI/CD published build  | Updated after each push to main                   |

### Common Scenarios

#### Scenario 1: Working locally, haven't pushed

```text
Local commits: Build #905
GitHub Pages:  Build #902
Production:    Build #902
Status: You're ahead (normal during development)
```

#### Scenario 2: Just pushed to main (early in CI pipeline)

```text
Local commits: Build #905
GitHub Pages:  Build #905 (updated first in CI)
Production:    Build #902 (Docker image building now, ~2-3 min)
Status: UI shows "update available" but Docker not ready yet
Note: This is intentional - Watchtower polls every 10s and will update soon
```

#### Scenario 3: Everything synced

```text
Local commits: Build #905
GitHub Pages:  Build #905
Production:    Build #905
Status: All systems current
```

### Semantic Version vs Build Number

- **Semantic version (v3.2.0)** stays the same during development
- **Build numbers** increment with every commit
- This is **intentional and correct** - you're working toward v3.2.0 release
- Only bump semantic version when officially releasing

---

## Release Workflow

### During Development (Daily)

**Do nothing!** Build numbers auto-increment with every commit.

```bash
git commit -m "feat: add new feature"
# Build number automatically goes from 900 → 901
```

### Before Release (When Ready)

1. **Update semantic version**:

   ```bash
   npm version minor  # or major/patch
   # Updates package.json: "version": "3.2.0" → "3.3.0"
   # Creates git commit + tag automatically
   ```

2. **Generate fresh version.json**:

   ```bash
   npm run build:version
   ```

3. **Update README badge** (if needed):

   Edit `README.md` line 13:

   ```markdown
   [![Release](https://img.shields.io/badge/release-v3.3.0-green)]...
   ```

4. **Push with tags**:

   ```bash
   git push origin main --tags
   ```

5. **CI/CD automatically**:
   - Publishes version.json to GitHub Pages (deployment starts, takes ~40s)
   - Builds Docker images in parallel (takes 3-4 minutes)
   - Tags as: `pidicon:v3.3.0`, `pidicon:901`, `pidicon:latest`
   - Pages is live well before Docker completes (no race condition)

### Verify Deployment

```bash
# Check Docker tags
docker pull ghcr.io/markus-barta/pidicon:901

# Check version on device
mosquitto_pub ... -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'
# → Pixoo displays: "Build:901"

# Check MQTT state
mosquitto_sub ... -t '/home/pixoo/+/scene/state' -C 1
# → {"version":"3.3.0","buildNumber":901,"gitCommit":"abc1234"}
```

---

## Build Number Lifecycle

```text
Local dev:    Build #900 (in your version.json)
     ↓
Make changes, commit
     ↓
Local dev:    Build #901 (version.json updated)
     ↓
Push to GitHub
     ↓
CI/CD builds: Build #901 (Docker image created)
     ↓
Deploy container
     ↓
Production:   Build #901 (running on server)
     ↓        Pixoo shows: "Build:901"
     ↓
Make more changes, commit
     ↓
Local dev:    Build #902 (ahead of production)
```

**Key point**: Local version.json will be ahead of deployed build after making commits
but before pushing and deploying. This is **expected and correct**.

---

## Anti-Patterns (Don't Do This)

### ❌ Version Headers in Files

```javascript
/**
 * @version 1.0.0  ← NEVER DO THIS
 */
```

**Why not?** Impossible to keep in sync, creates confusion, outdated practice.

### ❌ Hardcoded Versions

```javascript
const VERSION = '1.0.0'; // ❌ Don't hardcode
```

**Instead**:

```javascript
const { version } = require('./version.json'); // ✅ Single source of truth
```

### ❌ Multiple Version Files

```text
version.txt
VERSION
.version
versions.json  ← Too many sources = guaranteed inconsistency
```

### ❌ Manually Editing version.json

```json
{
  "buildNumber": 901  ← ❌ Never manually edit this!
}
```

**Always** regenerate with `npm run build:version`.

---

## Checking Current Version

### From Command Line

```bash
# Semantic version
node -p "require('./package.json').version"
# → 3.2.0

# Full build metadata
cat version.json | jq
# → {"version":"3.2.0","buildNumber":900,...}

# Git-based build number
git rev-list --count HEAD
# → 900

# Current commit
git rev-parse --short HEAD
# → ecc3651
```

### From Code

```javascript
const packageInfo = require('./package.json');
const versionInfo = require('./version.json');

console.log(`Version: ${packageInfo.version}`);
console.log(`Build: ${versionInfo.buildNumber}`);
console.log(`Commit: ${versionInfo.gitCommit}`);
```

### From MQTT

```bash
# Scene state (includes version info)
mosquitto_sub -h $MQTT_HOST -t '/home/pixoo/+/scene/state' -C 1 | jq

# Frame metrics (includes version info)
mosquitto_sub -h $MQTT_HOST -t 'pixoo/+/ok' -C 1 | jq
```

### From Device Display

```bash
# Send startup scene to see version on Pixoo
mosquitto_pub -h $MQTT_HOST -t "pixoo/192.168.1.159/state/upd" -m '{"scene":"startup"}'
```

---

## version.json Structure

Auto-generated by `scripts/build-version.js`:

```json
{
  "version": "3.2.0", // From package.json
  "deploymentId": "v3.2.0", // Git tag or version-commit
  "buildNumber": 900, // Git commit count
  "gitCommit": "ecc3651", // Short SHA (7 chars)
  "gitCommitFull": "ecc3651...", // Full SHA (40 chars)
  "gitCommitCount": 900, // Same as buildNumber
  "gitBranch": "main", // Current branch
  "gitTag": "v3.2.0", // Latest git tag (or null)
  "buildTime": "2025-10-31T...", // ISO 8601 timestamp
  "environment": "development" // or "production"
}
```

**Never edit manually!** Always regenerate with `npm run build:version`.

---

## Docker Image Tags

CI/CD creates multiple tags for each build:

```text
ghcr.io/markus-barta/pidicon:900      # Build number (recommended)
ghcr.io/markus-barta/pidicon:ecc3651  # Git commit
ghcr.io/markus-barta/pidicon:main     # Branch name
ghcr.io/markus-barta/pidicon:v3.2.0   # Semantic version (on git tag)
ghcr.io/markus-barta/pidicon:latest   # Latest main branch build
```

**Recommendation**: Use build number tags (`pidicon:900`) for precise deployments.

---

## Release Checklist

Before releasing a new version:

- [ ] All tests pass: `npm test`
- [ ] Linting clean: `npm run lint`
- [ ] Update version: `npm version major|minor|patch`
- [ ] Generate metadata: `npm run build:version`
- [ ] Update README badge if needed (line 13)
- [ ] Commit: `git commit` (already done by `npm version`)
- [ ] Push with tags: `git push origin main --tags`
- [ ] Verify CI/CD build passes
- [ ] Check Docker image: `docker pull ghcr.io/markus-barta/pidicon:latest`
- [ ] Deploy and test
- [ ] Verify startup scene shows correct build number
- [ ] Check MQTT state topic has correct version

---

## Files Involved

| File                          | Purpose                            | Edit Manually?             |
| ----------------------------- | ---------------------------------- | -------------------------- |
| `package.json`                | Semantic version (source of truth) | ✅ Yes (via `npm version`) |
| `version.json`                | Build metadata                     | ❌ No (auto-generated)     |
| `scripts/build-version.js`    | Generator script                   | ✅ Yes (rarely)            |
| `README.md` line 13           | Badge display                      | ✅ Yes (on release)        |
| `.github/workflows/build.yml` | CI/CD pipeline                     | ✅ Yes (rarely)            |

---

## Best Practices

1. **Single Source of Truth**
   - Semantic version: `package.json` only
   - Build metadata: `version.json` only (auto-generated)
   - All code imports from these files

2. **Automated Generation**
   - `version.json` is ALWAYS auto-generated
   - Never manually edit `version.json`
   - Regenerate before every deployment

3. **Git Integration**
   - Tag releases: `git tag v3.2.0`
   - Build number = commit count (automatic, monotonic)
   - Commit hash provides exact traceability

4. **Follow SemVer Strictly**
   - `3.2.0` → `3.2.1`: Bug fix (patch)
   - `3.2.0` → `3.3.0`: New feature (minor)
   - `3.2.0` → `4.0.0`: Breaking change (major)

5. **Show Build Numbers to Users**
   - Users care about "is mine newer?"
   - Build numbers are directly comparable
   - Web UI, Pixoo, MQTT all show build numbers

6. **Use Semantic Versions for Marketing**
   - README badges
   - GitHub releases
   - Documentation
   - Public announcements

---

## Troubleshooting

### "My build number is ahead of production"

**Normal!** Local version.json increments with every commit. Production only updates
when you push and deploy. This is expected during development.

### "README badge doesn't match my version"

Update line 13 in README.md before releasing:

```markdown
[![Release](https://img.shields.io/badge/release-v3.3.0-green)]...
```

### "Docker image has wrong version"

Rebuild with fresh git info:

```bash
npm run build:version
docker build -t pidicon:test .
docker run pidicon:test
# Check logs for version info
```

### "version.json is outdated"

Regenerate it:

```bash
npm run build:version
cat version.json | jq .buildNumber
```

### "CI/CD build number doesn't match local"

This happens if you have uncommitted changes. CI/CD builds from clean git state,
local might have uncommitted work. Push your commits to sync.

### "Web UI shows stale version info"

With cache removed (as of build #902), the Web UI always fetches fresh version info from
GitHub Pages. If it still shows old data:

1. Hard refresh browser (Cmd+Shift+R)
2. Check GitHub Pages directly: `curl https://markus-barta.github.io/pidicon/version.json`
3. Verify CI/CD completed: Check GitHub Actions status

---

## Summary

- **Build number** = every commit, automatic, for tracking and comparison
- **Semantic version** = releases, manual (via `npm version`), for humans
- **Git commit** = exact code, automatic, for debugging and traceability
- **Show build numbers in UI** → users care about "is mine newer?"
- **Show semantic versions in marketing** → GitHub, README, releases
- **Never edit version.json manually** → always regenerate with script
- **It's normal to be ahead locally** → production catches up on push + deploy

**The system is working correctly.** Build numbers auto-increment, semantic versions are
manual for releases, and everything is displayed in the right places for the right audiences.

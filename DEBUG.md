# Debug Guide - Pixoo Daemon Production Server

**Server**: `miniserver24`  
**Container**: `pidicon`

---

## Quick Access

```bash
# SSH to server
ssh mba@miniserver24

# View live logs
docker logs pidicon -f --tail 100

# Check specific logs
docker logs pidicon --tail 200 2>&1 | grep -E "WebSocket|LAST SEEN|error"

# Execute command in container
docker exec pidicon <command>

# Check version
docker exec pidicon cat version.json

# Restart container
docker restart pidicon

# Pull latest and restart
docker pull ghcr.io/markus-barta/pidicon:latest && docker restart pidicon
```

---

## Container Info

**Running Process**: `/usr/local/bin/node daemon.js`  
**Working Directory**: `/app`  
**Image**: `ghcr.io/markus-barta/pidicon:latest`  
**Web UI**: <http://miniserver24:10829>

---

## Common Checks

```bash
# Check if running
ssh mba@miniserver24 "docker ps | grep pixoo"

# Check version (build number)
ssh mba@miniserver24 "docker exec pidicon cat version.json | grep buildNumber"

# Check git commit
ssh mba@miniserver24 "docker exec pidicon cat version.json | grep gitCommit"

# Check for errors in logs
ssh mba@miniserver24 "docker logs pidicon --tail 100 2>&1 | grep -i error"

# Check WebSocket activity
ssh mba@miniserver24 "docker logs pidicon --tail 100 2>&1 | grep -E 'WebSocket|broadcast'"

# Check frame pushes
ssh mba@miniserver24 "docker logs pidicon --tail 50 2>&1 | grep 'OK \['"
```

---

## CI/CD & Deployment

### Automated Deployment (Watchtower)

Watchtower automatically pulls and deploys new Docker images when you push to `main`.

Process:

1. Commit and push changes to `main`
2. GitHub Actions builds new Docker image (~2-3 minutes)
3. Watchtower on miniserver24 auto-detects new image (~1-2 minutes polling)
4. Watchtower pulls and restarts container automatically

**Total deployment time:** ~3-5 minutes

**No manual action needed!** Just push and wait.

### Verifying Deployment

```bash
# Wait 3 minutes after push, then check every 30s for another 3 minutes

# Check current build number
curl -s http://miniserver24:10829/api/status | jq '.buildNumber'

# Or via SSH
ssh mba@miniserver24 "docker exec pidicon cat version.json | jq '.buildNumber'"

# Check when image was last updated
ssh mba@miniserver24 "docker inspect pidicon | jq '.[0].Created'"
```

**Expected behavior:**

- Build numbers increment sequentially
- Git commit matches your latest push
- Container `Created` timestamp is recent

### Manual Deployment (if needed)

Only use if Watchtower fails or you need immediate update:

```bash
# Manually pull and restart
ssh mba@miniserver24 "docker pull ghcr.io/markus-barta/pidicon:latest && docker restart pidicon"
```

---

## Debug Workflow

1. **Check version running**: `docker exec pidicon cat version.json`
2. **Check logs for errors**: `docker logs pidicon --tail 100 | grep -i error`
3. **If outdated, wait for Watchtower** (~5 min) or manually pull
4. **Verify fix**: Check logs and version again

---

## File Locations

- **Daemon code**: `/app/daemon.js` (in container)
- **Config**: Environment variables in Docker Compose
- **Logs**: `docker logs pidicon`
- **Version**: `/app/version.json` (in container)

---

**Last Updated**: 2025-10-15 (Build 752+)

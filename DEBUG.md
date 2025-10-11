# Debug Guide - Pixoo Daemon Production Server

**Server**: `miniserver24`  
**Container**: `pixoo-daemon`

---

## Quick Access

```bash
# SSH to server
ssh mba@miniserver24

# View live logs
docker logs pixoo-daemon -f --tail 100

# Check specific logs
docker logs pixoo-daemon --tail 200 2>&1 | grep -E "WebSocket|LAST SEEN|error"

# Execute command in container
docker exec pixoo-daemon <command>

# Check version
docker exec pixoo-daemon cat version.json

# Restart container
docker restart pixoo-daemon

# Pull latest and restart
docker pull ghcr.io/markus-barta/pixoo-daemon:latest && docker restart pixoo-daemon
```

---

## Container Info

**Running Process**: `/usr/local/bin/node daemon.js`  
**Working Directory**: `/app`  
**Image**: `ghcr.io/markus-barta/pixoo-daemon:latest`  
**Web UI**: http://miniserver24:10829

---

## Common Checks

```bash
# Check if running
ssh mba@miniserver24 "docker ps | grep pixoo"

# Check version (build number)
ssh mba@miniserver24 "docker exec pixoo-daemon cat version.json | grep buildNumber"

# Check git commit
ssh mba@miniserver24 "docker exec pixoo-daemon cat version.json | grep gitCommit"

# Check for errors in logs
ssh mba@miniserver24 "docker logs pixoo-daemon --tail 100 2>&1 | grep -i error"

# Check WebSocket activity
ssh mba@miniserver24 "docker logs pixoo-daemon --tail 100 2>&1 | grep -E 'WebSocket|broadcast'"

# Check frame pushes
ssh mba@miniserver24 "docker logs pixoo-daemon --tail 50 2>&1 | grep 'OK \['"
```

---

## Debug Workflow

1. **Check version running**: `docker exec pixoo-daemon cat version.json`
2. **Check logs for errors**: `docker logs pixoo-daemon --tail 100 | grep -i error`
3. **Pull latest**: `docker pull ghcr.io/markus-barta/pixoo-daemon:latest`
4. **Restart**: `docker restart pixoo-daemon`
5. **Verify fix**: Check logs again

---

## File Locations

- **Daemon code**: `/app/daemon.js` (in container)
- **Config**: Environment variables in Docker Compose
- **Logs**: `docker logs pixoo-daemon`
- **Version**: `/app/version.json` (in container)

---

**Last Updated**: 2025-10-11 (Build 606)

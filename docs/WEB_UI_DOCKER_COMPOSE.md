# Docker Compose Configuration for Web UI

## 🎯 Your Current Setup

Your `pixoo-daemon` uses `network_mode: host`, which means:

- ✅ **No port mapping needed** - Container binds directly to host ports
- ✅ Port 10829 will be accessible on your server IP
- ✅ Just add environment variables and restart

---

## 📝 Update Your docker-compose.yml

Add these environment variables to your `pixoo-daemon` service:

```yaml
pixoo-daemon:
  image: ghcr.io/markus-barta/pixoo-daemon:latest
  container_name: pixoo-daemon
  network_mode: host # ← Already using host network!
  restart: no
  environment:
    - TZ=Europe/Vienna
    - PIXOO_DEVICE_TARGETS=192.168.1.189=mock;192.168.1.159=mock
    - PIXOO_WEB_PORT=10829 # ← ADD THIS (optional, 10829 is default)
    - PIXOO_WEB_AUTH=admin:yourpassword # ← ADD THIS (optional, for security)
  volumes:
    - ./mounts/nodered/pixoo-media:/pixoo-media
    - ./mounts/shared/tmp:/shared-tmp
  env_file:
    - /home/mba/secrets/smarthome.env
  labels:
    - 'com.centurylinklabs.watchtower.enable=true'
    - 'com.centurylinklabs.watchtower.scope=pixoo'
```

---

## 🔄 Deploy Changes

### **Option 1: Automatic (Watchtower)**

Just push your code changes:

```bash
git add .
git commit -m "feat(web-ui): add Web UI control panel"
git push
```

Watchtower will automatically deploy within ~5 seconds.

### **Option 2: Manual**

```bash
cd /path/to/docker-compose
docker-compose down
docker-compose up -d
```

---

## 🌐 Access Web UI

### **On Server (localhost)**

```bash
curl http://localhost:10829/api/status
```

### **From Your Network**

```bash
# Replace with your server IP
http://192.168.1.XXX:10829
```

---

## 🔒 Security Recommendations

Since you're using `network_mode: host`, the Web UI will be accessible on your
local network. Consider:

### **1. Enable Authentication** (Recommended)

```yaml
environment:
  - PIXOO_WEB_AUTH=admin:strongpassword123
```

### **2. Firewall Rules** (If exposed to internet)

```bash
# Only allow from local network
iptables -A INPUT -p tcp --dport 10829 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 10829 -j DROP
```

### **3. Reverse Proxy with HTTPS** (Advanced)

Use Nginx or Caddy to add HTTPS if exposing externally.

---

## 🧪 Verify Deployment

### **Check Logs**

```bash
docker logs pixoo-daemon | grep "Web UI"
```

**Expected output**:

```text
🌐 Web UI started on http://localhost:10829
```

### **Test API**

```bash
curl http://localhost:10829/api/status
```

**Expected response**:

```json
{
  "version": "2.0.0",
  "buildNumber": 478,
  "status": "running",
  ...
}
```

---

## ❓ FAQ

### **Q: Do I need to expose port 10829 in docker-compose.yml?**

**A**: No! You're using `network_mode: host`, so the container binds directly
to the host's port 10829. Port mapping is only needed for bridge networking.

### **Q: Can I use a different port?**

**A**: Yes, set `PIXOO_WEB_PORT=8080` (or any free port).

### **Q: How do I disable the Web UI?**

**A**: Set `PIXOO_WEB_UI=false` in environment variables.

### **Q: Is the Web UI secure?**

**A**: By default, no authentication is enabled. Set `PIXOO_WEB_AUTH` for basic
authentication. For production, use a reverse proxy with HTTPS.

---

## 🚨 Troubleshooting

### **Web UI not starting**

1. Check logs: `docker logs pixoo-daemon`
2. Verify port is free: `lsof -i :10829`
3. Check Express is installed: Should be in `package.json` dependencies

### **Cannot access from browser**

1. Verify daemon is running: `docker ps | grep pixoo-daemon`
2. Check firewall: `telnet your-server-ip 10829`
3. Verify network mode: Should be `host` in docker-compose.yml

---

**Next**: See [WEB_UI_SETUP.md](./WEB_UI_SETUP.md) for complete Web UI documentation.

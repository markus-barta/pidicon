# Web UI Setup Guide

## Overview

The Pixoo Daemon now includes a Web UI control panel for managing devices and
scenes without using MQTT commands.

---

## 🚀 Quick Start

### **1. Enable Web UI** (Default: Enabled)

The Web UI is enabled by default. To disable it:

```bash
export PIXOO_WEB_UI=false
```

### **2. Configure Port** (Default: 10829)

```bash
export PIXOO_WEB_PORT=10829  # Or any other port
```

### **3. Optional: Enable Authentication**

```bash
export PIXOO_WEB_AUTH="admin:secretpassword"
```

Format: `username:password` (basic authentication)

### **4. Start Daemon**

```bash
node daemon.js
```

The Web UI will be available at: `http://localhost:10829`

### **5. Docker Compose Configuration**

For Docker deployments, add these environment variables to your `pixoo-daemon` service in `docker-compose.yml`:

```yaml
pixoo-daemon:
  image: ghcr.io/markus-barta/pixoo-daemon:latest
  container_name: pixoo-daemon
  network_mode: host # Uses host networking (recommended)
  restart: no
  environment:
    - TZ=Europe/Vienna
    - PIXOO_DEVICE_TARGETS=192.168.1.189=mock;192.168.1.159=mock
    - PIXOO_WEB_PORT=10829 # Optional: Custom port (default: 10829)
    - PIXOO_WEB_AUTH=admin:yourpassword # Optional: Authentication
  volumes:
    - ./mounts/nodered/pixoo-media:/pixoo-media
    - ./mounts/shared/tmp:/shared-tmp
  env_file:
    - /home/mba/secrets/smarthome.env
  labels:
    - 'com.centurylinklabs.watchtower.enable=true'
    - 'com.centurylinklabs.watchtower.scope=pixoo'
```

**Deploy Changes:**

```bash
# Option 1: Watchtower (automatic)
git add . && git commit -m "feat(web-ui): enable Web UI"
git push
# Watchtower deploys automatically

# Option 2: Manual restart
docker-compose down && docker-compose up -d
```

---

## 🌐 Accessing the Web UI

### **Local Development**

```text
http://localhost:10829
```

### **Remote Server**

```text
http://your-server-ip:10829
```

### **Docker Host Networking**

If using `network_mode: host` (recommended), the Web UI is accessible directly on the host port.

**Note**: If you have a firewall, make sure port 10829 is open.

### **With Authentication**

Your browser will prompt for username and password if `PIXOO_WEB_AUTH` is set.

---

## 📋 Web UI Features

### **System Status**

- Version, build number, commit hash
- Uptime (formatted)
- Memory usage (RSS)
- Node.js version
- Restart daemon button

### **Device Management**

- List all configured devices
- Current scene and status
- Metrics (pushes, errors)
- Turn display ON/OFF
- Soft reset device
- Change scene

### **Scene Control**

- List all available scenes
- Visual indicator for active scenes
- One-click scene switching
- Auto-refresh every 10 seconds

---

## 🔒 Security

### **Authentication**

Basic authentication is **optional but recommended**, especially if the Web UI is
exposed to the internet.

```bash
export PIXOO_WEB_AUTH="myuser:mypassword"
```

### **Firewall**

If the Web UI is only needed locally, restrict access via firewall:

```bash
# Only allow localhost
iptables -A INPUT -p tcp --dport 10829 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 10829 -j DROP
```

For network access with `network_mode: host`:

```bash
# Allow from local network only
iptables -A INPUT -p tcp --dport 10829 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 10829 -j DROP
```

### **Reverse Proxy** (Advanced)

For production, consider using Nginx or Caddy as a reverse proxy with HTTPS:

```nginx
# Nginx example
server {
    listen 443 ssl;
    server_name pixoo.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:10829;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🧪 Testing

### **Verify Web UI is Running**

Check daemon logs for:

```text
🌐 Web UI started on http://localhost:10829
```

### **Test API Endpoints**

```bash
# Get system status
curl http://localhost:10829/api/status

# List devices
curl http://localhost:10829/api/devices

# List scenes
curl http://localhost:10829/api/scenes

# Switch scene (requires authentication if enabled)
curl -X POST http://localhost:10829/api/devices/192.168.1.159/scene \
  -H "Content-Type: application/json" \
  -d '{"scene":"clock","clear":true}'
```

### **With Authentication**

```bash
curl -u admin:secretpassword http://localhost:10829/api/status
```

---

## ❓ FAQ

### **Q: Do I need to expose port 10829 in docker-compose.yml?**

**A**: No! When using `network_mode: host`, the container binds directly to the host's port 10829. Port mapping (`ports:` section) is only needed for bridge networking.

### **Q: Can I use a different port?**

**A**: Yes, set `PIXOO_WEB_PORT=8080` (or any free port) in your environment variables.

### **Q: How do I disable the Web UI?**

**A**: Set `PIXOO_WEB_UI=false` in your environment variables.

### **Q: Is the Web UI secure?**

**A**: By default, no authentication is enabled. Set `PIXOO_WEB_AUTH=username:password` for basic authentication. For production with external access, use a reverse proxy with HTTPS.

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

## 🛠️ Troubleshooting

### **Web UI Not Starting**

**Symptom**: No "🌐 Web UI started" message in logs

**Possible Causes**:

1. **Port 10829 already in use**

   ```bash
   # Check port usage
   lsof -i :10829

   # Or check what's using the port
   netstat -tulpn | grep :10829
   ```

2. **Express not installed**

   ```bash
   npm install express
   ```

3. **Web UI disabled via environment variable**

   ```bash
   # Verify environment variable
   echo $PIXOO_WEB_UI  # Should be empty or "true"

   # Enable it
   export PIXOO_WEB_UI=true
   ```

4. **Missing dependencies**

   ```bash
   # Check if all npm packages are installed
   npm ls --depth=0
   ```

### **Cannot Connect to Web UI**

**Symptom**: Browser shows "Connection refused"

**Check**:

1. **Is daemon running?**

   ```bash
   docker ps | grep pixoo-daemon

   # Should show: CONTAINER ID   IMAGE   ...   Up X minutes
   ```

2. **Is port accessible?**

   ```bash
   # From host machine
   curl http://localhost:10829/api/status

   # Or telnet test
   telnet your-server-ip 10829
   ```

3. **Docker networking issues**

   ```bash
   # Check if using host networking
   docker inspect pixoo-daemon | grep -A 5 -B 5 NetworkMode

   # Should show: "NetworkMode": "host"
   ```

4. **Firewall blocking**

   ```bash
   # Check if port is open
   sudo iptables -L | grep 10829

   # Allow the port
   sudo iptables -A INPUT -p tcp --dport 10829 -j ACCEPT
   ```

### **Authentication Not Working**

**Symptom**: Always prompted for credentials or "Invalid credentials"

**Check**:

1. **Environment variable format**

   ```bash
   # Correct format: "username:password"
   export PIXOO_WEB_AUTH="admin:pass123"

   # Check current value
   echo $PIXOO_WEB_AUTH
   ```

2. **Browser issues**
   - Try incognito/private mode
   - Clear browser cache and cookies
   - Restart browser

3. **Test authentication**

   ```bash
   # Test with curl
   curl -u admin:pass123 http://localhost:10829/api/status

   # Should return JSON, not prompt for credentials
   ```

### **API Endpoints Not Working**

**Symptom**: 404 errors or empty responses

**Check**:

1. **Wrong URL**

   ```bash
   # Correct format
   curl http://localhost:10829/api/devices
   curl http://localhost:10829/api/scenes
   ```

2. **Web UI not started**

   ```bash
   # Check logs for startup message
   docker logs pixoo-daemon | grep "Web UI"
   ```

3. **Port conflicts**

   ```bash
   # Check if another service is using the port
   sudo lsof -i :10829
   ```

---

## 📚 API Documentation

### **System**

- `GET /api/status` - Get daemon status

### **Devices**

- `GET /api/devices` - List all devices
- `GET /api/devices/:ip` - Get device info
- `GET /api/devices/:ip/metrics` - Get device metrics
- `POST /api/devices/:ip/scene` - Switch scene

  ```json
  { "scene": "clock", "clear": true, "payload": {} }
  ```

- `POST /api/devices/:ip/display` - Turn display on/off

  ```json
  { "on": true }
  ```

- `POST /api/devices/:ip/reset` - Soft reset device
- `POST /api/devices/:ip/driver` - Switch driver

  ```json
  { "driver": "real" }
  ```

### **Scenes**

- `GET /api/scenes` - List all scenes

### **Daemon**

- `POST /api/daemon/restart` - Restart daemon

---

## 🎨 Customization

### **Change Port**

```bash
export PIXOO_WEB_PORT=8080
```

### **Disable Web UI**

```bash
export PIXOO_WEB_UI=false
```

### **Custom Styles**

Edit `web/public/style.css` to customize the look and feel.

---

## 📦 Files

- `web/server.js` - Express server and API endpoints
- `web/frontend/` - Vue.js frontend application
- `web/public/` - Built static files (generated)

---

## 🔗 Related Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide
- **[CONFIG_AND_PERSISTENCE.md](./CONFIG_AND_PERSISTENCE.md)** - Configuration management
- **[BACKLOG.md](./BACKLOG.md)** - UI-401 completion status

---

**Need Help?** Check the logs in `docker logs pixoo-daemon` or open an issue.

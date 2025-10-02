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

---

## 🐳 Docker / Docker Compose Setup

If you're running in Docker (which you are), you need to expose port 10829.

### **Option A: Update docker-compose.yml**

Add port mapping to your `pixoo-daemon` service:

```yaml
version: '3.8'

services:
  pixoo-daemon:
    image: your-registry/pixoo-daemon:latest
    container_name: pixoo-daemon
    restart: unless-stopped
    environment:
      - MOSQITTO_HOST_MS24=your-mqtt-host
      - MOSQITTO_USER_MS24=your-mqtt-user
      - MOSQITTO_PASS_MS24=your-mqtt-password
      - PIXOO_DEVICE_TARGETS=192.168.1.159
      - PIXOO_WEB_PORT=10829 # Optional: Custom port
      - PIXOO_WEB_AUTH=admin:secretpassword # Optional: Authentication
    ports:
      - '10829:10829' # ← ADD THIS LINE
    networks:
      - your-network

networks:
  your-network:
    external: true
```

### **Option B: Docker Run Command**

```bash
docker run -d \
  --name pixoo-daemon \
  --restart unless-stopped \
  -e MOSQITTO_HOST_MS24=your-mqtt-host \
  -e MOSQITTO_USER_MS24=your-mqtt-user \
  -e MOSQITTO_PASS_MS24=your-mqtt-password \
  -e PIXOO_DEVICE_TARGETS=192.168.1.159 \
  -e PIXOO_WEB_PORT=10829 \
  -e PIXOO_WEB_AUTH=admin:secretpassword \
  -p 10829:10829 \
  your-registry/pixoo-daemon:latest
```

### **Restart Container**

After updating `docker-compose.yml`:

```bash
docker-compose down
docker-compose up -d
```

Or if using Watchtower, just push your changes and it will auto-deploy.

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

## 🛠️ Troubleshooting

### **Web UI Not Starting**

**Symptom**: No "🌐 Web UI started" message in logs

**Possible Causes**:

1. Port 10829 already in use

   ```bash
   # Check port usage
   lsof -i :10829
   ```

2. Express not installed

   ```bash
   npm install express
   ```

3. Web UI disabled via environment variable
   ```bash
   # Verify
   echo $PIXOO_WEB_UI  # Should be empty or "true"
   ```

### **Cannot Connect to Web UI**

**Symptom**: Browser shows "Connection refused"

**Check**:

1. Is daemon running?

   ```bash
   docker ps | grep pixoo-daemon
   ```

2. Is port exposed in Docker?

   ```bash
   docker port pixoo-daemon
   # Should show: 10829/tcp -> 0.0.0.0:10829
   ```

3. Is firewall blocking?
   ```bash
   telnet your-server-ip 10829
   ```

### **Authentication Not Working**

**Symptom**: Always prompted for credentials or "Invalid credentials"

**Check**:

1. Environment variable format

   ```bash
   # Correct format: "user:password"
   export PIXOO_WEB_AUTH="admin:pass123"
   ```

2. Browser credentials
   - Try incognito/private mode
   - Clear browser cache

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
- `web/public/index.html` - HTML structure
- `web/public/style.css` - CSS styles
- `web/public/app.js` - Frontend JavaScript

---

## 🔗 Related Documentation

- **[lib/services/README.md](../lib/services/README.md)** - Service layer documentation
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide
- **[BACKLOG.md](./BACKLOG.md)** - UI-401 work package details

---

**Need Help?** Check the logs in `docker logs pixoo-daemon` or open an issue.

# 🚀 Pixoo Daemon Deployment Guide

This guide covers deploying the Pixoo Daemon using Docker and GitHub Actions for
automated, professional-grade deployments.

---

## 🔄 Automated Deployment Flow

Pushing to the `main` branch automatically triggers a GitHub Actions workflow that
will test, build, and deploy the application to your server.

### Setup Requirements

You will need to configure the following secrets in your GitHub repository settings
under **Settings > Secrets and variables > Actions**:

| Secret Name          | Description                     | Example Value                            |
| -------------------- | ------------------------------- | ---------------------------------------- |
| `DEPLOYMENT_HOST`    | Your server's hostname or IP    | `miniserver24.lan`                       |
| `DEPLOYMENT_USER`    | The SSH username for deployment | `mba`                                    |
| `DEPLOYMENT_SSH_KEY` | The private SSH key for auth    | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

---

## 🐳 Manual Docker Deployment

If you need to deploy manually, you can use the provided Docker setup.

### Build the Image

```bash
docker build -t pixoo-daemon:local .
```

### Run the Container

```bash
docker run --rm -d --name pixoo-daemon \
  -e MOSQITTO_HOST_MS24=your_broker_host \
  -e MOSQITTO_USER_MS24=your_mqtt_user \
  -e MOSQITTO_PASS_MS24=your_mqtt_pass \
  -e PIXOO_DEVICE_TARGETS="192.168.1.159=real" \
  pixoo-daemon:local
```

For a more robust setup, refer to the example `docker-compose.yml` located in
the `other-code/server basics/` directory.

---

## 🛠️ Deployment Scripts

The deployment process is managed by two key scripts:

- `scripts/build-version.js`: Generates `version.json` with the current build
  number and Git commit hash.
- `scripts/deploy-server.sh`: Executed on the server to pull the latest code and
  restart the Docker container.

For more details on the development standards and contribution guidelines, please
see `STANDARDS.md`.

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

## 🔄 Complete Deployment Pipeline

### Automated Container Updates with Watchtower

The Pixoo Daemon uses an automated deployment pipeline that ensures the daemon is always
running the latest version with minimal manual intervention.

#### Pipeline Components

1. **GitHub Actions CI/CD**: Triggered on every push to `main` branch
   - Runs tests and builds Docker image
   - Tags image with build number and git commit hash
   - Pushes to GitHub Container Registry

2. **Watchtower-Pixoo Service**: On-demand container monitoring (not continuous)
   - Dedicated watchtower service that runs only when triggered
   - Monitors pixoo-daemon container for image updates
   - Stops automatically after detecting update or timeout

3. **Husky Pre-commit Hook**: Prevents excessive GitHub Actions usage
   - Triggers watchtower-pixoo service before committing
   - Runs watchtower for maximum 5 minutes (300 seconds)
   - Checks every 5 seconds for container image updates
   - Stops watchtower when update detected or timeout reached

#### How It Works

1. **Developer commits code** → Husky pre-commit hook triggers watchtower-pixoo service
2. **Watchtower-pixoo starts** → Monitors pixoo-daemon container for 5 minutes max
3. **GitHub Actions builds** → New container image pushed to registry
4. **Watchtower detects new image** → Pulls and restarts daemon, then stops itself
5. **Startup scene displays** → Build number and git hash for verification

#### Watchtower-Pixoo Configuration

The `watchtower-pixoo` service is defined in `docker-compose.yml` and runs on-demand:

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

This service:

- Monitors only containers with `com.centurylinklabs.watchtower.scope=pixoo` label
- Checks for updates every 5 seconds when running
- Automatically stops after detecting an update or when stopped by the trigger script

#### Husky Pre-commit Hook Process

The pre-commit hook runs `other-code/watchtower-pixoo-run.sh` to ensure container updates during development:

1. **Starts watchtower-pixoo service** → Monitors pixoo-daemon container
2. **Runs for maximum 5 minutes (300 seconds)** → Timeout prevents hanging commits
3. **Checks every 5 seconds** → Detects when GitHub Actions pushes new image
4. **Stops watchtower-pixoo** → When update detected or timeout reached
5. **Allows normal development workflow** → While ensuring container stays updated

#### Verification

After deployment, the startup scene will display:

- Build number (from `version.json`)
- Git commit hash (from `version.json`)
- Current timestamp

This provides immediate visual confirmation that the latest version is running.

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

# 🚀 Pixoo Daemon Deployment Guide

## Overview

This project now uses **GitHub Actions** for automated deployment instead of manual fish functions and server scripts.

## 🔄 New Deployment Flow

```
Git Push → GitHub Actions → Test → Deploy → Restart Container
```

### What Happens Automatically

1. **Push to main branch** triggers deployment
2. **Automated testing** (linting, markdown validation)
3. **Version generation** with build numbers
4. **Server deployment** via SSH
5. **Container restart** with new code
6. **Health verification** and status check

## 🛠️ Setup Requirements

### GitHub Repository Secrets

You need to add these secrets in your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret Name          | Description                    | Example Value                            |
| -------------------- | ------------------------------ | ---------------------------------------- |
| `DEPLOYMENT_HOST`    | Your server hostname           | `miniserver24.lan`                       |
| `DEPLOYMENT_USER`    | SSH username                   | `mba`                                    |
| `DEPLOYMENT_SSH_KEY` | Private SSH key for deployment | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

### SSH Key Setup

1. **Generate SSH key** (if you don't have one):

   ```bash
   ssh-keygen -t ed25519 -C "github-actions@pixoo-daemon"
   ```

2. **Add public key** to your server's `~/.ssh/authorized_keys`

3. **Add private key** to GitHub secrets as `DEPLOYMENT_SSH_KEY`

## 📁 File Structure

```
.github/
├── workflows/
│   └── deploy.yml          # GitHub Actions workflow
scripts/
├── build-version.js        # Version generation
└── deploy-server.sh        # Server deployment script
```

## 🔧 Manual Deployment (if needed)

### Server-Side Deployment

```bash
# SSH into your server
ssh mba@miniserver24.lan

# Navigate to pixoo-daemon directory
cd ~/Code/pixoo-daemon

# Run deployment script
./scripts/deploy-server.sh
```

### Local Testing

```bash
# Test the deployment script locally
./scripts/deploy-server.sh

# Note: Will fail on mount path check (expected)
```

## 📋 Deployment Process Details

### 1. Testing Phase

- ✅ **Linting**: ESLint checks
- ✅ **Markdown**: Markdownlint validation
- ✅ **Tests**: npm test (if configured)
- ✅ **Version**: Generate version.json

### 2. Deployment Phase

- 🔄 **SSH Connection** to server
- 📥 **Git Pull** latest changes
- 🔨 **Version Generation** on server
- 📂 **File Copy** to mount directory
- ♻️ **Container Restart**
- ✅ **Health Verification**

### 3. Backup & Safety

- 💾 **Automatic backup** of current deployment
- 🔍 **Prerequisites check** before deployment
- ❌ **Error handling** with clear messages
- 🔄 **Rollback capability** via backup

## 🚨 Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Check SSH key in GitHub secrets
   - Verify server accessibility
   - Check firewall settings

2. **Deployment Failed**
   - Check server logs: `docker compose logs pixoo-daemon`
   - Verify mount paths exist
   - Check file permissions

3. **Container Won't Start**
   - Check Docker Compose configuration
   - Verify environment variables
   - Check container logs

### Debug Commands

```bash
# Check container status
docker compose ps pixoo-daemon

# View container logs
docker compose logs --tail=50 pixoo-daemon

# Check mount directory
ls -la ~/docker/mounts/pixoo-daemon/app/

# Verify version.json
cat ~/docker/mounts/pixoo-daemon/app/version.json
```

## 🔄 Migration from Old System

### What Changed

- ❌ **Removed**: Fish functions (`deploy-pixoo`, `deploy-pixoo-fast`)
- ❌ **Removed**: Manual server scripts
- ✅ **Added**: GitHub Actions automation
- ✅ **Added**: Robust deployment script
- ✅ **Added**: Automatic testing and validation

### What Stays the Same

- ✅ **Docker Compose** configuration
- ✅ **Volume mounts** and directory structure
- ✅ **Environment variables** and secrets
- ✅ **Container restart** process

## 📈 Future Enhancements

### Phase 2 (Backlog)

- 🔍 **Health checks** and monitoring
- 📧 **Email notifications** for deployments
- 🔄 **Rollback automation** on failure
- 📊 **Deployment metrics** and analytics

### Phase 3 (Future)

- 🐳 **Docker image** optimization
- 🔒 **Security scanning** and validation
- 🌍 **Multi-environment** support
- 📱 **Mobile notifications**

## 📞 Support

If you encounter issues:

1. **Check GitHub Actions** logs first
2. **Review server logs** for errors
3. **Verify configuration** and secrets
4. **Test manually** on server if needed

---

**Last Updated**: 2025-08-28  
**Version**: 1.0.4  
**Author**: Markus Barta

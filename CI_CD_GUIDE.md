# CI/CD Pipeline Guide

Your project now has a complete automated CI/CD pipeline! Here's how it all works.

## 🚀 Pipeline Overview

### 3 GitHub Actions Workflows:

1. **Build & Test** (`.github/workflows/build.yml`)
   - Runs on every push/PR
   - Tests on Windows, macOS, Linux
   - Multiple Node.js versions (18, 20)

2. **Release** (`.github/workflows/release.yml`) 
   - Builds production installers
   - Publishes to GitHub Releases
   - Triggered by version tags

3. **Version Bump** (`.github/workflows/version-bump.yml`)
   - Easy version management
   - Manual trigger from GitHub UI

## 📋 How to Release Updates

### Method 1: Automatic (Recommended)

1. **Bump Version**:
   ```bash
   # Go to GitHub → Actions → Version Bump → Run workflow
   # Choose: patch (1.0.0 → 1.0.1), minor (1.0.0 → 1.1.0), or major (1.0.0 → 2.0.0)
   ```

2. **Auto-Release**:
   - Workflow creates version tag
   - Release workflow triggers automatically
   - Builds installers for all platforms
   - Creates GitHub release with download links

### Method 2: Manual

1. **Local Version Bump**:
   ```bash
   npm version patch  # or minor/major
   git push origin main --tags
   ```

2. **Triggers Release**:
   - Push of tag triggers release workflow
   - Installers built and published automatically

## 🔄 How Update Checking Works

### For Your App Users:

1. **First Install**: Download from GitHub Releases
2. **Auto-Update Process**:
   ```
   App Startup (3 seconds later)
   ↓
   Check GitHub API: /repos/owner/repo/releases/latest
   ↓
   Compare versions: local vs remote
   ↓
   If newer version found → Download installer
   ↓
   When complete → Prompt user to install
   ↓
   User chooses → App restarts with new version
   ```

### Technical Details:

```javascript
// Version comparison (semantic versioning)
Current App: "1.0.0"  
GitHub Release: "1.0.1"
Result: Update available ✅

Current App: "1.0.1"
GitHub Release: "1.0.1"  
Result: Up to date ❌

Current App: "1.1.0"
GitHub Release: "1.0.5"
Result: No downgrade ❌
```

## 🛠 Pipeline Configuration

### Required GitHub Secrets:
- **GITHUB_TOKEN**: Automatically provided by GitHub
- **No additional secrets needed!**

### Workflow Triggers:

#### Build Workflow:
```yaml
on:
  push:
    branches: [ main, develop ]  # Test every commit
  pull_request:
    branches: [ main ]          # Test every PR
```

#### Release Workflow:
```yaml
on:
  push:
    tags: [ 'v*' ]             # Auto-release on version tags
  workflow_dispatch:           # Manual trigger option
```

## 📦 What Gets Built

### Windows:
- `Advanced-Data-Extractor-Setup-1.0.1.exe` (NSIS installer)
- `latest.yml` (update metadata)

### macOS:
- `Advanced-Data-Extractor-1.0.1.dmg` 
- `latest-mac.yml`

### Linux:
- `Advanced-Data-Extractor-1.0.1.AppImage`
- `latest-linux.yml`

## 🎯 Development Workflow

### Daily Development:
```bash
# 1. Make changes
git add .
git commit -m "Add new feature"
git push origin main

# 2. Pipeline automatically:
#    - Runs tests
#    - Builds app
#    - Verifies on all platforms
```

### Release Day:
```bash
# Option A: Use GitHub UI
# Go to Actions → Version Bump → Run workflow

# Option B: Command line
npm version patch
git push origin main --tags

# Pipeline automatically:
# - Builds production installers
# - Creates GitHub release
# - Users get auto-update notifications
```

## 🔍 Monitoring & Debugging

### Check Pipeline Status:
- Go to GitHub → Actions tab
- See all workflow runs and their status
- Download build artifacts if needed

### Common Issues:

1. **Build Fails**:
   - Check Actions tab for error logs
   - Usually dependency or syntax issues

2. **Release Fails**:
   - Verify version format (e.g., "1.0.1", not "v1.0.1")
   - Check GitHub token permissions

3. **Auto-Update Fails**:
   - Verify `package.json` has correct GitHub repo info
   - Check user's internet connection
   - Look at app console logs

## 🚀 Benefits of This Setup

### For You (Developer):
- ✅ **Zero-effort releases**: Just bump version, pipeline does the rest
- ✅ **Multi-platform builds**: Windows, Mac, Linux automatically
- ✅ **Quality assurance**: Tests run on every change
- ✅ **Rollback ready**: All versions preserved in releases

### For Your Users:
- ✅ **Automatic updates**: No manual downloads
- ✅ **Always latest**: App stays current automatically  
- ✅ **Professional experience**: Like VS Code, Slack, etc.
- ✅ **Choice**: Can install now or later

## 📋 Quick Commands Reference

```bash
# Development
npm run dev              # Run in development mode
npm run build:raw        # Build without installer
npm run build:win        # Build Windows installer

# Testing locally
npm install              # Install new dependencies
npm test                 # Run tests (when added)

# Version management
npm version patch        # 1.0.0 → 1.0.1
npm version minor        # 1.0.0 → 1.1.0  
npm version major        # 1.0.0 → 2.0.0

# Manual publishing (if needed)
npm run publish          # Build and publish to GitHub
```

Your app now has enterprise-grade CI/CD! 🎉

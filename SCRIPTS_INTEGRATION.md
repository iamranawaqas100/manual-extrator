# 🔧 Scripts & CI/CD Integration Map

## 📋 Your Clean Scripts & Where They're Used

| Script | Used By | Purpose | When It Runs |
|--------|---------|---------|--------------|
| `npm run dev` | **👨‍💻 You (Developer)** | Development with hot reload | Daily coding |
| `npm start` | **👨‍💻 You (Developer)** | Run production app locally | Local testing |
| `npm run build` | **🤖 GitHub Actions** | Test builds (no installer) | Every push/PR |
| `npm run build:win` | **🤖 GitHub Actions** | Windows installer creation | Release pipeline |
| `npm run publish` | **🤖 GitHub Actions** | Build + publish to GitHub | Release pipeline |

## 🚀 CI/CD Pipeline Integration

### **1. Build & Test Workflow** (`.github/workflows/build.yml`)
```yaml
# Runs on: Every push/PR
# Uses: npm run build
# Purpose: Test that app compiles on all platforms
```

**What happens:**
```bash
npm ci                    # Install dependencies
npm run build            # Create app folder (test build)
# Upload artifacts for review
```

### **2. Release Workflow** (`.github/workflows/release.yml`)
```yaml
# Runs on: Version tags (v1.0.1, v1.2.0)  
# Uses: npm run build:win + npm run publish
# Purpose: Create installers and publish to GitHub Releases
```

**What happens:**
```bash
# Windows Release:
npm run build:win        # Create .exe installer
npm run publish          # Upload to GitHub Releases

# macOS Release:
npx electron-builder --mac --publish=always

# Linux Release:  
npx electron-builder --linux --publish=always
```

### **3. Version Bump Workflow** (`.github/workflows/version-bump.yml`)
```yaml
# Runs on: Manual trigger from GitHub UI
# Uses: npm version (built-in command)
# Purpose: Increment version and trigger release
```

**What happens:**
```bash
npm version patch        # 1.0.0 → 1.0.1
git push --tags         # Triggers release workflow
```

## 🔄 Auto-Update Mechanism

### **How Users Get Updates:**
```
1. User's App → Checks GitHub API
2. GitHub API → Returns latest version info  
3. User's App → Downloads from GitHub Releases
4. User's App → Installs new version
```

### **Files Created by CI/CD for Auto-Updates:**

**Windows:**
- `Advanced-Data-Extractor-Setup-1.0.1.exe` ← Created by `npm run build:win`
- `latest.yml` ← Created by `npm run publish`

**macOS:**
- `Advanced-Data-Extractor-1.0.1.dmg` ← Created by direct electron-builder
- `latest-mac.yml` ← Metadata for updates

**Linux:**
- `Advanced-Data-Extractor-1.0.1.AppImage` ← Created by direct electron-builder  
- `latest-linux.yml` ← Metadata for updates

## 🎯 Complete Flow: Code to User Updates

### **Developer Side:**
```
1. You: Code changes → git push
2. GitHub Actions: npm run build (test)
3. You: Ready to release → GitHub Actions "Version Bump"
4. GitHub Actions: npm version patch → git tag
5. GitHub Actions: npm run build:win + npm run publish
6. GitHub Releases: Hosts new .exe and latest.yml
```

### **User Side:**
```
1. User starts app
2. App reads local version (package.json): "1.0.0"
3. App checks GitHub API: GET /releases/latest
4. GitHub returns: latest.yml with version "1.0.1"
5. App compares: 1.0.1 > 1.0.0 = Update available!
6. App downloads: Advanced-Data-Extractor-Setup-1.0.1.exe
7. User sees: "Update ready to install"
8. User clicks "Install" → App restarts with v1.0.1
```

## 🛠 Your Workflow Commands

### **Daily Development:**
```bash
npm run dev              # Code with hot reload ✅
```

### **Local Testing:**
```bash
npm start               # Test production app ✅
npm run build          # Test build process ✅
npm run build:win      # Create installer for sharing ✅
```

### **Production Release:**
```bash
# DON'T run commands manually! ❌
# Instead use GitHub Actions: ✅
# Go to: Actions → Version Bump → Run workflow
```

## 🔄 Scripts NOT Used by CI/CD

These scripts are for **your local development only**:
- `npm run dev` - Your daily coding
- `npm start` - Local testing

## 🤖 Scripts ONLY Used by CI/CD

These scripts are **automated in the cloud**:
- `npm run build` - Testing builds  
- `npm run build:win` - Production Windows installer
- `npm run publish` - Upload to GitHub Releases

## 🎉 The Magic

**You write code → GitHub Actions uses your scripts → Users get auto-updates**

No manual intervention needed! Your scripts power the entire automated pipeline. 🚀

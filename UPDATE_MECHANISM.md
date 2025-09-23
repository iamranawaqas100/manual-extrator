# How Auto-Update Detection Works

## Update Checking Process

### 1. **App Startup Check**
```javascript
// In main.js - happens 3 seconds after app starts
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
  setTimeout(() => {
    checkForUpdates()
  }, 3000)
}
```

### 2. **Version Comparison Process**

#### Current Version (App)
- Reads from `package.json`: `"version": "1.0.0"`
- App knows its current version

#### Remote Version Check
- electron-updater makes HTTPS request to GitHub API
- Checks: `https://api.github.com/repos/your-username/advanced-data-extractor/releases/latest`
- Downloads: `latest.yml` metadata file

#### Example latest.yml:
```yaml
version: 1.0.1
files:
  - url: Advanced-Data-Extractor-Setup-1.0.1.exe
    sha512: abc123...
    size: 45678901
path: Advanced-Data-Extractor-Setup-1.0.1.exe
sha512: abc123...
releaseDate: '2024-01-15T10:30:00.000Z'
```

### 3. **Update Decision Logic**
```javascript
// electron-updater compares versions using semver
const currentVersion = "1.0.0"  // from app's package.json
const remoteVersion = "1.0.1"   // from latest.yml

if (semver.gt(remoteVersion, currentVersion)) {
  // Update available! Start download
  autoUpdater.emit('update-available', updateInfo)
} else {
  // No update needed
  autoUpdater.emit('update-not-available', updateInfo)
}
```

## Update Detection Scenarios

### ✅ Update Available
- **Remote**: v1.0.1
- **Local**: v1.0.0
- **Result**: Download starts automatically

### ❌ No Update Available  
- **Remote**: v1.0.0
- **Local**: v1.0.0
- **Result**: "App is up to date"

### 🔄 Downgrade Prevention
- **Remote**: v1.0.0
- **Local**: v1.0.1
- **Result**: No update (prevents downgrades)

## Manual Update Check

Users can also trigger manual checks via:
- **Menu**: Help → Check for Updates
- **API**: `window.electronAPI.checkForUpdates()`

## Update States in Your App

### Console Logs You'll See:
```javascript
// Initial check
console.log('Checking for update...')

// If update found
console.log('Update available:', '1.0.1')
console.log('Download speed: 1234567 - Downloaded 45% (2MB/4MB)')
console.log('Update downloaded:', '1.0.1')

// If no update
console.log('Update not available:', '1.0.0')
```

### User Experience Flow:
1. **Silent Check**: App checks GitHub releases
2. **Background Download**: If update found, downloads silently
3. **User Prompt**: Shows dialog when download complete
4. **Install Choice**: User picks "Install Now" or "Later"
5. **Restart**: App restarts with new version

## Technical Details

### Network Requirements:
- **HTTPS access** to GitHub API
- **Firewall**: Allow app to download updates
- **Certificates**: GitHub's SSL certificates must be valid

### File Locations:
- **Updates cache**: `%APPDATA%/advanced-data-extractor/pending`
- **App data**: `%APPDATA%/advanced-data-extractor/`
- **Logs**: Console and app logs show update progress

### Security:
- **SHA512 verification**: Downloaded files are verified
- **HTTPS only**: All downloads over secure connections
- **Signature check**: Windows installers are verified

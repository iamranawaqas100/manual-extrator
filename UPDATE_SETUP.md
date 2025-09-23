# Auto-Update Setup Guide

Your Electron app now has auto-update functionality! Here's how to set it up:

## Quick Setup with GitHub Releases (Recommended)

### 1. Update package.json Configuration
In your `package.json`, update the GitHub info in the publish section:

```json
"publish": {
  "provider": "github",
  "owner": "your-github-username",
  "repo": "advanced-data-extractor"
}
```

### 2. Create GitHub Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` permissions
3. Copy the token

### 3. Set Environment Variable
Set the GitHub token as an environment variable:

**Windows:**
```cmd
set GH_TOKEN=your_github_token_here
```

**PowerShell:**
```powershell
$env:GH_TOKEN="your_github_token_here"
```

### 4. Build and Publish
```bash
# Install the new dependency first
npm install

# Build installers for Windows
npm run build:win

# Publish to GitHub releases (this will upload installers and create release)
npm run publish
```

## How It Works

### For Users:
1. **First Install**: Users download and install your `.exe` from GitHub releases
2. **Auto Updates**: 
   - App checks for updates 3 seconds after startup
   - Downloads updates silently in background
   - Prompts user when ready to install
   - User can choose "Install Now" or "Install Later"

### For You (Developer):
1. **Release Process**:
   ```bash
   # Update version in package.json
   # npm version patch (or minor/major)
   
   # Build and publish
   npm run publish
   ```

2. **What gets uploaded**:
   - `Advanced-Data-Extractor-Setup-1.0.0.exe` (Windows installer)
   - `latest.yml` (update metadata)

## Alternative: Custom Update Server

If you prefer hosting updates yourself:

### 1. Update package.json
```json
"publish": {
  "provider": "generic",
  "url": "https://your-domain.com/updates/"
}
```

### 2. Server Requirements
- HTTPS endpoint serving:
  - `latest.yml` (update metadata)
  - `.exe` installer files
- Proper CORS headers for your app

### 3. Upload Process
```bash
npm run build:win
# Manually upload dist/*.exe and dist/latest.yml to your server
```

## Testing Updates

### Test in Development:
```javascript
// In main.js, temporarily enable in dev mode:
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    checkForUpdates()
  }, 3000)
}
```

### Test Flow:
1. Create v1.0.1 with a small change
2. Publish to GitHub releases
3. Install v1.0.0 locally
4. Run app - it should detect and offer v1.0.1 update

## User Experience

### Update Available:
- App automatically checks for updates on startup
- Downloads happen in background
- User sees dialog: "Version X.X.X has been downloaded and is ready to install"
- Options: "Install and Restart" or "Install Later"

### Manual Check:
- Users can check via Help → Check for Updates menu

## Troubleshooting

### Common Issues:
1. **Update check fails**: Verify GitHub token and repo permissions
2. **Download fails**: Check internet connection and GitHub releases
3. **Install fails**: Ensure app has write permissions

### Debug Logs:
Check console for update-related logs:
```javascript
// These will appear in your app console
console.log('Checking for update...')
console.log('Update available:', info.version)
console.log('Update downloaded:', info.version)
```

## Security Notes

- Updates are downloaded over HTTPS
- Signature verification is handled by electron-updater
- GitHub releases provide secure hosting
- Users can always verify downloads manually

## Next Steps

1. Update the GitHub repo info in package.json
2. Set up your GitHub token
3. Test the update process
4. Document for your users how to get updates

Your app now has professional auto-update capabilities like VS Code, Slack, and other major Electron apps! 🚀

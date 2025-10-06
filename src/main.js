const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, BrowserView } = require('electron')
const { autoUpdater } = require('electron-updater')
const { updateElectronApp } = require('update-electron-app')
const path = require('path')
const fs = require('fs')
const http = require('http')

// Expose a DevTools Protocol endpoint only in development mode
// In production, this could be detected by Cloudflare
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_CDP === 'true') {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
  app.commandLine.appendSwitch('remote-allow-origins', '*')
  console.log('CDP debugging enabled on port 9222')
}

// Add command line switches to make browser appear more legitimate
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')
app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process')
app.commandLine.appendSwitch('disable-site-isolation-trials')

// Keep a global reference of the window object
let mainWindow
// In-memory data storage
let extractedData = []
let templates = []
let updateCheckInProgress = false

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname)
  } catch (e) {
    console.log('electron-reload not available (optional dependency):', e.message)
  }
}

// Initialize in-memory data storage
function initializeDataStorage() {
  console.log('Initialized in-memory data storage')
  // Data will be stored in memory arrays
  extractedData = []
  templates = []
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload', 'preload.js'),
      webviewTag: true, // Enable webview tag
      webSecurity: false // Needed for cross-origin requests in development
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    titleBarStyle: 'default',
    show: false // Don't show until ready
  })

  // Load the login page first
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'login.html'))

  // Configure webview permissions and headers for realistic browser behavior
  // Only modify CSP if it's blocking our app, don't remove it completely
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    
    // Don't completely remove CSP, just relax it if needed
    // This prevents breaking sites that rely on CSP for functionality
    if (headers['content-security-policy'] || headers['Content-Security-Policy']) {
      // Keep CSP but ensure it doesn't block rendering
      // We only modify it for our app, not for all sites
    }
    
    callback({ responseHeaders: headers })
  })
  
  // Add realistic request headers to bypass bot detection
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders
    
    // CRITICAL: Remove X-Requested-With header - Cloudflare Turnstile ALWAYS fails with this
    delete headers['X-Requested-With']
    
    // Remove headers that expose automation
    delete headers['X-DevTools-Emulate-Network-Conditions-Client-Id']
    
    // Add realistic headers that browsers send (but don't override existing ones)
    if (!headers['Accept-Language']) {
      headers['Accept-Language'] = 'en-US,en;q=0.9'
    }
    if (!headers['Accept-Encoding']) {
      headers['Accept-Encoding'] = 'gzip, deflate, br'
    }
    if (!headers['Sec-Fetch-Dest']) {
      headers['Sec-Fetch-Dest'] = 'document'
    }
    if (!headers['Sec-Fetch-Mode']) {
      headers['Sec-Fetch-Mode'] = 'navigate'
    }
    if (!headers['Sec-Fetch-Site']) {
      headers['Sec-Fetch-Site'] = 'none'
    }
    if (!headers['Sec-Fetch-User']) {
      headers['Sec-Fetch-User'] = '?1'
    }
    if (!headers['Upgrade-Insecure-Requests']) {
      headers['Upgrade-Insecure-Requests'] = '1'
    }
    
    callback({ requestHeaders: headers })
  })

  // Handle webview permission requests
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  // Enable webview preload scripts with stealth mode
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Inject stealth preload script to bypass bot detection
    webPreferences.preload = path.join(__dirname, 'preload', 'stealthPreload.js')
    
    // Enable necessary permissions
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true // Better security
    webPreferences.webSecurity = true // Re-enable for legitimacy
    webPreferences.sandbox = true // Enable sandbox for security
    webPreferences.allowRunningInsecureContent = false
    webPreferences.javascript = true
    webPreferences.plugins = true
    webPreferences.webviewTag = true
    
    // Prevent crashes by enabling better resource management
    webPreferences.backgroundThrottling = false
    webPreferences.offscreen = false
    
    // IMPORTANT: According to Cloudflare Community, use Electron's DEFAULT user agent
    // Don't override it - let Electron use its natural user agent
    // webPreferences.userAgent is NOT set here intentionally
    
    // Enable features that make the browser look more legitimate
    webPreferences.enableBlinkFeatures = 'ExecutionContext'
    webPreferences.experimentalFeatures = true
    webPreferences.spellcheck = true
    
    console.log('Webview attached with stealth mode and default user agent')
  })

  // Block external window opens; keep navigation inside the app
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))


  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
    
    // Check for updates (only in production) - Professional Implementation with Detailed Logging
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
      console.log('🚀 Auto-updater initializing...')
      console.log('📦 Current version:', app.getVersion())
      console.log('🔗 Repository:', 'iamranawaqas100/manual-extrator')
      
      // Use the official Electron update module for GitHub releases
      updateElectronApp({
        repo: 'iamranawaqas100/manual-extrator',
        updateInterval: '5 minutes', // Check more frequently for testing
        logger: console
      })
      
      // Enhanced manual check with detailed logging
      setTimeout(() => {
        console.log('⏰ Manual update check starting in 3 seconds...')
        checkForUpdates()
      }, 3000)
      
      // Send logs to renderer for UI display
      autoUpdater.on('checking-for-update', () => {
        console.log('🔍 Checking for update...')
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-log', '🔍 Checking for update...')
        }
      })
      
      autoUpdater.on('update-available', (info) => {
        console.log('✅ Update available:', info.version)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-log', `✅ Update available: ${info.version}`)
        }
      })
      
      autoUpdater.on('update-not-available', (info) => {
        console.log('❌ Update not available. Current version:', info.version)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-log', `❌ Update not available. Current: ${info.version}`)
        }
      })
      
      autoUpdater.on('error', (err) => {
        console.error('💥 Update error:', err)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-log', `💥 Update error: ${err.message}`)
        }
      })
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Extraction',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-extraction')
          }
        },
        {
          label: 'Open URL',
          accelerator: 'CmdOrCtrl+L',
          click: async () => {
            await dialog.showMessageBox(mainWindow, {
              type: 'question',
              title: 'Open URL',
              message: 'This feature requires the URL input in the main interface.',
              detail: 'Please use the URL bar at the top of the application to navigate to a website.',
              buttons: ['OK']
            })
          }
        },
        { type: 'separator' },
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-data')
          }
        },
        { type: 'separator' },
        {
          label: 'Logout',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => {
            mainWindow.webContents.executeJavaScript(`
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('username');
              localStorage.removeItem('loginTime');
              window.location.href = 'login.html';
            `)
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Clear All Data',
          click: () => {
            mainWindow.webContents.send('menu-clear-data')
          }
        },
        {
          label: 'Find Similar Elements',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu-find-similar')
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            checkForUpdates()
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            const packageInfo = require('../package.json')
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Advanced Data Extractor',
              message: `Advanced Data Extractor v${packageInfo.version}`,
              detail: 'Professional web scraping tool with Chrome extension functionality.\n\nBuilt with Electron, React, and modern web technologies.'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC Handlers
ipcMain.handle('get-app-version', async () => {
  return require('../package.json').version
})

ipcMain.handle('get-extracted-data', async () => {
  // Return data sorted by creation date (newest first)
  return extractedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

ipcMain.handle('save-extracted-data', async (event, data) => {
  const { url, title, description, image, price } = data
  
  // Generate a unique ID
  const id = extractedData.length > 0 ? Math.max(...extractedData.map(item => item.id)) + 1 : 1
  
  const newItem = {
    id,
    url,
    title,
    description,
    image,
    price,
    verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  extractedData.push(newItem)
  return newItem
})

ipcMain.handle('update-extracted-data', async (event, id, data) => {
  const { title, description, image, price, verified } = data
  
  const itemIndex = extractedData.findIndex(item => item.id === id)
  if (itemIndex === -1) {
    throw new Error(`Item with id ${id} not found`)
  }
  
  extractedData[itemIndex] = {
    ...extractedData[itemIndex],
    title,
    description,
    image,
    price,
    verified: verified || false,
    updated_at: new Date().toISOString()
  }
  
  return { id, ...data }
})

ipcMain.handle('delete-extracted-data', async (event, id) => {
  const itemIndex = extractedData.findIndex(item => item.id === id)
  if (itemIndex === -1) {
    throw new Error(`Item with id ${id} not found`)
  }
  
  extractedData.splice(itemIndex, 1)
  return true
})

ipcMain.handle('export-data', async (event, format = 'json') => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Extracted Data',
    defaultPath: `extracted-data-${new Date().toISOString().slice(0, 10)}.${format}`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  })

  if (!result.canceled) {
    try {
      // Get data sorted by creation date (newest first)
      const rows = extractedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      let content
      if (format === 'csv' || result.filePath.endsWith('.csv')) {
        // Convert to CSV
        const headers = ['ID', 'URL', 'Title', 'Description', 'Image', 'Price', 'Verified', 'Created At']
        const csvRows = [headers.join(',')]
        
        rows.forEach(row => {
          const values = [
            row.id,
            `"${(row.url || '').replace(/"/g, '""')}"`,
            `"${(row.title || '').replace(/"/g, '""')}"`,
            `"${(row.description || '').replace(/"/g, '""')}"`,
            `"${(row.image || '').replace(/"/g, '""')}"`,
            `"${(row.price || '').replace(/"/g, '""')}"`,
            row.verified ? 'Yes' : 'No',
            row.created_at
          ]
          csvRows.push(values.join(','))
        })
        
        content = csvRows.join('\n')
      } else {
        // Convert to JSON
        content = JSON.stringify(rows, null, 2)
      }

      fs.writeFileSync(result.filePath, content, 'utf8')
      return { success: true, path: result.filePath, count: rows.length }
    } catch (error) {
      throw new Error(`Export processing error: ${error.message}`)
    }
  }
  
  return { success: false, canceled: true }
})




// Handle protocol URL at startup (Windows)
function handleStartupProtocol() {
  const protocolArg = process.argv.find(arg => arg.startsWith('dataextractor://'))
  if (protocolArg) {
    console.log('📱 Startup protocol URL:', protocolArg)
    // Wait for app to be ready, then handle the URL
    setTimeout(() => {
      handleProtocolUrl(protocolArg)
    }, 2000)
  }
}

// App event handlers
app.whenReady().then(() => {
  initializeDataStorage()
  createWindow()
  createMenu()
  
  // Handle protocol URL from startup
  handleStartupProtocol()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Clear in-memory data on app close
    extractedData = []
    templates = []
    console.log('In-memory data cleared')
    app.quit()
  }
})

app.on('before-quit', () => {
  // Clear in-memory data before quit
  extractedData = []
  templates = []
})


// Auto-updater functions
function checkForUpdates() {
  if (updateCheckInProgress) return
  
  updateCheckInProgress = true
  console.log('Checking for updates...')
  
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    console.log('Update check failed:', err)
    updateCheckInProgress = false
  })
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...')
})

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-log', `✅ Update available: ${info.version}`)
    
    // Show update dialog immediately
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Download and Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Available',
      message: `Version ${info.version} is available!`,
      detail: 'A new version of the application is available. Would you like to download and install it now?'
    })
    
    if (response === 0) {
      // User chose to download and install
      console.log('User chose to download update')
      mainWindow.webContents.send('update-log', '📥 Starting download...')
      // Download will start automatically
    } else {
      // User chose later
      console.log('User chose to install later')
      mainWindow.webContents.send('update-log', '⏰ Update postponed')
    }
    
    mainWindow.webContents.send('update-available', info)
  }
})

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info.version)
  updateCheckInProgress = false
})

autoUpdater.on('error', (err) => {
  console.error('Update error:', err)
  updateCheckInProgress = false
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-log', `💥 Update error: ${err.message}`)
    
    // Show error dialog only for critical errors
    if (err.message.includes('ENOTFOUND') || err.message.includes('network')) {
      dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['OK'],
        title: 'Update Check Failed',
        message: 'Unable to check for updates',
        detail: 'Please check your internet connection and try again later.'
      })
    }
  }
})

autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = `📥 Download progress: ${Math.round(progressObj.percent)}%`
  console.log(logMessage)
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-log', logMessage)
    mainWindow.webContents.send('download-progress', progressObj)
  }
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version)
  updateCheckInProgress = false
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-log', `✅ Update downloaded: v${info.version}`)
    
    // Show installation dialog
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      buttons: ['Restart and Install', 'Install Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Ready',
      message: `Version ${info.version} is ready to install!`,
      detail: 'The application will restart to apply the update. Click "Restart and Install" to update now, or "Install Later" to update on next app start.'
    })
    
    if (response === 0) {
      // User chose to install now
      console.log('User chose to restart and install')
      mainWindow.webContents.send('update-log', '🔄 Restarting to install update...')
      setImmediate(() => autoUpdater.quitAndInstall())
    } else {
      // User chose to install later
      console.log('User chose to install later')
      mainWindow.webContents.send('update-log', '⏰ Update will install on next restart')
      mainWindow.webContents.send('update-ready', info)
    }
  }
})

// IPC handlers for manual update checking
ipcMain.handle('check-for-updates', async () => {
  try {
    checkForUpdates()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('install-update', async () => {
  try {
    autoUpdater.quitAndInstall()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Handle protocol for deep linking
app.setAsDefaultProtocolClient('dataextractor')

// Prevent multiple instances and handle protocol URLs
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  console.log('🚫 Another instance is running, quitting...')
  app.quit()
} else {
  // Handle protocol URL when app is already running (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault()
    console.log('📱 Protocol URL received (open-url):', url)
    handleProtocolUrl(url)
  })

  // Handle protocol URL when someone tries to run a second instance (Windows/Linux)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    console.log('📱 Second instance detected, focusing existing window')
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.show()
      
      // Check for protocol URL in command line
      const protocolUrl = commandLine.find(arg => arg.startsWith('dataextractor://'))
      if (protocolUrl) {
        console.log('📱 Protocol URL from second instance:', protocolUrl)
        handleProtocolUrl(protocolUrl)
      }
    }
  })
}

function handleProtocolUrl(url) {
  console.log('🔗 Processing protocol URL:', url)
  console.log('🕵️ Protocol URL type:', typeof url)
  console.log('🕵️ Protocol URL length:', url.length)
  
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('❌ Main window not available, creating new window')
    createWindow()
    // Wait for window to be ready, then retry
    setTimeout(() => handleProtocolUrl(url), 1000)
    return
  }
  
  console.log('✅ Main window available, proceeding with protocol handling')
  
  try {
    // Parse URL: dataextractor://extract?url=https://example.com
    console.log('🔍 Attempting to parse URL...')
    const urlObj = new URL(url)
    console.log('✅ URL parsed successfully')
    console.log('🔍 Protocol:', urlObj.protocol)
    console.log('🔍 Hostname:', urlObj.hostname)
    console.log('🔍 Search params:', urlObj.searchParams.toString())
    
    if (urlObj.protocol === 'dataextractor:') {
      const action = urlObj.hostname // extract, open, etc.
      const targetUrl = urlObj.searchParams.get('url')
      
      console.log('🎯 Action:', action)
      console.log('🌐 Target URL (raw):', targetUrl)
      console.log('🌐 Target URL (decoded):', targetUrl ? decodeURIComponent(targetUrl) : 'null')
      
      if (action === 'extract' && targetUrl) {
        // Focus and show the window first
        mainWindow.show()
        mainWindow.focus()
        
        // Store protocol data for use after auth
        global.pendingProtocolData = {
          action: 'extract',
          url: decodeURIComponent(targetUrl)
        }
        
        // Send the URL to the renderer process immediately
        const decodedUrl = decodeURIComponent(targetUrl)
        console.log('📤 Sending to renderer process...')
        console.log('📤 Decoded URL for renderer:', decodedUrl)
        
        mainWindow.webContents.send('protocol-extract', {
          action: 'extract',
          url: decodedUrl,
          bypassAuth: true // Flag to bypass authentication
        })
        
        // Show a notification in the update log
        mainWindow.webContents.send('update-log', `🌐 Opened from website: ${decodedUrl}`)
        
        console.log('✅ Protocol URL processed and sent to renderer successfully')
      }
    }
  } catch (error) {
    console.error('❌ Error parsing protocol URL:', error)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-log', `❌ Invalid URL format: ${url}`)
    }
  }
}

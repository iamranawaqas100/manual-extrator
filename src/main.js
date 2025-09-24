const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, BrowserView } = require('electron')
const { autoUpdater } = require('electron-updater')
const { updateElectronApp } = require('update-electron-app')
const path = require('path')
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()
const http = require('http')
const WebSocket = require('ws')

// Expose a DevTools Protocol endpoint so external automation (e.g., Playwright)
// can attach to this Electron instance instead of launching a separate Chromium
app.commandLine.appendSwitch('remote-debugging-port', '9222')
app.commandLine.appendSwitch('remote-allow-origins', '*')

// Keep a global reference of the window object
let mainWindow
let db
let aiView = null
let aiViewActive = false
let extractionWebSocket = null
let updateCheckInProgress = false

async function resolveCdpWsUrl() {
  return new Promise((resolve) => {
    try {
      const options = { hostname: '127.0.0.1', port: 9222, path: '/json/version', method: 'GET' }
      const req = http.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            const ws = json.webSocketDebuggerUrl
            resolve(ws || 'http://127.0.0.1:9222')
          } catch (e) {
            console.warn('Error parsing CDP response:', e.message)
            resolve('http://127.0.0.1:9222')
          }
        })
      })
      req.on('error', (err) => {
        console.warn('CDP request error:', err.message)
        resolve('http://127.0.0.1:9222')
      })
      req.end()
    } catch (e) {
      console.warn('CDP connection error:', e.message)
      resolve('http://127.0.0.1:9222')
    }
  })
}

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname)
  } catch (e) {
    console.log('electron-reload not available (optional dependency):', e.message)
  }
}

function createDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'extractor.db')
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err)
    } else {
      console.log('Connected to SQLite database')
      
      // Create tables if they don't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS extracted_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL,
          title TEXT,
          description TEXT,
          image TEXT,
          price TEXT,
          verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      db.run(`
        CREATE TABLE IF NOT EXISTS templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          url_pattern TEXT,
          selectors TEXT, -- JSON string
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
    }
  })
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

  // Configure webview permissions
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['']
      }
    })
  })

  // Handle webview permission requests
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  // Enable webview preload scripts
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Delete the existing preload to avoid conflicts
    delete webPreferences.preload
    
    // Enable necessary permissions
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = false
    webPreferences.webSecurity = false
    webPreferences.allowRunningInsecureContent = true
    webPreferences.javascript = true
    webPreferences.plugins = true
    
    // Allow the webview to execute JavaScript
    webPreferences.webviewTag = true
  })

  // Block external window opens; keep navigation inside the app
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Ensure AI BrowserView is cleared on window close
  mainWindow.on('close', () => {
    try {
      if (aiView) {
        mainWindow.removeBrowserView(aiView)
        aiView.destroy()
        aiView = null
      }
    } catch (e) {
      console.warn('Error cleaning up AI view:', e.message)
    }
  })

  // Keep AI BrowserView bounds in sync when the window is resized
  mainWindow.on('resize', () => {
    try {
      if (!aiView || aiViewActive) return
      const bounds = mainWindow.getContentBounds()
      const leftPaneWidth = 260
      const rightPaneWidth = 360
      const topBarHeight = 64
      const x = leftPaneWidth
      const y = topBarHeight
      const width = Math.max(600, bounds.width - leftPaneWidth - rightPaneWidth)
      const height = Math.max(400, bounds.height - topBarHeight)
      aiView.setBounds({ x, y, width, height })
    } catch (e) {
      console.warn('Error resizing AI view:', e.message)
    }
  })

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
    
    // Initialize WebSocket connection for extraction logs
    initializeWebSocket()
    
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
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM extracted_data ORDER BY created_at DESC', [], (err, rows) => {
      if (err) reject(new Error(`Database error: ${err.message}`))
      else resolve(rows)
    })
  })
})

ipcMain.handle('save-extracted-data', async (event, data) => {
  return new Promise((resolve, reject) => {
    const { url, title, description, image, price } = data
    
    db.run(
      'INSERT INTO extracted_data (url, title, description, image, price) VALUES (?, ?, ?, ?, ?)',
      [url, title, description, image, price],
      function(err) {
        if (err) reject(new Error(`Database save error: ${err.message}`))
        else resolve({ id: this.lastID, ...data })
      }
    )
  })
})

ipcMain.handle('update-extracted-data', async (event, id, data) => {
  return new Promise((resolve, reject) => {
    const { title, description, image, price, verified } = data
    
    db.run(
      'UPDATE extracted_data SET title = ?, description = ?, image = ?, price = ?, verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, image, price, verified ? 1 : 0, id],
      function(err) {
        if (err) reject(new Error(`Database update error: ${err.message}`))
        else resolve({ id, ...data })
      }
    )
  })
})

ipcMain.handle('delete-extracted-data', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM extracted_data WHERE id = ?', [id], function(err) {
      if (err) reject(new Error(`Database delete error: ${err.message}`))
      else resolve(true)
    })
  })
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
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM extracted_data ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
          reject(new Error(`Database export error: ${err.message}`))
          return
        }

        try {
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
          resolve({ success: true, path: result.filePath, count: rows.length })
        } catch (error) {
          reject(new Error(`Export processing error: ${error.message}`))
        }
      })
    })
  }
  
  return { success: false, canceled: true }
})

// AI Extraction API call
ipcMain.handle('ai-extract', async (event, url) => {
  const cdpUrl = await resolveCdpWsUrl()
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ url, cdpUrl })
    
    const options = {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/menu/collect-electron',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    
    const req = http.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve({ success: true, data: result })
        } catch (error) {
          console.error('Error parsing AI response:', error.message)
          resolve({ success: false, error: `Invalid response from AI service: ${error.message}` })
        }
      })
    })
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message })
    })
    
    req.write(postData)
    req.end()
  })
})

// Optional: expose the CDP URL to renderers
ipcMain.handle('get-cdp-url', async () => await resolveCdpWsUrl())

// Create and show a BrowserView overlay for AI mode so backend can attach
ipcMain.handle('ai-view-show', async (event, targetUrl) => {
  try {
    if (!mainWindow) return { ok: false, error: 'no-window' }
    aiViewActive = true
    if (!aiView) {
      aiView = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false
        }
      })
    }
    try { 
      mainWindow.addBrowserView(aiView) 
    } catch (e) {
      console.warn('Error adding browser view:', e.message)
    }
    // Position over the existing browser area (matching index.html layout)
    const bounds = mainWindow.getContentBounds()
    const leftPaneWidth = 260 // approx navigation panel width
    const rightPaneWidth = 360 // approx data panel width
    const topBarHeight = 64 // title bar + url bar height
    const x = leftPaneWidth
    const y = topBarHeight
    const width = Math.max(600, bounds.width - leftPaneWidth - rightPaneWidth)
    const height = Math.max(400, bounds.height - topBarHeight)
    aiView.setBounds({ x, y, width, height })
    aiView.setAutoResize({ width: false, height: false })
    // Keep target stable: block popups and disable throttling
    try {
      aiView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
      aiView.webContents.setBackgroundThrottling(false)
    } catch (e) {
      console.warn('Error configuring AI view:', e.message)
    }
    if (targetUrl) {
      await aiView.webContents.loadURL(targetUrl)
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
})

ipcMain.handle('ai-view-hide', async () => {
  try {
    aiViewActive = false
    if (aiView && mainWindow) {
      mainWindow.removeBrowserView(aiView)
      aiView.destroy()
      aiView = null
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
})

// Show extraction method dialog
ipcMain.handle('show-extraction-dialog', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Choose Extraction Method',
    message: 'How would you like to extract data from this page?',
    buttons: ['AI Extraction (Automatic)', 'Manual Extraction'],
    defaultId: 0,
    cancelId: 1,
    detail: 'AI extraction will automatically detect and extract product information from the page. Manual extraction allows you to select specific elements.'
  })
  
  return result.response === 0 ? 'ai' : 'manual'
})

// App event handlers
app.whenReady().then(() => {
  createDatabase()
  createWindow()
  createMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close((err) => {
        if (err) console.error('Error closing database:', err)
        else console.log('Database connection closed')
      })
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (db) {
    db.close()
  }
  if (extractionWebSocket) {
    extractionWebSocket.close()
  }
})

// WebSocket connection for real-time extraction logs
function initializeWebSocket() {
  try {
    extractionWebSocket = new WebSocket('ws://127.0.0.1:8000/ws/extraction-logs')
    
    extractionWebSocket.on('open', () => {
      console.log('Connected to extraction logs WebSocket')
    })
    
    extractionWebSocket.on('message', (data) => {
      try {
        const logData = JSON.parse(data.toString())
        console.log('Received WebSocket log:', logData) // Debug log
        // Send log to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('Sending log to renderer...') // Debug log
          mainWindow.webContents.send('extraction-log', logData)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    })
    
    extractionWebSocket.on('close', () => {
      console.log('WebSocket connection closed')
      // Reconnect after 5 seconds
      setTimeout(initializeWebSocket, 5000)
    })
    
    extractionWebSocket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error)
    // Retry after 5 seconds
    setTimeout(initializeWebSocket, 5000)
  }
}

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

// Handle protocol for deep linking (optional)
app.setAsDefaultProtocolClient('advanced-data-extractor')

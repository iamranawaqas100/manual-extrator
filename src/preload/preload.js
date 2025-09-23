const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Data operations
  getExtractedData: () => ipcRenderer.invoke('get-extracted-data'),
  saveExtractedData: (data) => ipcRenderer.invoke('save-extracted-data', data),
  updateExtractedData: (id, data) => ipcRenderer.invoke('update-extracted-data', id, data),
  deleteExtractedData: (id) => ipcRenderer.invoke('delete-extracted-data', id),
  exportData: (format) => ipcRenderer.invoke('export-data', format),

  // AI extraction
  aiExtract: (url) => ipcRenderer.invoke('ai-extract', url),
  getCdpUrl: () => ipcRenderer.invoke('get-cdp-url'),
  aiViewShow: (url) => ipcRenderer.invoke('ai-view-show', url),
  aiViewHide: () => ipcRenderer.invoke('ai-view-hide'),
  showExtractionDialog: () => ipcRenderer.invoke('show-extraction-dialog'),

  // Menu event listeners
  onMenuNewExtraction: (callback) => ipcRenderer.on('menu-new-extraction', callback),
  onMenuExportData: (callback) => ipcRenderer.on('menu-export-data', callback),
  onMenuClearData: (callback) => ipcRenderer.on('menu-clear-data', callback),
  onMenuFindSimilar: (callback) => ipcRenderer.on('menu-find-similar', callback),
  
  // Extraction log events
  onExtractionLog: (callback) => ipcRenderer.on('extraction-log', callback),

  // Browser view communication
  sendToBrowser: (channel, data) => ipcRenderer.send('send-to-browser', channel, data),
  onBrowserMessage: (callback) => ipcRenderer.on('browser-message', callback),

  // System operations
  openExternal: (url) => require('electron').shell.openExternal(url),
  showItemInFolder: (path) => require('electron').shell.showItemInFolder(path),

  // App info
  getAppVersion: () => require('../../package.json').version,
  getAppName: () => require('../../package.json').name,

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback)
})

// Listen for browser messages and forward them
ipcRenderer.on('browser-data-extracted', (event, data) => {
  window.postMessage({ type: 'BROWSER_DATA_EXTRACTED', data }, '*')
})

ipcRenderer.on('browser-element-selected', (event, data) => {
  window.postMessage({ type: 'BROWSER_ELEMENT_SELECTED', data }, '*')
})

// Handle browser view communication
ipcRenderer.on('send-to-browser', (event, channel, data) => {
  // This will be handled by the browser preload script
})

console.log('Preload script loaded successfully')

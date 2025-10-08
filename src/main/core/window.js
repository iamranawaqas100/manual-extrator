/**
 * Window Management Module
 * Handles BrowserWindow creation and configuration
 * Functional approach to window management
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { BrowserWindow } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/constants');
const sessionService = require('../services/session');
const updater = require('../services/updater');

let mainWindow = null;

/**
 * Get main window instance
 */
const getMainWindow = () => mainWindow;

/**
 * Setup webview configuration
 */
const setupWebviewConfig = (window) => {
  // eslint-disable-next-line no-unused-vars
  window.webContents.on('will-attach-webview', (event, webPreferences, _params) => {
    webPreferences.preload = path.join(__dirname, '..', '..', 'preload', 'stealthPreload.js');
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.webSecurity = true;
    webPreferences.sandbox = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.javascript = true;
    webPreferences.plugins = true;
    webPreferences.webviewTag = true;
    webPreferences.backgroundThrottling = false;
    webPreferences.offscreen = false;
    webPreferences.enableBlinkFeatures = 'ExecutionContext';
    webPreferences.experimentalFeatures = true;
    webPreferences.spellcheck = true;

    logger.security('Webview attached with stealth mode and default user agent');
  });
};

/**
 * Setup window event handlers
 */
const setupWindowHandlers = (window) => {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  window.once('ready-to-show', () => {
    window.show();
    window.focus();

    // Initialize updater in production
    if (config.isProduction) {
      // eslint-disable-next-line import/no-extraneous-dependencies, global-require
      updater.initializeUpdater(require('electron').app);
    }
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (config.isDevelopment) {
    window.webContents.openDevTools();
  }
};

/**
 * Create main window
 */
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    minWidth: config.window.minWidth,
    minHeight: config.window.minHeight,
    webPreferences: {
      ...config.security,
      preload: path.join(__dirname, '..', '..', 'preload', 'preload.js'),
      webviewTag: true,
    },
    icon: path.join(__dirname, '..', '..', '..', 'assets', 'icon.ico'),
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'login.html'));

  // Setup configurations
  sessionService.initializeSession(mainWindow);
  setupWebviewConfig(mainWindow);
  setupWindowHandlers(mainWindow);

  // Set window reference in services
  updater.setMainWindow(mainWindow);

  logger.success('Main window created successfully');

  return mainWindow;
};

module.exports = {
  createWindow,
  getMainWindow,
};

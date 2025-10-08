/**
 * Main Process Entry Point
 * Clean, modular architecture following functional programming principles
 *
 * Architecture:
 * - config/ - Application constants and configuration
 * - core/ - Core functionality (window, menu, lifecycle)
 * - ipc/ - IPC communication handlers
 * - services/ - Business logic services
 * - utils/ - Utility functions
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { app } = require('electron');
const logger = require('./main/utils/logger');
const config = require('./main/config/constants');
const dataService = require('./main/services/data');
const windowManager = require('./main/core/window');
const menuManager = require('./main/core/menu');
const lifecycleManager = require('./main/core/lifecycle');
const ipcHandlers = require('./main/ipc/handlers');
const protocolService = require('./main/services/protocol');

// Enable live reload in development
if (config.isDevelopment) {
  try {
    // @ts-ignore - electron-reload is optional dev dependency
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    require('electron-reload')(__dirname);
    logger.debug('Electron reload enabled');
  } catch (/** @type {any} */ e) {
    logger.warn('Electron-reload not available (optional):', e.message);
  }
}

/**
 * Initialize application
 */
const initializeApp = () => {
  logger.info('Initializing Advanced Data Extractor...');

  // Initialize data storage
  dataService.initializeStorage();

  // Create main window
  const mainWindow = windowManager.createWindow();

  // Set window reference in services
  protocolService.setMainWindow(mainWindow);

  // Create application menu
  menuManager.createMenu(mainWindow);

  // Register IPC handlers
  ipcHandlers.registerHandlers(mainWindow);

  // Handle startup protocol URL
  protocolService.handleStartupProtocol();

  logger.success('Application initialized successfully');
};

/**
 * Main execution
 */
const main = () => {
  // Initialize lifecycle management
  lifecycleManager.initializeLifecycle(app, windowManager.createWindow);

  // Register protocol
  protocolService.registerProtocol(app);

  // Request single instance lock
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    logger.warn('Another instance is running, quitting...');
    app.quit();
    return;
  }

  // Setup protocol listeners
  protocolService.setupProtocolListeners(app);

  // Initialize app when ready
  app.whenReady().then(initializeApp);
};

// Run the application
main();

/**
 * Protocol Handler Service
 * Manages deep linking and protocol URLs
 * Functional approach to protocol handling
 */

const logger = require('../utils/logger');
const config = require('../config/constants');

let mainWindow = null;
let pendingProtocolData = null;

/**
 * Set main window reference
 */
const setMainWindow = (window) => {
  mainWindow = window;
};

/**
 * Get pending protocol data
 */
const getPendingProtocolData = () => pendingProtocolData;

/**
 * Clear pending protocol data
 */
const clearPendingProtocolData = () => {
  pendingProtocolData = null;
};

/**
 * Handle protocol URL
 */
const handleProtocolUrl = (url) => {
  logger.network('Processing protocol URL:', url);

  if (!mainWindow || mainWindow.isDestroyed()) {
    logger.error('Main window not available');
    return;
  }

  logger.success('Main window available, proceeding with protocol handling');

  try {
    const urlObj = new URL(url);
    logger.debug('Protocol:', urlObj.protocol);
    logger.debug('Hostname:', urlObj.hostname);
    logger.debug('Search params:', urlObj.searchParams.toString());

    if (urlObj.protocol === `${config.protocol.scheme}:`) {
      const action = urlObj.hostname;
      const targetUrl = urlObj.searchParams.get('url');

      logger.info('Action:', action);
      logger.network('Target URL:', targetUrl ? decodeURIComponent(targetUrl) : 'null');

      if (action === 'extract' && targetUrl) {
        mainWindow.show();
        mainWindow.focus();

        const decodedUrl = decodeURIComponent(targetUrl);
        const protocolData = {
          action: 'extract',
          url: decodedUrl,
          bypassAuth: true,
        };

        // Store for use after auth
        pendingProtocolData = protocolData;

        mainWindow.webContents.send('protocol-extract', protocolData);
        mainWindow.webContents.send('update-log', `🌐 Opened from website: ${decodedUrl}`);

        logger.success('Protocol URL processed successfully');
      }
    }
  } catch (error) {
    logger.error('Error parsing protocol URL:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-log', `❌ Invalid URL format: ${url}`);
    }
  }
};

/**
 * Handle startup protocol
 */
const handleStartupProtocol = () => {
  const protocolArg = process.argv.find((arg) => arg.startsWith(`${config.protocol.scheme}://`));

  if (protocolArg) {
    logger.info('Startup protocol URL:', protocolArg);
    setTimeout(() => handleProtocolUrl(protocolArg), 2000);
  }
};

/**
 * Register protocol
 */
const registerProtocol = (app) => {
  app.setAsDefaultProtocolClient(config.protocol.scheme);
  logger.success(`Protocol ${config.protocol.scheme}:// registered`);
};

/**
 * Setup protocol listeners
 */
const setupProtocolListeners = (app) => {
  // Handle protocol URL when app is already running (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    logger.network('Protocol URL received (open-url):', url);
    handleProtocolUrl(url);
  });

  // Handle protocol URL from second instance (Windows/Linux)
  // eslint-disable-next-line no-unused-vars
  app.on('second-instance', (event, commandLine, _workingDirectory) => {
    logger.info('Second instance detected, focusing existing window');

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();

      const protocolUrl = commandLine.find((arg) => arg.startsWith(`${config.protocol.scheme}://`));

      if (protocolUrl) {
        logger.network('Protocol URL from second instance:', protocolUrl);
        handleProtocolUrl(protocolUrl);
      }
    }
  });
};

module.exports = {
  setMainWindow,
  handleProtocolUrl,
  handleStartupProtocol,
  registerProtocol,
  setupProtocolListeners,
  getPendingProtocolData,
  clearPendingProtocolData,
};

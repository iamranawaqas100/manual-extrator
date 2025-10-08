/**
 * Application-wide constants
 * Centralized configuration for easy maintenance
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = !isDevelopment;

module.exports = {
  // Environment flags
  isDevelopment,
  isProduction,

  // Window configuration
  window: {
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
  },

  // Security settings
  security: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    webSecurity: false, // For cross-origin in dev
  },

  // Network configuration
  network: {
    debugPort: '9222',
    updateCheckInterval: '5 minutes',
  },

  // Authentication
  auth: {
    sessionDuration: 24, // hours
  },

  // Protocol
  protocol: {
    scheme: 'dataextractor',
  },

  // GitHub repository
  repository: {
    owner: 'iamranawaqas100',
    repo: 'manual-extrator',
  },

  // Command line switches
  commandLineSwitches: [
    { key: 'disable-blink-features', value: 'AutomationControlled' },
    { key: 'disable-features', value: 'IsolateOrigins,site-per-process' },
    { key: 'disable-site-isolation-trials', value: null },
  ],

  // Request headers for stealth mode
  stealthHeaders: {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  },
};

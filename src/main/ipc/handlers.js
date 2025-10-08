/**
 * IPC Handlers Module
 * Centralized IPC communication handlers
 * Pure functions for handling renderer requests
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const { ipcMain, dialog } = require('electron');
const dataService = require('../services/data');
const exportService = require('../services/export');
const updater = require('../services/updater');
const logger = require('../utils/logger');

/**
 * Get app version handler
 */
const handleGetAppVersion = async () => {
  // eslint-disable-next-line global-require
  const { version } = require('../../../package.json');
  logger.debug('App version requested:', version);
  return version;
};

/**
 * Get extracted data handler
 */
const handleGetExtractedData = async () => {
  const data = dataService.getAllData();
  logger.debug(`Retrieved ${data.length} items`);
  return data;
};

/**
 * Save extracted data handler
 */
const handleSaveExtractedData = async (event, data) => {
  try {
    const savedItem = dataService.saveData(data);
    logger.success(`Saved item with ID: ${savedItem.id}`);
    return savedItem;
  } catch (error) {
    logger.error('Error saving data:', error);
    throw error;
  }
};

/**
 * Update extracted data handler
 */
const handleUpdateExtractedData = async (event, id, data) => {
  try {
    const updatedItem = dataService.updateData(id, data);
    logger.success(`Updated item with ID: ${id}`);
    return updatedItem;
  } catch (error) {
    logger.error('Error updating data:', error);
    throw error;
  }
};

/**
 * Delete extracted data handler
 */
const handleDeleteExtractedData = async (event, id) => {
  try {
    const result = dataService.deleteData(id);
    logger.success(`Deleted item with ID: ${id}`);
    return result;
  } catch (error) {
    logger.error('Error deleting data:', error);
    throw error;
  }
};

/**
 * Export data handler
 */
const handleExportData = async (event, mainWindow, format = 'json') => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Extracted Data',
    defaultPath: `extracted-data-${new Date().toISOString().slice(0, 10)}.${format}`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'CSV Files', extensions: ['csv'] },
    ],
  });

  if (result.canceled) {
    return { success: false, canceled: true };
  }

  try {
    const data = dataService.getAllData();
    const exportResult = exportService.exportData(data, result.filePath, format);

    return { ...exportResult, count: data.length };
  } catch (error) {
    logger.error('Export error:', error);
    throw error;
  }
};

/**
 * Check for updates handler
 */
const handleCheckForUpdates = async () => {
  try {
    updater.checkForUpdates();
    return { success: true };
  } catch (error) {
    logger.error('Update check error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Install update handler
 */
const handleInstallUpdate = async () => {
  try {
    // eslint-disable-next-line global-require
    const { autoUpdater } = require('electron-updater');
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    logger.error('Install update error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Register all IPC handlers
 */
const registerHandlers = (mainWindow) => {
  // App info handlers
  ipcMain.handle('get-app-version', handleGetAppVersion);

  // Data handlers
  ipcMain.handle('get-extracted-data', handleGetExtractedData);
  ipcMain.handle('save-extracted-data', handleSaveExtractedData);
  ipcMain.handle('update-extracted-data', handleUpdateExtractedData);
  ipcMain.handle('delete-extracted-data', handleDeleteExtractedData);

  // Export handler (needs mainWindow reference)
  ipcMain.handle('export-data', (event, format) => handleExportData(event, mainWindow, format));

  // Update handlers
  ipcMain.handle('check-for-updates', handleCheckForUpdates);
  ipcMain.handle('install-update', handleInstallUpdate);

  logger.success('IPC handlers registered');
};

module.exports = {
  registerHandlers,
};

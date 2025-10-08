/**
 * Advanced Data Extractor - Renderer Process
 * Functional Architecture with Full Extraction Features
 * Browser-compatible, modular, professional code
 *
 * @ts-nocheck - Browser-compatible file without Node.js types
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// DOM Utilities
const getElement = (id) => document.getElementById(id);
const getElements = (selector) => document.querySelectorAll(selector);
const getValue = (element) => (element ? element.value : '');
const setValue = (element, value) => { if (element) element.value = value; };
const setText = (element, text) => { if (element) element.textContent = text; };
const setHTML = (element, html) => { if (element) element.innerHTML = html; };
const show = (element) => { if (element) element.style.display = 'block'; };
const hide = (element) => { if (element) element.style.display = 'none'; };
const addClass = (element, className) => element?.classList.add(className);
const removeClass = (element, className) => element?.classList.remove(className);
const toggleClass = (element, className, force) => element?.classList.toggle(className, force);
const addListener = (element, event, handler, options = {}) => {
  if (!element) return () => {};
  element.addEventListener(event, handler, options);
  return () => element.removeEventListener(event, handler, options);
};

// Validation Utilities
const isEmpty = (str) => !str || str.trim().length === 0;
const normalizeUrl = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};
const isItemEmpty = (item) => {
  const contentFields = ['title', 'description', 'image', 'price'];
  return contentFields.every((field) => isEmpty(item[field]));
};
const isAuthValid = () => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const loginTime = localStorage.getItem('loginTime');
  if (!isAuthenticated || !loginTime) return false;
  const timeDiff = new Date() - new Date(loginTime);
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  return hoursDiff < 24;
};

// Formatting Utilities
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};
const truncate = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const createStore = () => {
  const state = {
    extractedData: [],
    currentMode: 'manual',
    selectedField: null,
    isSelecting: false,
    currentItemId: null,
    highlightsVisible: false,
  };

  const observers = new Set();

  const subscribe = (callback) => {
    observers.add(callback);
    return () => observers.delete(callback);
  };

  const notify = () => {
    observers.forEach((callback) => callback(state));
  };

  const getState = () => ({ ...state });

  const setState = (updates) => {
    Object.assign(state, updates);
    notify();
  };

  const actions = {
    setExtractedData: (data) => setState({ extractedData: data }),
    addExtractedItem: (item) => setState({ extractedData: [...state.extractedData, item] }),
    updateExtractedItem: (id, updates) => {
      const index = state.extractedData.findIndex((item) => item.id === id);
      if (index !== -1) {
        const newData = [...state.extractedData];
        newData[index] = { ...newData[index], ...updates };
        setState({ extractedData: newData });
      }
    },
    removeExtractedItem: (id) => {
      setState({ extractedData: state.extractedData.filter((item) => item.id !== id) });
    },
    setCurrentMode: (mode) => setState({ currentMode: mode }),
    setSelectedField: (field) => setState({ selectedField: field }),
    setIsSelecting: (isSelecting) => setState({ isSelecting }),
    setCurrentItemId: (id) => setState({ currentItemId: id }),
    setHighlightsVisible: (visible) => setState({ highlightsVisible: visible }),
  };

  return {
    getState, setState, subscribe, actions,
  };
};

const store = createStore();

// ============================================================================
// UI COMPONENTS
// ============================================================================

const renderEmptyState = () => `
  <div class="empty-state">
    <div class="empty-icon">📊</div>
    <div class="empty-text">No data extracted yet</div>
    <div class="empty-subtext">
      Click "Add Item" to create your first item, then select fields and click elements to fill it
    </div>
  </div>
`;

const renderDataField = (label, value, isUrl = false) => {
  const hasValue = value && value.trim();

  let fieldContent;
  if (!hasValue) {
    fieldContent = `No ${label.toLowerCase()}`;
  } else if (isUrl) {
    const href = escapeHtml(value);
    const text = escapeHtml(truncate(value, 50));
    fieldContent = `<a href="${href}" target="_blank">${text}</a>`;
  } else {
    fieldContent = escapeHtml(truncate(value, 100));
  }

  return `
    <div class="data-field">
      <div class="data-field-label">${escapeHtml(label)}:</div>
      <div class="data-field-value ${hasValue ? '' : 'empty'}">
        ${fieldContent}
      </div>
    </div>
  `;
};

const renderDataItem = (item, itemNumber, currentItemId) => {
  const isCurrentItem = item.id === currentItemId;
  const itemIsEmpty = isItemEmpty(item);

  const itemClasses = [
    'data-item',
    item.verified ? 'verified' : '',
    isCurrentItem ? 'current-item' : '',
    itemIsEmpty ? 'empty-item' : '',
  ].filter(Boolean).join(' ');

  const selectButton = !isCurrentItem
    ? `<button class="data-action-btn select" onclick="app.setCurrentItem(${item.id})">
         📍 Select for Filling
       </button>`
    : '';

  return `
    <div class="${itemClasses}" data-item-id="${item.id}">
      <div class="data-header">
        <div class="item-number">Item #${itemNumber}</div>
        <div class="item-status">
          ${isCurrentItem ? '<span class="status-badge current">🎯 Currently Filling</span>' : ''}
          ${itemIsEmpty && !isCurrentItem ? '<span class="status-badge empty">📝 Empty</span>' : ''}
          ${item.verified ? '<span class="status-badge verified">✅ Verified</span>' : ''}
        </div>
      </div>
      <div class="data-content">
        ${renderDataField('Title', item.title)}
        ${renderDataField('Description', item.description)}
        ${renderDataField('Image', item.image, true)}
        ${renderDataField('Price', item.price)}
      </div>
      <div class="data-actions">
        ${selectButton}
        <button class="data-action-btn verify ${item.verified ? 'verified' : ''}"
                onclick="app.toggleVerification(${item.id})">
          ${item.verified ? '✓ Verified' : 'Verify'}
        </button>
        <button class="data-action-btn edit" onclick="app.editItem(${item.id})">Edit</button>
        <button class="data-action-btn delete" onclick="app.deleteItem(${item.id})">Delete</button>
      </div>
    </div>
  `;
};

const renderEditModal = (item) => `
  <div class="edit-form-overlay">
    <div class="edit-form-modal">
      <div class="edit-form-header">
        <h3>Edit Item</h3>
        <button class="close-btn" onclick="this.closest('.edit-form-overlay').remove()">×</button>
      </div>
      <div class="edit-form-content">
        <div class="form-group">
          <label>Title:</label>
          <input type="text" id="edit-title" value="${escapeHtml(item.title || '')}" />
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea id="edit-description">${escapeHtml(item.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Price:</label>
          <input type="text" id="edit-price" value="${escapeHtml(item.price || '')}" />
        </div>
        <div class="form-group">
          <label>Category:</label>
          <input type="text" id="edit-category" value="${escapeHtml(item.category || '')}" />
        </div>
        <div class="form-group">
          <label>Image URL:</label>
          <input type="text" id="edit-image" value="${escapeHtml(item.image || '')}" />
        </div>
      </div>
      <div class="edit-form-actions">
        <button class="btn-save" onclick="app.saveEditedItem(${item.id})">Save Changes</button>
        <button class="btn-cancel" onclick="this.closest('.edit-form-overlay').remove()">Cancel</button>
      </div>
    </div>
  </div>
`;

// ============================================================================
// DATA SERVICE
// ============================================================================

const dataService = {
  getAllData: async () => {
    try {
      return window.electronAPI.getExtractedData();
    } catch (error) {
      console.error('Error getting data:', error);
      return [];
    }
  },

  saveData: async (data) => window.electronAPI.saveExtractedData(data),

  updateData: async (id, data) => window.electronAPI.updateExtractedData(id, data),

  deleteData: async (id) => window.electronAPI.deleteExtractedData(id),

  exportData: async (format = 'json') => window.electronAPI.exportData(format),

  getAppVersion: async () => {
    try {
      return await window.electronAPI.getAppVersion();
    } catch (error) {
      return 'Unknown';
    }
  },
};

// ============================================================================
// EXTRACTION SCRIPT
// ============================================================================

// Full extraction script
const getExtractionScript = () => `
  console.log('Initializing extraction system...');
  
  window.extractionState = {
    isSelecting: false,
    currentField: null,
    mode: 'manual'
  };
  
  function sendToHost(type, payload) {
    console.log('EXTRACT:' + JSON.stringify({ type, payload }));
  }
  
  window.addEventListener('message', (event) => {
    if (event.data && event.data.command) {
      console.log('Received command:', event.data.command);
      
      if (event.data.command === 'START_SELECTION') {
        startSelection(event.data.field);
      } else if (event.data.command === 'STOP_SELECTION') {
        stopSelection();
      } else if (event.data.command === 'SET_MODE') {
        window.extractionState.mode = event.data.mode;
      } else if (event.data.command === 'ENABLE_EXTRACTION') {
        console.log('Extraction enabled');
      } else if (event.data.command === 'STOP_EXTRACTION') {
        stopSelection();
      }
    }
  });
  
  function startSelection(field) {
    console.log('Starting selection for:', field);
    window.extractionState.isSelecting = true;
    window.extractionState.currentField = field;
    
    document.addEventListener('click', handleExtractClick, true);
    document.addEventListener('mouseover', handleHover, true);
    document.addEventListener('mouseout', handleHoverOut, true);
    
    const overlay = document.createElement('div');
    overlay.id = 'extract-overlay';
    const overlayStyle = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
      'background:#4DEAC7;color:#1e293b;padding:12px 24px;border-radius:8px;z-index:999999;' +
      'font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    overlay.style.cssText = overlayStyle;
    overlay.textContent = '🎯 Click to select ' + field;
    document.body.appendChild(overlay);
    document.body.style.cursor = 'crosshair';
  }
  
  function handleHover(e) {
    if (!window.extractionState.isSelecting) return;
    e.target.style.outline = '2px dashed #4DEAC7';
    e.target.style.outlineOffset = '2px';
  }
  
  function handleHoverOut(e) {
    if (!window.extractionState.isSelecting) return;
    if (!e.target.style.backgroundColor.includes('rgba(77, 234, 199')) {
      e.target.style.outline = '';
      e.target.style.outlineOffset = '';
    }
  }
  
  function stopSelection() {
    console.log('Stopping selection');
    window.extractionState.isSelecting = false;
    window.extractionState.currentField = null;
    
    document.removeEventListener('click', handleExtractClick, true);
    document.removeEventListener('mouseover', handleHover, true);
    document.removeEventListener('mouseout', handleHoverOut, true);
    
    const overlay = document.getElementById('extract-overlay');
    if (overlay) overlay.remove();
    
    document.body.style.cursor = '';
  }
  
  function handleExtractClick(e) {
    if (!window.extractionState.isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const element = e.target;
    const field = window.extractionState.currentField;
    let value = '';
    
    console.log('Clicked element:', element, 'Field:', field);
    
    if (field === 'image') {
      if (element.tagName === 'IMG') {
        value = element.src || element.getAttribute('data-src') || '';
      } else {
        const img = element.querySelector('img');
        if (img) value = img.src || img.getAttribute('data-src') || '';
      }
    } else if (field === 'price') {
      const text = element.textContent || '';
      const priceMatch = text.match(/[\\$€£¥]?[\\d,]+\\.?\\d*/);
      value = priceMatch ? priceMatch[0] : text.trim();
    } else {
      value = element.textContent || element.value || '';
    }
    
    console.log('Extracted value:', value);
    
    sendToHost('data-extracted', {
      [field]: value.trim(),
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    
    element.style.outline = '3px solid #4DEAC7';
    element.style.backgroundColor = 'rgba(77, 234, 199, 0.15)';
    
    setTimeout(() => stopSelection(), 100);
    
    return false;
  }
  
  console.log('Extraction system initialized');
`;

// ============================================================================
// WEBVIEW SERVICE
// ============================================================================

const webviewService = {
// State
  loadingCount: 0,
  lastLoadTime: Date.now(),
  visibilityFixApplied: false,

  getWebview: () => getElement('webview'),

  isReady: () => {
    const webview = getElement('webview');
    return webview && webview.src && webview.src !== 'about:blank';
  },

  execute: async (script) => {
    const webview = getElement('webview');
    if (!webview || !webviewService.isReady()) {
      console.warn('Webview not ready for script execution');
      return null;
    }
    try {
      return await webview.executeJavaScript(script);
    } catch (error) {
      console.error('Script execution error:', error);
      return null;
    }
  },

  sendMessage: (command, data = {}) => {
    return webviewService.execute(`
      window.postMessage(${JSON.stringify({ command, ...data })}, '*');
    `);
  },

  startSelection: (field) => webviewService.sendMessage('START_SELECTION', { field }),
  stopSelection: () => webviewService.sendMessage('STOP_SELECTION'),
  setMode: (mode) => webviewService.sendMessage('SET_MODE', { mode }),

  clearHighlights: () => {
    return webviewService.execute(`
      document.querySelectorAll('[style*="outline"]').forEach(el => {
        el.style.outline = '';
        el.style.backgroundColor = '';
      });
      window.postMessage({ command: 'STOP_SELECTION' }, '*');
    `);
  },

  forcePageVisibility: async () => {
    if (webviewService.visibilityFixApplied) {
      console.log('🎨 Visibility fix already applied');
      return;
    }

    console.log('🎨 Forcing page visibility...');
    webviewService.visibilityFixApplied = true;

    setTimeout(() => {
      webviewService.visibilityFixApplied = false;
    }, 10000);

    const fixScript = `
      (function() {
        try {
          const style = document.createElement('style');
          style.id = 'electron-visibility-fix';
          
          if (document.getElementById('electron-visibility-fix')) {
            return 'Already applied';
          }
          
          style.textContent = \`
            body, html {
              display: block !important;
              visibility: visible !important;
            }
            .cf-browser-verification,
            #cf-wrapper,
            .cf-challenge-running {
              display: none !important;
            }
          \`;
          
          if (document.head) {
            document.head.appendChild(style);
          }
          
          if (window.scrollY > 100) {
            window.scrollTo({top: 0, behavior: 'smooth'});
          }
          
          console.log('✅ Visibility fix applied');
          return 'Visibility forced safely';
        } catch (error) {
          console.error('❌ Visibility fix error:', error.message);
          return 'Error: ' + error.message;
        }
      })();
    `;

    const result = await webviewService.execute(fixScript);
    console.log('✅ Force visibility result:', result);
  },

  injectExtractionScript: async () => {
    const script = `
      if (!window.webviewInitialized) {
        window.webviewInitialized = true;
        ${getExtractionScript()}
      }
    `;
    return webviewService.execute(script);
  },

  waitForLoad: () => {
    return new Promise((resolve) => {
      const webview = getElement('webview');
      if (!webview) {
        resolve();
        return;
      }

      const checkLoad = () => {
        if (webview.src && webview.src !== 'about:blank') {
          setTimeout(resolve, 2000);
        } else {
          setTimeout(checkLoad, 500);
        }
      };

      checkLoad();
    });
  },
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

let statusTimeout = null;

const notifications = {
  updateStatus: (message) => {
    const statusMessage = getElement('statusMessage');
    if (!statusMessage) return;

    setText(statusMessage, message);

    if (statusTimeout) clearTimeout(statusTimeout);

    statusTimeout = setTimeout(() => {
      setText(statusMessage, 'Ready to extract data');
    }, 5000);
  },

  showLoading: (message = 'Loading...') => {
    const overlay = getElement('loadingOverlay');
    if (overlay) {
      const text = overlay.querySelector('.loading-text');
      if (text) setText(text, message);
      overlay.style.display = 'flex';
    }
  },

  hideLoading: () => {
    const overlay = getElement('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  },

  showModal: () => {
    const modal = getElement('modalOverlay');
    if (modal) modal.style.display = 'flex';
  },

  hideModal: () => {
    const modal = getElement('modalOverlay');
    if (modal) modal.style.display = 'none';
  },

  showUpdateLog: (message) => {
    let updateLogDiv = getElement('updateLogDiv');

    if (!updateLogDiv) {
      updateLogDiv = document.createElement('div');
      updateLogDiv.id = 'updateLogDiv';
      updateLogDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        max-width: 400px;
        z-index: 10000;
        border: 1px solid #444;
      `;
      document.body.appendChild(updateLogDiv);
    }

    const timestamp = new Date().toLocaleTimeString();
    const newLine = document.createElement('div');
    newLine.textContent = `[${timestamp}] ${message}`;
    updateLogDiv.appendChild(newLine);

    while (updateLogDiv.children.length > 10) {
      updateLogDiv.removeChild(updateLogDiv.firstChild);
    }

    if (!message.includes('💥') && !message.includes('✅')) {
      setTimeout(() => {
        if (updateLogDiv && updateLogDiv.parentNode) {
          updateLogDiv.style.opacity = '0.5';
        }
      }, 30000);
    }
  },
};

// ============================================================================
// DATA DISPLAY
// ============================================================================

const updateFillingStatus = (data, currentItemId) => {
  const emptyItems = data.filter((item) => isItemEmpty(item)).length;
  const beingFilledItems = data.filter((item) => item.id === currentItemId).length;
  const completedItems = data.filter((item) => !isItemEmpty(item) && item.id !== currentItemId).length;

  const fillingStatus = getElement('fillingStatus');
  const finishItemBtn = getElement('finishItemBtn');

  if (!fillingStatus) return;

  // Show/hide finish button
  if (finishItemBtn) {
    finishItemBtn.style.display = currentItemId && beingFilledItems > 0 ? 'block' : 'none';
  }

  // Show/hide status
  if (data.length > 0) {
    fillingStatus.style.display = 'block';

    const emptyCount = getElement('emptyCount');
    const fillingCount = getElement('fillingCount');
    const completedCount = getElement('completedCount');

    if (emptyCount) setText(emptyCount, emptyItems);
    if (fillingCount) setText(fillingCount, beingFilledItems);
    if (completedCount) setText(completedCount, completedItems);
  } else {
    fillingStatus.style.display = 'none';
  }
};

const updateDataDisplay = (data, currentItemId) => {
  const dataList = getElement('dataList');
  const dataCount = getElement('dataCount');
  const extractionStats = getElement('extractionStats');

  if (!dataList) return;

  // Update counts
  if (dataCount) setText(dataCount, data.length);
  if (extractionStats) setText(extractionStats, `${data.length} items extracted`);

  // Update filling status
  updateFillingStatus(data, currentItemId);

  // Render list
  if (data.length === 0) {
    setHTML(dataList, renderEmptyState());
    return;
  }

  // Group by category if needed
  const grouped = {};
  let hasCategories = false;

  data.forEach((item) => {
    const category = item.category || 'Uncategorized';
    if (item.category) hasCategories = true;
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(item);
  });

  const html = Object.entries(grouped).map(([category, items]) => {
    const categoryHeader = (hasCategories && Object.keys(grouped).length > 1)
      ? `<div class="category-header">${escapeHtml(category)} (${items.length} items)</div>`
      : '';

    const itemsHtml = items.map((item) => {
      const itemNumber = data.findIndex((dataItem) => dataItem.id === item.id) + 1;
      return renderDataItem(item, itemNumber, currentItemId);
    }).join('');

    return categoryHeader + itemsHtml;
  }).join('');

  setHTML(dataList, html);
};

// ============================================================================
// WEBVIEW SETUP
// ============================================================================

const setupWebview = (onDataExtracted) => {
  const webview = getElement('webview');
  if (!webview) return;

  // DOM ready handler
  webview.addEventListener('dom-ready', () => {
    console.log('✅ Webview DOM ready');

    setTimeout(() => {
      // Check page rendering
      webview.executeJavaScript(`
        (function() {
          return {
            url: window.location.href,
            title: document.title,
            bodyLength: document.body ? document.body.innerHTML.length : 0,
            bodyVisible: document.body ? window.getComputedStyle(document.body).display !== 'none' : false,
            hasCloudflare: !!document.querySelector('[data-translate="checking_browser"]') ||
              document.body?.textContent.includes('Checking your browser'),
          };
        })();
      `).then((info) => {
        console.log('📊 Page Info:', info);

        if (info.hasCloudflare) {
          console.log('🔒 Cloudflare challenge detected');
        } else if (!info.bodyVisible || info.bodyLength < 1000) {
          console.warn('⚠️ Page may need visibility fix');
          webviewService.forcePageVisibility();
        } else {
          console.log('✅ Page rendering correctly');
          webviewService.forcePageVisibility();
        }
      }).catch((err) => console.error('Cannot check page:', err));

      // Inject extraction script
      webviewService.injectExtractionScript().catch((err) => {
        console.error('Error injecting script:', err);
      });
    }, 1000);
  });

  // Console message handler
  webview.addEventListener('console-message', (e) => {
    let prefix = '📘';
    if (e.level === 1) prefix = '⚠️';
    else if (e.level > 1) prefix = '❌';

    console.log(`${prefix} [Webview]:`, e.message);

    if (e.message.startsWith('EXTRACT:')) {
      try {
        const data = JSON.parse(e.message.substring(8));
        if (data.type === 'data-extracted') {
          onDataExtracted(data.payload);
        }
      } catch (err) {
        console.error('Failed to parse extraction message:', err);
      }
    }
  });

  // IPC message handler
  webview.addEventListener('ipc-message', (event) => {
    console.log('IPC message received:', event.channel, event.args);
    const { channel, args } = event;

    if (channel === 'data-extracted') {
      onDataExtracted(args[0]);
    }
  });

  // Loading handlers
  webview.addEventListener('did-start-loading', () => {
    console.log('🔄 Webview started loading');
    notifications.updateStatus('Loading...');

    webviewService.loadingCount += 1;
    const timeSinceLastLoad = Date.now() - webviewService.lastLoadTime;
    webviewService.lastLoadTime = Date.now();

    if (timeSinceLastLoad > 5000) {
      webviewService.loadingCount = 1;
    }

    if (webviewService.loadingCount > 10) {
      console.error('🔄 Too many redirects!');
      notifications.updateStatus('Too many redirects');
      webview.stop();
      webviewService.loadingCount = 0;
    }
  });

  webview.addEventListener('did-stop-loading', () => {
    console.log('✅ Webview stopped loading');
    notifications.updateStatus('Page loaded');

    setTimeout(() => {
      webview.executeJavaScript('document.body ? document.body.innerHTML.length : 0')
        .then((length) => {
          if (length < 1000) {
            console.warn('⚠️ Page may not be fully loaded');
            webviewService.forcePageVisibility();
          }
        })
        .catch((err) => {
          console.error('Failed to check page load:', err);
        });
    }, 2000);
  });

  webview.addEventListener('did-fail-load', (e) => {
    if (e.errorCode !== -3) {
      console.error('❌ Load failed:', e.errorCode, e.errorDescription);
      notifications.updateStatus(`Load failed: ${e.errorDescription}`);
    }
  });

  // Crash handler
  webview.addEventListener('render-process-gone', (e) => {
    console.error('💥 Renderer crashed!', e.details);
    notifications.updateStatus('Page crashed - reloading...');

    setTimeout(() => {
      const currentUrl = webview.src;
      if (currentUrl && currentUrl !== 'about:blank') {
        console.log('🔄 Auto-reloading after crash');
        webview.reload();
      }
    }, 1000);
  });

  // Handle new windows
  webview.addEventListener('new-window', (event) => {
    try {
      event.preventDefault();
    } catch (e) {
      console.warn('Could not prevent new window:', e);
    }
    if (event.url) {
      webview.loadURL(event.url);
    }
  });
};

// ============================================================================
// EVENT HANDLERS - Forward declarations
// ============================================================================

const handleNavigate = async () => {
  const urlInput = getElement('urlInput');
  const url = getValue(urlInput).trim();

  if (!url) {
    notifications.updateStatus('Please enter a URL');
    return;
  }

  const fullUrl = normalizeUrl(url);
  const webview = getElement('webview');

  if (webview) {
    notifications.showLoading('Loading page...');
    webview.src = fullUrl;
    notifications.updateStatus(`Loading: ${fullUrl}`);

    // Wait for page to load
    setTimeout(() => {
      notifications.hideLoading();
      webviewService.injectExtractionScript();
    }, 3000);
  }
};

const switchMode = (mode) => {
  store.actions.setCurrentMode(mode);

  getElements('.mode-btn').forEach((btn) => {
    toggleClass(btn, 'active', btn.dataset.mode === mode);
  });

  // Update UI elements
  const templateInfo = getElement('templateInfo');
  const fieldSection = document.querySelector('.field-section');
  const findSimilarBtn = getElement('findSimilarBtn');

  if (mode === 'template') {
    if (templateInfo) show(templateInfo);
    if (fieldSection) show(fieldSection);
    if (findSimilarBtn) show(findSimilarBtn);
  } else {
    if (templateInfo) hide(templateInfo);
    if (fieldSection) show(fieldSection);
    if (findSimilarBtn) hide(findSimilarBtn);
  }

  webviewService.setMode(mode);
  notifications.updateStatus(`Switched to ${mode} mode`);
};

const selectField = (field) => {
  if (!webviewService.isReady()) {
    notifications.updateStatus('Please load a page first');
    return;
  }

  store.actions.setSelectedField(field);
  store.actions.setIsSelecting(true);

  getElements('.field-btn').forEach((btn) => {
    toggleClass(btn, 'active', btn.dataset.field === field);
  });

  webviewService.startSelection(field);
  notifications.updateStatus(`Click elements to extract ${field}`);
};

const toggleExtractionMode = () => {
  const extractModeBtn = getElement('extractModeBtn');

  if (!webviewService.isReady()) {
    notifications.updateStatus('Please load a page first');
    return;
  }

  const isActive = extractModeBtn.classList.contains('active');

  if (isActive) {
    removeClass(extractModeBtn, 'active');
    extractModeBtn.textContent = 'Extract Mode';
    store.actions.setIsSelecting(false);
    store.actions.setSelectedField(null);

    getElements('.field-btn').forEach((btn) => removeClass(btn, 'active'));

    webviewService.execute(`
      window.postMessage({ command: 'STOP_EXTRACTION' }, '*');
    `);

    notifications.updateStatus('Extraction mode disabled');
  } else {
    addClass(extractModeBtn, 'active');
    extractModeBtn.textContent = 'Exit Extract Mode';

    webviewService.execute(`
      window.postMessage({ command: 'ENABLE_EXTRACTION' }, '*');
    `);

    notifications.updateStatus('Extraction mode enabled - select a field');
  }
};

const showExtractionControls = () => {
  const controls = getElement('extractionControls');
  if (controls) show(controls);
};

const hideExtractionControls = () => {
  const controls = getElement('extractionControls');
  if (controls) hide(controls);
};

const updateUI = () => {
  const state = store.getState();
  updateDataDisplay(state.extractedData, state.currentItemId);
};

const addNewItem = async () => {
  try {
    if (store.getState().currentMode !== 'manual') {
      switchMode('manual');
    }

    const emptyItem = {
      title: '',
      description: '',
      image: '',
      price: '',
      category: '',
      url: webviewService.getWebview()?.src || '',
      timestamp: new Date().toISOString(),
      verified: false,
    };

    const savedItem = await dataService.saveData(emptyItem);
    store.actions.addExtractedItem(savedItem);
    store.actions.setCurrentItemId(savedItem.id);

    updateUI();
    notifications.updateStatus(`New item #${store.getState().extractedData.length} created`);
  } catch (error) {
    console.error('Error creating item:', error);
    notifications.updateStatus(`Error: ${error.message}`);
  }
};

const finishCurrentItem = async () => {
  const state = store.getState();

  if (!state.currentItemId) {
    notifications.updateStatus('No item being filled');
    return;
  }

  const item = state.extractedData.find((i) => i.id === state.currentItemId);

  if (!item || isItemEmpty(item)) {
    notifications.updateStatus('Cannot finish empty item');
    return;
  }

  const updatedItem = {
    ...item,
    timestamp: new Date().toISOString(),
  };

  await dataService.updateData(state.currentItemId, updatedItem);
  store.actions.updateExtractedItem(state.currentItemId, updatedItem);
  store.actions.setCurrentItemId(null);

  updateUI();
  notifications.updateStatus('Item finished!');
};

const verifyAllItems = async () => {
  try {
    const state = store.getState();
    const itemsToVerify = state.extractedData.filter((item) => !item.verified);

    await Promise.all(itemsToVerify.map(async (item) => {
      await dataService.updateData(item.id, { ...item, verified: true });
      store.actions.updateExtractedItem(item.id, { verified: true });
    }));

    updateUI();
    notifications.updateStatus(`Verified ${itemsToVerify.length} items`);
  } catch (error) {
    notifications.updateStatus(`Error: ${error.message}`);
  }
};

const findSimilar = () => {
  const state = store.getState();

  if (state.currentMode !== 'template') {
    notifications.updateStatus('Switch to template mode first');
    return;
  }

  if (!webviewService.isReady()) {
    notifications.updateStatus('Load a page first');
    return;
  }

  notifications.showLoading('Finding similar elements...');

  setTimeout(() => {
    notifications.hideLoading();
    notifications.updateStatus('Similar elements feature coming soon');
  }, 1000);
};

const clearAll = async () => {
  // eslint-disable-next-line no-restricted-globals, no-alert
  if (!window.confirm('Clear all data? This cannot be undone.')) {
    return;
  }

  try {
    const state = store.getState();

    await Promise.all(state.extractedData.map((item) => dataService.deleteData(item.id)));

    store.actions.setExtractedData([]);
    store.actions.setCurrentItemId(null);
    store.actions.setSelectedField(null);
    store.actions.setIsSelecting(false);

    getElements('.field-btn').forEach((btn) => removeClass(btn, 'active'));

    webviewService.clearHighlights();

    updateUI();
    notifications.updateStatus('All data cleared');
  } catch (error) {
    notifications.updateStatus(`Error: ${error.message}`);
  }
};

const exportData = async () => {
  const selectedFormat = document.querySelector('input[name="exportFormat"]:checked').value;

  notifications.showLoading('Exporting...');
  notifications.hideModal();

  try {
    const result = await dataService.exportData(selectedFormat);

    if (result.success) {
      notifications.updateStatus(`Exported ${result.count} items to ${result.path}`);

      setTimeout(() => {
        // eslint-disable-next-line no-restricted-globals, no-alert
        if (window.confirm('Export complete! Open file location?')) {
          // Would need IPC handler for this
        }
      }, 500);
    } else if (result.canceled) {
      notifications.updateStatus('Export canceled');
    }
  } catch (error) {
    notifications.updateStatus(`Export error: ${error.message}`);
  } finally {
    notifications.hideLoading();
  }
};

const handleManualExtraction = async (data, field) => {
  const state = store.getState();
  let targetItem = state.extractedData.find((item) => item.id === state.currentItemId);

  if (!targetItem) {
    const emptyItem = state.extractedData.find((item) => isItemEmpty(item));
    if (emptyItem) {
      targetItem = emptyItem;
      store.actions.setCurrentItemId(emptyItem.id);
    } else {
      await addNewItem();
      return;
    }
  }

  const updatedItem = {
    ...targetItem,
    [field]: data[field],
    url: data.url || targetItem.url,
    timestamp: new Date().toISOString(),
  };

  await dataService.updateData(targetItem.id, updatedItem);
  store.actions.updateExtractedItem(targetItem.id, updatedItem);

  updateUI();

  const itemIndex = state.extractedData.findIndex((item) => item.id === targetItem.id);
  notifications.updateStatus(`Added ${field} to item #${itemIndex + 1}`);
};

const handleTemplateExtraction = async (data) => {
  const items = Array.isArray(data) ? data : [data];

  await Promise.all(items.map(async (item) => {
    const savedItem = await dataService.saveData(item);
    store.actions.addExtractedItem(savedItem);
  }));

  updateUI();
  notifications.updateStatus(`Extracted ${items.length} item(s)`);
};

const handleExtractedData = async (data) => {
  try {
    const state = store.getState();
    const field = Object.keys(data).find((key) => key !== 'url' && key !== 'timestamp');

    if (!field) return;

    if (state.currentMode === 'manual') {
      await handleManualExtraction(data, field);
    } else {
      await handleTemplateExtraction(data);
    }
  } catch (error) {
    console.error('Error handling extracted data:', error);
    notifications.updateStatus(`Error: ${error.message}`);
  }
};

const handleProtocolExtract = async (data) => {
  const { action, url, bypassAuth } = data;

  if (action !== 'extract' || !url) return;

  console.log('🎯 Handling protocol URL:', url);

  if (bypassAuth) {
    console.log('🔓 Bypassing auth');
    notifications.showUpdateLog('🔓 Authentication bypassed');
  }

  notifications.showUpdateLog(`🌐 Opening: ${url}`);

  setTimeout(async () => {
    try {
      const urlInput = getElement('urlInput');
      if (urlInput) {
        setValue(urlInput, url);
        notifications.updateStatus('Loading from protocol...');

        await handleNavigate();
        await webviewService.waitForLoad();

        const extractModeBtn = getElement('extractModeBtn');
        if (extractModeBtn && !extractModeBtn.classList.contains('active')) {
          console.log('🎯 Enabling extraction mode');
          toggleExtractionMode();
          notifications.showUpdateLog('✅ Extraction mode enabled!');
        }

        notifications.updateStatus(`Ready: ${url}`);
      }
    } catch (error) {
      console.error('❌ Protocol error:', error);
      notifications.showUpdateLog(`❌ Failed: ${error.message}`);
      notifications.updateStatus(`Error: ${url}`);
    }
  }, bypassAuth ? 2500 : 500);
};

const setupMenuListeners = () => {
  window.electronAPI.onMenuNewExtraction(clearAll);
  window.electronAPI.onMenuExportData(notifications.showModal);
  window.electronAPI.onMenuClearData(clearAll);
  window.electronAPI.onMenuFindSimilar(findSimilar);
};

const setupProtocolHandling = () => {
  window.electronAPI.onProtocolExtract((event, data) => {
    console.log('🌐 Protocol extract:', data);
    handleProtocolExtract(data);
  });
};

const setupUpdateLogListener = () => {
  window.electronAPI.onUpdateLog((event, message) => {
    console.log('🔄 Update:', message);
    notifications.showUpdateLog(message);
  });
};

const setupEventListeners = () => {
  // URL navigation
  const navigateBtn = getElement('navigateBtn');
  const urlInput = getElement('urlInput');

  if (navigateBtn && urlInput) {
    addListener(navigateBtn, 'click', handleNavigate);
    addListener(urlInput, 'keypress', (e) => {
      if (e.key === 'Enter') handleNavigate();
    });
  }

  // Mode switching
  getElements('.mode-btn').forEach((btn) => {
    addListener(btn, 'click', () => switchMode(btn.dataset.mode));
  });

  // Field selection
  getElements('.field-btn').forEach((btn) => {
    addListener(btn, 'click', () => selectField(btn.dataset.field));
  });

  // Extract mode button
  const extractModeBtn = getElement('extractModeBtn');
  if (extractModeBtn) {
    addListener(extractModeBtn, 'click', toggleExtractionMode);
  }

  // Action buttons
  const buttons = {
    addItemBtn: () => { addNewItem(); showExtractionControls(); },
    finishItemBtn: finishCurrentItem,
    verifyAllBtn: verifyAllItems,
    findSimilarBtn: findSimilar,
    clearBtn: clearAll,
    exportBtn: notifications.showModal,
    confirmExport: exportData,
    cancelExport: notifications.hideModal,
    modalClose: notifications.hideModal,
    closeExtractionBtn: hideExtractionControls,
  };

  Object.entries(buttons).forEach(([id, handler]) => {
    const btn = getElement(id);
    if (btn) addListener(btn, 'click', handler);
  });

  // Browser controls
  const backBtn = getElement('backBtn');
  const forwardBtn = getElement('forwardBtn');
  const refreshBtn = getElement('refreshBtn');

  if (backBtn) {
    addListener(backBtn, 'click', () => {
      const webview = getElement('webview');
      if (webview && webview.canGoBack()) {
        webview.goBack();
        notifications.updateStatus('Navigated back');
      }
    });
  }

  if (forwardBtn) {
    addListener(forwardBtn, 'click', () => {
      const webview = getElement('webview');
      if (webview && webview.canGoForward()) {
        webview.goForward();
        notifications.updateStatus('Navigated forward');
      }
    });
  }

  if (refreshBtn) {
    addListener(refreshBtn, 'click', () => {
      const webview = getElement('webview');
      if (webview && webview.src && webview.src !== 'about:blank') {
        webview.reload();
        notifications.updateStatus('Page refreshed');
      }
    });
  }
};

// ============================================================================
// MAIN APPLICATION
// ============================================================================

const cleanupFunctions = [];

const initializeApp = async () => {
  // Check auth
  if (!isAuthValid()) {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    window.location.href = 'login.html';
    return;
  }

  console.log('Initializing Advanced Data Extractor...');

  // Show username
  const username = localStorage.getItem('username') || 'Guest';
  const connectionStatus = getElement('connectionStatus');
  if (connectionStatus) connectionStatus.textContent = `${username} - Connected`;

  // Set app version
  const version = await dataService.getAppVersion();
  const appVersion = getElement('appVersion');
  if (appVersion) appVersion.textContent = `v${version}`;

  // Load data
  const data = await dataService.getAllData();
  store.actions.setExtractedData(data);

  // Setup
  setupEventListeners();
  setupWebview(handleExtractedData);
  setupMenuListeners();
  setupProtocolHandling();
  setupUpdateLogListener();

  // Initial render
  updateUI();

  console.log('✅ App initialized successfully');
};

// ============================================================================
// GLOBAL APP OBJECT (for onclick handlers in HTML)
// ============================================================================

window.app = {
  toggleVerification: async (id) => {
    try {
      const state = store.getState();
      const dataItem = state.extractedData.find((item) => item.id === id);

      if (dataItem) {
        await dataService.updateData(id, { ...dataItem, verified: !dataItem.verified });
        store.actions.updateExtractedItem(id, { verified: !dataItem.verified });
        updateUI();
        notifications.updateStatus(`Item ${dataItem.verified ? 'unverified' : 'verified'}`);
      }
    } catch (error) {
      notifications.updateStatus(`Error: ${error.message}`);
    }
  },

  deleteItem: async (id) => {
    // eslint-disable-next-line no-restricted-globals, no-alert
    if (!window.confirm('Delete this item?')) return;

    try {
      await dataService.deleteData(id);
      store.actions.removeExtractedItem(id);
      updateUI();
      notifications.updateStatus('Item deleted');
    } catch (error) {
      notifications.updateStatus(`Error: ${error.message}`);
    }
  },

  editItem: (id) => {
    const state = store.getState();
    const dataItem = state.extractedData.find((item) => item.id === id);
    if (!dataItem) return;

    const modal = document.createElement('div');
    modal.innerHTML = renderEditModal(dataItem);
    document.body.appendChild(modal.firstElementChild);
  },

  saveEditedItem: async (id) => {
    try {
      const updatedItem = {
        title: getValue(getElement('edit-title')),
        description: getValue(getElement('edit-description')),
        price: getValue(getElement('edit-price')),
        category: getValue(getElement('edit-category')),
        image: getValue(getElement('edit-image')),
        verified: true,
        timestamp: new Date().toISOString(),
      };

      await dataService.updateData(id, updatedItem);
      store.actions.updateExtractedItem(id, updatedItem);

      document.querySelector('.edit-form-overlay').remove();

      updateUI();
      notifications.updateStatus('Item updated');
    } catch (error) {
      notifications.updateStatus(`Error: ${error.message}`);
    }
  },

  setCurrentItem: async (id) => {
    store.actions.setCurrentItemId(id);
    updateUI();

    const state = store.getState();
    const itemIndex = state.extractedData.findIndex((dataItem) => dataItem.id === id);
    notifications.updateStatus(`Now filling item #${itemIndex + 1}`);
  },
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Subscribe to state changes
store.subscribe(updateUI);

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  cleanupFunctions.forEach((cleanup) => cleanup());
});

console.log('🚀 Advanced Data Extractor loaded');

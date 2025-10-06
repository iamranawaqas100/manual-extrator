// Renderer process main script
class DataExtractorApp {
    constructor() {
        this.extractedData = []
        this.currentMode = 'manual'
        this.selectedField = null
        this.isSelecting = false
        this.currentItemId = null // ID of the item currently being filled
        this.highlightsVisible = false
        
        this.init()
    }

    async init() {
        // Check authentication
        if (!this.checkAuth()) {
            window.location.href = 'login.html'
            return
        }
        
        this.setupEventListeners()
        this.setupMenuListeners()
        this.setupWebview()
        await this.loadData()
        this.updateUI()
        
        // Set app version
        try {
            const version = await window.electronAPI.getAppVersion()
            document.getElementById('appVersion').textContent = `v${version}`
        } catch (error) {
            console.log('Could not get app version:', error)
        }
        
        // Show username in UI
        const username = localStorage.getItem('username')
        if (username) {
            const connectionStatus = document.getElementById('connectionStatus')
            connectionStatus.textContent = `${username} - Connected`
        }
        
        console.log('Data Extractor App initialized')
        
        // Set up update log listener
        this.setupUpdateLogListener()
        
        // Set up protocol handling
        this.setupProtocolHandling()
    }
    
    checkAuth() {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
        const loginTime = localStorage.getItem('loginTime')
        
        if (!isAuthenticated || !loginTime) {
            return false
        }
        
        // Check if login is still valid (within 24 hours)
        const timeDiff = new Date() - new Date(loginTime)
        const hoursDiff = timeDiff / (1000 * 60 * 60)
        
        if (hoursDiff >= 24) {
            // Clear expired auth
            localStorage.removeItem('isAuthenticated')
            localStorage.removeItem('username')
            localStorage.removeItem('loginTime')
            return false
        }
        
        return true
    }

    setupWebview() {
        const webview = document.getElementById('webview')
        
        // Track loading state to prevent infinite loops
        this.loadingCount = 0
        this.lastLoadTime = Date.now()
        this.visibilityFixApplied = false
        
        // Wait for webview to be ready before setting properties
        webview.addEventListener('dom-ready', () => {
            console.log('✅ Webview DOM ready, setting up communication...')
            
            // Wait a bit for Cloudflare redirects to complete
            setTimeout(() => {
                // Check if page is rendering properly
                webview.executeJavaScript(`
                    (function() {
                        const info = {
                            url: window.location.href,
                            title: document.title,
                            bodyLength: document.body ? document.body.innerHTML.length : 0,
                            bodyVisible: document.body ? window.getComputedStyle(document.body).display !== 'none' : false,
                            bodyBackground: document.body ? window.getComputedStyle(document.body).backgroundColor : 'unknown',
                            htmlVisible: document.documentElement ? window.getComputedStyle(document.documentElement).display !== 'none' : false,
                            hasCloudflare: !!document.querySelector('[data-translate="checking_browser"]') || document.body?.textContent.includes('Checking your browser'),
                            visibleText: document.body?.textContent.substring(0, 200) || 'NO TEXT'
                        };
                        return info;
                    })();
                `)
                .then(info => {
                    console.log('📊 Page Debug Info:', info)
                    if (info.hasCloudflare) {
                        console.log('🔒 Cloudflare challenge still present, waiting...')
                    } else if (info.bodyLength === 0) {
                        console.warn('⚠️ Page body is empty!')
                    } else if (!info.bodyVisible) {
                        console.warn('⚠️ Page body is hidden!')
                        console.log('🎨 Body background:', info.bodyBackground)
                        // Try to force visibility
                        this.forcePageVisibility(webview)
                    } else {
                        console.log('✅ Page appears to be rendering correctly')
                        console.log('📝 Visible text preview:', info.visibleText)
                        // Even if it looks good, ensure no gray overlays
                        this.forcePageVisibility(webview)
                    }
                })
                .catch(err => console.error('❌ Cannot check page:', err))
            }, 1000) // Wait 1 second after DOM ready
        })
        
        // Add console message listener for debugging
        webview.addEventListener('console-message', (e) => {
            const prefix = e.level === 0 ? '📘' : e.level === 1 ? '⚠️' : '❌'
            console.log(`${prefix} [Webview]:`, e.message)
        })
        
        // Log navigation events
        webview.addEventListener('did-start-loading', () => {
            console.log('🔄 Webview started loading')
            this.updateStatus('Loading...')
            
            // Track loading to detect infinite redirect loops
            this.loadingCount++
            const timeSinceLastLoad = Date.now() - this.lastLoadTime
            this.lastLoadTime = Date.now()
            
            // Reset counter if enough time has passed
            if (timeSinceLastLoad > 5000) {
                this.loadingCount = 1
            }
            
            // Detect redirect loop
            if (this.loadingCount > 10) {
                console.error('🔄 Too many redirects detected! Stopping...')
                this.updateStatus('Too many redirects - please try another site')
                webview.stop()
                this.loadingCount = 0
            }
        })
        
        webview.addEventListener('did-stop-loading', () => {
            console.log('✅ Webview stopped loading')
            this.updateStatus('Page loaded')
            
            // Additional check after page finishes loading
            // Some sites need extra time after Cloudflare
            setTimeout(() => {
                webview.executeJavaScript('document.body ? document.body.innerHTML.length : 0')
                    .then(length => {
                        if (length < 1000) {
                            console.warn('⚠️ Page may not be fully loaded, applying visibility fix...')
                            this.forcePageVisibility(webview)
                        }
                    })
                    .catch(() => {})
            }, 2000) // Wait 2 seconds after page stops loading
        })
        
        webview.addEventListener('did-fail-load', (e) => {
            if (e.errorCode !== -3) { // -3 is user abort
                console.error('❌ Webview load failed:', e.errorCode, e.errorDescription)
                this.updateStatus(`Load failed: ${e.errorDescription}`)
            }
        })
        
        // Check for renderer crashes
        webview.addEventListener('render-process-gone', (e) => {
            console.error('💥 Renderer process crashed!', e.details)
            this.updateStatus('Page crashed - reloading...')
            
            // Auto-reload after crash
            setTimeout(() => {
                const currentUrl = webview.src
                if (currentUrl && currentUrl !== 'about:blank') {
                    console.log('🔄 Auto-reloading after crash...')
                    webview.reload()
                }
            }, 1000)
        })
        
        // Monitor page responsiveness
        webview.addEventListener('unresponsive', () => {
            console.warn('⏸️ Page became unresponsive')
        })
        
        webview.addEventListener('responsive', () => {
            console.log('▶️ Page became responsive again')
        })
    }

    setupEventListeners() {
        // URL navigation
        const urlInput = document.getElementById('urlInput')
        const navigateBtn = document.getElementById('navigateBtn')
        
        navigateBtn.addEventListener('click', () => this.navigateToUrl())
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.navigateToUrl()
            }
        })

        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchMode(btn.dataset.mode)
            })
        })

        // Field selection
        document.querySelectorAll('.field-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectField(btn.dataset.field)
            })
        })

        // Extract Mode button
        const extractModeBtn = document.getElementById('extractModeBtn')
        if (extractModeBtn) {
            extractModeBtn.addEventListener('click', () => {
                this.toggleExtractionMode()
            })
        } else {
            console.warn('⚠️ extractModeBtn element not found in DOM')
        }

        // Action buttons
        const findSimilarBtn = document.getElementById('findSimilarBtn')
        if (findSimilarBtn) {
            findSimilarBtn.addEventListener('click', () => {
                this.findSimilar()
            })
        } else {
            console.warn('⚠️ findSimilarBtn element not found in DOM')
        }
        
        const clearBtn = document.getElementById('clearBtn')
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAll()
            })
        } else {
            console.warn('⚠️ clearBtn element not found in DOM')
        }
        
        const exportBtn = document.getElementById('exportBtn')
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportModal()
            })
        } else {
            console.warn('⚠️ exportBtn element not found in DOM')
        }

        // Data controls
        document.getElementById('addItemBtn').addEventListener('click', () => {
            this.addNewItem()
            this.showExtractionControls()
        })
        
        document.getElementById('finishItemBtn').addEventListener('click', () => {
            this.finishCurrentItem()
        })
        
        document.getElementById('verifyAllBtn').addEventListener('click', () => {
            this.verifyAllItems()
        })


        // Extraction controls toggle
        const closeExtractionBtn = document.getElementById('closeExtractionBtn')
        if (closeExtractionBtn) {
            closeExtractionBtn.addEventListener('click', () => {
                this.hideExtractionControls()
            })
        }

        // Browser controls (moved to title bar)
        const backBtn = document.getElementById('backBtn')
        const forwardBtn = document.getElementById('forwardBtn')
        const refreshBtn = document.getElementById('refreshBtn')
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                const webview = document.getElementById('webview')
                if (webview && webview.canGoBack()) {
                    webview.goBack()
                    this.updateStatus('Navigated back')
                } else {
                    this.updateStatus('Cannot go back')
                }
            })
        }
        
        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => {
                const webview = document.getElementById('webview')
                if (webview && webview.canGoForward()) {
                    webview.goForward()
                    this.updateStatus('Navigated forward')
                } else {
                    this.updateStatus('Cannot go forward')
                }
            })
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const webview = document.getElementById('webview')
                if (webview && webview.src && webview.src !== 'about:blank') {
                    webview.reload()
                    this.updateStatus('Page refreshed')
                } else {
                    this.updateStatus('No page loaded')
                }
            })
        }

        // Modal controls
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal()
        })
        
        document.getElementById('cancelExport').addEventListener('click', () => {
            this.hideModal()
        })
        
        document.getElementById('confirmExport').addEventListener('click', () => {
            this.exportData()
        })

        // Listen for browser messages
        window.addEventListener('message', (event) => {
            if (event.data.type === 'BROWSER_DATA_EXTRACTED') {
                this.handleExtractedData(event.data.data)
            } else if (event.data.type === 'BROWSER_ELEMENT_SELECTED') {
                this.handleElementSelected(event.data.data)
            }
        })
    }

    setupMenuListeners() {
        // Menu event listeners
        window.electronAPI.onMenuNewExtraction(() => {
            this.clearAll()
        })

        window.electronAPI.onMenuExportData(() => {
            this.showExportModal()
        })

        window.electronAPI.onMenuClearData(() => {
            this.clearAll()
        })

        window.electronAPI.onMenuFindSimilar(() => {
            this.findSimilar()
        })
    }

    async navigateToUrl(skipDialog = false) {
        const urlInput = document.getElementById('urlInput')
        const url = urlInput.value.trim()
        
        if (!url) {
            this.updateStatus('Please enter a URL')
            return
        }

        // Add protocol if missing
        let fullUrl = url
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            fullUrl = 'https://' + url
        }

        // Manual extraction only
        try {
            this.showLoading('Loading page...')
            this.loadUrlInWebview(fullUrl)
            this.hideLoading()
        } catch (error) {
            this.updateStatus(`Error: ${error.message}`)
            this.hideLoading()
        }
    }

    loadUrlInWebview(url) {
        const webview = document.getElementById('webview')
        webview.src = url
        this.updateStatus(`Loaded: ${url} - Ready for manual extraction`)
        
        // Setup webview event listeners
        this.setupWebviewListeners()
    }

    waitForWebviewLoaded() {
        return new Promise((resolve, reject) => {
            const webview = document.getElementById('webview')
            if (!webview) return resolve()
            const onStop = () => {
                webview.removeEventListener('did-stop-loading', onStop)
                resolve()
            }
            const onFail = (e) => {
                webview.removeEventListener('did-fail-load', onFail)
                // Resolve on aborted (-3) to not block flow; reject others
                if (e.errorCode === -3) resolve()
                else reject(new Error(e.errorDescription || 'Navigation failed'))
            }
            webview.addEventListener('did-stop-loading', onStop, { once: true })
            webview.addEventListener('did-fail-load', onFail, { once: true })
        })
    }

    setupWebviewListeners() {
        const webview = document.getElementById('webview')
        
        // Only set up listeners once
        if (webview.hasListeners) return
        webview.hasListeners = true
        
        // Set the preload script when DOM is ready
        webview.addEventListener('dom-ready', () => {
            console.log('Webview DOM ready - page loaded')
            
            // Small delay to ensure page is fully loaded
            setTimeout(() => {
                // Inject the webview preload script if needed
                webview.executeJavaScript(`
                    if (!window.webviewInitialized) {
                        window.webviewInitialized = true;
                        ${this.getInjectionScript()}
                    }
                `).catch(err => {
                    console.error('Error injecting script:', err)
                })
            }, 500)
            
            // Enable dev tools in development
            if (process.env.NODE_ENV === 'development') {
                // webview.openDevTools()
            }
        })
        
        // Handle messages from webview using different methods
        webview.addEventListener('ipc-message', (event) => {
            console.log('IPC message received:', event.channel, event.args)
            const { channel, args } = event
            
            if (channel === 'data-extracted') {
                this.handleExtractedData(args[0])
            } else if (channel === 'element-selected') {
                this.handleElementSelected(args[0])
            }
        })
        
        // Alternative: Handle console messages as communication channel
        webview.addEventListener('console-message', (e) => {
            // Check if it's a special message
            if (e.message.startsWith('EXTRACT:')) {
                try {
                    const data = JSON.parse(e.message.substring(8))
                    if (data.type === 'data-extracted') {
                        this.handleExtractedData(data.payload)
                    } else if (data.type === 'element-selected') {
                        this.handleElementSelected(data.payload)
                    }
                } catch (err) {
                    // Not a special message
                }
            }
        })
        
        // Handle navigation
        webview.addEventListener('did-navigate', (event) => {
            // Navigation handled
        })

        // Force popups and new windows to open in the same webview
        webview.addEventListener('new-window', (event) => {
            try {
                event.preventDefault()
            } catch (e) {}
            if (event.url) {
                webview.loadURL(event.url)
            }
        })

        // Keep status URL in sync for will-navigate too
        webview.addEventListener('will-navigate', (event) => {
            // Navigation will occur
        })
        
        // Handle loading errors
        webview.addEventListener('did-fail-load', (event) => {
            if (event.errorCode !== -3) { // Ignore aborted errors
                this.updateStatus(`Failed to load: ${event.errorDescription}`)
            }
        })
    }

    getInjectionScript() {
        // Return the essential extraction script to inject
        return `
        console.log('Initializing extraction system via injection...');
        
        // Simplified extraction state
        window.extractionState = {
            isSelecting: false,
            currentField: null,
            mode: 'manual'
        };
        
        // Communication helper
        function sendToHost(type, payload) {
            console.log('EXTRACT:' + JSON.stringify({ type, payload }));
        }
        
        // Message listener for commands
        window.addEventListener('message', (event) => {
            if (event.data && event.data.command) {
                console.log('Received command:', event.data.command);
                
                if (event.data.command === 'START_SELECTION') {
                    startSelection(event.data.field);
                } else if (event.data.command === 'STOP_SELECTION') {
                    stopSelection();
                } else if (event.data.command === 'SET_MODE') {
                    window.extractionState.mode = event.data.mode;
                }
            }
        });
        
        // Start selection function
        function startSelection(field) {
            console.log('Starting selection for:', field);
            window.extractionState.isSelecting = true;
            window.extractionState.currentField = field;
            
            // Add click listener
            document.addEventListener('click', handleExtractClick, true);
            
            // Add hover listener for visual feedback
            document.addEventListener('mouseover', handleHover, true);
            document.addEventListener('mouseout', handleHoverOut, true);
            
            // Show overlay
            const overlay = document.createElement('div');
            overlay.id = 'extract-overlay';
            overlay.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#4DEAC7;color:#1e293b;padding:12px 24px;border-radius:8px;z-index:999999;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
            overlay.textContent = '🎯 Click to select ' + field;
            document.body.appendChild(overlay);
            
            // Change cursor
            document.body.style.cursor = 'crosshair';
        }
        
        // Hover handlers
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
        
        // Stop selection function  
        function stopSelection() {
            console.log('Stopping selection');
            window.extractionState.isSelecting = false;
            window.extractionState.currentField = null;
            
            document.removeEventListener('click', handleExtractClick, true);
            document.removeEventListener('mouseover', handleHover, true);
            document.removeEventListener('mouseout', handleHoverOut, true);
            
            const overlay = document.getElementById('extract-overlay');
            if (overlay) overlay.remove();
            
            // Reset cursor
            document.body.style.cursor = '';
        }
        
        // Click handler
        function handleExtractClick(e) {
            if (!window.extractionState.isSelecting) return;
            
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const element = e.target;
            const field = window.extractionState.currentField;
            let value = '';
            
            console.log('Clicked element:', element, 'Field:', field);
            
            // Extract value based on field type
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
            
            // Send extracted data
            sendToHost('data-extracted', {
                [field]: value.trim(),
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
            
            // Highlight element
            element.style.outline = '3px solid #4DEAC7';
            element.style.backgroundColor = 'rgba(77, 234, 199, 0.15)';
            
            // Add a small delay before stopping selection
            setTimeout(() => {
                stopSelection();
            }, 100);
            
            return false;
        }
        
        console.log('Extraction system initialized');
        `;
    }


    getCurrentUrl() {
        // Try to get current URL from webview if available
        const webview = document.getElementById('webview')
        if (webview && webview.src && webview.src !== 'about:blank') {
            return webview.src
        }
        // Fallback to stored URL or window location
        return this.currentUrl || window.location.href
    }

    switchMode(mode) {
        this.currentMode = mode
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode)
        })

        // Show/hide template info and find similar button
        const templateInfo = document.getElementById('templateInfo')
        const fieldSection = document.querySelector('.field-section')
        const findSimilarBtn = document.getElementById('findSimilarBtn')
        
        if (mode === 'template') {
            templateInfo.style.display = 'block'
            fieldSection.style.display = 'block'
            findSimilarBtn.style.display = 'flex'
        } else {
            templateInfo.style.display = 'none'
            fieldSection.style.display = 'block'
            findSimilarBtn.style.display = 'none'
        }

        // Send mode to webview
        const webview = document.getElementById('webview')
        if (webview && webview.src !== 'about:blank') {
            webview.executeJavaScript(`
                window.postMessage({ 
                    command: 'SET_MODE', 
                    mode: '${mode}' 
                }, '*');
            `)
        }

        this.updateStatus(`Switched to ${mode} mode`)
    }

    selectField(field) {
        this.selectedField = field
        this.isSelecting = true
        
        // Update field buttons
        document.querySelectorAll('.field-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.field === field)
        })

        // Send selection message to webview
        const webview = document.getElementById('webview')
        if (webview && webview.src !== 'about:blank') {
            // Use executeJavaScript to send command
            webview.executeJavaScript(`
                window.postMessage({ 
                    command: 'START_SELECTION', 
                    field: '${field}' 
                }, '*');
            `)
            this.updateStatus(`Click on page elements to extract ${field} data`)
        } else {
            this.updateStatus('Please load a page first')
            // Reset selection
            this.selectedField = null
            this.isSelecting = false
            document.querySelectorAll('.field-btn').forEach(btn => {
                btn.classList.remove('active')
            })
        }
    }

    toggleExtractionMode() {
        const extractModeBtn = document.getElementById('extractModeBtn')
        const webview = document.getElementById('webview')
        
        // Toggle extraction mode
        if (extractModeBtn.classList.contains('active')) {
            // Currently in extract mode - disable it
            extractModeBtn.classList.remove('active')
            extractModeBtn.textContent = 'Extract Mode'
            this.isSelecting = false
            this.selectedField = null
            
            // Clear any active field selections
            document.querySelectorAll('.field-btn').forEach(btn => {
                btn.classList.remove('active')
            })
            
            // Disable extraction in webview
            if (webview && webview.src !== 'about:blank') {
                webview.executeJavaScript(`
                    window.postMessage({ 
                        command: 'STOP_EXTRACTION' 
                    }, '*');
                `)
            }
            
            this.updateStatus('Extraction mode disabled')
        } else {
            // Enable extract mode
            extractModeBtn.classList.add('active')
            extractModeBtn.textContent = 'Exit Extract Mode'
            
            // Enable extraction in webview
            if (webview && webview.src !== 'about:blank') {
                webview.executeJavaScript(`
                    window.postMessage({ 
                        command: 'ENABLE_EXTRACTION' 
                    }, '*');
                `)
                this.updateStatus('Extraction mode enabled - select a field to extract data')
            } else {
                this.updateStatus('Please load a page first to enable extraction mode')
                // Reset button state
                extractModeBtn.classList.remove('active')
                extractModeBtn.textContent = 'Extract Mode'
            }
        }
    }

    setupProtocolHandling() {
        // Listen for protocol extract events
        window.electronAPI.onProtocolExtract((event, data) => {
            console.log('🌐 Received protocol extract request:', data)
            console.log('🕵️ Event object:', event)
            console.log('🕵️ Data keys:', Object.keys(data))
            console.log('🕵️ Action:', data.action)
            console.log('🕵️ URL:', data.url)
            console.log('🕵️ BypassAuth:', data.bypassAuth)
            this.handleProtocolExtract(data)
        })
    }

    async handleProtocolExtract(data) {
        const { action, url, bypassAuth } = data
        
        if (action === 'extract' && url) {
            console.log('🎯 Handling protocol extract for URL:', url)
            
            // If bypassAuth is true, bypass authentication check
            if (bypassAuth) {
                console.log('🔓 Bypassing authentication for protocol URL')
                // Skip auth check and proceed directly
                this.isAuthenticated = true
                
                // Check if we need to transition from login to app, or if app is already shown
                const loginContainer = document.getElementById('loginContainer')
                const appContainer = document.getElementById('appContainer')
                
                // Check if login is currently visible
                const loginVisible = loginContainer && 
                    loginContainer.style.display !== 'none' && 
                    getComputedStyle(loginContainer).display !== 'none'
                
                if (loginVisible && appContainer) {
                    console.log('🔓 Transitioning from login to app interface')
                    // Add smooth transition
                    loginContainer.style.transition = 'opacity 0.3s ease'
                    loginContainer.style.opacity = '0'
                    
                    setTimeout(() => {
                        loginContainer.style.display = 'none'
                        appContainer.style.display = 'block'
                        appContainer.style.opacity = '0'
                        appContainer.style.transition = 'opacity 0.3s ease'
                        
                        // Fade in app container and wait for render
                        setTimeout(() => {
                            appContainer.style.opacity = '1'
                            
                            // Force a reflow to ensure all elements are rendered
                            appContainer.offsetHeight
                            
                            // Additional delay to ensure all child elements are ready
                            setTimeout(() => {
                                console.log('🎯 App container fully rendered, proceeding with protocol handling')
                            }, 200)
                        }, 50)
                    }, 300)
                } else {
                    console.log('🔓 App already loaded and visible, no transition needed')
                    // App is already visible, just ensure it's marked as authenticated
                    this.isAuthenticated = true
                }
                
                this.showUpdateLog('🔓 Authentication bypassed for website integration')
            }
            
            // Show notification
            this.showUpdateLog(`🌐 Opening URL from website: ${url}`)
            
            // Determine if we're transitioning from login
            const loginContainer = document.getElementById('loginContainer')
            const needsTransition = loginContainer && 
                loginContainer.style.display !== 'none' && 
                getComputedStyle(loginContainer).display !== 'none'
                
            // Wait a moment for UI to be ready
            setTimeout(async () => {
                try {
                    // Ensure UI is fully ready with more complete check
                    const urlInput = document.getElementById('urlInput')
                    const appContainer = document.getElementById('appContainer')
                    const extractModeBtn = document.getElementById('extractModeBtn')
                    const webview = document.getElementById('webview')
                    
                    // Check for essential elements (appContainer might not exist if app is already loaded)
                    const essentialElements = {
                        urlInput: !!urlInput,
                        extractModeBtn: !!extractModeBtn,
                        webview: !!webview
                    }
                    
                    const missingEssential = Object.entries(essentialElements).filter(([key, exists]) => !exists)
                    
                    if (missingEssential.length > 0) {
                        console.error('❌ Required UI elements not found')
                        console.error('Missing elements:', {
                            urlInput: !!urlInput,
                            appContainer: !!appContainer, 
                            extractModeBtn: !!extractModeBtn,
                            webview: !!webview
                        })
                        console.error('Missing essential:', missingEssential.map(([key]) => key))
                        this.showUpdateLog('❌ UI not ready, retrying...')
                        
                        // Retry with exponential backoff - but limit retries to prevent infinite loop
                        if (!this.protocolRetryCount) this.protocolRetryCount = 0
                        this.protocolRetryCount++
                        
                        if (this.protocolRetryCount < 5) {
                            const delay = Math.min(2000 * this.protocolRetryCount, 10000) // Max 10 seconds
                            setTimeout(() => this.handleProtocolExtract(data), delay)
                        } else {
                            this.showUpdateLog('❌ UI failed to load after multiple attempts')
                            console.error('❌ Giving up after 5 retry attempts')
                        }
                        return
                    }
                    
                    // Reset retry counter on success
                    this.protocolRetryCount = 0
                    
                    // Set URL and show loading state
                    urlInput.value = url
                    console.log('📝 Set URL input to:', url)
                    console.log('📝 URL input element value after setting:', urlInput.value)
                    this.updateStatus('Loading website from protocol...')
                    
                    // Navigate to the URL automatically (skip dialog)
                    console.log('🧭 Starting navigation with skipDialog=true')
                    await this.navigateToUrl(true)
                    console.log('🧭 Navigation completed successfully')
                    
                    // Wait for webview to be ready
                    const webviewElement = document.getElementById('webview')
                    if (webviewElement) {
                        // Wait for page to load before enabling extraction
                        const waitForLoad = new Promise((resolve) => {
                            const checkLoad = () => {
                                if (webviewElement.src && webviewElement.src !== 'about:blank') {
                                    setTimeout(resolve, 2000) // Extra 2 seconds for page stability
                                } else {
                                    setTimeout(checkLoad, 500) // Check again in 500ms
                                }
                            }
                            checkLoad()
                        })
                        
                        await waitForLoad
                        
                        // Enable extraction mode automatically
                        const extractModeBtn = document.getElementById('extractModeBtn')
                        if (extractModeBtn && !extractModeBtn.classList.contains('active')) {
                            console.log('🎯 Enabling extraction mode')
                            this.toggleExtractionMode()
                            this.showUpdateLog('✅ Extraction mode enabled - ready to extract!')
                        }
                    }
                    
                    // Show success message
                    this.updateStatus(`Ready to extract data from: ${url}`)
                    
                } catch (error) {
                    console.error('❌ Protocol handling failed:', error)
                    this.showUpdateLog(`❌ Failed to load: ${error.message}`)
                    this.updateStatus(`Error loading: ${url}`)
                }
            }, bypassAuth ? (needsTransition ? 2500 : 1000) : 500) // Wait longer only if transitioning from login
        }
    }

    async findSimilar() {
        if (this.currentMode !== 'template') {
            this.updateStatus('Please switch to template mode to find similar elements')
            return
        }

        const webview = document.getElementById('webview')
        if (!webview || webview.src === 'about:blank') {
            this.updateStatus('Please load a page first')
            return
        }

        this.showLoading('Finding similar elements...')
        
        try {
            // Send find similar message to webview
            webview.send('find-similar')
            
            setTimeout(() => {
                this.hideLoading()
            }, 1000)
        } catch (error) {
            this.hideLoading()
            this.updateStatus(`Error finding similar elements: ${error.message}`)
        }
    }

    async clearAll() {
        try {
            // Clear local data
            this.extractedData = []
            
            // Clear database
            const allData = await window.electronAPI.getExtractedData()
            for (const item of allData) {
                await window.electronAPI.deleteExtractedData(item.id)
            }
            
            // Clear field selection
            this.selectedField = null
            this.isSelecting = false
            
            // Update UI
            document.querySelectorAll('.field-btn').forEach(btn => {
                btn.classList.remove('active')
            })
            
            // Clear webview highlights
            const webview = document.getElementById('webview')
            if (webview && webview.src !== 'about:blank') {
                webview.executeJavaScript(`
                    // Clear all highlights
                    document.querySelectorAll('[style*="outline"]').forEach(el => {
                        el.style.outline = '';
                        el.style.backgroundColor = '';
                    });
                    window.postMessage({ command: 'STOP_SELECTION' }, '*');
                `)
            }
            
            this.updateDataDisplay()
            this.updateStatus('All data cleared')
        } catch (error) {
            this.updateStatus(`Error clearing data: ${error.message}`)
        }
    }

    showExportModal() {
        if (this.extractedData.length === 0) {
            this.updateStatus('No data to export')
            return
        }
        
        document.getElementById('modalOverlay').style.display = 'flex'
    }

    hideModal() {
        document.getElementById('modalOverlay').style.display = 'none'
    }

    async exportData() {
        const selectedFormat = document.querySelector('input[name="exportFormat"]:checked').value
        
        this.showLoading('Exporting data...')
        this.hideModal()
        
        try {
            const result = await window.electronAPI.exportData(selectedFormat)
            
            if (result.success) {
                this.updateStatus(`Exported ${result.count} items to ${result.path}`)
                
                // Show success notification
                setTimeout(() => {
                    if (confirm('Export completed! Would you like to open the file location?')) {
                        window.electronAPI.showItemInFolder(result.path)
                    }
                }, 500)
            } else if (result.canceled) {
                this.updateStatus('Export canceled')
            } else {
                this.updateStatus('Export failed')
            }
        } catch (error) {
            this.updateStatus(`Export error: ${error.message}`)
        } finally {
            this.hideLoading()
        }
    }

    async addNewItem() {
        try {
            // Switch to manual mode if not already
            if (this.currentMode !== 'manual') {
                this.switchMode('manual')
            }
            
            // Create empty item with basic structure
            const emptyItem = {
                title: '',
                description: '',
                image: '',
                price: '',
                category: '',
                url: this.getCurrentUrl(),
                timestamp: new Date().toISOString(),
                verified: false,
                isBeingFilled: true // Special flag to indicate this item is currently being filled
            }
            
            // Save the empty item to get an ID
            const savedItem = await window.electronAPI.saveExtractedData(emptyItem)
            
            // Add to our local array
            this.extractedData.push(savedItem)
            
            // Set this as the current item being filled
            this.currentItemId = savedItem.id
            
            // Update display to show the new empty item
            this.updateDataDisplay()
            
            this.updateStatus(`New item created! Select a field and click elements to fill item #${this.extractedData.length}`)
            
        } catch (error) {
            console.error('Error creating new item:', error)
            this.updateStatus(`Error creating new item: ${error.message}`)
        }
    }

    showExtractionControls() {
        const extractionControls = document.getElementById('extractionControls')
        if (extractionControls) {
            extractionControls.style.display = 'block'
        }
    }

    hideExtractionControls() {
        const extractionControls = document.getElementById('extractionControls')
        if (extractionControls) {
            extractionControls.style.display = 'none'
        }
    }

    async verifyAllItems() {
        try {
            let verifiedCount = 0
            
            for (const item of this.extractedData) {
                if (!item.verified) {
                    await window.electronAPI.updateExtractedData(item.id, {
                        ...item,
                        verified: true
                    })
                    item.verified = true
                    verifiedCount++
                }
            }
            
            this.updateDataDisplay()
            this.updateStatus(`Verified ${verifiedCount} items`)
        } catch (error) {
            this.updateStatus(`Error verifying items: ${error.message}`)
        }
    }

    async handleExtractedData(data) {
        try {
            if (this.currentMode === 'manual') {
                // In manual mode, fill the current item or create a new one
                const field = Object.keys(data).find(key => key !== 'url' && key !== 'timestamp')
                if (!field) return
                
                let targetItem = null
                let targetIndex = -1
                
                // Determine which item to fill
                if (this.currentItemId) {
                    // Find the current item being filled
                    targetIndex = this.extractedData.findIndex(item => item.id === this.currentItemId)
                    if (targetIndex !== -1) {
                        targetItem = this.extractedData[targetIndex]
                    }
                }
                
                // If no current item or current item not found, find the first empty item or create new one
                if (!targetItem) {
                    // Look for the first item that's being filled or is empty
                    targetIndex = this.extractedData.findIndex(item => 
                        item.isBeingFilled || this.isItemEmpty(item)
                    )
                    
                    if (targetIndex !== -1) {
                        targetItem = this.extractedData[targetIndex]
                        this.currentItemId = targetItem.id
                    } else {
                        // No empty items found, create a new one automatically
                        await this.addNewItem()
                        return // addNewItem will set up currentItemId, so we're done
                    }
                }
                
                // Update the target item with the new field data
                const updatedItem = {
                    ...targetItem,
                    [field]: data[field],
                    url: data.url || targetItem.url,
                    timestamp: new Date().toISOString(),
                    isBeingFilled: true
                }
                
                // Save the updated item
                const savedItem = await window.electronAPI.updateExtractedData(targetItem.id, updatedItem)
                
                // Update the item in our local array
                this.extractedData[targetIndex] = savedItem
                
                this.updateDataDisplay()
                this.updateStatus(`Added ${field} to item #${targetIndex + 1}`)
                
            } else {
                // Template mode or array of items
                const items = Array.isArray(data) ? data : [data]
                
                for (const item of items) {
                    const savedItem = await window.electronAPI.saveExtractedData(item)
                    this.extractedData.push(savedItem)
                }
                
                this.updateDataDisplay()
                this.updateStatus(`Extracted ${items.length} item(s)`)
            }
        } catch (error) {
            console.error('Error handling extracted data:', error)
            this.updateStatus(`Error saving data: ${error.message}`)
        }
    }

    handleElementSelected(data) {
        if (this.currentMode === 'template') {
            // Update template status
            this.updateTemplateField(data.field, true)
            this.updateStatus(`Template ${data.field} set: ${data.value.substring(0, 30)}...`)
        }
    }

    // Helper method to check if an item is empty (has no meaningful content)
    isItemEmpty(item) {
        const contentFields = ['title', 'description', 'image', 'price']
        return contentFields.every(field => !item[field] || item[field].trim() === '')
    }

    // Method to set which item is currently being filled
    async setCurrentItem(itemId) {
        try {
            // Mark the previous current item as no longer being filled
            if (this.currentItemId && this.currentItemId !== itemId) {
                const prevIndex = this.extractedData.findIndex(item => item.id === this.currentItemId)
                if (prevIndex !== -1) {
                    this.extractedData[prevIndex].isBeingFilled = false
                    // Update in database
                    await window.electronAPI.updateExtractedData(this.currentItemId, {
                        ...this.extractedData[prevIndex],
                        isBeingFilled: false
                    })
                }
            }
            
            // Set the new current item
            this.currentItemId = itemId
            const currentIndex = this.extractedData.findIndex(item => item.id === itemId)
            if (currentIndex !== -1) {
                this.extractedData[currentIndex].isBeingFilled = true
                // Update in database
                await window.electronAPI.updateExtractedData(itemId, {
                    ...this.extractedData[currentIndex],
                    isBeingFilled: true
                })
                this.updateDataDisplay()
                this.updateStatus(`Now filling item #${currentIndex + 1}`)
            }
        } catch (error) {
            console.error('Error setting current item:', error)
            this.updateStatus(`Error selecting item: ${error.message}`)
        }
    }

    // Method to finish filling current item (marks it as complete and ready for verification)
    async finishCurrentItem() {
        if (!this.currentItemId) {
            this.updateStatus('No item is currently being filled')
            return
        }

        try {
            const currentIndex = this.extractedData.findIndex(item => item.id === this.currentItemId)
            if (currentIndex !== -1) {
                const item = this.extractedData[currentIndex]
                
                // Check if item has at least one field filled
                if (this.isItemEmpty(item)) {
                    this.updateStatus('Cannot finish empty item. Add some data first.')
                    return
                }

                // Mark as finished (not being filled anymore)
                const updatedItem = {
                    ...item,
                    isBeingFilled: false,
                    timestamp: new Date().toISOString()
                }

                const savedItem = await window.electronAPI.updateExtractedData(this.currentItemId, updatedItem)
                this.extractedData[currentIndex] = savedItem
                
                // Clear current item ID
                this.currentItemId = null
                
                this.updateDataDisplay()
                this.updateStatus(`Item #${currentIndex + 1} finished! Click "Add Item" to create a new one.`)
            }
        } catch (error) {
            console.error('Error finishing current item:', error)
            this.updateStatus(`Error finishing item: ${error.message}`)
        }
    }

    // Method to get summary of filling status
    getFillingStatus() {
        const emptyItems = this.extractedData.filter(item => this.isItemEmpty(item)).length
        const beingFilledItems = this.extractedData.filter(item => item.isBeingFilled).length
        const completedItems = this.extractedData.filter(item => !this.isItemEmpty(item) && !item.isBeingFilled).length
        
        return {
            empty: emptyItems,
            beingFilled: beingFilledItems,
            completed: completedItems,
            total: this.extractedData.length
        }
    }

    // Method to update the filling status display and controls
    updateFillingStatus() {
        const status = this.getFillingStatus()
        const fillingStatus = document.getElementById('fillingStatus')
        const finishItemBtn = document.getElementById('finishItemBtn')
        
        // Show/hide finish button based on whether there's a current item
        if (this.currentItemId && status.beingFilled > 0) {
            finishItemBtn.style.display = 'block'
        } else {
            finishItemBtn.style.display = 'none'
        }
        
        // Show/hide filling status based on whether we have items
        if (status.total > 0) {
            fillingStatus.style.display = 'block'
            
            // Update status counts
            document.getElementById('emptyCount').textContent = status.empty
            document.getElementById('fillingCount').textContent = status.beingFilled
            document.getElementById('completedCount').textContent = status.completed
        } else {
            fillingStatus.style.display = 'none'
        }
    }

    updateTemplateField(field, isSet) {
        const templateField = document.querySelector(`.template-field[data-field="${field}"] .status`)
        if (templateField) {
            if (isSet) {
                templateField.textContent = 'Set'
                templateField.classList.add('set')
            } else {
                templateField.textContent = 'Not set'
                templateField.classList.remove('set')
            }
        }
    }

    async loadData() {
        try {
            this.extractedData = await window.electronAPI.getExtractedData()
            this.updateDataDisplay()
        } catch (error) {
            console.error('Error loading data:', error)
            this.updateStatus('Error loading saved data')
        }
    }

    updateDataDisplay() {
        const dataList = document.getElementById('dataList')
        const dataCount = document.getElementById('dataCount')
        const extractionStats = document.getElementById('extractionStats')
        
        dataCount.textContent = this.extractedData.length
        extractionStats.textContent = `${this.extractedData.length} items extracted`
        
        // Update filling status and controls
        this.updateFillingStatus()
        
        if (this.extractedData.length === 0) {
            dataList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <div class="empty-text">No data extracted yet</div>
                    <div class="empty-subtext">Click "Add Item" to create your first item, then select fields and click elements to fill it</div>
                </div>
            `
            return
        }

        // Group items by category if categories exist
        const itemsByCategory = {}
        let hasCategories = false
        
        this.extractedData.forEach(item => {
            const category = item.category || 'Uncategorized'
            if (item.category) hasCategories = true
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = []
            }
            itemsByCategory[category].push(item)
        })

        // Render items, grouped by category if applicable
        let html = ''
        for (const [category, items] of Object.entries(itemsByCategory)) {
            // Show category header only if we have multiple categories
            if (hasCategories && Object.keys(itemsByCategory).length > 1) {
                html += `<div class="category-header">${category} (${items.length} items)</div>`
            }
            
            html += items.map((item, globalIndex) => {
                const isCurrentItem = item.id === this.currentItemId
                const isEmpty = this.isItemEmpty(item)
                const itemNumber = this.extractedData.findIndex(dataItem => dataItem.id === item.id) + 1
                
                return `
                <div class="data-item ${item.verified ? 'verified' : ''} ${isCurrentItem ? 'current-item' : ''} ${isEmpty ? 'empty-item' : ''}" 
                     data-index="${globalIndex}" data-item-id="${item.id}">
                    <div class="data-header">
                        <div class="item-number">Item #${itemNumber}</div>
                        <div class="item-status">
                            ${isCurrentItem ? '<span class="status-badge current">🎯 Currently Filling</span>' : ''}
                            ${isEmpty && !isCurrentItem ? '<span class="status-badge empty">📝 Empty</span>' : ''}
                            ${item.verified ? '<span class="status-badge verified">✅ Verified</span>' : ''}
                        </div>
                    </div>
                    <div class="data-content">
                        ${this.renderDataField('Title', item.title)}
                        ${this.renderDataField('Description', item.description)}
                        ${this.renderDataField('Image', item.image, true)}
                        ${this.renderDataField('Price', item.price)}
                    </div>
                    <div class="data-actions">
                        ${!isCurrentItem ? `<button class="data-action-btn select" onclick="app.setCurrentItem(${item.id})">
                            📍 Select for Filling
                        </button>` : ''}
                        <button class="data-action-btn verify ${item.verified ? 'verified' : ''}" 
                                onclick="app.toggleVerification(${item.id})">
                            ${item.verified ? '✓ Verified' : 'Verify'}
                        </button>
                        <button class="data-action-btn edit" onclick="app.editItem(${item.id})">
                            Edit
                        </button>
                        <button class="data-action-btn delete" onclick="app.deleteItem(${item.id})">
                            Delete
                        </button>
                    </div>
                </div>
            `}).join('')
        }
        
        dataList.innerHTML = html
    }

    formatOptions(options) {
        if (!options || typeof options !== 'object') return ''
        return Object.entries(options)
            .map(([key, values]) => `${key}: ${Array.isArray(values) ? values.join(', ') : values}`)
            .join(' | ')
    }

    renderDataField(label, value, isUrl = false) {
        const hasValue = value && value.trim()
        
        return `
            <div class="data-field">
                <div class="data-field-label">${label}:</div>
                <div class="data-field-value ${hasValue ? '' : 'empty'}">
                    ${hasValue ? (isUrl ? `<a href="${value}" target="_blank">${value}</a>` : value) : `No ${label.toLowerCase()}`}
                </div>
            </div>
        `
    }

    async toggleVerification(id) {
        try {
            const item = this.extractedData.find(item => item.id === id)
            if (item) {
                const updatedItem = await window.electronAPI.updateExtractedData(id, {
                    ...item,
                    verified: !item.verified
                })
                
                // Update local data
                Object.assign(item, updatedItem)
                this.updateDataDisplay()
                this.updateStatus(`Item ${item.verified ? 'verified' : 'unverified'}`)
            }
        } catch (error) {
            this.updateStatus(`Error updating item: ${error.message}`)
        }
    }

    async deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return
        }

        try {
            await window.electronAPI.deleteExtractedData(id)
            this.extractedData = this.extractedData.filter(item => item.id !== id)
            this.updateDataDisplay()
            this.updateStatus('Item deleted')
        } catch (error) {
            this.updateStatus(`Error deleting item: ${error.message}`)
        }
    }

    editItem(id) {
        const item = this.extractedData.find(item => item.id === id)
        if (!item) {
            this.updateStatus('Item not found')
            return
        }

        // Create edit form
        const editForm = document.createElement('div')
        editForm.className = 'edit-form-overlay'
        editForm.innerHTML = `
            <div class="edit-form-modal">
                <div class="edit-form-header">
                    <h3>Edit Item</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="edit-form-content">
                    <div class="form-group">
                        <label>Title:</label>
                        <input type="text" id="edit-title" value="${item.title || ''}" />
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <textarea id="edit-description">${item.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Price:</label>
                        <input type="text" id="edit-price" value="${item.price || ''}" />
                    </div>
                    <div class="form-group">
                        <label>Category:</label>
                        <input type="text" id="edit-category" value="${item.category || ''}" />
                    </div>
                    <div class="form-group">
                        <label>Image URL:</label>
                        <input type="text" id="edit-image" value="${item.image || ''}" />
                    </div>
                </div>
                <div class="edit-form-actions">
                    <button class="btn-save" onclick="app.saveEditedItem(${id})">Save Changes</button>
                    <button class="btn-cancel" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                </div>
            </div>
        `
        
        document.body.appendChild(editForm)
    }

    async saveEditedItem(id) {
        try {
            const updatedItem = {
                title: document.getElementById('edit-title').value,
                description: document.getElementById('edit-description').value,
                price: document.getElementById('edit-price').value,
                category: document.getElementById('edit-category').value,
                image: document.getElementById('edit-image').value,
                verified: true, // Mark as verified when user manually edits
                timestamp: new Date().toISOString()
            }

            const savedItem = await window.electronAPI.updateExtractedData(id, updatedItem)
            
            // Update local data
            const itemIndex = this.extractedData.findIndex(item => item.id === id)
            if (itemIndex !== -1) {
                this.extractedData[itemIndex] = { ...this.extractedData[itemIndex], ...savedItem }
            }

            // Close edit form
            document.querySelector('.edit-form-overlay').remove()
            
            // Refresh display
            this.updateDataDisplay()
            this.updateStatus('Item updated successfully')
        } catch (error) {
            this.updateStatus(`Error updating item: ${error.message}`)
        }
    }

    updateStatus(message) {
        const statusMessage = document.getElementById('statusMessage')
        statusMessage.textContent = message
        
        // Clear status after 5 seconds
        setTimeout(() => {
            statusMessage.textContent = 'Ready to extract data'
        }, 5000)
    }

    updateUI() {
        // Update browser view bounds
        this.resizeBrowserView()
        
        // Update connection status
        const connectionStatus = document.getElementById('connectionStatus')
        connectionStatus.textContent = 'Connected'
        connectionStatus.style.background = 'rgba(77, 234, 199, 0.2)'
        connectionStatus.style.color = '#4DEAC7'
    }

    async resizeBrowserView() {
        // No longer needed with webview tag
        // Webview automatically resizes with CSS
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay')
        const text = overlay.querySelector('.loading-text')
        text.textContent = message
        overlay.style.display = 'flex'
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none'
    }
    
    
    setupUpdateLogListener() {
        // Listen for update logs from main process
        window.electronAPI.onUpdateLog((event, message) => {
            console.log('🔄 Update Log:', message)
            this.showUpdateLog(message)
        })
    }
    
    showUpdateLog(message) {
        // Create or update update log display
        let updateLogDiv = document.getElementById('updateLogDiv')
        if (!updateLogDiv) {
            updateLogDiv = document.createElement('div')
            updateLogDiv.id = 'updateLogDiv'
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
            `
            document.body.appendChild(updateLogDiv)
        }
        
        const timestamp = new Date().toLocaleTimeString()
        updateLogDiv.innerHTML += `<div>[${timestamp}] ${message}</div>`
        
        // Keep only last 10 messages
        const lines = updateLogDiv.children
        if (lines.length > 10) {
            updateLogDiv.removeChild(lines[0])
        }
        
        // Auto-hide after 30 seconds if no error
        if (!message.includes('💥') && !message.includes('✅')) {
            setTimeout(() => {
                if (updateLogDiv && updateLogDiv.parentNode) {
                    updateLogDiv.style.opacity = '0.5'
                }
            }, 30000)
        }
    }
    


    forcePageVisibility(webview) {
        // Prevent multiple applications
        if (this.visibilityFixApplied) {
            console.log('🎨 Visibility fix already applied, skipping...')
            return
        }
        
        console.log('🎨 Forcing page visibility...')
        this.visibilityFixApplied = true
        
        // Reset flag after 10 seconds
        setTimeout(() => {
            this.visibilityFixApplied = false
        }, 10000)
        
        // Inject CSS and JavaScript to force page rendering (SAFE VERSION)
        const fixScript = `
            (function() {
                try {
                    // Add minimal CSS fix without breaking the page
                    const style = document.createElement('style');
                    style.id = 'electron-visibility-fix';
                    
                    // Don't add if already exists
                    if (document.getElementById('electron-visibility-fix')) {
                        return 'Already applied';
                    }
                    
                    style.textContent = \`
                        /* Minimal visibility fixes */
                        body, html {
                            display: block !important;
                            visibility: visible !important;
                        }
                        
                        /* Hide Cloudflare challenge after success */
                        .cf-browser-verification,
                        #cf-wrapper,
                        .cf-challenge-running {
                            display: none !important;
                        }
                    \`;
                    
                    if (document.head) {
                        document.head.appendChild(style);
                    }
                    
                    // Gentle scroll to top
                    if (window.scrollY > 100) {
                        window.scrollTo({top: 0, behavior: 'smooth'});
                    }
                    
                    console.log('✅ Visibility fix applied safely');
                    return 'Visibility forced safely';
                } catch (error) {
                    console.error('❌ Visibility fix error:', error.message);
                    return 'Error: ' + error.message;
                }
            })();
        `;
        
        webview.executeJavaScript(fixScript)
            .then(result => {
                console.log('✅ Force visibility result:', result)
            })
            .catch(err => {
                console.error('❌ Failed to force visibility:', err)
                this.visibilityFixApplied = false // Allow retry on error
            })
    }
}

// Global functions for button clicks (called from HTML)
window.app = null

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DataExtractorApp()
})

// Handle window resize
window.addEventListener('resize', () => {
    if (window.app) {
        window.app.resizeBrowserView()
    }
})

// Handle window focus
window.addEventListener('focus', () => {
    if (window.app) {
        window.app.updateUI()
    }
})

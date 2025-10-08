# Architecture Documentation

## System Overview

This is a professional Electron-based data extraction application built with **functional programming principles** and a **modular architecture**.

## Tech Stack

- **Electron**: Desktop application framework
- **Node.js**: JavaScript runtime
- **Functional Programming**: Pure functions, immutability
- **Module Pattern**: CommonJS modules
- **State Management**: Custom reactive store
- **No Framework**: Vanilla JS with modern patterns

## Core Principles

### 1. Functional Programming

Every function is designed to be:
- **Pure**: Same input always produces same output
- **Predictable**: No side effects
- **Testable**: Easy to unit test
- **Composable**: Can be combined with other functions

### 2. Modularity

Each module has:
- **Single Responsibility**: One clear purpose
- **Loose Coupling**: Minimal dependencies
- **High Cohesion**: Related code stays together
- **Clear Interface**: Well-defined exports

### 3. Immutability

Data structures:
- Never mutated directly
- Always copied when modified
- Predictable state changes
- Easier debugging

## Directory Structure

```
manual-extrator/
├── src/
│   ├── main/                  # Main process (Node.js)
│   │   ├── config/
│   │   │   └── constants.js   # App configuration
│   │   ├── core/
│   │   │   ├── window.js      # Window management
│   │   │   ├── menu.js        # Application menu
│   │   │   └── lifecycle.js   # App lifecycle
│   │   ├── ipc/
│   │   │   └── handlers.js    # IPC handlers
│   │   ├── services/
│   │   │   ├── data.js        # Data management
│   │   │   ├── export.js      # Export functionality
│   │   │   ├── updater.js     # Auto-updater
│   │   │   ├── protocol.js    # Deep linking
│   │   │   └── session.js     # Session config
│   │   └── utils/
│   │       └── logger.js      # Logging utility
│   │
│   ├── renderer/              # Renderer process (Browser)
│   │   ├── components/
│   │   │   ├── ui.js          # UI components
│   │   │   ├── dataDisplay.js # Data display
│   │   │   └── notifications.js # Notifications
│   │   ├── hooks/
│   │   │   ├── useAuth.js     # Auth logic
│   │   │   └── useWebview.js  # Webview logic
│   │   ├── services/
│   │   │   ├── dataService.js # Data operations
│   │   │   └── webview.js     # Webview service
│   │   ├── state/
│   │   │   └── store.js       # State management
│   │   ├── utils/
│   │   │   ├── dom.js         # DOM utilities
│   │   │   ├── validation.js  # Validation
│   │   │   └── formatters.js  # Formatting
│   │   ├── renderer.js        # Main entry point
│   │   ├── login.js           # Login page
│   │   └── index.html         # Main HTML
│   │
│   ├── preload/               # Preload scripts
│   │   ├── preload.js
│   │   ├── stealthPreload.js
│   │   └── webviewPreload.js
│   │
│   └── main.js                # App entry point
│
├── assets/                    # Static assets
├── dist/                      # Build output
├── node_modules/              # Dependencies
├── package.json               # Project config
└── README.md                  # Documentation
```

## Component Interaction

```
┌─────────────────────────────────────────────────┐
│                 Electron App                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌───────────────────┐      ┌────────────────┐ │
│  │   Main Process    │◄────►│   Renderer     │ │
│  │   (Node.js)       │ IPC  │   (Browser)    │ │
│  └───────────────────┘      └────────────────┘ │
│           │                         │           │
│           │                         │           │
│  ┌────────▼──────────┐     ┌────────▼────────┐ │
│  │  Services Layer   │     │  Components     │ │
│  │  - Data           │     │  - UI           │ │
│  │  - Export         │     │  - Webview      │ │
│  │  - Updater        │     │  - State        │ │
│  │  - Protocol       │     │  - Utils        │ │
│  └───────────────────┘     └─────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Data Flow

### Unidirectional Data Flow

```
User Action
    ↓
Event Handler
    ↓
Service Layer (Business Logic)
    ↓
State Update
    ↓
UI Re-render
    ↓
User Sees Updated UI
```

### State Management Flow

```javascript
// 1. User clicks button
onClick={() => addItem()}

// 2. Handler calls service
const addItem = async () => {
  const item = await dataService.saveData(newItem);
  
  // 3. Update state
  store.actions.addExtractedItem(item);
}

// 4. State notifies subscribers
store.subscribe((newState) => {
  updateUI();  // UI automatically updates
});
```

## Module Dependencies

### Main Process Dependencies

```
main.js
  └─> lifecycle.js
  └─> windowManager.js
      └─> sessionService.js
      └─> updater.js
  └─> menuManager.js
  └─> ipcHandlers.js
      └─> dataService.js
      └─> exportService.js
  └─> protocolService.js
```

### Renderer Dependencies

```
renderer.js
  └─> state/store.js
  └─> services/
      └─> dataService.js
      └─> webview.js
  └─> components/
      └─> ui.js
      └─> dataDisplay.js
      └─> notifications.js
  └─> hooks/
      └─> useAuth.js
      └─> useWebview.js
  └─> utils/
      └─> dom.js
      └─> validation.js
      └─> formatters.js
```

## Key Design Patterns

### 1. Service Pattern

Services encapsulate business logic:

```javascript
// dataService.js
const getAllData = async () => {
  return await window.electronAPI.getExtractedData();
};

module.exports = {
  getAllData,
  saveData,
  updateData,
  deleteData,
};
```

### 2. Observer Pattern

State management with observers:

```javascript
// store.js
const observers = new Set();

const subscribe = (callback) => {
  observers.add(callback);
  return () => observers.delete(callback);
};

const notify = () => {
  observers.forEach(callback => callback(state));
};
```

### 3. Higher-Order Functions

Reusable logic wrappers:

```javascript
const withLoading = (fn) => {
  return async (...args) => {
    showLoading();
    try {
      return await fn(...args);
    } finally {
      hideLoading();
    }
  };
};

const fetchData = withLoading(async () => {
  // fetch logic
});
```

### 4. Dependency Injection

Explicit dependencies:

```javascript
// Instead of
function saveData() {
  window.electronAPI.saveData(this.data);
}

// We use
const saveData = (data, api) => {
  return api.saveData(data);
};
```

## Communication Patterns

### IPC Communication

```javascript
// Main Process (ipcHandlers.js)
ipcMain.handle('get-data', async () => {
  return dataService.getAllData();
});

// Renderer Process (dataService.js)
const getAllData = async () => {
  return await window.electronAPI.getExtractedData();
};
```

### Webview Communication

```javascript
// Renderer to Webview
webview.executeJavaScript(`
  window.postMessage({ command: 'START_SELECTION' }, '*');
`);

// Webview to Renderer
webview.addEventListener('console-message', (e) => {
  if (e.message.startsWith('EXTRACT:')) {
    const data = JSON.parse(e.message.substring(8));
    handleExtractedData(data);
  }
});
```

## Error Handling Strategy

### 1. Try-Catch Blocks

```javascript
const loadData = async () => {
  try {
    const data = await dataService.getAllData();
    store.actions.setExtractedData(data);
  } catch (error) {
    logger.error('Failed to load data:', error);
    notifications.showError('Error loading data');
  }
};
```

### 2. Error Boundaries

```javascript
const withErrorBoundary = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`Error in ${fn.name}:`, error);
      notifications.showError(`Operation failed: ${error.message}`);
      return null;
    }
  };
};
```

### 3. Validation

```javascript
const validateInput = (data) => {
  if (!data) throw new Error('Data is required');
  if (isEmpty(data.title)) throw new Error('Title is required');
  return true;
};
```

## Performance Optimizations

### 1. Lazy Loading

Only load modules when needed:

```javascript
const loadHeavyModule = async () => {
  const module = await import('./heavyModule.js');
  return module.default;
};
```

### 2. Debouncing

Reduce expensive operations:

```javascript
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);
```

### 3. Memoization

Cache expensive computations:

```javascript
const memoizedComputation = memoize((data) => {
  return expensiveOperation(data);
});
```

### 4. Virtual Scrolling

For large lists (future enhancement):

```javascript
const renderVisibleItems = (items, viewport) => {
  const visibleItems = items.slice(viewport.start, viewport.end);
  return visibleItems.map(renderItem);
};
```

## Security Considerations

### 1. Context Isolation

```javascript
// main/core/window.js
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  enableRemoteModule: false,
}
```

### 2. Input Validation

```javascript
// Always validate user input
const normalizeUrl = (url) => {
  if (!url) return '';
  // Sanitize and validate
  return cleanUrl;
};
```

### 3. XSS Prevention

```javascript
// Use escapeHtml for user-generated content
const renderContent = (userInput) => {
  return escapeHtml(userInput);
};
```

## Testing Strategy

### Unit Tests

Test pure functions:

```javascript
describe('validation', () => {
  test('normalizeUrl adds protocol', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });
});
```

### Integration Tests

Test module interactions:

```javascript
describe('dataService', () => {
  test('saveData persists to storage', async () => {
    const item = { title: 'Test' };
    const saved = await dataService.saveData(item);
    expect(saved.id).toBeDefined();
  });
});
```

### E2E Tests

Test full user flows (future):

```javascript
describe('extraction flow', () => {
  test('user can extract data from page', async () => {
    // Load page
    // Click extract button
    // Verify data saved
  });
});
```

## Build & Deployment

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build:win
```

### Distribution

```bash
npm run publish
```

## Monitoring & Logging

### Structured Logging

```javascript
logger.info('Application started');
logger.error('Failed to load data:', error);
logger.debug('Current state:', state);
```

### Performance Monitoring

```javascript
const startTime = Date.now();
await performOperation();
const duration = Date.now() - startTime;
logger.info(`Operation took ${duration}ms`);
```

## Future Enhancements

### Planned Features

1. **TypeScript**: Add type safety
2. **React**: Migrate to React for better component model
3. **Redux**: More sophisticated state management
4. **Testing**: Comprehensive test suite
5. **CI/CD**: Automated testing and deployment
6. **Telemetry**: Usage analytics
7. **Themes**: Dark mode support
8. **Plugins**: Extension system

### Scalability Considerations

- **Database**: Move from in-memory to SQLite/IndexedDB
- **Background Tasks**: Use worker threads
- **Caching**: Implement smart caching layer
- **Offline Mode**: Add offline support

## Contributing Guidelines

1. **Follow the functional paradigm**: Use pure functions
2. **Keep modules small**: < 200 lines per file
3. **Write tests**: For all new functions
4. **Document**: Add JSDoc comments
5. **Use logger**: For all significant operations
6. **Handle errors**: Always use try-catch
7. **Validate inputs**: Never trust user input

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Functional Programming Guide](https://github.com/readme/guides/functional-programming-basics)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Version**: 2.0.0 (Refactored)  
**Last Updated**: 2025-10-08


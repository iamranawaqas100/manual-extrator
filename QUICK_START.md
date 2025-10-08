# Quick Start Guide

## 🚀 For Developers New to This Codebase

Welcome! This guide will help you understand the refactored architecture in 5 minutes.

## 📁 File Structure (Simplified)

```
src/
├── main.js                    # ← START HERE (Entry point)
│
├── main/                      # Main Process (Node.js)
│   ├── config/constants.js    # App settings
│   ├── core/window.js         # Window creation
│   ├── ipc/handlers.js        # IPC handlers
│   ├── services/data.js       # Data operations
│   └── utils/logger.js        # Logging
│
└── renderer/                  # Renderer Process (Browser)
    ├── renderer.js            # ← START HERE (UI entry point)
    ├── components/ui.js       # UI rendering
    ├── services/dataService.js # Data API calls
    ├── state/store.js         # State management
    └── utils/dom.js           # DOM helpers
```

## 🎯 Key Concepts

### 1. Everything is a Function

```javascript
// ✅ Pure function - easy to test
const addItem = (items, newItem) => [...items, newItem]

// ✅ Service function - handles async
const saveData = async (item) => {
  return await window.electronAPI.saveExtractedData(item)
}

// ✅ UI function - returns HTML
const renderItem = (item) => `<div>${item.title}</div>`
```

### 2. State Management

```javascript
// Get state
const state = store.getState()

// Update state
store.actions.setExtractedData(newData)

// Subscribe to changes
store.subscribe((newState) => {
  console.log('State changed:', newState)
})
```

### 3. Services Handle Logic

```javascript
// dataService.js - talks to main process
const dataService = {
  getAllData: async () => { /* ... */ },
  saveData: async (item) => { /* ... */ },
  updateData: async (id, data) => { /* ... */ },
  deleteData: async (id) => { /* ... */ },
}
```

## 🔧 Common Tasks

### Adding a New Feature

**Example: Add a "Favorite" feature**

1. **Add to state** (`src/renderer/state/store.js`):
   ```javascript
   // Add to initial state
   favoriteIds: []
   
   // Add action
   actions: {
     toggleFavorite: (id) => {
       const { favoriteIds } = state
       const newFavorites = favoriteIds.includes(id)
         ? favoriteIds.filter(fid => fid !== id)
         : [...favoriteIds, id]
       setState({ favoriteIds: newFavorites })
     }
   }
   ```

2. **Add to UI** (`src/renderer/components/ui.js`):
   ```javascript
   const renderFavoriteButton = (item, isFavorite) => `
     <button onclick="app.toggleFavorite(${item.id})">
       ${isFavorite ? '⭐' : '☆'}
     </button>
   `
   ```

3. **Add handler** (`src/renderer/renderer.js`):
   ```javascript
   window.app = {
     toggleFavorite: (id) => {
       store.actions.toggleFavorite(id)
       updateUI()
     }
   }
   ```

Done! No need to touch 50 different files.

### Debugging a Bug

1. **Find the module** - Look in the relevant folder:
   - Data issue? → `services/data.js`
   - UI issue? → `components/`
   - State issue? → `state/store.js`

2. **Add logging**:
   ```javascript
   logger.debug('Current state:', store.getState())
   logger.error('Failed to save:', error)
   ```

3. **Check error handling**:
   ```javascript
   try {
     await saveData(item)
   } catch (error) {
     logger.error('Save failed:', error)
   }
   ```

### Adding Tests

```javascript
// Test a utility function
describe('validation', () => {
  test('normalizeUrl adds https', () => {
    expect(normalizeUrl('example.com'))
      .toBe('https://example.com')
  })
})

// Test a component
describe('renderDataItem', () => {
  test('renders item correctly', () => {
    const item = { id: 1, title: 'Test' }
    const html = renderDataItem(item, 1, null)
    expect(html).toContain('Test')
  })
})

// Test state
describe('store', () => {
  test('addExtractedItem updates state', () => {
    const item = { id: 1, title: 'Test' }
    store.actions.addExtractedItem(item)
    expect(store.selectors.getItemCount()).toBe(1)
  })
})
```

## 📖 Code Reading Guide

### Start Here (5 minutes)

1. **Entry Points**:
   - `src/main.js` (50 lines) - Main process entry
   - `src/renderer/renderer.js` (600 lines) - Renderer entry

2. **Configuration**:
   - `src/main/config/constants.js` - All settings

3. **State**:
   - `src/renderer/state/store.js` - How state works

### Deep Dive (30 minutes)

4. **Services**:
   - `src/main/services/data.js` - Data management
   - `src/renderer/services/dataService.js` - Data API
   - `src/renderer/services/webview.js` - Webview control

5. **Components**:
   - `src/renderer/components/ui.js` - UI rendering
   - `src/renderer/components/dataDisplay.js` - Data display

6. **Utils**:
   - `src/renderer/utils/dom.js` - DOM helpers
   - `src/renderer/utils/validation.js` - Validation

## 🛠️ Development Workflow

### 1. Make Changes

```bash
# Edit files in src/
# Save changes

# App auto-reloads in development mode
```

### 2. Check for Errors

```bash
# Open DevTools (F12)
# Check console for errors
```

### 3. Test

```bash
npm run test  # When tests are set up
```

### 4. Build

```bash
npm run build:win
```

## 📚 Where to Find Things

| Need to... | Look in... |
|------------|-----------|
| Change app settings | `src/main/config/constants.js` |
| Change window behavior | `src/main/core/window.js` |
| Add IPC handler | `src/main/ipc/handlers.js` |
| Change data logic | `src/main/services/data.js` |
| Change UI rendering | `src/renderer/components/ui.js` |
| Change state structure | `src/renderer/state/store.js` |
| Add utility function | `src/renderer/utils/` |
| Change extraction logic | `src/renderer/services/webview.js` |

## 🎨 Code Style

### Naming

```javascript
// Functions: verbNoun
const getUserData = () => { }
const handleClick = () => { }

// Constants: UPPER_SNAKE_CASE
const MAX_ITEMS = 100

// Variables: camelCase
const extractedData = []
```

### Structure

```javascript
/**
 * Description of function
 * @param {Type} paramName - Description
 * @returns {Type} Description
 */
const functionName = (param1, param2) => {
  // Validate
  if (!param1) return null
  
  // Process
  const result = process(param1, param2)
  
  // Return
  return result
}
```

### Exports

```javascript
// Export multiple functions
module.exports = {
  functionOne,
  functionTwo,
  functionThree,
}
```

## 🐛 Common Issues

### Issue: State not updating

```javascript
// ❌ Don't mutate state
state.extractedData.push(item)

// ✅ Create new array
store.actions.setExtractedData([...state.extractedData, item])
```

### Issue: Module not found

```javascript
// Check the path
const service = require('./services/dataService')  // Relative path
```

### Issue: Function not defined

```javascript
// Make sure it's exported
module.exports = {
  myFunction,  // ← Must be here
}
```

## 💡 Pro Tips

1. **Use the logger**:
   ```javascript
   logger.info('Operation started')
   logger.success('Operation completed')
   logger.error('Operation failed:', error)
   ```

2. **Use error boundaries**:
   ```javascript
   try {
     await riskyOperation()
   } catch (error) {
     logger.error('Failed:', error)
     notifications.showError('Operation failed')
   }
   ```

3. **Keep functions small**:
   - One function, one purpose
   - If it's > 30 lines, split it

4. **Keep files small**:
   - If file is > 200 lines, split it
   - Create new module if needed

## 🚀 Ready to Code!

You're now ready to work on this codebase!

### Quick Reference

- 📖 **Detailed docs**: See `ARCHITECTURE.md`
- 🎯 **Refactoring guide**: See `REFACTORING_GUIDE.md`
- 📊 **Summary**: See `REFACTORING_SUMMARY.md`

### Need Help?

1. Check the documentation files
2. Read the code comments
3. Use the logger for debugging
4. Ask the team

---

**Remember**: This codebase follows **functional programming** principles. Keep functions pure, avoid mutations, and compose small functions into larger ones.

Happy coding! 🎉


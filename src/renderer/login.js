/**
 * Login Page
 * Browser-compatible functional approach
 *
 * @ts-nocheck - Browser-compatible file without Node.js types
 */

// Utility Functions
const getElement = (id) => document.getElementById(id);
const getValue = (element) => (element ? element.value : '');
const isEmpty = (str) => !str || str.trim().length === 0;
const addClass = (element, className) => element?.classList.add(className);
const removeClass = (element, className) => element?.classList.remove(className);
const addListener = (element, event, handler, options = {}) => {
  if (!element) return () => {};
  element.addEventListener(event, handler, options);
  return () => element.removeEventListener(event, handler, options);
};

/**
 * Clear messages
 */
const clearMessages = () => {
  const messages = document.querySelectorAll('.error-message, .success-message');
  messages.forEach((msg) => msg.remove());
};

/**
 * Show error message
 */
const showError = (message) => {
  clearMessages();

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;

  const form = document.querySelector('.login-form');
  if (form) form.appendChild(errorDiv);
};

/**
 * Show success message
 */
const showSuccess = (message) => {
  clearMessages();

  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;

  const form = document.querySelector('.login-form');
  if (form) form.appendChild(successDiv);
};

/**
 * Validate credentials
 */
const validateCredentials = (username, password) => {
  const validUsers = [
    { username: 'demo', password: 'demo123' },
    { username: 'admin', password: 'admin123' },
    { username: 'collector', password: 'collector123' },
  ];

  return validUsers.some((user) => user.username === username && user.password === password);
};

/**
 * Store auth session
 */
const storeAuth = (username) => {
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('username', username);
  localStorage.setItem('loginTime', new Date().toISOString());
};

/**
 * Handle login
 */
const handleLogin = async (e) => {
  e.preventDefault();

  const usernameInput = getElement('username');
  const passwordInput = getElement('password');
  const loginBtn = document.querySelector('.login-btn');

  const username = getValue(usernameInput).trim();
  const password = getValue(passwordInput);

  if (isEmpty(username) || isEmpty(password)) {
    showError('Please enter both username and password');
    return;
  }

  // Show loading state
  addClass(loginBtn, 'loading');
  loginBtn.disabled = true;
  clearMessages();

  // Simulate authentication
  setTimeout(() => {
    if (validateCredentials(username, password)) {
      storeAuth(username);
      showSuccess('Login successful! Redirecting...');

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      showError('Invalid username or password');
      removeClass(loginBtn, 'loading');
      loginBtn.disabled = false;
    }
  }, 1000);
};

/**
 * Check if already authenticated
 */
const checkExistingAuth = () => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const loginTime = localStorage.getItem('loginTime');

  if (!isAuthenticated || !loginTime) {
    return false;
  }

  const timeDiff = new Date() - new Date(loginTime);
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  if (hoursDiff < 24) {
    window.location.href = 'index.html';
    return true;
  }

  // Clear expired auth
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('username');
  localStorage.removeItem('loginTime');

  return false;
};

/**
 * Initialize login page
 */
const initializeLogin = () => {
  console.log('Initializing login page...');

  // Check existing auth
  if (checkExistingAuth()) {
    return;
  }

  // Setup form submission
  const loginForm = getElement('loginForm');
  if (loginForm) {
    addListener(loginForm, 'submit', handleLogin);
  }

  // Auto-focus username field
  const usernameInput = getElement('username');
  if (usernameInput) {
    usernameInput.focus();
  }

  console.log('Login page initialized');
};

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', initializeLogin);

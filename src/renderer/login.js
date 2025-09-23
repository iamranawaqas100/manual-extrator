// Login page functionality
class LoginApp {
    constructor() {
        this.setupEventListeners()
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm')
        loginForm.addEventListener('submit', (e) => this.handleLogin(e))
        
        // Auto-focus username field
        document.getElementById('username').focus()
    }

    async handleLogin(e) {
        e.preventDefault()
        
        const username = document.getElementById('username').value.trim()
        const password = document.getElementById('password').value
        
        if (!username || !password) {
            this.showError('Please enter both username and password')
            return
        }
        
        // Show loading state
        const loginBtn = document.querySelector('.login-btn')
        loginBtn.classList.add('loading')
        loginBtn.disabled = true
        
        // Clear any existing messages
        this.clearMessages()
        
        // Simulate authentication (in real app, this would call an API)
        setTimeout(async () => {
            // Check demo credentials or any valid user
            if ((username === 'demo' && password === 'demo123') || 
                (username === 'admin' && password === 'admin123') ||
                (username === 'collector' && password === 'collector123')) {
                
                // Store auth info
                localStorage.setItem('isAuthenticated', 'true')
                localStorage.setItem('username', username)
                localStorage.setItem('loginTime', new Date().toISOString())
                
                this.showSuccess('Login successful! Redirecting...')
                
                // Redirect to main app after short delay
                setTimeout(() => {
                    window.location.href = 'index.html'
                }, 1000)
            } else {
                this.showError('Invalid username or password')
                loginBtn.classList.remove('loading')
                loginBtn.disabled = false
            }
        }, 1000)
    }

    showError(message) {
        this.clearMessages()
        const errorDiv = document.createElement('div')
        errorDiv.className = 'error-message'
        errorDiv.textContent = message
        document.querySelector('.login-form').appendChild(errorDiv)
    }

    showSuccess(message) {
        this.clearMessages()
        const successDiv = document.createElement('div')
        successDiv.className = 'success-message'
        successDiv.textContent = message
        document.querySelector('.login-form').appendChild(successDiv)
    }

    clearMessages() {
        const messages = document.querySelectorAll('.error-message, .success-message')
        messages.forEach(msg => msg.remove())
    }
}

// Initialize login app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginApp()
    
    // Check if already authenticated
    if (localStorage.getItem('isAuthenticated') === 'true') {
        // Check if login is still valid (e.g., within 24 hours)
        const loginTime = localStorage.getItem('loginTime')
        if (loginTime) {
            const timeDiff = new Date() - new Date(loginTime)
            const hoursDiff = timeDiff / (1000 * 60 * 60)
            
            if (hoursDiff < 24) {
                // Still valid, redirect to main app
                window.location.href = 'index.html'
                return
            }
        }
        
        // Clear expired auth
        localStorage.removeItem('isAuthenticated')
        localStorage.removeItem('username')
        localStorage.removeItem('loginTime')
    }
})

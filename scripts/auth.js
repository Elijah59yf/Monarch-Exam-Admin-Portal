/**
 * M-Academy Admin Portal Authentication Module
 * Handles JWT authentication and route protection
 */

const AUTH_API_URL = 'http://localhost:1337/api/auth/local';
const JWT_STORAGE_KEY = 'mAcademyJWT';

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
function isAuthenticated() {
    const token = localStorage.getItem(JWT_STORAGE_KEY);
    if (!token) return false;
    
    // Basic token validation (could be enhanced with JWT decoding)
    try {
        // Check if token looks like a JWT (at least 2 dots)
        const parts = token.split('.');
        if (parts.length !== 3) {
            localStorage.removeItem(JWT_STORAGE_KEY);
            return false;
        }
        return true;
    } catch (error) {
        localStorage.removeItem(JWT_STORAGE_KEY);
        return false;
    }
}

/**
 * Get authentication token
 * @returns {string|null} JWT token or null if not authenticated
 */
function getAuthToken() {
    return localStorage.getItem(JWT_STORAGE_KEY);
}

/**
 * Set authentication token
 * @param {string} token - JWT token
 */
function setAuthToken(token) {
    localStorage.setItem(JWT_STORAGE_KEY, token);
}

/**
 * Clear authentication token (logout)
 */
function clearAuthToken() {
    localStorage.removeItem(JWT_STORAGE_KEY);
}

/**
 * Redirect to login page if not authenticated
 */
function protectRoute() {
    // Skip protection on login page
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'index.html' || currentPage === '') {
        // If already authenticated on login page, redirect to dashboard
        if (isAuthenticated()) {
            window.location.href = 'dashboard.html';
        }
        return;
    }
    
    // Protect all other pages
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
    }
}

/**
 * Login function
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Login response
 */
async function login(email, password) {
    try {
        const response = await fetch(AUTH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identifier: email,
                password: password
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Authentication failed');
        }
        
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Login error:', error);
        return { 
            success: false, 
            error: error.message || 'Network error. Please check your connection.'
        };
    }
}

/**
 * Logout function
 */
function logout() {
    clearAuthToken();
    window.location.href = 'index.html';
}

/**
 * Initialize authentication protection
 * Should be called on every protected page
 */
function initAuth() {
    // Add logout button event listeners
    document.addEventListener('DOMContentLoaded', function() {
        const logoutButtons = document.querySelectorAll('[data-logout]');
        logoutButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        });
        
        // Also handle any logout button with id "logout-btn"
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && !logoutBtn.hasAttribute('data-logout')) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    });
    
    // Protect the route
    protectRoute();
}

/**
 * Get authenticated headers for API requests
 * @returns {Object} Headers object with Authorization
 */
function getAuthHeaders() {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }
    
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Make authenticated API request
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function authFetch(url, options = {}) {
    if (!isAuthenticated()) {
        throw new Error('User not authenticated');
    }
    
    const headers = getAuthHeaders();
    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {})
        }
    });
    
    if (response.status === 401) {
        // Token expired or invalid
        clearAuthToken();
        window.location.href = 'index.html';
        throw new Error('Authentication expired. Please login again.');
    }
    
    return response;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getAuthToken,
        setAuthToken,
        clearAuthToken,
        login,
        logout,
        initAuth,
        getAuthHeaders,
        authFetch
    };
}

// Initialize auth protection on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', protectRoute);
} else {
    protectRoute();
}
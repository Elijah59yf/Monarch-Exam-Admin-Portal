/**
 * M-Academy Admin Portal Action Handler
 * Clean fetch wrapper matching backend API requirements
 */

const API_BASE_URL = 'https://api.monarchdem.me/api';

/**
 * Get JWT token from localStorage
 * @returns {string} JWT token
 * @throws {Error} If no token found
 */
function getJWT() {
    const token = localStorage.getItem('mAcademyJWT');
    if (!token) {
        throw new Error('Authentication required. Please login again.');
    }
    return token;
}

/**
 * Format timestamp for logs
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `[${hours}:${minutes}:${seconds}]`;
}

/**
 * Log message to terminal
 * @param {string} terminalId - Terminal element ID (always 'terminal-log')
 * @param {string} message - Message to log
 * @param {string} type - Message type (info, success, error, warning)
 */
function logToTerminal(terminalId, message, type = 'info') {
    const terminal = document.getElementById(terminalId);
    if (!terminal) return;
    
    const timestamp = getTimestamp();
    const typeClass = `terminal-${type}`;
    
    // Create log entry
    const logEntry = document.createElement('div');
    logEntry.className = `terminal-log ${typeClass}`;
    logEntry.innerHTML = `<span class="terminal-timestamp">${timestamp}</span> <span class="terminal-message">${message}</span>`;
    
    // Prepend to terminal (newest first)
    terminal.prepend(logEntry);
    
    // Scroll to top
    terminal.scrollTop = 0;
}

/**
 * Clear terminal logs
 * @param {string} terminalId - Terminal element ID (always 'terminal-log')
 */
function clearTerminal(terminalId) {
    const terminal = document.getElementById(terminalId);
    if (!terminal) return;
    
    terminal.innerHTML = `${getTimestamp()} [System] Terminal cleared`;
}

/**
 * Execute action by calling API endpoint - Clean fetch wrapper
 * @param {string} endpoint - API endpoint path (e.g., '/admin-action/sync-moodle')
 * @param {Object} payload - Data to send in request body
 * @param {string} buttonId - Button element ID (for restoring state)
 * @returns {Promise<Object>} Response data
 */
async function executeAction(endpoint, payload, buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) {
        console.error(`Button not found: ${buttonId}`);
        throw new Error('Action button not found');
    }
    
    // Disable button and show loading state
    const originalText = button.textContent;
    button.textContent = 'Processing...';
    button.disabled = true;
    
    try {
        // Get JWT token
        const token = getJWT();
        
        // Make API request
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                error: { message: `HTTP ${response.status}: ${response.statusText}` }
            }));
            throw new Error(error.error?.message || `Request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } finally {
        // Restore button state
        button.textContent = originalText;
        button.disabled = false;
    }
}

/**
 * Handle sync action with 3 input fields
 */
async function handleSync() {
    const terminalId = 'terminal-log';
    
    try {
        // Get form values
        const cmid = document.getElementById('cmid')?.value;
        const courseId = document.getElementById('courseId')?.value;
        const courseCode = document.getElementById('courseCode')?.value;
        
        // Validate required fields
        if (!cmid || !courseId || !courseCode) {
            logToTerminal(terminalId, 'Please fill in all required fields: Moodle CMID, Moodle Course ID, and Course Code', 'error');
            return;
        }
        
        // Parse numeric values
        const cmidNum = parseInt(cmid, 10);
        const courseIdNum = parseInt(courseId, 10);
        
        if (isNaN(cmidNum) || isNaN(courseIdNum)) {
            logToTerminal(terminalId, 'Moodle CMID and Course ID must be valid numbers', 'error');
            return;
        }
        
        // Create payload matching backend requirements
        const payload = {
            cmid: cmidNum,
            courseId: courseIdNum,
            courseCode: courseCode.trim().toUpperCase()
        };
        
        logToTerminal(terminalId, `Starting Moodle sync for course: ${payload.courseCode}`, 'info');
        
        // Execute action
        const result = await executeAction('/admin-action/sync-moodle', payload, 'sync-btn');
        
        logToTerminal(terminalId, `Moodle sync completed successfully for ${payload.courseCode}`, 'success');
        
        if (result && typeof result === 'object') {
            const formattedResponse = JSON.stringify(result, null, 2);
            logToTerminal(terminalId, `Response: ${formattedResponse}`, 'info');
        }
        
    } catch (error) {
        let errorMessage = `Sync failed: ${error.message}`;
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network/CORS Error: Unable to reach backend server. Please ensure Strapi is running on ${API_BASE_URL}`;
        }
        
        logToTerminal(terminalId, errorMessage, 'error');
        
        // Handle authentication errors
        if (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('403')) {
            logToTerminal(terminalId, 'Authentication error. Redirecting to login...', 'warning');
            setTimeout(() => {
                localStorage.removeItem('mAcademyJWT');
                window.location.href = 'index.html';
            }, 2000);
        }
        
        console.error('Sync error:', error);
    }
}

/**
 * Handle publish action with single course code field
 */
async function handlePublish() {
    const terminalId = 'terminal-log';
    
    try {
        // Get form value
        const courseCode = document.getElementById('courseCode')?.value;
        
        // Validate required field
        if (!courseCode) {
            logToTerminal(terminalId, 'Please enter a course code', 'error');
            return;
        }
        
        // Create payload matching backend requirements
        const payload = {
            courseCode: courseCode.trim().toUpperCase()
        };
        
        logToTerminal(terminalId, `Starting result publication for course: ${payload.courseCode}`, 'info');
        
        // Execute action
        const result = await executeAction('/admin-action/publish-results', payload, 'publish-btn');
        
        logToTerminal(terminalId, `Results published successfully for ${payload.courseCode}`, 'success');
        
        if (result && typeof result === 'object') {
            const formattedResponse = JSON.stringify(result, null, 2);
            logToTerminal(terminalId, `Response: ${formattedResponse}`, 'info');
        }
        
    } catch (error) {
        let errorMessage = `Publication failed: ${error.message}`;
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network/CORS Error: Unable to reach backend server. Please ensure Strapi is running on ${API_BASE_URL}`;
        }
        
        logToTerminal(terminalId, errorMessage, 'error');
        
        // Handle authentication errors
        if (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('403')) {
            logToTerminal(terminalId, 'Authentication error. Redirecting to login...', 'warning');
            setTimeout(() => {
                localStorage.removeItem('mAcademyJWT');
                window.location.href = 'index.html';
            }, 2000);
        }
        
        console.error('Publish error:', error);
    }
}

/**
 * Handle revoke action with single course code field
 */
async function handleRevoke() {
    const terminalId = 'terminal-log';
    
    try {
        // Get form value
        const courseCode = document.getElementById('courseCode')?.value;
        
        // Validate required field
        if (!courseCode) {
            logToTerminal(terminalId, 'Please enter a course code', 'error');
            return;
        }
        
        // Create payload matching backend requirements
        const payload = {
            courseCode: courseCode.trim().toUpperCase()
        };
        
        logToTerminal(terminalId, `Starting result revocation for course: ${payload.courseCode}`, 'info');
        
        // Execute action
        const result = await executeAction('/admin-action/revoke-results', payload, 'revoke-btn');
        
        logToTerminal(terminalId, `Results revoked successfully for ${payload.courseCode}`, 'success');
        
        if (result && typeof result === 'object') {
            const formattedResponse = JSON.stringify(result, null, 2);
            logToTerminal(terminalId, `Response: ${formattedResponse}`, 'info');
        }
        
    } catch (error) {
        let errorMessage = `Revocation failed: ${error.message}`;
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network/CORS Error: Unable to reach backend server. Please ensure Strapi is running on ${API_BASE_URL}`;
        }
        
        logToTerminal(terminalId, errorMessage, 'error');
        
        // Handle authentication errors
        if (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('403')) {
            logToTerminal(terminalId, 'Authentication error. Redirecting to login...', 'warning');
            setTimeout(() => {
                localStorage.removeItem('mAcademyJWT');
                window.location.href = 'index.html';
            }, 2000);
        }
        
        console.error('Revoke error:', error);
    }
}

/**
 * Handle broadcast action with single course code field
 */
async function handleBroadcast() {
    const terminalId = 'terminal-log';
    
    try {
        // Get form value
        const courseCode = document.getElementById('courseCode')?.value;
        
        // Validate required field
        if (!courseCode) {
            logToTerminal(terminalId, 'Please enter a course code', 'error');
            return;
        }
        
        // Create payload matching backend requirements
        const payload = {
            courseCode: courseCode.trim().toUpperCase()
        };
        
        logToTerminal(terminalId, `Starting email broadcast for course: ${payload.courseCode}`, 'info');
        
        // Execute action
        const result = await executeAction('/admin-action/broadcast-emails', payload, 'broadcast-btn');
        
        logToTerminal(terminalId, `Emails broadcast successfully for ${payload.courseCode}`, 'success');
        
        if (result && typeof result === 'object') {
            const formattedResponse = JSON.stringify(result, null, 2);
            logToTerminal(terminalId, `Response: ${formattedResponse}`, 'info');
        }
        
    } catch (error) {
        let errorMessage = `Broadcast failed: ${error.message}`;
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network/CORS Error: Unable to reach backend server. Please ensure Strapi is running on ${API_BASE_URL}`;
        }
        
        logToTerminal(terminalId, errorMessage, 'error');
        
        // Handle authentication errors
        if (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('403')) {
            logToTerminal(terminalId, 'Authentication error. Redirecting to login...', 'warning');
            setTimeout(() => {
                localStorage.removeItem('mAcademyJWT');
                window.location.href = 'index.html';
            }, 2000);
        }
        
        console.error('Broadcast error:', error);
    }
}

/**
 * Initialize event handlers
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded, initializing action handlers...");

    // 1. SYNC MOODLE BUTTON
    const btnSync = document.getElementById('sync-btn');
    if (btnSync) {
        btnSync.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Sync Button clicked!");
            await handleSync();
        });
    }

    // 2. PUBLISH RESULTS BUTTON
    const btnPublish = document.getElementById('publish-btn');
    if (btnPublish) {
        btnPublish.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Publish Button clicked!");
            await handlePublish();
        });
    }

    // 3. REVOKE RESULTS BUTTON
    const btnRevoke = document.getElementById('revoke-btn');
    if (btnRevoke) {
        btnRevoke.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Revoke Button clicked!");
            await handleRevoke();
        });
    }

    // 4. BROADCAST EMAILS BUTTON
    const btnBroadcast = document.getElementById('broadcast-btn');
    if (btnBroadcast) {
        btnBroadcast.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Broadcast Button clicked!");
            await handleBroadcast();
        });
    }

    // 5. HAMBURGER MENU TOGGLE FOR MOBILE
    const hamburgerToggle = document.getElementById('sidebar-toggle');
    if (hamburgerToggle) {
        hamburgerToggle.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.toggle('active');
                console.log('Sidebar toggled:', sidebar.classList.contains('active') ? 'visible' : 'hidden');
            }
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (event) => {
            const sidebar = document.querySelector('.sidebar');
            const hamburgerToggle = document.getElementById('sidebar-toggle');
            
            if (sidebar && sidebar.classList.contains('active') && 
                !sidebar.contains(event.target) && 
                event.target !== hamburgerToggle && 
                !hamburgerToggle.contains(event.target)) {
                sidebar.classList.remove('active');
                console.log('Sidebar closed (clicked outside)');
            }
        });
    }
});

/**
 * Global error handler for API requests
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Try to log to terminal-log
    const terminal = document.getElementById('terminal-log');
    if (terminal) {
        logToTerminal('terminal-log', `Unhandled error: ${event.reason?.message || 'Unknown error'}`, 'error');
    }
});

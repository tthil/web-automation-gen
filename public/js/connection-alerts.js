/**
 * Connection Alerts Module
 * Provides threshold-based alerting for connection quality and events
 */

// Default alert thresholds
const DEFAULT_THRESHOLDS = {
    qualityScore: 60,         // Minimum acceptable quality score
    disconnectionCount: 3,    // Maximum acceptable disconnections
    reconnectionFailRate: 25, // Maximum acceptable reconnection failure rate (%)
    downtimeThreshold: 30000  // Maximum acceptable downtime (in ms)
};

// Alert levels
const ALERT_LEVELS = {
    INFO: {
        name: 'info',
        color: '#0dcaf0',
        icon: 'info-circle'
    },
    WARNING: {
        name: 'warning',
        color: '#ffc107',
        icon: 'exclamation-triangle'
    },
    CRITICAL: {
        name: 'critical',
        color: '#dc3545',
        icon: 'exclamation-circle'
    }
};

// Store user-defined thresholds
let userThresholds = { ...DEFAULT_THRESHOLDS };

// Active alerts
const activeAlerts = new Map();

// Alert subscribers
const alertSubscribers = [];

/**
 * Initialize the connection alerts system
 */
function initializeAlerts() {
    // Load saved thresholds from localStorage
    loadThresholds();
    
    // Set up event listeners
    document.addEventListener('connectionStatusChanged', evaluateConnectionStatus);
    
    // Set up periodic evaluation for active sessions
    setInterval(evaluateActiveSessions, 30000); // Check every 30 seconds
}

/**
 * Load user-defined thresholds from localStorage
 */
function loadThresholds() {
    try {
        const saved = localStorage.getItem('connectionAlertThresholds');
        if (saved) {
            const parsed = JSON.parse(saved);
            userThresholds = { ...DEFAULT_THRESHOLDS, ...parsed };
        }
    } catch (error) {
        console.error('Error loading alert thresholds:', error);
    }
}

/**
 * Save user-defined thresholds to localStorage
 */
function saveThresholds() {
    try {
        localStorage.setItem('connectionAlertThresholds', JSON.stringify(userThresholds));
    } catch (error) {
        console.error('Error saving alert thresholds:', error);
    }
}

/**
 * Update alert thresholds
 * @param {Object} newThresholds - New threshold values
 */
function updateThresholds(newThresholds) {
    userThresholds = { ...userThresholds, ...newThresholds };
    saveThresholds();
    
    // Re-evaluate active sessions with new thresholds
    evaluateActiveSessions();
}

/**
 * Evaluate connection status from event
 * @param {Event} event - Connection status change event
 */
function evaluateConnectionStatus(event) {
    if (!event.detail || !event.detail.sessionId) return;
    
    const { sessionId, status, timestamp, details } = event.detail;
    
    // Check for critical connection events
    if (status === 'disconnected') {
        createAlert(
            sessionId,
            'Connection Lost',
            `The connection was lost at ${new Date(timestamp).toLocaleTimeString()}. ${details || ''}`,
            ALERT_LEVELS.WARNING
        );
    } else if (status === 'failed') {
        createAlert(
            sessionId,
            'Connection Failed',
            `The connection failed at ${new Date(timestamp).toLocaleTimeString()}. ${details || ''}`,
            ALERT_LEVELS.CRITICAL
        );
    }
}

/**
 * Evaluate all active sessions for alerts
 */
async function evaluateActiveSessions() {
    try {
        // Fetch active sessions - use absolute URL to avoid network routing issues
        const apiUrl = new URL('/api/sessions?active=true', window.location.origin).href;
        console.log('Fetching active sessions from:', apiUrl);
        const response = await fetch(apiUrl);
        if (!response.ok) return;
        
        const sessions = await response.json();
        console.log('Received sessions:', sessions.length);
        
        // Evaluate each session
        sessions.forEach(evaluateSession);
    } catch (error) {
        console.error('Error evaluating active sessions:', error);
    }
}

/**
 * Evaluate a session for alerts
 * @param {Object} session - Session data
 */
function evaluateSession(session) {
    if (!session || !session.id) return;
    
    const { id, name, connectionEvents } = session;
    
    // Skip if no connection events
    if (!connectionEvents || !Array.isArray(connectionEvents) || connectionEvents.length === 0) {
        return;
    }
    
    // Calculate connection metrics
    const quality = window.connectionCharts?.calculateConnectionQuality(connectionEvents);
    if (!quality) return;
    
    // Check quality score threshold
    if (quality.score < userThresholds.qualityScore) {
        createAlert(
            id,
            'Poor Connection Quality',
            `Session "${name || id}" has a connection quality score of ${quality.score}/100, below the threshold of ${userThresholds.qualityScore}.`,
            quality.score < userThresholds.qualityScore * 0.6 ? ALERT_LEVELS.CRITICAL : ALERT_LEVELS.WARNING
        );
    }
    
    // Count disconnections
    const disconnections = connectionEvents.filter(event => event.type === 'disconnected').length;
    if (disconnections > userThresholds.disconnectionCount) {
        createAlert(
            id,
            'Excessive Disconnections',
            `Session "${name || id}" has experienced ${disconnections} disconnections, exceeding the threshold of ${userThresholds.disconnectionCount}.`,
            ALERT_LEVELS.WARNING
        );
    }
    
    // Calculate reconnection failure rate
    const disconnectionCount = connectionEvents.filter(event => event.type === 'disconnected').length;
    const reconnectionCount = connectionEvents.filter(event => event.type === 'reconnected').length;
    
    if (disconnectionCount > 0) {
        const reconnectionFailRate = ((disconnectionCount - reconnectionCount) / disconnectionCount) * 100;
        
        if (reconnectionFailRate > userThresholds.reconnectionFailRate) {
            createAlert(
                id,
                'High Reconnection Failure Rate',
                `Session "${name || id}" has a reconnection failure rate of ${reconnectionFailRate.toFixed(1)}%, exceeding the threshold of ${userThresholds.reconnectionFailRate}%.`,
                ALERT_LEVELS.WARNING
            );
        }
    }
    
    // Calculate total downtime
    let totalDowntime = 0;
    connectionEvents.forEach(event => {
        if (event.duration) {
            totalDowntime += parseInt(event.duration, 10) || 0;
        }
    });
    
    if (totalDowntime > userThresholds.downtimeThreshold) {
        createAlert(
            id,
            'Excessive Downtime',
            `Session "${name || id}" has experienced ${formatDuration(totalDowntime)} of downtime, exceeding the threshold of ${formatDuration(userThresholds.downtimeThreshold)}.`,
            ALERT_LEVELS.WARNING
        );
    }
}

/**
 * Create a new alert
 * @param {string} sessionId - Session ID
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {Object} level - Alert level object
 */
function createAlert(sessionId, title, message, level) {
    // Generate unique alert ID
    const alertId = `alert-${sessionId}-${Date.now()}`;
    
    // Create alert object
    const alert = {
        id: alertId,
        sessionId,
        title,
        message,
        level,
        timestamp: new Date().toISOString(),
        acknowledged: false
    };
    
    // Check for duplicate alerts
    let isDuplicate = false;
    activeAlerts.forEach((existingAlert) => {
        if (existingAlert.sessionId === sessionId && 
            existingAlert.title === title &&
            !existingAlert.acknowledged) {
            isDuplicate = true;
        }
    });
    
    // Don't add duplicate alerts
    if (isDuplicate) return;
    
    // Add to active alerts
    activeAlerts.set(alertId, alert);
    
    // Notify subscribers
    notifyAlertSubscribers('alert-created', alert);
    
    // Show notification
    showAlertNotification(alert);
    
    // Update alert count in UI
    updateAlertCount();
}

/**
 * Acknowledge an alert
 * @param {string} alertId - Alert ID
 */
function acknowledgeAlert(alertId) {
    const alert = activeAlerts.get(alertId);
    if (!alert) return;
    
    // Mark as acknowledged
    alert.acknowledged = true;
    
    // Update alert
    activeAlerts.set(alertId, alert);
    
    // Notify subscribers
    notifyAlertSubscribers('alert-acknowledged', alert);
    
    // Update alert count
    updateAlertCount();
}

/**
 * Dismiss an alert
 * @param {string} alertId - Alert ID
 */
function dismissAlert(alertId) {
    if (!activeAlerts.has(alertId)) return;
    
    // Get alert before deletion
    const alert = activeAlerts.get(alertId);
    
    // Remove alert
    activeAlerts.delete(alertId);
    
    // Notify subscribers
    notifyAlertSubscribers('alert-dismissed', alert);
    
    // Update alert count
    updateAlertCount();
}

/**
 * Subscribe to alert events
 * @param {Function} callback - Callback function
 */
function subscribeToAlerts(callback) {
    if (typeof callback === 'function' && !alertSubscribers.includes(callback)) {
        alertSubscribers.push(callback);
    }
}

/**
 * Unsubscribe from alert events
 * @param {Function} callback - Callback function
 */
function unsubscribeFromAlerts(callback) {
    const index = alertSubscribers.indexOf(callback);
    if (index !== -1) {
        alertSubscribers.splice(index, 1);
    }
}

/**
 * Notify all alert subscribers
 * @param {string} eventType - Event type
 * @param {Object} alert - Alert data
 */
function notifyAlertSubscribers(eventType, alert) {
    alertSubscribers.forEach(callback => {
        try {
            callback(eventType, alert);
        } catch (error) {
            console.error('Error in alert subscriber callback:', error);
        }
    });
}

/**
 * Update alert count in UI
 */
function updateAlertCount() {
    // Count unacknowledged alerts
    let count = 0;
    activeAlerts.forEach(alert => {
        if (!alert.acknowledged) {
            count++;
        }
    });
    
    // Update UI element if it exists
    const alertCountElement = document.getElementById('connectionDashboardAlerts');
    if (alertCountElement) {
        alertCountElement.textContent = count.toString();
        
        if (count > 0) {
            alertCountElement.classList.add('has-alerts');
        } else {
            alertCountElement.classList.remove('has-alerts');
        }
    }
    
    // Update page title if there are alerts
    updatePageTitleWithAlertCount(count);
}

/**
 * Update page title with alert count
 * @param {number} count - Alert count
 */
function updatePageTitleWithAlertCount(count) {
    const originalTitle = document.title.replace(/^\(\d+\)\s+/, '');
    
    if (count > 0) {
        document.title = `(${count}) ${originalTitle}`;
    } else {
        document.title = originalTitle;
    }
}

/**
 * Show notification for an alert
 * @param {Object} alert - Alert data
 */
function showAlertNotification(alert) {
    // Show toast notification if available
    if (typeof showToast === 'function') {
        showToast(`${alert.title}: ${alert.message}`, alert.level.name);
    }
    
    // Use browser notification if permission granted
    if (Notification.permission === 'granted') {
        const notification = new Notification(`Web Booster: ${alert.title}`, {
            body: alert.message,
            icon: '/favicon.ico'
        });
        
        // Close notification after 10 seconds
        setTimeout(() => notification.close(), 10000);
        
        // Focus window when notification is clicked
        notification.onclick = () => {
            window.focus();
            // Show alert details
            showAlertDetails(alert.id);
        };
    }
    
    // Request notification permission if not granted
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

/**
 * Show alert details
 * @param {string} alertId - Alert ID
 */
function showAlertDetails(alertId) {
    const alert = activeAlerts.get(alertId);
    if (!alert) return;
    
    // Open connection metrics for the session
    if (typeof openConnectionMetrics === 'function') {
        openConnectionMetrics(alert.sessionId);
    }
    
    // Acknowledge the alert
    acknowledgeAlert(alertId);
}

/**
 * Format duration in milliseconds to human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    } else {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
}

/**
 * Get all active alerts
 * @returns {Array} - Array of active alerts
 */
function getActiveAlerts() {
    return Array.from(activeAlerts.values());
}

/**
 * Get current threshold values
 * @returns {Object} - Current thresholds
 */
function getThresholds() {
    return { ...userThresholds };
}

// Export public API
window.connectionAlerts = {
    initialize: initializeAlerts,
    updateThresholds,
    getThresholds,
    acknowledgeAlert,
    dismissAlert,
    getActiveAlerts,
    subscribeToAlerts,
    unsubscribeFromAlerts,
    ALERT_LEVELS
};

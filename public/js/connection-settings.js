/**
 * Connection Settings Module
 * Provides user customization for connection metrics, alerts, and notifications
 */

// Default settings
const DEFAULT_SETTINGS = {
    alerts: {
        qualityScore: 60,         // Minimum acceptable quality score
        disconnectionCount: 3,     // Maximum acceptable disconnections
        reconnectionFailRate: 25,  // Maximum acceptable reconnection failure rate (%)
        downtimeThreshold: 30000   // Maximum acceptable downtime (in ms)
    },
    notifications: {
        showDesktopNotifications: true,
        showToastNotifications: true,
        showStatusInTitle: true,
        alertSound: true
    },
    display: {
        showConnectionHealthDashboard: true,
        defaultChartPeriod: 'week',
        autoExpandConnectionDetails: true,
        showQualityIndicatorsInSessionList: true
    },
    advanced: {
        sessionRecoveryAttempts: 3,
        reconnectionTimeout: 60000,  // ms
        metricsRefreshInterval: 5000 // ms
    }
};

// Current user settings
let userSettings = { ...DEFAULT_SETTINGS };

/**
 * Initialize connection settings
 */
function initializeSettings() {
    // Load saved settings
    loadSettings();
    
    // Apply settings to alerting system
    if (window.connectionAlerts) {
        window.connectionAlerts.updateThresholds(userSettings.alerts);
    }
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('connectionSettings');
        if (savedSettings) {
            // Merge saved settings with defaults (to handle new properties)
            const parsed = JSON.parse(savedSettings);
            
            // Deep merge settings
            userSettings = {
                alerts: { ...DEFAULT_SETTINGS.alerts, ...parsed.alerts },
                notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
                display: { ...DEFAULT_SETTINGS.display, ...parsed.display },
                advanced: { ...DEFAULT_SETTINGS.advanced, ...parsed.advanced }
            };
        }
    } catch (error) {
        console.error('Error loading connection settings:', error);
    }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    try {
        localStorage.setItem('connectionSettings', JSON.stringify(userSettings));
        
        // Dispatch event for other modules
        document.dispatchEvent(new CustomEvent('connectionSettingsChanged', {
            detail: { settings: { ...userSettings } }
        }));
    } catch (error) {
        console.error('Error saving connection settings:', error);
    }
}

/**
 * Update settings
 * @param {string} category - Settings category
 * @param {Object} values - New values
 */
function updateSettings(category, values) {
    // Validate category
    if (!userSettings[category]) {
        console.error(`Invalid settings category: ${category}`);
        return;
    }
    
    // Update settings
    userSettings[category] = {
        ...userSettings[category],
        ...values
    };
    
    // Save settings
    saveSettings();
    
    // Apply settings to relevant modules
    applySettings();
}

/**
 * Apply current settings to all modules
 */
function applySettings() {
    // Apply alert thresholds
    if (window.connectionAlerts) {
        window.connectionAlerts.updateThresholds(userSettings.alerts);
    }
    
    // Apply display settings
    applyDisplaySettings();
    
    // Apply notification settings
    applyNotificationSettings();
    
    // Apply advanced settings
    applyAdvancedSettings();
}

/**
 * Apply display settings
 */
function applyDisplaySettings() {
    const { display } = userSettings;
    
    // Show/hide connection health dashboard
    const dashboardContainer = document.getElementById('dashboardMetricsContainer');
    if (dashboardContainer) {
        dashboardContainer.style.display = display.showConnectionHealthDashboard ? 'block' : 'none';
    }
    
    // Apply quality indicators to session list
    if (display.showQualityIndicatorsInSessionList) {
        addQualityIndicatorsToSessionList();
    } else {
        removeQualityIndicatorsFromSessionList();
    }
}

/**
 * Add quality indicators to session list
 */
function addQualityIndicatorsToSessionList() {
    const sessionItems = document.querySelectorAll('.session-item');
    
    sessionItems.forEach(async (item) => {
        if (item.querySelector('.quality-indicator')) return;
        
        const sessionId = item.dataset.sessionId;
        if (!sessionId) return;
        
        try {
            // Fetch session data
            const response = await fetch(`/api/sessions/${sessionId}`);
            if (!response.ok) return;
            
            const session = await response.json();
            if (!session || !session.connectionEvents) return;
            
            // Calculate quality
            const quality = window.connectionCharts?.calculateConnectionQuality(session.connectionEvents);
            if (!quality) return;
            
            // Create indicator
            const indicator = document.createElement('span');
            indicator.className = `quality-indicator quality-${quality.label.toLowerCase()}`;
            indicator.setAttribute('title', `Connection Quality: ${quality.score}/100 (${quality.label})`);
            indicator.textContent = quality.score;
            
            // Add to session item
            const sessionHeader = item.querySelector('.session-header');
            if (sessionHeader) {
                sessionHeader.appendChild(indicator);
            }
        } catch (error) {
            console.error('Error adding quality indicator:', error);
        }
    });
}

/**
 * Remove quality indicators from session list
 */
function removeQualityIndicatorsFromSessionList() {
    const indicators = document.querySelectorAll('.quality-indicator');
    indicators.forEach(indicator => indicator.remove());
}

/**
 * Apply notification settings
 */
function applyNotificationSettings() {
    const { notifications } = userSettings;
    
    // Request permission for desktop notifications if enabled
    if (notifications.showDesktopNotifications && 
        Notification.permission !== 'granted' && 
        Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

/**
 * Apply advanced settings
 */
function applyAdvancedSettings() {
    // These settings are applied when relevant modules access them
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
    userSettings = { ...DEFAULT_SETTINGS };
    saveSettings();
    applySettings();
}

/**
 * Get current settings
 * @returns {Object} - Current settings
 */
function getSettings() {
    return { ...userSettings };
}

/**
 * Create and open settings modal
 */
function openSettingsModal() {
    // Check if modal already exists
    let modal = document.getElementById('connectionSettingsModal');
    
    if (!modal) {
        // Create modal
        modal = document.createElement('div');
        modal.id = 'connectionSettingsModal';
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'connectionSettingsTitle');
        modal.setAttribute('aria-hidden', 'true');
        
        // Create modal content
        modal.innerHTML = `
            <div class="modal-content connection-settings-modal">
                <div class="modal-header">
                    <h3 id="connectionSettingsTitle">Connection Settings</h3>
                    <span id="closeConnectionSettingsModal" class="close-modal" aria-label="Close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="settings-tabs">
                        <button class="settings-tab-btn active" data-tab="alerts">Alert Thresholds</button>
                        <button class="settings-tab-btn" data-tab="notifications">Notifications</button>
                        <button class="settings-tab-btn" data-tab="display">Display</button>
                        <button class="settings-tab-btn" data-tab="advanced">Advanced</button>
                    </div>
                    
                    <div class="settings-tab-content active" id="alerts-tab">
                        <h4>Alert Threshold Settings</h4>
                        <div class="setting-group">
                            <label for="qualityScoreThreshold">Minimum Quality Score</label>
                            <div class="setting-control">
                                <input type="range" id="qualityScoreThreshold" min="0" max="100" value="${userSettings.alerts.qualityScore}" />
                                <span class="setting-value">${userSettings.alerts.qualityScore}/100</span>
                            </div>
                            <p class="setting-help">Alerts will be triggered when quality falls below this value</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="disconnectionCountThreshold">Maximum Disconnections</label>
                            <div class="setting-control">
                                <input type="number" id="disconnectionCountThreshold" min="1" max="20" value="${userSettings.alerts.disconnectionCount}" />
                            </div>
                            <p class="setting-help">Alerts will be triggered when disconnections exceed this count</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="reconnectionFailRateThreshold">Maximum Reconnection Failure (%)</label>
                            <div class="setting-control">
                                <input type="range" id="reconnectionFailRateThreshold" min="0" max="100" value="${userSettings.alerts.reconnectionFailRate}" />
                                <span class="setting-value">${userSettings.alerts.reconnectionFailRate}%</span>
                            </div>
                            <p class="setting-help">Alerts will be triggered when reconnection failure rate exceeds this percentage</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="downtimeThreshold">Maximum Acceptable Downtime</label>
                            <div class="setting-control">
                                <select id="downtimeThreshold">
                                    <option value="5000" ${userSettings.alerts.downtimeThreshold === 5000 ? 'selected' : ''}>5 seconds</option>
                                    <option value="10000" ${userSettings.alerts.downtimeThreshold === 10000 ? 'selected' : ''}>10 seconds</option>
                                    <option value="30000" ${userSettings.alerts.downtimeThreshold === 30000 ? 'selected' : ''}>30 seconds</option>
                                    <option value="60000" ${userSettings.alerts.downtimeThreshold === 60000 ? 'selected' : ''}>1 minute</option>
                                    <option value="300000" ${userSettings.alerts.downtimeThreshold === 300000 ? 'selected' : ''}>5 minutes</option>
                                </select>
                            </div>
                            <p class="setting-help">Alerts will be triggered when total downtime exceeds this duration</p>
                        </div>
                    </div>
                    
                    <div class="settings-tab-content" id="notifications-tab">
                        <h4>Notification Settings</h4>
                        <div class="setting-group">
                            <label for="showDesktopNotifications">Desktop Notifications</label>
                            <div class="setting-control">
                                <input type="checkbox" id="showDesktopNotifications" ${userSettings.notifications.showDesktopNotifications ? 'checked' : ''} />
                            </div>
                            <p class="setting-help">Show desktop notifications for connection alerts</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="showToastNotifications">Toast Notifications</label>
                            <div class="setting-control">
                                <input type="checkbox" id="showToastNotifications" ${userSettings.notifications.showToastNotifications ? 'checked' : ''} />
                            </div>
                            <p class="setting-help">Show in-app toast notifications for connection events</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="showStatusInTitle">Show Status in Page Title</label>
                            <div class="setting-control">
                                <input type="checkbox" id="showStatusInTitle" ${userSettings.notifications.showStatusInTitle ? 'checked' : ''} />
                            </div>
                            <p class="setting-help">Display connection status and alert count in browser tab title</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="alertSound">Alert Sounds</label>
                            <div class="setting-control">
                                <input type="checkbox" id="alertSound" ${userSettings.notifications.alertSound ? 'checked' : ''} />
                            </div>
                            <p class="setting-help">Play a sound when connection alerts are triggered</p>
                        </div>
                    </div>
                    
                    <div class="settings-tab-content" id="display-tab">
                        <h4>Display Settings</h4>
                        <div class="setting-group">
                            <label for="showConnectionHealthDashboard">Connection Health Dashboard</label>
                            <div class="setting-control">
                                <input type="checkbox" id="showConnectionHealthDashboard" ${userSettings.display.showConnectionHealthDashboard ? 'checked' : ''} />
                            </div>
                            <p class="setting-help">Show connection health metrics on the main dashboard</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="defaultChartPeriod">Default Chart Period</label>
                            <div class="setting-control">
                                <select id="defaultChartPeriod">
                                    <option value="day" ${userSettings.display.defaultChartPeriod === 'day' ? 'selected' : ''}>Day</option>
                                    <option value="week" ${userSettings.display.defaultChartPeriod === 'week' ? 'selected' : ''}>Week</option>
                                    <option value="month" ${userSettings.display.defaultChartPeriod === 'month' ? 'selected' : ''}>Month</option>
                                    <option value="all" ${userSettings.display.defaultChartPeriod === 'all' ? 'selected' : ''}>All Time</option>
                                </select>
                            </div>
                            <p class="setting-help">Default time period for historical charts</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="autoExpandConnectionDetails">Auto-expand Connection Details</label>
                            <div class="setting-control">
                                <input type="checkbox" id="autoExpandConnectionDetails" ${userSettings.display.autoExpandConnectionDetails ? 'checked' : ''} />
                            </div>
                            <p class="setting-help">Automatically expand connection details for sessions with issues</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="showQualityIndicatorsInSessionList">Quality Indicators in Session List</label>
                            <div class="setting-control">
                                <input type="checkbox" id="showQualityIndicatorsInSessionList" ${userSettings.display.showQualityIndicatorsInSessionList ? 'checked' : ''} />
                            </div>
                            <p class="setting-help">Show connection quality indicators next to sessions in the list</p>
                        </div>
                    </div>
                    
                    <div class="settings-tab-content" id="advanced-tab">
                        <h4>Advanced Settings</h4>
                        <div class="setting-group">
                            <label for="sessionRecoveryAttempts">Session Recovery Attempts</label>
                            <div class="setting-control">
                                <input type="number" id="sessionRecoveryAttempts" min="0" max="10" value="${userSettings.advanced.sessionRecoveryAttempts}" />
                            </div>
                            <p class="setting-help">Number of attempts to recover a disconnected session</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="reconnectionTimeout">Reconnection Timeout (ms)</label>
                            <div class="setting-control">
                                <input type="number" id="reconnectionTimeout" min="5000" max="300000" step="1000" value="${userSettings.advanced.reconnectionTimeout}" />
                            </div>
                            <p class="setting-help">Time to wait for reconnection before giving up</p>
                        </div>
                        
                        <div class="setting-group">
                            <label for="metricsRefreshInterval">Metrics Refresh Interval (ms)</label>
                            <div class="setting-control">
                                <input type="number" id="metricsRefreshInterval" min="1000" max="60000" step="1000" value="${userSettings.advanced.metricsRefreshInterval}" />
                            </div>
                            <p class="setting-help">How frequently to refresh connection metrics</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="resetConnectionSettings" class="btn btn-secondary">Reset to Defaults</button>
                    <button id="saveConnectionSettings" class="btn btn-primary">Save Settings</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('closeConnectionSettingsModal').addEventListener('click', closeSettingsModal);
        document.getElementById('saveConnectionSettings').addEventListener('click', saveSettingsFromModal);
        document.getElementById('resetConnectionSettings').addEventListener('click', resetSettings);
        
        // Tab switching
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Hide all content
                document.querySelectorAll('.settings-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Deactivate all buttons
                document.querySelectorAll('.settings-tab-btn').forEach(button => {
                    button.classList.remove('active');
                });
                
                // Activate clicked button
                e.target.classList.add('active');
                
                // Show related content
                const tabId = e.target.dataset.tab + '-tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Live update range input displays
        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const valueElement = e.target.parentNode.querySelector('.setting-value');
                if (valueElement) {
                    if (e.target.id === 'reconnectionFailRateThreshold') {
                        valueElement.textContent = e.target.value + '%';
                    } else if (e.target.id === 'qualityScoreThreshold') {
                        valueElement.textContent = e.target.value + '/100';
                    } else {
                        valueElement.textContent = e.target.value;
                    }
                }
            });
        });
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .connection-settings-modal {
                max-width: 600px;
                max-height: 85vh;
            }
            
            .settings-tabs {
                display: flex;
                border-bottom: 1px solid var(--border-color, #ddd);
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            .settings-tab-btn {
                background: none;
                border: none;
                padding: 10px 15px;
                cursor: pointer;
                font-size: 1rem;
                margin-bottom: -1px;
                color: var(--secondary-text-color, #666);
                transition: all 0.2s ease;
            }
            
            .settings-tab-btn.active {
                border-bottom: 2px solid var(--primary-color, #007bff);
                color: var(--primary-color, #007bff);
                font-weight: 500;
            }
            
            .settings-tab-content {
                display: none;
                max-height: 400px;
                overflow-y: auto;
                padding-right: 10px;
            }
            
            .settings-tab-content.active {
                display: block;
            }
            
            .setting-group {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid var(--border-color-light, #eee);
            }
            
            .setting-group:last-child {
                border-bottom: none;
            }
            
            .setting-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
            }
            
            .setting-control {
                margin-bottom: 5px;
                display: flex;
                align-items: center;
            }
            
            .setting-control input[type="range"] {
                flex-grow: 1;
                margin-right: 10px;
            }
            
            .setting-value {
                min-width: 50px;
                text-align: right;
                font-weight: 500;
            }
            
            .setting-help {
                margin: 5px 0 0;
                font-size: 0.85rem;
                color: var(--secondary-text-color, #666);
                font-style: italic;
            }
            
            .quality-indicator {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 0.8rem;
                font-weight: bold;
                color: white;
                margin-left: 8px;
            }
            
            .quality-excellent {
                background-color: #28a745;
            }
            
            .quality-good {
                background-color: #4caf50;
            }
            
            .quality-fair {
                background-color: #ffc107;
            }
            
            .quality-poor {
                background-color: #fd7e14;
            }
            
            .quality-critical {
                background-color: #dc3545;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Show modal
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    
    // Announce for screen readers
    if (typeof window.announceToScreenReader === 'function') {
        window.announceToScreenReader('Connection settings dialog opened');
    }
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
    const modal = document.getElementById('connectionSettingsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        // Announce for screen readers
        if (typeof window.announceToScreenReader === 'function') {
            window.announceToScreenReader('Connection settings dialog closed');
        }
    }
}

/**
 * Save settings from modal
 */
function saveSettingsFromModal() {
    // Get values from form
    const newSettings = {
        alerts: {
            qualityScore: parseInt(document.getElementById('qualityScoreThreshold').value, 10),
            disconnectionCount: parseInt(document.getElementById('disconnectionCountThreshold').value, 10),
            reconnectionFailRate: parseInt(document.getElementById('reconnectionFailRateThreshold').value, 10),
            downtimeThreshold: parseInt(document.getElementById('downtimeThreshold').value, 10)
        },
        notifications: {
            showDesktopNotifications: document.getElementById('showDesktopNotifications').checked,
            showToastNotifications: document.getElementById('showToastNotifications').checked,
            showStatusInTitle: document.getElementById('showStatusInTitle').checked,
            alertSound: document.getElementById('alertSound').checked
        },
        display: {
            showConnectionHealthDashboard: document.getElementById('showConnectionHealthDashboard').checked,
            defaultChartPeriod: document.getElementById('defaultChartPeriod').value,
            autoExpandConnectionDetails: document.getElementById('autoExpandConnectionDetails').checked,
            showQualityIndicatorsInSessionList: document.getElementById('showQualityIndicatorsInSessionList').checked
        },
        advanced: {
            sessionRecoveryAttempts: parseInt(document.getElementById('sessionRecoveryAttempts').value, 10),
            reconnectionTimeout: parseInt(document.getElementById('reconnectionTimeout').value, 10),
            metricsRefreshInterval: parseInt(document.getElementById('metricsRefreshInterval').value, 10)
        }
    };
    
    // Update settings
    userSettings = newSettings;
    
    // Save and apply
    saveSettings();
    applySettings();
    
    // Close modal
    closeSettingsModal();
    
    // Show confirmation
    if (typeof showToast === 'function') {
        showToast('Connection settings saved successfully', 'success');
    }
}

// Add settings button to header
function addSettingsButton() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    
    // Check if button already exists
    if (document.getElementById('connectionSettingsBtn')) return;
    
    // Create button
    const settingsButton = document.createElement('button');
    settingsButton.id = 'connectionSettingsBtn';
    settingsButton.className = 'btn btn-icon';
    settingsButton.setAttribute('aria-label', 'Connection Settings');
    settingsButton.innerHTML = '<i class="fas fa-sliders-h"></i>';
    settingsButton.title = 'Connection Settings';
    
    // Add click handler
    settingsButton.addEventListener('click', openSettingsModal);
    
    // Add to header
    headerActions.appendChild(settingsButton);
}

// Export public API
window.connectionSettings = {
    initialize: initializeSettings,
    getSettings,
    updateSettings,
    resetSettings,
    openSettingsModal,
    addSettingsButton
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    addSettingsButton();
});

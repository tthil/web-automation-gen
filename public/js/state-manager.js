/**
 * State Management System for Web Booster
 * 
 * This module implements a central state management approach to connect all UI components
 * and handle application state transitions.
 */

const AppState = (function() {
    // Private state object
    const state = {
        // Application state
        appMode: 'idle', // idle, recording, replaying
        
        // Session recording state
        currentSession: null,
        isRecording: false,
        recordingPid: null,
        
        // Replay state
        isReplaying: false,
        replayPid: null,
        replaySpeed: 1,
        selectedSessionId: null,
        
        // UI preferences (saved to localStorage)
        uiPreferences: {
            sortOrder: 'desc',
            filterCategory: 'all',
            searchTerm: '',
            logFilters: {
                info: true,
                action: true,
                warning: true,
                error: true
            },
            darkMode: false,
            expandedSections: {
                recording: true,
                sessions: true,
                logs: true
            }
        },
        
        // Data collections
        sessions: [],
        categories: new Set(['Uncategorized']),
        
        // Component references
        components: {
            urlInput: null,
            replayControls: null,
            sessionList: null
        }
    };
    
    // Initialize from localStorage
    function _loadFromLocalStorage() {
        try {
            const savedPreferences = localStorage.getItem('webBooster_preferences');
            if (savedPreferences) {
                state.uiPreferences = {
                    ...state.uiPreferences,
                    ...JSON.parse(savedPreferences)
                };
            }
            
            // Check for active recording session
            const savedRecordingPid = localStorage.getItem('currentRecordingProcess');
            if (savedRecordingPid) {
                state.recordingPid = savedRecordingPid;
            }
        } catch (error) {
            console.error('Error loading preferences from localStorage:', error);
        }
    }
    
    // Save to localStorage
    function _saveToLocalStorage() {
        try {
            localStorage.setItem('webBooster_preferences', JSON.stringify(state.uiPreferences));
            
            // Save active recording session if any
            if (state.recordingPid) {
                localStorage.setItem('currentRecordingProcess', state.recordingPid);
            } else {
                localStorage.removeItem('currentRecordingProcess');
            }
        } catch (error) {
            console.error('Error saving preferences to localStorage:', error);
        }
    }
    
    // Event subscription system
    const subscribers = {
        stateChange: [],
        recordingStatusChange: [],
        replayStatusChange: [],
        sessionsUpdate: [],
        selectedSessionChange: [],
        uiPreferencesChange: []
    };
    
    // Notify subscribers of state changes
    function _notifySubscribers(eventType, data) {
        if (subscribers[eventType]) {
            subscribers[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${eventType} subscriber:`, error);
                }
            });
        }
    }
    
    // Public API methods
    return {
        /**
         * Initialize the state manager
         * @param {Object} options - Configuration options
         */
        initialize: function(options = {}) {
            // Load saved preferences
            _loadFromLocalStorage();
            
            // Store component references if provided
            if (options.components) {
                state.components = {
                    ...state.components,
                    ...options.components
                };
            }
            
            // Load sessions
            this.loadSessions();
            
            // Check for previously active recording
            if (state.recordingPid) {
                this.checkRecordingStatus(state.recordingPid);
            }
            
            console.log('AppState initialized');
            _notifySubscribers('stateChange', { appMode: state.appMode });
        },
        
        /**
         * Get a copy of the current state
         * @returns {Object} Current state
         */
        getState: function() {
            return {
                appMode: state.appMode,
                isRecording: state.isRecording,
                isReplaying: state.isReplaying,
                selectedSessionId: state.selectedSessionId,
                uiPreferences: {...state.uiPreferences}
            };
        },
        
        /**
         * Subscribe to state changes
         * @param {string} eventType - Type of event to subscribe to
         * @param {Function} callback - Callback function
         * @returns {Function} Unsubscribe function
         */
        subscribe: function(eventType, callback) {
            if (!subscribers[eventType]) {
                subscribers[eventType] = [];
            }
            
            subscribers[eventType].push(callback);
            
            // Return unsubscribe function
            return () => {
                subscribers[eventType] = subscribers[eventType].filter(cb => cb !== callback);
            };
        },
        
        /**
         * Load sessions from the server
         * @returns {Promise<Array>} Array of sessions
         */
        loadSessions: async function() {
            try {
                const response = await fetch('/api/sessions');
                if (!response.ok) {
                    throw new Error(`Error loading sessions: ${response.status}`);
                }
                
                const data = await response.json();
                state.sessions = data.sessions || [];
                
                // Extract categories
                state.categories = new Set(['Uncategorized']);
                state.sessions.forEach(session => {
                    if (session.category && session.category.trim() !== '') {
                        state.categories.add(session.category);
                    }
                });
                
                // Notify subscribers
                _notifySubscribers('sessionsUpdate', state.sessions);
                return state.sessions;
            } catch (error) {
                console.error('Error loading sessions:', error);
                return [];
            }
        },
        
        /**
         * Get available categories
         * @returns {Array} Array of category names
         */
        getCategories: function() {
            return Array.from(state.categories).sort();
        },
        
        /**
         * Filter and sort sessions
         * @returns {Array} Filtered and sorted sessions
         */
        getFilteredSessions: function() {
            const { filterCategory, searchTerm, sortOrder } = state.uiPreferences;
            
            // Filter by category and search term
            let filtered = state.sessions;
            
            if (filterCategory !== 'all') {
                if (filterCategory === '') {
                    // Show only uncategorized
                    filtered = filtered.filter(session => !session.category || session.category.trim() === '');
                } else {
                    filtered = filtered.filter(session => session.category === filterCategory);
                }
            }
            
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                filtered = filtered.filter(session => {
                    return (
                        (session.name && session.name.toLowerCase().includes(search)) ||
                        (session.description && session.description.toLowerCase().includes(search)) ||
                        (session.url && session.url.toLowerCase().includes(search))
                    );
                });
            }
            
            // Sort by creation date
            filtered.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            });
            
            return filtered;
        },
        
        /**
         * Update UI preferences
         * @param {Object} preferences - New preference values
         */
        updatePreferences: function(preferences) {
            state.uiPreferences = {
                ...state.uiPreferences,
                ...preferences
            };
            
            _saveToLocalStorage();
            _notifySubscribers('uiPreferencesChange', state.uiPreferences);
        },
        
        /**
         * Get UI preferences
         * @returns {Object} Current UI preferences
         */
        getPreferences: function() {
            return {...state.uiPreferences};
        },
        
        /**
         * Start a new recording session
         * @param {string} url - URL to record
         * @returns {Promise<Object>} New session object
         */
        startRecording: async function(url) {
            try {
                // Make API call to start session
                const response = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to start recording session');
                }
                
                const sessionData = await response.json();
                
                // Update state
                state.appMode = 'recording';
                state.isRecording = true;
                state.currentSession = sessionData;
                state.recordingPid = sessionData.id;
                
                // Save to localStorage
                _saveToLocalStorage();
                
                // Notify subscribers
                _notifySubscribers('stateChange', { appMode: state.appMode });
                _notifySubscribers('recordingStatusChange', { isRecording: true, session: sessionData });
                
                return sessionData;
            } catch (error) {
                console.error('Error starting recording:', error);
                throw error;
            }
        },
        
        /**
         * Complete the current recording session
         * @returns {Promise<Object>} Updated session object
         */
        completeRecording: async function() {
            if (!state.currentSession || !state.recordingPid) {
                throw new Error('No active recording session');
            }
            
            try {
                // Don't try to complete temporary sessions
                if (state.recordingPid.startsWith('temp-')) {
                    // Just update the UI state
                    state.appMode = 'idle';
                    state.isRecording = false;
                    state.currentSession = null;
                    state.recordingPid = null;
                    
                    // Remove from localStorage
                    localStorage.removeItem('currentRecordingProcess');
                    
                    // Notify subscribers
                    _notifySubscribers('stateChange', { appMode: state.appMode });
                    _notifySubscribers('recordingStatusChange', { isRecording: false });
                    
                    return null;
                }
                
                // Make API call to complete session
                const response = await fetch(`/api/sessions/${state.recordingPid}/complete`, {
                    method: 'PUT'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to complete recording session');
                }
                
                const sessionData = await response.json();
                
                // Update state
                state.appMode = 'idle';
                state.isRecording = false;
                state.currentSession = null;
                state.recordingPid = null;
                
                // Remove from localStorage
                localStorage.removeItem('currentRecordingProcess');
                
                // Notify subscribers
                _notifySubscribers('stateChange', { appMode: state.appMode });
                _notifySubscribers('recordingStatusChange', { isRecording: false, session: sessionData });
                
                // Refresh sessions list
                this.loadSessions();
                
                return sessionData;
            } catch (error) {
                console.error('Error completing recording:', error);
                throw error;
            }
        },
        
        /**
         * Select a session for replay
         * @param {string} sessionId - ID of the session to select
         */
        selectSession: async function(sessionId) {
            if (state.selectedSessionId === sessionId) {
                return;
            }
            
            // Update state
            state.selectedSessionId = sessionId;
            
            // If we're replaying, stop replay
            if (state.isReplaying) {
                this.stopReplay();
            }
            
            // Fetch session data if needed
            if (sessionId) {
                try {
                    const response = await fetch(`/api/sessions/${sessionId}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch session data: ${response.status}`);
                    }
                    
                    const sessionData = await response.json();
                    
                    // Notify subscribers
                    _notifySubscribers('selectedSessionChange', { 
                        sessionId,
                        sessionData
                    });
                } catch (error) {
                    console.error('Error fetching session data:', error);
                    
                    // Still notify with just the ID
                    _notifySubscribers('selectedSessionChange', { 
                        sessionId,
                        error
                    });
                }
            } else {
                // Notify with null session
                _notifySubscribers('selectedSessionChange', { 
                    sessionId: null
                });
            }
        },
        
        /**
         * Start replaying the selected session
         * @returns {Promise<Object>} Replay status
         */
        startReplay: async function() {
            if (!state.selectedSessionId) {
                throw new Error('No session selected for replay');
            }
            
            if (state.isReplaying) {
                throw new Error('Replay already in progress');
            }
            
            try {
                // Make API call to start replay
                const response = await fetch(`/api/sessions/${state.selectedSessionId}/replay`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        speed: state.uiPreferences.replaySpeed || 1
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to start replay');
                }
                
                const replayData = await response.json();
                
                // Update state
                state.appMode = 'replaying';
                state.isReplaying = true;
                state.replayPid = replayData.replayId || replayData.id;
                
                // Notify subscribers
                _notifySubscribers('stateChange', { appMode: state.appMode });
                _notifySubscribers('replayStatusChange', { 
                    isReplaying: true,
                    sessionId: state.selectedSessionId,
                    replayData
                });
                
                return replayData;
            } catch (error) {
                console.error('Error starting replay:', error);
                throw error;
            }
        },
        
        /**
         * Stop the current replay
         * @returns {Promise<Object>} Stop status
         */
        stopReplay: async function() {
            if (!state.isReplaying) {
                return null;
            }
            
            try {
                // Update state immediately for responsiveness
                state.appMode = 'idle';
                state.isReplaying = false;
                
                // Make API call to stop replay if we have a valid replay ID
                if (state.replayPid) {
                    const response = await fetch(`/api/sessions/${state.selectedSessionId}/replay/${state.replayPid}/stop`, {
                        method: 'POST'
                    });
                    
                    if (response.ok) {
                        const stopData = await response.json();
                        state.replayPid = null;
                        
                        // Notify subscribers
                        _notifySubscribers('stateChange', { appMode: state.appMode });
                        _notifySubscribers('replayStatusChange', { 
                            isReplaying: false,
                            sessionId: state.selectedSessionId,
                            stopData
                        });
                        
                        return stopData;
                    }
                }
                
                // If API call failed or we didn't have a replay ID
                state.replayPid = null;
                
                // Notify subscribers
                _notifySubscribers('stateChange', { appMode: state.appMode });
                _notifySubscribers('replayStatusChange', { 
                    isReplaying: false,
                    sessionId: state.selectedSessionId
                });
                
                return null;
            } catch (error) {
                console.error('Error stopping replay:', error);
                
                // Still update state and notify on error
                state.appMode = 'idle';
                state.isReplaying = false;
                state.replayPid = null;
                
                _notifySubscribers('stateChange', { appMode: state.appMode });
                _notifySubscribers('replayStatusChange', { 
                    isReplaying: false,
                    sessionId: state.selectedSessionId,
                    error
                });
                
                throw error;
            }
        },
        
        /**
         * Set replay speed
         * @param {number} speed - Replay speed multiplier
         */
        setReplaySpeed: function(speed) {
            // Update preferences
            state.uiPreferences.replaySpeed = speed;
            _saveToLocalStorage();
            
            // If actively replaying, update the replay
            if (state.isReplaying && state.replayPid) {
                // Placeholder for API call to update speed
                // This would be implemented when the backend supports it
                console.log(`Setting replay speed to ${speed}x`);
            }
            
            // Notify subscribers
            _notifySubscribers('uiPreferencesChange', state.uiPreferences);
        },
        
        /**
         * Check recording status of a process
         * @param {string} pid - Process ID to check
         * @returns {Promise<Object>} Status data
         */
        checkRecordingStatus: async function(pid) {
            if (!pid) return null;
            
            try {
                const response = await fetch(`/api/recording/status/${pid}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to check recording status: ${response.status}`);
                }
                
                const statusData = await response.json();
                
                // If recording is still active, update state
                if (statusData.success && statusData.status === 'recording' && statusData.isRunning) {
                    state.appMode = 'recording';
                    state.isRecording = true;
                    state.recordingPid = pid;
                    
                    // Try to recover session details
                    try {
                        const sessionResponse = await fetch(`/api/sessions/${pid}`);
                        if (sessionResponse.ok) {
                            const sessionData = await sessionResponse.json();
                            state.currentSession = sessionData;
                        }
                    } catch (error) {
                        console.error('Error recovering session details:', error);
                    }
                    
                    // Notify subscribers
                    _notifySubscribers('stateChange', { appMode: state.appMode });
                    _notifySubscribers('recordingStatusChange', { 
                        isRecording: true,
                        pid,
                        session: state.currentSession
                    });
                } else {
                    // Recording is not active, clear state
                    state.appMode = 'idle';
                    state.isRecording = false;
                    state.currentSession = null;
                    state.recordingPid = null;
                    localStorage.removeItem('currentRecordingProcess');
                    
                    // Notify subscribers
                    _notifySubscribers('stateChange', { appMode: state.appMode });
                    _notifySubscribers('recordingStatusChange', { isRecording: false });
                }
                
                return statusData;
            } catch (error) {
                console.error('Error checking recording status:', error);
                return null;
            }
        },
        
        /**
         * Register a component with the state manager
         * @param {string} componentName - Name of the component
         * @param {Object} component - Component reference
         */
        registerComponent: function(componentName, component) {
            state.components[componentName] = component;
        }
    };
})();

// Export to global scope
window.AppState = AppState;

// Auto-initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    AppState.initialize();
});

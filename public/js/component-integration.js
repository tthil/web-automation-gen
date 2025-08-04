/**
 * Component Integration Module
 * 
 * This module connects all UI components to the central state management system
 * and handles event coordination between components.
 */

const ComponentIntegration = (function() {
    let initialized = false;
    
    // Component references
    const components = {
        urlInput: null,
        startSessionBtn: null,
        saveSessionBtn: null,
        statusText: null,
        recordingStatus: null,
        connectionStatus: null,
        reconnectBtn: null,
        sessionsList: null,
        categoryFilter: null,
        sessionSearch: null,
        sortSessionsBtn: null,
        clearSearchBtn: null,
        replayLogs: null,
        stopReplayBtn: null,
        clearLogsBtn: null
    };
    
    // State subscriptions
    const subscriptions = [];
    
    /**
     * Initialize component integration
     */
    function initialize() {
        if (initialized) return;
        
        // Get DOM element references
        _initializeComponents();
        
        // Set up event listeners
        _setupEventListeners();
        
        // Subscribe to state changes
        _subscribeToStateChanges();
        
        // Apply initial state
        _applyInitialState();
        
        initialized = true;
        console.log('Component integration initialized');
    }
    
    /**
     * Initialize component references
     */
    function _initializeComponents() {
        components.urlInput = document.getElementById('urlInput');
        components.startSessionBtn = document.getElementById('startSessionBtn');
        components.saveSessionBtn = document.getElementById('saveSessionBtn');
        components.statusText = document.getElementById('statusText');
        components.recordingStatus = document.getElementById('recordingStatus');
        components.connectionStatus = document.getElementById('connectionStatus');
        components.reconnectBtn = document.getElementById('reconnectBtn');
        components.sessionsList = document.getElementById('sessionsList');
        components.categoryFilter = document.getElementById('categoryFilter');
        components.sessionSearch = document.getElementById('sessionSearch');
        components.sortSessionsBtn = document.getElementById('sortSessionsBtn');
        components.clearSearchBtn = document.getElementById('clearSearchBtn');
        components.replayLogs = document.getElementById('replayLogs');
        components.stopReplayBtn = document.getElementById('stopReplayBtn');
        components.clearLogsBtn = document.getElementById('clearLogsBtn');
        
        // Register components with state manager
        if (window.AppState) {
            window.AppState.registerComponent('urlInput', components.urlInput);
            window.AppState.registerComponent('sessionsList', components.sessionsList);
        }
    }
    
    /**
     * Set up event listeners for UI components
     */
    function _setupEventListeners() {
        // URL Input and Session Control
        if (components.startSessionBtn) {
            components.startSessionBtn.addEventListener('click', _handleStartSession);
        }
        
        if (components.saveSessionBtn) {
            components.saveSessionBtn.addEventListener('click', _handleSaveSession);
        }
        
        if (components.reconnectBtn) {
            components.reconnectBtn.addEventListener('click', _handleReconnect);
        }
        
        // Session List Controls
        if (components.categoryFilter) {
            components.categoryFilter.addEventListener('change', _handleCategoryFilter);
        }
        
        if (components.sessionSearch) {
            components.sessionSearch.addEventListener('input', _handleSessionSearch);
        }
        
        if (components.sortSessionsBtn) {
            components.sortSessionsBtn.addEventListener('click', _handleSortToggle);
        }
        
        if (components.clearSearchBtn) {
            components.clearSearchBtn.addEventListener('click', _handleClearSearch);
        }
        
        // Replay Controls
        if (components.stopReplayBtn) {
            components.stopReplayBtn.addEventListener('click', _handleStopReplay);
        }
        
        if (components.clearLogsBtn) {
            components.clearLogsBtn.addEventListener('click', _handleClearLogs);
        }
        
        // URL Input Enter key
        if (components.urlInput) {
            components.urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !components.startSessionBtn.disabled) {
                    _handleStartSession();
                }
            });
        }
    }
    
    /**
     * Subscribe to state changes from AppState
     */
    function _subscribeToStateChanges() {
        if (!window.AppState) return;
        
        // Subscribe to general state changes
        subscriptions.push(
            window.AppState.subscribe('stateChange', _handleStateChange)
        );
        
        // Subscribe to recording status changes
        subscriptions.push(
            window.AppState.subscribe('recordingStatusChange', _handleRecordingStatusChange)
        );
        
        // Subscribe to replay status changes
        subscriptions.push(
            window.AppState.subscribe('replayStatusChange', _handleReplayStatusChange)
        );
        
        // Subscribe to sessions updates
        subscriptions.push(
            window.AppState.subscribe('sessionsUpdate', _handleSessionsUpdate)
        );
        
        // Subscribe to selected session changes
        subscriptions.push(
            window.AppState.subscribe('selectedSessionChange', _handleSelectedSessionChange)
        );
        
        // Subscribe to UI preferences changes
        subscriptions.push(
            window.AppState.subscribe('uiPreferencesChange', _handlePreferencesChange)
        );
    }
    
    /**
     * Apply initial state to UI components
     */
    function _applyInitialState() {
        if (!window.AppState) return;
        
        const state = window.AppState.getState();
        const preferences = window.AppState.getPreferences();
        
        // Apply UI preferences
        if (components.categoryFilter) {
            components.categoryFilter.value = preferences.filterCategory || 'all';
        }
        
        if (components.sessionSearch) {
            components.sessionSearch.value = preferences.searchTerm || '';
        }
        
        // Update sort button icon
        _updateSortIcon(preferences.sortOrder);
        
        // Apply initial app mode
        _updateUIForAppMode(state.appMode);
    }
    
    /**
     * Handle start session button click
     */
    async function _handleStartSession() {
        if (!components.urlInput || !window.AppState) return;
        
        const url = components.urlInput.value.trim();
        if (!url) {
            _showToast('Please enter a URL', 'warning');
            components.urlInput.focus();
            return;
        }
        
        // Validate URL format
        if (!_isValidUrl(url)) {
            _showToast('Please enter a valid URL (e.g., https://example.com)', 'warning');
            components.urlInput.focus();
            return;
        }
        
        try {
            // Update UI immediately for responsiveness
            components.startSessionBtn.disabled = true;
            components.startSessionBtn.innerHTML = '<i class="fas fa-spinner fa-spin btn-icon"></i> Starting...';
            
            // Start recording through state manager
            await window.AppState.startRecording(url);
            
            _showToast('Recording session started', 'success');
            _announceToScreenReader('Recording session started');
        } catch (error) {
            console.error('Error starting session:', error);
            _showToast('Failed to start recording session', 'error');
            
            // Reset button state
            components.startSessionBtn.disabled = false;
            components.startSessionBtn.innerHTML = '<i class="fas fa-play btn-icon"></i> Start Session';
        }
    }
    
    /**
     * Handle save session button click
     */
    async function _handleSaveSession() {
        if (!window.AppState) return;
        
        try {
            // Update UI immediately
            components.saveSessionBtn.disabled = true;
            components.saveSessionBtn.innerHTML = '<i class="fas fa-spinner fa-spin btn-icon"></i> Saving...';
            
            // Complete recording through state manager
            await window.AppState.completeRecording();
            
            _showToast('Recording session saved', 'success');
            _announceToScreenReader('Recording session saved');
        } catch (error) {
            console.error('Error saving session:', error);
            _showToast('Failed to save recording session', 'error');
            
            // Reset button state
            components.saveSessionBtn.disabled = false;
            components.saveSessionBtn.innerHTML = '<i class="fas fa-save btn-icon"></i> Save';
        }
    }
    
    /**
     * Handle reconnect button click
     */
    async function _handleReconnect() {
        if (!window.AppState) return;
        
        const savedPid = localStorage.getItem('currentRecordingProcess');
        if (!savedPid) {
            _showToast('No recording session to reconnect to', 'warning');
            return;
        }
        
        try {
            components.reconnectBtn.disabled = true;
            components.reconnectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            
            await window.AppState.checkRecordingStatus(savedPid);
            
            _showToast('Reconnection attempt completed', 'info');
        } catch (error) {
            console.error('Error reconnecting:', error);
            _showToast('Failed to reconnect to recording session', 'error');
        } finally {
            components.reconnectBtn.disabled = false;
            components.reconnectBtn.innerHTML = '<i class="fas fa-sync"></i> Reconnect';
        }
    }
    
    /**
     * Handle category filter change
     */
    function _handleCategoryFilter(event) {
        if (!window.AppState) return;
        
        const category = event.target.value;
        window.AppState.updatePreferences({ filterCategory: category });
        
        // Update sessions display
        _updateSessionsDisplay();
    }
    
    /**
     * Handle session search input
     */
    function _handleSessionSearch(event) {
        if (!window.AppState) return;
        
        const searchTerm = event.target.value;
        window.AppState.updatePreferences({ searchTerm });
        
        // Update sessions display
        _updateSessionsDisplay();
        
        // Show/hide clear button
        if (components.clearSearchBtn) {
            components.clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        }
    }
    
    /**
     * Handle sort toggle button click
     */
    function _handleSortToggle() {
        if (!window.AppState) return;
        
        const preferences = window.AppState.getPreferences();
        const newSortOrder = preferences.sortOrder === 'asc' ? 'desc' : 'asc';
        
        window.AppState.updatePreferences({ sortOrder: newSortOrder });
        
        // Update sessions display
        _updateSessionsDisplay();
        
        // Update sort icon
        _updateSortIcon(newSortOrder);
    }
    
    /**
     * Handle clear search button click
     */
    function _handleClearSearch() {
        if (!window.AppState || !components.sessionSearch) return;
        
        components.sessionSearch.value = '';
        window.AppState.updatePreferences({ searchTerm: '' });
        
        // Update sessions display
        _updateSessionsDisplay();
        
        // Hide clear button
        if (components.clearSearchBtn) {
            components.clearSearchBtn.style.display = 'none';
        }
        
        // Focus search input
        components.sessionSearch.focus();
    }
    
    /**
     * Handle stop replay button click
     */
    async function _handleStopReplay() {
        if (!window.AppState) return;
        
        try {
            await window.AppState.stopReplay();
            _showToast('Replay stopped', 'info');
        } catch (error) {
            console.error('Error stopping replay:', error);
            _showToast('Failed to stop replay', 'error');
        }
    }
    
    /**
     * Handle clear logs button click
     */
    function _handleClearLogs() {
        if (!components.replayLogs) return;
        
        components.replayLogs.innerHTML = '';
        _showToast('Logs cleared', 'info');
        _announceToScreenReader('Replay logs cleared');
    }
    
    /**
     * Handle general state changes
     */
    function _handleStateChange(data) {
        _updateUIForAppMode(data.appMode);
    }
    
    /**
     * Handle recording status changes
     */
    function _handleRecordingStatusChange(data) {
        const { isRecording, session } = data;
        
        // Update recording status indicator
        if (components.recordingStatus) {
            if (isRecording) {
                components.recordingStatus.classList.add('active');
            } else {
                components.recordingStatus.classList.remove('active');
            }
        }
        
        // Update status text
        if (components.statusText) {
            components.statusText.textContent = isRecording ? 'Recording...' : 'Ready';
        }
        
        // Update connection status
        if (components.connectionStatus) {
            components.connectionStatus.textContent = isRecording ? 'Connected' : 'Not recording';
            components.connectionStatus.className = `connection-status ${isRecording ? 'connected' : 'idle'}`;
        }
        
        // Update button states
        if (components.startSessionBtn) {
            components.startSessionBtn.disabled = isRecording;
            components.startSessionBtn.innerHTML = '<i class="fas fa-play btn-icon"></i> Start Session';
        }
        
        if (components.saveSessionBtn) {
            components.saveSessionBtn.disabled = !isRecording;
            components.saveSessionBtn.innerHTML = '<i class="fas fa-save btn-icon"></i> Save';
        }
        
        // Update reconnect button
        if (components.reconnectBtn) {
            components.reconnectBtn.style.display = isRecording ? 'none' : 'none';
        }
    }
    
    /**
     * Handle replay status changes
     */
    function _handleReplayStatusChange(data) {
        const { isReplaying } = data;
        
        // Update stop replay button
        if (components.stopReplayBtn) {
            components.stopReplayBtn.disabled = !isReplaying;
        }
    }
    
    /**
     * Handle sessions update
     */
    function _handleSessionsUpdate(sessions) {
        _updateCategoryOptions();
        _updateSessionsDisplay();
    }
    
    /**
     * Handle selected session change
     */
    function _handleSelectedSessionChange(data) {
        const { sessionId, sessionData } = data;
        
        // Update UI to reflect selected session
        // This could include highlighting the selected session in the list
        _updateSelectedSessionUI(sessionId, sessionData);
    }
    
    /**
     * Handle UI preferences changes
     */
    function _handlePreferencesChange(preferences) {
        // Update UI elements to reflect new preferences
        if (components.categoryFilter) {
            components.categoryFilter.value = preferences.filterCategory || 'all';
        }
        
        if (components.sessionSearch) {
            components.sessionSearch.value = preferences.searchTerm || '';
        }
        
        _updateSortIcon(preferences.sortOrder);
        _updateSessionsDisplay();
    }
    
    /**
     * Update UI for different app modes
     */
    function _updateUIForAppMode(appMode) {
        const isRecording = appMode === 'recording';
        const isReplaying = appMode === 'replaying';
        
        // Update main controls
        if (components.startSessionBtn) {
            components.startSessionBtn.disabled = isRecording || isReplaying;
        }
        
        if (components.saveSessionBtn) {
            components.saveSessionBtn.disabled = !isRecording;
        }
        
        if (components.stopReplayBtn) {
            components.stopReplayBtn.disabled = !isReplaying;
        }
        
        // Update URL input
        if (components.urlInput) {
            components.urlInput.disabled = isRecording || isReplaying;
        }
    }
    
    /**
     * Update category filter options
     */
    function _updateCategoryOptions() {
        if (!components.categoryFilter || !window.AppState) return;
        
        const categories = window.AppState.getCategories();
        const currentValue = components.categoryFilter.value;
        
        // Clear existing options except 'All Categories' and 'Uncategorized'
        components.categoryFilter.innerHTML = `
            <option value="all">All Categories</option>
            <option value="">Uncategorized</option>
        `;
        
        // Add category options
        categories.forEach(category => {
            if (category !== 'Uncategorized') {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                components.categoryFilter.appendChild(option);
            }
        });
        
        // Restore previous selection if it still exists
        if (currentValue && Array.from(components.categoryFilter.options).some(opt => opt.value === currentValue)) {
            components.categoryFilter.value = currentValue;
        }
    }
    
    /**
     * Update sessions display
     */
    function _updateSessionsDisplay() {
        if (!components.sessionsList || !window.AppState) return;
        
        const filteredSessions = window.AppState.getFilteredSessions();
        
        if (filteredSessions.length === 0) {
            components.sessionsList.innerHTML = `
                <div class="no-sessions">
                    <i class="fas fa-folder-open fa-2x" style="margin-bottom: 10px;"></i><br>
                    No sessions available
                </div>
            `;
            return;
        }
        
        // Render sessions
        components.sessionsList.innerHTML = filteredSessions.map(session => {
            const createdDate = new Date(session.createdAt).toLocaleDateString();
            const category = session.category || 'Uncategorized';
            
            return `
                <div class="session-item" data-session-id="${session.id}">
                    <div class="session-header">
                        <h3 class="session-name">${_escapeHtml(session.name || 'Unnamed Session')}</h3>
                        <div class="session-actions">
                            <button class="btn micro primary replay-btn" data-session-id="${session.id}">
                                <i class="fas fa-play"></i> Replay
                            </button>
                            <button class="btn micro secondary edit-btn" data-session-id="${session.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn micro danger delete-btn" data-session-id="${session.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="session-details">
                        <p class="session-url"><i class="fas fa-link"></i> ${_escapeHtml(session.url)}</p>
                        <div class="session-meta">
                            <span class="session-category">
                                <i class="fas fa-tag"></i> ${_escapeHtml(category)}
                            </span>
                            <span class="session-date">
                                <i class="fas fa-calendar"></i> ${createdDate}
                            </span>
                        </div>
                        ${session.description ? `<p class="session-description">${_escapeHtml(session.description)}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners to session items
        _addSessionEventListeners();
    }
    
    /**
     * Add event listeners to session items
     */
    function _addSessionEventListeners() {
        if (!components.sessionsList) return;
        
        // Replay buttons
        components.sessionsList.querySelectorAll('.replay-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const sessionId = e.target.closest('[data-session-id]').dataset.sessionId;
                await _handleSessionReplay(sessionId);
            });
        });
        
        // Edit buttons
        components.sessionsList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.closest('[data-session-id]').dataset.sessionId;
                _handleSessionEdit(sessionId);
            });
        });
        
        // Delete buttons
        components.sessionsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.closest('[data-session-id]').dataset.sessionId;
                _handleSessionDelete(sessionId);
            });
        });
        
        // Session item click (for selection)
        components.sessionsList.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't select if clicking on action buttons
                if (e.target.closest('.session-actions')) return;
                
                const sessionId = item.dataset.sessionId;
                _handleSessionSelect(sessionId);
            });
        });
    }
    
    /**
     * Handle session replay
     */
    async function _handleSessionReplay(sessionId) {
        if (!window.AppState) return;
        
        try {
            // Select the session first
            await window.AppState.selectSession(sessionId);
            
            // Start replay
            await window.AppState.startReplay();
            
            _showToast('Replay started', 'success');
            _announceToScreenReader('Session replay started');
        } catch (error) {
            console.error('Error starting replay:', error);
            _showToast('Failed to start replay', 'error');
        }
    }
    
    /**
     * Handle session selection
     */
    async function _handleSessionSelect(sessionId) {
        if (!window.AppState) return;
        
        try {
            await window.AppState.selectSession(sessionId);
        } catch (error) {
            console.error('Error selecting session:', error);
        }
    }
    
    /**
     * Handle session edit (placeholder)
     */
    function _handleSessionEdit(sessionId) {
        // Placeholder for session editing functionality
        console.log('Edit session:', sessionId);
        _showToast('Session editing not yet implemented', 'info');
    }
    
    /**
     * Handle session delete (placeholder)
     */
    function _handleSessionDelete(sessionId) {
        // Placeholder for session deletion functionality
        console.log('Delete session:', sessionId);
        _showToast('Session deletion not yet implemented', 'info');
    }
    
    /**
     * Update selected session UI
     */
    function _updateSelectedSessionUI(sessionId, sessionData) {
        if (!components.sessionsList) return;
        
        // Remove previous selection
        components.sessionsList.querySelectorAll('.session-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to new session
        if (sessionId) {
            const sessionItem = components.sessionsList.querySelector(`[data-session-id="${sessionId}"]`);
            if (sessionItem) {
                sessionItem.classList.add('selected');
            }
        }
    }
    
    /**
     * Update sort icon
     */
    function _updateSortIcon(sortOrder) {
        if (!components.sortSessionsBtn) return;
        
        const icon = components.sortSessionsBtn.querySelector('i');
        if (icon) {
            icon.className = sortOrder === 'asc' ? 'fas fa-sort-alpha-up' : 'fas fa-sort-alpha-down';
        }
    }
    
    /**
     * Utility functions
     */
    function _isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    function _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function _showToast(message, type = 'info') {
        // Use existing toast system if available
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    function _announceToScreenReader(message) {
        // Use existing screen reader announcement if available
        if (typeof announceForScreenReaders === 'function') {
            announceForScreenReaders(message);
        } else if (window.announceToScreenReader) {
            window.announceToScreenReader(message);
        }
    }
    
    /**
     * Cleanup function
     */
    function cleanup() {
        // Unsubscribe from all state changes
        subscriptions.forEach(unsubscribe => unsubscribe());
        subscriptions.length = 0;
        
        initialized = false;
    }
    
    // Public API
    return {
        initialize,
        cleanup,
        getComponents: () => ({ ...components })
    };
})();

// Export to global scope
window.ComponentIntegration = ComponentIntegration;

// Auto-initialize when DOM is ready and AppState is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for AppState to be available
    const initWhenReady = () => {
        if (window.AppState) {
            ComponentIntegration.initialize();
        } else {
            setTimeout(initWhenReady, 100);
        }
    };
    
    initWhenReady();
});

/**
 * replay-controls.js
 * Manages replay controls and logs panel functionality for session playback
 */

// Self-executing function to avoid polluting global namespace
(function() {
    // DOM elements
    const replayLogsContainer = document.getElementById('replayLogs');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const stopReplayBtn = document.getElementById('stopReplayBtn');
    
    // Initialize module
    function init() {
        // Add event listeners
        if (clearLogsBtn) clearLogsBtn.addEventListener('click', clearLogs);
        if (stopReplayBtn) stopReplayBtn.addEventListener('click', stopReplay);
        
        // Add filter controls to the DOM
        addLogFilterControls();
        
        // Initialize replay controls
        initReplayControls();
        
        // Log initialization
        addLogEntry('System', 'Replay controls initialized', 'info');
    }
    
    /**
     * Initialize replay control buttons
     */
    function initReplayControls() {
        // Get the replay controls container
        const replayControlsContainer = document.querySelector('.replay-controls');
        if (!replayControlsContainer) return;
        
        // Add play and pause buttons before the stop button
        const playPauseBtn = document.createElement('button');
        playPauseBtn.id = 'playPauseReplayBtn';
        playPauseBtn.className = 'btn primary';
        playPauseBtn.disabled = true; // Initially disabled
        playPauseBtn.innerHTML = '<i class="fas fa-play btn-icon"></i> Play';
        playPauseBtn.setAttribute('aria-label', 'Play or pause replay');
        
        // Add restart button
        const restartBtn = document.createElement('button');
        restartBtn.id = 'restartReplayBtn';
        restartBtn.className = 'btn secondary';
        restartBtn.disabled = true; // Initially disabled
        restartBtn.innerHTML = '<i class="fas fa-redo-alt btn-icon"></i> Restart';
        restartBtn.setAttribute('aria-label', 'Restart replay from beginning');
        
        // Speed control dropdown
        const speedControl = document.createElement('select');
        speedControl.id = 'replaySpeedControl';
        speedControl.className = 'replay-speed-control';
        speedControl.setAttribute('aria-label', 'Replay speed');
        speedControl.disabled = true;
        
        // Add speed options
        const speeds = [
            { value: '0.5', text: '0.5x (Slow)' },
            { value: '1', text: '1x (Normal)' },
            { value: '2', text: '2x (Fast)' },
            { value: '4', text: '4x (Very Fast)' }
        ];
        
        speeds.forEach(speed => {
            const option = document.createElement('option');
            option.value = speed.value;
            option.textContent = speed.text;
            if (speed.value === '1') option.selected = true;
            speedControl.appendChild(option);
        });
        
        // Add event listeners
        playPauseBtn.addEventListener('click', togglePlayPause);
        restartBtn.addEventListener('click', restartReplay);
        speedControl.addEventListener('change', changeReplaySpeed);
        
        // Insert buttons at the beginning of the controls container
        replayControlsContainer.insertBefore(speedControl, replayControlsContainer.firstChild);
        replayControlsContainer.insertBefore(restartBtn, replayControlsContainer.firstChild);
        replayControlsContainer.insertBefore(playPauseBtn, replayControlsContainer.firstChild);
    }
    
    /**
     * Add log filter controls to the DOM
     */
    function addLogFilterControls() {
        // Create filter controls container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'log-filter-controls';
        
        // Create filter options
        const filterTypes = [
            { value: 'all', text: 'All Logs', checked: true },
            { value: 'info', text: 'Info', checked: false },
            { value: 'action', text: 'Actions', checked: false },
            { value: 'warning', text: 'Warnings', checked: false },
            { value: 'error', text: 'Errors', checked: false }
        ];
        
        // Add filter label
        const filterLabel = document.createElement('span');
        filterLabel.className = 'filter-label';
        filterLabel.textContent = 'Filter:';
        filterContainer.appendChild(filterLabel);
        
        // Create filter buttons
        filterTypes.forEach(filter => {
            const filterBtn = document.createElement('button');
            filterBtn.className = `filter-btn ${filter.checked ? 'active' : ''}`;
            filterBtn.dataset.filter = filter.value;
            filterBtn.textContent = filter.text;
            filterBtn.addEventListener('click', function() {
                // Toggle active state
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Apply filtering
                filterLogs(filter.value);
            });
            
            filterContainer.appendChild(filterBtn);
        });
        
        // Find the logs-header div and add the filter controls
        const logsHeader = document.querySelector('.logs-actions');
        if (logsHeader) {
            logsHeader.insertBefore(filterContainer, logsHeader.firstChild);
        }
    }
    
    /**
     * Filter logs based on type
     * @param {string} filterType - The type of logs to filter for
     */
    function filterLogs(filterType) {
        const logMessages = replayLogsContainer.querySelectorAll('.log-message');
        
        logMessages.forEach(message => {
            if (filterType === 'all') {
                message.style.display = 'block';
            } else {
                if (message.classList.contains(filterType)) {
                    message.style.display = 'block';
                } else {
                    message.style.display = 'none';
                }
            }
        });
        
        // Announce to screen readers
        if (window.announceToScreenReader) {
            window.announceToScreenReader(`Showing ${filterType} logs`);
        }
    }
    
    /**
     * Add a new log entry to the logs panel
     * @param {string} source - The source of the log (e.g., System, Browser, Action)
     * @param {string} message - The log message content
     * @param {string} type - Type of log (info, action, warning, error)
     */
    function addLogEntry(source, message, type = 'info') {
        // Create log message element
        const logMessage = document.createElement('div');
        logMessage.className = `log-message ${type}`;
        
        // Set icon based on type
        let icon = 'info-circle';
        if (type === 'action') icon = 'mouse-pointer';
        if (type === 'warning') icon = 'exclamation-triangle';
        if (type === 'error') icon = 'exclamation-circle';
        
        // Format timestamp
        const timestamp = new Date().toLocaleTimeString();
        
        // Create log content
        logMessage.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-source">[${source}]</span>
            <i class="fas fa-${icon} log-icon ${type}"></i>
            <span class="log-content">${message}</span>
        `;
        
        // Add to container
        replayLogsContainer.appendChild(logMessage);
        
        // Auto-scroll to bottom
        replayLogsContainer.scrollTop = replayLogsContainer.scrollHeight;
        
        // For important messages, announce to screen readers
        if (type === 'error' || type === 'warning') {
            if (window.announceToScreenReader) {
                window.announceToScreenReader(`${type}: ${message}`);
            }
        }
        
        return logMessage;
    }
    
    /**
     * Clear all logs from the logs panel
     */
    function clearLogs() {
        replayLogsContainer.innerHTML = '';
        addLogEntry('System', 'Logs cleared', 'info');
    }
    
    /**
     * Toggle between play and pause states
     */
    function togglePlayPause() {
        const playPauseBtn = document.getElementById('playPauseReplayBtn');
        if (!playPauseBtn) return;
        
        const isPlaying = playPauseBtn.classList.contains('playing');
        
        if (isPlaying) {
            // Change to pause state
            playPauseBtn.classList.remove('playing');
            playPauseBtn.innerHTML = '<i class="fas fa-play btn-icon"></i> Play';
            pauseReplay();
        } else {
            // Change to play state
            playPauseBtn.classList.add('playing');
            playPauseBtn.innerHTML = '<i class="fas fa-pause btn-icon"></i> Pause';
            startReplay();
        }
    }
    
    /**
     * Start the session replay
     */
    function startReplay() {
        addLogEntry('System', 'Starting replay', 'action');
        // This would connect to the backend replay functionality
        // For now, simulate with sample logs
        addDemoLogs();
    }
    
    /**
     * Pause the session replay
     */
    function pauseReplay() {
        addLogEntry('System', 'Replay paused', 'info');
        // This would pause the backend replay
    }
    
    /**
     * Stop the session replay
     */
    function stopReplay() {
        addLogEntry('System', 'Replay stopped', 'info');
        
        // Reset play/pause button
        const playPauseBtn = document.getElementById('playPauseReplayBtn');
        if (playPauseBtn) {
            playPauseBtn.classList.remove('playing');
            playPauseBtn.innerHTML = '<i class="fas fa-play btn-icon"></i> Play';
        }
        
        // This would stop the backend replay
    }
    
    /**
     * Restart the session replay from the beginning
     */
    function restartReplay() {
        addLogEntry('System', 'Replay restarted', 'action');
        
        // Reset play/pause button to playing state
        const playPauseBtn = document.getElementById('playPauseReplayBtn');
        if (playPauseBtn) {
            playPauseBtn.classList.add('playing');
            playPauseBtn.innerHTML = '<i class="fas fa-pause btn-icon"></i> Pause';
        }
        
        // This would restart the backend replay
    }
    
    /**
     * Change the replay speed
     */
    function changeReplaySpeed() {
        const speedControl = document.getElementById('replaySpeedControl');
        if (!speedControl) return;
        
        const speed = speedControl.value;
        addLogEntry('System', `Replay speed changed to ${speed}x`, 'info');
        
        // This would set the backend replay speed
    }
    
    /**
     * Enable replay controls when a session is selected for replay
     */
    function enableReplayControls(sessionId) {
        // Enable buttons
        const playPauseBtn = document.getElementById('playPauseReplayBtn');
        const restartBtn = document.getElementById('restartReplayBtn');
        const stopReplayBtn = document.getElementById('stopReplayBtn');
        const speedControl = document.getElementById('replaySpeedControl');
        
        if (playPauseBtn) playPauseBtn.disabled = false;
        if (restartBtn) restartBtn.disabled = false;
        if (stopReplayBtn) stopReplayBtn.disabled = false;
        if (speedControl) speedControl.disabled = false;
        
        // Log
        addLogEntry('System', `Session ${sessionId} loaded for replay`, 'info');
    }
    
    /**
     * Add demo logs for testing
     */
    function addDemoLogs() {
        setTimeout(() => addLogEntry('Browser', 'Navigating to https://example.com', 'action'), 1000);
        setTimeout(() => addLogEntry('Browser', 'Page loaded successfully', 'info'), 2000);
        setTimeout(() => addLogEntry('Action', 'Click on #login-button', 'action'), 3000);
        setTimeout(() => addLogEntry('Browser', 'Form submission detected', 'info'), 4000);
        setTimeout(() => addLogEntry('System', 'Waiting for response...', 'info'), 4500);
        setTimeout(() => addLogEntry('Network', 'POST request to /api/login', 'info'), 5000);
        setTimeout(() => addLogEntry('Network', 'Response received (200 OK)', 'info'), 5500);
        setTimeout(() => addLogEntry('Browser', 'Redirecting to /dashboard', 'action'), 6000);
        setTimeout(() => addLogEntry('System', 'Auth cookie detected', 'info'), 6500);
        setTimeout(() => addLogEntry('Browser', 'Dashboard loaded with 6 elements', 'info'), 7000);
        setTimeout(() => addLogEntry('Action', 'Click on #user-settings', 'action'), 8000);
        setTimeout(() => addLogEntry('System', 'Modal dialog opened', 'info'), 8500);
        setTimeout(() => addLogEntry('Network', 'GET request to /api/user/preferences failed (404)', 'error'), 9000);
        setTimeout(() => addLogEntry('System', 'Unable to load user preferences', 'warning'), 9500);
        setTimeout(() => addLogEntry('Action', 'Click on modal close button', 'action'), 10000);
    }
    
    // Expose public API
    window.replayControls = {
        addLogEntry,
        clearLogs,
        enableReplayControls
    };
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);
})();

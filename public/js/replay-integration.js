/**
 * replay-integration.js
 * Integrates session selection with replay controls
 */

(function() {
    // Keep track of the currently selected session
    let selectedSessionId = null;
    
    // Initialize integration
    function init() {
        // Listen for session selection events
        document.addEventListener('click', function(event) {
            // Check if clicked element has a data-replay attribute or is a child of one
            const replayBtn = event.target.closest('[data-replay]');
            if (replayBtn) {
                const sessionId = replayBtn.dataset.replay;
                if (sessionId) {
                    selectSessionForReplay(sessionId);
                }
            }
        });
        
        // Add replay buttons to existing session items
        addReplayButtonsToSessions();
    }
    
    /**
     * Add replay buttons to all session items
     */
    function addReplayButtonsToSessions() {
        // Wait for sessions to be loaded
        setTimeout(() => {
            // Find all session items that don't already have replay buttons
            const sessionItems = document.querySelectorAll('.session-item:not(.replay-button-added)');
            
            sessionItems.forEach(item => {
                const sessionId = item.dataset.sessionId;
                if (!sessionId) return;
                
                // Check if action buttons container exists, otherwise create it
                let actionsContainer = item.querySelector('.session-actions');
                if (!actionsContainer) {
                    actionsContainer = document.createElement('div');
                    actionsContainer.className = 'session-actions';
                    item.appendChild(actionsContainer);
                }
                
                // Create replay button
                const replayBtn = document.createElement('button');
                replayBtn.className = 'btn primary session-replay-btn';
                replayBtn.innerHTML = '<i class="fas fa-play"></i> Replay';
                replayBtn.setAttribute('data-replay', sessionId);
                replayBtn.setAttribute('aria-label', `Replay session ${sessionId}`);
                
                // Add button to actions container
                actionsContainer.appendChild(replayBtn);
                
                // Mark as processed
                item.classList.add('replay-button-added');
            });
        }, 1000); // Wait for sessions to be loaded
    }
    
    /**
     * Select a session for replay
     * @param {string} sessionId - The ID of the session to replay
     */
    function selectSessionForReplay(sessionId) {
        // Store the selected session ID
        selectedSessionId = sessionId;
        
        // Highlight the selected session
        highlightSelectedSession(sessionId);
        
        // Enable replay controls
        if (window.replayControls) {
            window.replayControls.enableReplayControls(sessionId);
        }
        
        // Log session selection
        addSessionSelectionLog(sessionId);
        
        // Fetch session data
        fetchSessionData(sessionId);
    }
    
    /**
     * Highlight the selected session in the UI
     * @param {string} sessionId - The ID of the session to highlight
     */
    function highlightSelectedSession(sessionId) {
        // Remove highlight from all sessions
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.remove('selected-for-replay');
        });
        
        // Add highlight to selected session
        const selectedItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected-for-replay');
            
            // Scroll into view if needed
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    /**
     * Add log entry for session selection
     * @param {string} sessionId - The ID of the selected session
     */
    function addSessionSelectionLog(sessionId) {
        if (window.replayControls && window.replayControls.addLogEntry) {
            window.replayControls.addLogEntry('System', `Session ${sessionId} selected for replay`, 'info');
            window.replayControls.addLogEntry('System', 'Loading session data...', 'info');
        }
    }
    
    /**
     * Fetch session data from the server
     * @param {string} sessionId - The ID of the session to fetch
     */
    function fetchSessionData(sessionId) {
        // Create the API URL using the current origin
        const apiUrl = new URL(`/api/sessions/${sessionId}`, window.location.origin).href;
        
        // Add log entry
        if (window.replayControls && window.replayControls.addLogEntry) {
            window.replayControls.addLogEntry('Network', `Fetching session data from ${apiUrl}`, 'info');
        }
        
        // Fetch session data
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch session data: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // Process session data
                processSessionData(data);
            })
            .catch(error => {
                // Log error
                if (window.replayControls && window.replayControls.addLogEntry) {
                    window.replayControls.addLogEntry('Network', `Error: ${error.message}`, 'error');
                }
                console.error('Error fetching session data:', error);
            });
    }
    
    /**
     * Process the fetched session data
     * @param {Object} data - The session data
     */
    function processSessionData(data) {
        // Add log entry for successful data fetch
        if (window.replayControls && window.replayControls.addLogEntry) {
            window.replayControls.addLogEntry('System', 'Session data loaded successfully', 'info');
            
            // Log session details
            window.replayControls.addLogEntry('Session', `Name: ${data.name || 'Unnamed'}`, 'info');
            
            if (data.events && Array.isArray(data.events)) {
                window.replayControls.addLogEntry('Session', `Contains ${data.events.length} events`, 'info');
                window.replayControls.addLogEntry('System', 'Ready to replay session', 'info');
            } else {
                window.replayControls.addLogEntry('System', 'No events found in session', 'warning');
            }
        }
    }
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);
    
    // Monitor for dynamically added session items
    setInterval(addReplayButtonsToSessions, 5000);
    
    // Expose public API
    window.replayIntegration = {
        selectSessionForReplay
    };
})();

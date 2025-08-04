/**
 * URL Input and Session Control Panel
 * Handles URL input validation, session control buttons state management,
 * and related event listeners.
 */

// Module for URL input and session controls
const urlInputControl = (function() {
    // DOM Elements
    const urlInput = document.getElementById('urlInput');
    const startSessionBtn = document.getElementById('startSessionBtn');
    const saveSessionBtn = document.getElementById('saveSessionBtn');
    const reconnectBtn = document.getElementById('reconnectBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const statusText = document.getElementById('statusText');
    const connectionStatus = document.getElementById('connectionStatus');
    
    // State
    let isRecording = false;
    let isValidUrl = false;
    let currentSession = null;
    
    // Initialize event listeners
    function initialize() {
        if (!urlInput || !startSessionBtn || !saveSessionBtn) {
            console.error('URL Input Control: Required DOM elements not found');
            return;
        }
        
        // URL input validation
        urlInput.addEventListener('input', validateUrl);
        urlInput.addEventListener('blur', validateUrl);
        
        // Session control buttons
        startSessionBtn.addEventListener('click', toggleSession);
        saveSessionBtn.addEventListener('click', saveSession);
        
        if (reconnectBtn) {
            reconnectBtn.addEventListener('click', reconnectSession);
        }
        
        // Initial validation
        validateUrl();
    }
    
    // Validate URL format
    function validateUrl() {
        const url = urlInput.value.trim();
        const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/;
        
        isValidUrl = urlPattern.test(url);
        
        if (url === '') {
            // Empty input - neutral state
            urlInput.classList.remove('is-valid', 'is-invalid');
            startSessionBtn.disabled = true;
        } else if (isValidUrl) {
            // Valid URL
            urlInput.classList.add('is-valid');
            urlInput.classList.remove('is-invalid');
            startSessionBtn.disabled = false;
        } else {
            // Invalid URL
            urlInput.classList.add('is-invalid');
            urlInput.classList.remove('is-valid');
            startSessionBtn.disabled = true;
            
            // Show validation error message
            showErrorToast('Please enter a valid URL (e.g., https://example.com)');
        }
        
        return isValidUrl;
    }
    
    // Toggle session start/stop
    function toggleSession() {
        if (!validateUrl()) {
            return;
        }
        
        if (!isRecording) {
            startSession();
        } else {
            stopSession();
        }
    }
    
    // Start a new recording session
    function startSession() {
        const url = urlInput.value.trim();
        
        try {
            // Update UI state
            isRecording = true;
            updateUIState();
            
            // Create a new session
            currentSession = {
                id: generateSessionId(),
                url: url,
                startTime: new Date(),
                events: []
            };
            
            // Make API call to start session
            fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Update session with server data
                currentSession.id = data.id;
                updateStatusText('Recording session for ' + url);
                showSuccessToast('Recording started successfully');
                
                // If we have an app-level session manager, notify it
                if (window.app && typeof window.app.onSessionStart === 'function') {
                    window.app.onSessionStart(currentSession);
                }
            })
            .catch(error => {
                console.error('Error starting session:', error);
                stopSession();
                showErrorToast('Failed to start recording: ' + error.message);
            });
        } catch (error) {
            console.error('Error in startSession:', error);
            stopSession();
            showErrorToast('An unexpected error occurred');
        }
    }
    
    // Stop the current recording session
    function stopSession() {
        if (!currentSession) {
            return;
        }
        
        try {
            // Update UI state
            isRecording = false;
            updateUIState();
            
            // Check if we have a valid server-assigned session ID (not a temporary one)
            // Only make the API call if the ID doesn't start with 'temp-'
            if (currentSession.id && !currentSession.id.startsWith('temp-')) {
                // Make API call to complete session
                fetch(`/api/sessions/${currentSession.id}/complete`, {
                    method: 'PUT'
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    updateStatusText('Session stopped');
                    showSuccessToast('Recording stopped');
                    
                    // Enable save button after session is stopped
                    saveSessionBtn.disabled = false;
                    
                    // If we have an app-level session manager, notify it
                    if (window.app && typeof window.app.onSessionStop === 'function') {
                        window.app.onSessionStop(currentSession);
                    }
                })
                .catch(error => {
                    console.error('Error stopping session:', error);
                    showErrorToast('Failed to stop recording: ' + error.message);
                });
            } else {
                // For temporary sessions that weren't properly created on the server
                updateStatusText('Session stopped (local only)');
                showSuccessToast('Recording stopped');
                saveSessionBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error in stopSession:', error);
            showErrorToast('An unexpected error occurred');
        }
    }
    
    // Save the current session
    function saveSession() {
        if (!currentSession) {
            showErrorToast('No active session to save');
            return;
        }
        
        // Show the name session modal
        const nameSessionModal = document.getElementById('nameSessionModal');
        if (nameSessionModal) {
            // Set up the modal with current session data
            const sessionNameInput = document.getElementById('sessionName');
            if (sessionNameInput) {
                sessionNameInput.value = `Session ${new Date().toLocaleString()}`;
            }
            
            // Show the modal
            nameSessionModal.setAttribute('aria-hidden', 'false');
            nameSessionModal.style.display = 'block';
            
            // Focus on the name input
            if (sessionNameInput) {
                sessionNameInput.focus();
            }
            
            // Set up save button handler in the modal
            const saveNameSession = document.getElementById('saveNameSession');
            if (saveNameSession) {
                // Remove any existing event listeners
                const newSaveNameSession = saveNameSession.cloneNode(true);
                saveNameSession.parentNode.replaceChild(newSaveNameSession, saveNameSession);
                
                // Add new event listener
                newSaveNameSession.addEventListener('click', function() {
                    const sessionName = document.getElementById('sessionName').value.trim();
                    const sessionCategory = document.getElementById('sessionCategory').value;
                    const customCategory = document.getElementById('customCategory').value.trim();
                    const sessionDescription = document.getElementById('sessionDescription').value.trim();
                    
                    const category = sessionCategory === 'custom' ? customCategory : sessionCategory;
                    
                    if (!sessionName) {
                        showErrorToast('Please enter a session name');
                        return;
                    }
                    
                    // Make API call to save session with metadata
                    fetch(`/api/sessions/${currentSession.id}/metadata`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: sessionName,
                            category: category,
                            description: sessionDescription
                        })
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Hide modal
                        nameSessionModal.style.display = 'none';
                        nameSessionModal.setAttribute('aria-hidden', 'true');
                        
                        // Reset UI
                        resetAfterSave();
                        
                        // Show success message
                        showSuccessToast(`Session "${sessionName}" saved successfully`);
                        
                        // If session list exists, refresh it
                        if (window.sessionList && typeof window.sessionList.refreshSessions === 'function') {
                            window.sessionList.refreshSessions();
                        }
                    })
                    .catch(error => {
                        console.error('Error saving session:', error);
                        showErrorToast('Failed to save session: ' + error.message);
                    });
                });
            }
            
            // Set up cancel and close buttons
            const cancelNameSession = document.getElementById('cancelNameSession');
            const closeNameModal = document.getElementById('closeNameModal');
            
            if (cancelNameSession) {
                cancelNameSession.addEventListener('click', function() {
                    nameSessionModal.style.display = 'none';
                    nameSessionModal.setAttribute('aria-hidden', 'true');
                });
            }
            
            if (closeNameModal) {
                closeNameModal.addEventListener('click', function() {
                    nameSessionModal.style.display = 'none';
                    nameSessionModal.setAttribute('aria-hidden', 'true');
                });
            }
        } else {
            console.error('Name session modal not found');
            showErrorToast('Could not open save dialog');
        }
    }
    
    // Reconnect to an interrupted session
    function reconnectSession() {
        if (!currentSession) {
            showErrorToast('No active session to reconnect');
            return;
        }
        
        // Show reconnecting status
        connectionStatus.textContent = 'Reconnecting...';
        connectionStatus.className = 'connection-status connecting';
        
        // Hide reconnect button
        if (reconnectBtn) {
            reconnectBtn.style.display = 'none';
        }
        
        // Make API call to reconnect
        fetch(`/api/sessions/${currentSession.id}/reconnect`, {
            method: 'POST'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update connection status
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'connection-status active';
            
            showSuccessToast('Successfully reconnected to session');
        })
        .catch(error => {
            console.error('Error reconnecting session:', error);
            
            // Show failed status
            connectionStatus.textContent = 'Connection failed';
            connectionStatus.className = 'connection-status error';
            
            // Show reconnect button again
            if (reconnectBtn) {
                reconnectBtn.style.display = 'inline-block';
            }
            
            showErrorToast('Failed to reconnect: ' + error.message);
        });
    }
    
    // Update UI based on current state
    function updateUIState() {
        if (isRecording) {
            // Recording active state
            startSessionBtn.innerHTML = '<i class="fas fa-stop btn-icon"></i> Stop Session';
            startSessionBtn.classList.add('warning');
            startSessionBtn.classList.remove('primary');
            
            saveSessionBtn.disabled = true;
            urlInput.disabled = true;
            
            recordingStatus.classList.add('recording');
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'connection-status active';
        } else {
            // Idle state
            startSessionBtn.innerHTML = '<i class="fas fa-play btn-icon"></i> Start Session';
            startSessionBtn.classList.add('primary');
            startSessionBtn.classList.remove('warning');
            
            // Save button remains disabled until session is stopped
            urlInput.disabled = false;
            
            recordingStatus.classList.remove('recording');
            connectionStatus.textContent = 'Not recording';
            connectionStatus.className = 'connection-status idle';
        }
    }
    
    // Reset UI after saving a session
    function resetAfterSave() {
        currentSession = null;
        saveSessionBtn.disabled = true;
        updateStatusText('Ready');
    }
    
    // Update the status text
    function updateStatusText(text) {
        if (statusText) {
            statusText.textContent = text;
            
            // Also announce to screen reader if available
            if (window.announceToScreenReader) {
                window.announceToScreenReader(text);
            }
        }
    }
    
    // Show toast notification for success
    function showSuccessToast(message) {
        showToast(message, 'success');
    }
    
    // Show toast notification for errors
    function showErrorToast(message) {
        showToast(message, 'error');
    }
    
    // Show a toast notification
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        // Add icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" aria-label="Dismiss notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Add close handler
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                toast.classList.add('toast-hiding');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            });
        }
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-hiding');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Generate a temporary session ID until server provides one
    function generateSessionId() {
        return 'temp-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    // Public API
    return {
        initialize: initialize,
        validateUrl: validateUrl,
        getCurrentSession: function() { return currentSession; },
        isRecording: function() { return isRecording; }
    };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    urlInputControl.initialize();
});

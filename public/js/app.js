// Web Automation Tool Frontend Script

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const urlInput = document.getElementById('urlInput');
  const startSessionBtn = document.getElementById('startSessionBtn');
  const saveSessionBtn = document.getElementById('saveSessionBtn');
  const sessionsList = document.getElementById('sessionsList');
  const replayLogs = document.getElementById('replayLogs');
  const stopReplayBtn = document.getElementById('stopReplayBtn');
  
  // State
  let currentRecordingProcess = null;
  let currentReplayProcess = null;
  let tempScriptPath = null;
  
  // Load sessions on startup
  loadSessions();
  
  // Event Listeners
  startSessionBtn.addEventListener('click', startRecordingSession);
  saveSessionBtn.addEventListener('click', saveSession);
  stopReplayBtn.addEventListener('click', stopReplay);
  
  /**
   * Start a new recording session
   */
  async function startRecordingSession() {
    const url = urlInput.value.trim();
    
    if (!url) {
      showToast('Please enter a URL to automate');
      return;
    }
    
    try {
      // Disable start button, enable save button
      startSessionBtn.disabled = true;
      saveSessionBtn.disabled = false;
      
      // Add a log entry
      addLogMessage('Starting new recording session...');
      addLogMessage(`Opening URL: ${url}`);
      
      // Make API call to start recording
      const response = await fetch('/api/recording/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start recording session');
      }
      
      const data = await response.json();
      
      if (data.success) {
        currentRecordingProcess = data.processId;
        tempScriptPath = data.outputPath;
        addLogMessage('Recording session started. Perform actions in the browser window that opened.');
        addLogMessage('Return here and click "Save Session" when you\'re done.');
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      addLogMessage(`Error: ${error.message}`, 'error');
      resetUI();
    }
  }
  
  /**
   * Save the current recording session
   */
  async function saveSession() {
    if (!tempScriptPath) {
      showToast('No active recording session to save');
      return;
    }
    
    try {
      // Generate a default session name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const sessionName = `Session_${timestamp}`;
      
      // Ask for a session name
      const name = prompt('Enter a name for this session:', sessionName);
      
      if (name === null) {
        // User cancelled
        return;
      }
      
      const url = urlInput.value.trim();
      
      // Make API call to save the session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          url,
          scriptPath: tempScriptPath
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save session');
      }
      
      const data = await response.json();
      addLogMessage(`Session saved: ${name}`, 'success');
      
      // Reload the sessions list
      loadSessions();
      
      // Reset the UI
      resetUI();
    } catch (error) {
      console.error('Error saving session:', error);
      addLogMessage(`Error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Load all saved sessions
   */
  async function loadSessions() {
    try {
      const response = await fetch('/api/sessions');
      
      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }
      
      const sessions = await response.json();
      renderSessionsList(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      sessionsList.innerHTML = '<div class="no-sessions">Error loading sessions</div>';
    }
  }
  
  /**
   * Render the sessions list
   */
  function renderSessionsList(sessions) {
    if (sessions.length === 0) {
      sessionsList.innerHTML = '<div class="no-sessions">No sessions available</div>';
      return;
    }
    
    sessionsList.innerHTML = '';
    
    sessions.forEach(session => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'session-item';
      
      // Format the date
      const date = new Date(session.createdAt);
      const formattedDate = date.toLocaleString();
      
      sessionItem.innerHTML = `
        <div class="session-info">
          <h3>${session.name}</h3>
          <div class="session-meta">Created: ${formattedDate}</div>
          <div class="session-meta">URL: ${session.url}</div>
        </div>
        <div class="session-actions">
          <button class="btn primary replay-btn" data-id="${session.id}">Replay</button>
          <button class="btn warning delete-btn" data-id="${session.id}">Delete</button>
        </div>
      `;
      
      sessionsList.appendChild(sessionItem);
    });
    
    // Add event listeners to the buttons
    document.querySelectorAll('.replay-btn').forEach(button => {
      button.addEventListener('click', () => replaySession(button.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', () => deleteSession(button.dataset.id));
    });
  }
  
  /**
   * Replay a session
   */
  async function replaySession(id) {
    try {
      // Clear previous logs
      replayLogs.innerHTML = '';
      
      // Enable stop button
      stopReplayBtn.disabled = false;
      
      // Make API call to start the replay
      const response = await fetch(`/api/sessions/${id}/replay`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to start replay');
      }
      
      const data = await response.json();
      
      if (data.success) {
        currentReplayProcess = data.processId;
        
        // Add initial logs
        data.logs.forEach(log => {
          addLogMessage(log);
        });
        
        // Start polling for logs
        if (currentReplayProcess) {
          pollReplayLogs(currentReplayProcess);
        }
      } else {
        throw new Error(data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error replaying session:', error);
      addLogMessage(`Error: ${error.message}`, 'error');
      stopReplayBtn.disabled = true;
    }
  }
  
  /**
   * Poll for replay logs
   */
  function pollReplayLogs(processId) {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/recording/logs/${processId}`);
        
        if (!response.ok) {
          throw new Error('Failed to get logs');
        }
        
        const data = await response.json();
        
        // Add new logs
        data.logs.forEach(log => {
          addLogMessage(log.message, log.type);
        });
        
        // Check if process is still running
        if (data.completed) {
          clearInterval(intervalId);
          currentReplayProcess = null;
          stopReplayBtn.disabled = true;
          
          // Add completion message
          addLogMessage('Replay completed', data.success ? 'success' : 'error');
        }
      } catch (error) {
        console.error('Error polling logs:', error);
        clearInterval(intervalId);
        addLogMessage(`Error: ${error.message}`, 'error');
        stopReplayBtn.disabled = true;
      }
    }, 1000); // Poll every second
  }
  
  /**
   * Stop the current replay
   */
  async function stopReplay() {
    if (!currentReplayProcess) {
      return;
    }
    
    try {
      const response = await fetch(`/api/recording/stop/${currentReplayProcess}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop replay');
      }
      
      addLogMessage('Replay stopped by user');
      currentReplayProcess = null;
      stopReplayBtn.disabled = true;
    } catch (error) {
      console.error('Error stopping replay:', error);
      addLogMessage(`Error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Delete a session
   */
  async function deleteSession(id) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete session');
      }
      
      showToast('Session deleted successfully');
      
      // Reload the sessions list
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      showToast(`Error: ${error.message}`);
    }
  }
  
  /**
   * Add a log message to the logs container
   */
  function addLogMessage(message, type = 'info') {
    const logItem = document.createElement('div');
    logItem.className = `log-message ${type ? `log-${type}` : ''}`;
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    logItem.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
    
    // Append to logs container
    replayLogs.appendChild(logItem);
    
    // Scroll to bottom
    replayLogs.scrollTop = replayLogs.scrollHeight;
  }
  
  /**
   * Reset the UI after a session
   */
  function resetUI() {
    startSessionBtn.disabled = false;
    saveSessionBtn.disabled = true;
    tempScriptPath = null;
    currentRecordingProcess = null;
    urlInput.value = '';
  }
  
  /**
   * Show a toast notification
   */
  function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Append to body
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
});

// Web Automation Tool Frontend Script

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const urlInput = document.getElementById('urlInput');
  const startSessionBtn = document.getElementById('startSessionBtn');
  const saveSessionBtn = document.getElementById('saveSessionBtn');
  const sessionsList = document.getElementById('sessionsList');
  const replayLogs = document.getElementById('replayLogs');
  const stopReplayBtn = document.getElementById('stopReplayBtn');
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  const recordingStatus = document.getElementById('recordingStatus');
  const statusText = document.getElementById('statusText');
  const reconnectBtn = document.getElementById('reconnectBtn');
  const connectionStatus = document.getElementById('connectionStatus');
  
  // Session Organization Elements
  const categoryFilter = document.getElementById('categoryFilter');
  const sessionSearch = document.getElementById('sessionSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSessionsBtn = document.getElementById('sortSessionsBtn');
  
  // Modal Elements
  const nameSessionModal = document.getElementById('nameSessionModal');
  const renameSessionModal = document.getElementById('renameSessionModal');
  const closeNameModal = document.getElementById('closeNameModal');
  const closeRenameModal = document.getElementById('closeRenameModal');
  const sessionName = document.getElementById('sessionName');
  const sessionCategory = document.getElementById('sessionCategory');
  const sessionDescription = document.getElementById('sessionDescription');
  const customCategory = document.getElementById('customCategory');
  const customCategoryContainer = document.getElementById('customCategoryContainer');
  const cancelNameSession = document.getElementById('cancelNameSession');
  const saveNameSession = document.getElementById('saveNameSession');
  
  // Rename Modal Elements
  const editSessionName = document.getElementById('editSessionName');
  const editSessionCategory = document.getElementById('editSessionCategory');
  const editSessionDescription = document.getElementById('editSessionDescription');
  const editCustomCategory = document.getElementById('editCustomCategory');
  const editCustomCategoryContainer = document.getElementById('editCustomCategoryContainer');
  const cancelRenameSession = document.getElementById('cancelRenameSession');
  const saveRenameSession = document.getElementById('saveRenameSession');
  const editSessionId = document.getElementById('editSessionId');
  
  // Toast container
  const toastContainer = document.getElementById('toastContainer');
  
  // State
  const state = {
    currentRecordingProcess: null,
    currentReplayProcess: null,
    tempScriptPath: null,
    isRecording: false,
    isReplaying: false,
    selectedSessionId: null,
    sortOrder: 'desc', // 'asc' or 'desc'
    sessions: [],
    currentFilter: 'all',
    searchTerm: '',
    recordingStatusInterval: null
  };
  
  /**
   * Load sessions from the server
   */
  async function loadSessions() {
    try {
      // Show loading state
      sessionsList.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading sessions...</div>';
      
      const response = await fetch('/api/sessions');
      
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.status}`);
      }
      
      const data = await response.json();
      state.sessions = data.sessions || [];
      
      // Update category filter options
      updateCategoryOptions();
      
      // Filter, sort, and render sessions
      filterSessions();
      
      // Announce for screen readers
      announceForScreenReaders(`${state.sessions.length} sessions loaded`);
    } catch (error) {
      console.error('Error loading sessions:', error);
      sessionsList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i> Failed to load sessions</div>';
      showToast(`Error loading sessions: ${error.message}`, 'error');
    }
  }
  
  /**
   * Update category filter options based on available session categories
   */
  function updateCategoryOptions() {
    // Get unique categories from sessions
    const categories = ['all', ...new Set(state.sessions.map(session => session.category || 'uncategorized').filter(Boolean))];
    
    // Current selected value
    const currentValue = categoryFilter.value;
    
    // Clear existing options
    categoryFilter.innerHTML = '';
    
    // Add options
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category === 'all' ? 'All Categories' : category;
      categoryFilter.appendChild(option);
    });
    
    // Restore selected value if it still exists
    if (categories.includes(currentValue)) {
      categoryFilter.value = currentValue;
    } else {
      categoryFilter.value = 'all';
      state.currentFilter = 'all';
    }
  }
  
  /**
   * Filter sessions based on category and search term
   */
  function filterSessions() {
    // Get current filter and search values from state
    const { sessions, currentFilter, searchTerm, sortOrder } = state;
    
    if (!sessions || sessions.length === 0) {
      sessionsList.innerHTML = '<div class="no-sessions">No sessions available</div>';
      return;
    }
    
    // Apply category filter first
    let filteredSessions = sessions.filter(session => {
      if (currentFilter === 'all') return true;
      return (session.category || 'uncategorized') === currentFilter;
    });
    
    // Then apply search if there is a search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredSessions = filteredSessions.filter(session => {
        const nameMatch = (session.name || '').toLowerCase().includes(term);
        const urlMatch = (session.url || '').toLowerCase().includes(term);
        const descriptionMatch = (session.description || '').toLowerCase().includes(term);
        return nameMatch || urlMatch || descriptionMatch;
      });
    }
    
    // Apply sorting
    filteredSessions.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      
      return sortOrder === 'asc' 
        ? dateA - dateB 
        : dateB - dateA;
    });
    
    // Render the filtered sessions
    renderSessionsList(filteredSessions);
    
    // Update the session count in UI
    const countText = filteredSessions.length === 1 
      ? '1 session found' 
      : `${filteredSessions.length} sessions found`;
      
    announceForScreenReaders(countText);
  }
  /**
   * Render the sessions list in the UI
   */
  function renderSessionsList(sessions) {
    if (!sessions || sessions.length === 0) {
      sessionsList.innerHTML = '<div class="no-sessions">No matching sessions</div>';
      return;
    }
    
    sessionsList.innerHTML = '';
    
    sessions.forEach(session => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'session-item';
      sessionItem.setAttribute('data-id', session.id);
      sessionItem.setAttribute('tabindex', '0');
      
      // Highlight if this is the currently selected session
      if (session.id === state.selectedSessionId) {
        sessionItem.classList.add('active');
      }
      
      const sessionHeader = document.createElement('div');
      sessionHeader.className = 'session-header';
      
      const sessionTitle = document.createElement('h3');
      sessionTitle.textContent = session.name || 'Unnamed Session';
      sessionHeader.appendChild(sessionTitle);
      
      // Add category badge if it exists
      if (session.category) {
        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'category-badge';
        categoryBadge.textContent = session.category;
        sessionHeader.appendChild(categoryBadge);
      }
      
      sessionItem.appendChild(sessionHeader);
      
      // Session URL
      const sessionUrl = document.createElement('div');
      sessionUrl.className = 'session-url';
      sessionUrl.textContent = session.url || 'No URL';
      sessionItem.appendChild(sessionUrl);
      
      // Session description if it exists
      if (session.description) {
        const sessionDesc = document.createElement('div');
        sessionDesc.className = 'session-description';
        sessionDesc.textContent = session.description;
        sessionItem.appendChild(sessionDesc);
      }
      
      // Session created date
      const sessionDate = document.createElement('div');
      sessionDate.className = 'session-date';
      sessionDate.textContent = session.createdAt 
        ? `Created: ${new Date(session.createdAt).toLocaleString()}` 
        : '';
      sessionItem.appendChild(sessionDate);
      
      // Action buttons
      const sessionActions = document.createElement('div');
      sessionActions.className = 'session-actions';
      
      // Replay button
      const replayButton = document.createElement('button');
      replayButton.className = 'btn btn-primary';
      replayButton.innerHTML = '<i class="fas fa-play"></i> Replay';
      replayButton.setAttribute('data-id', session.id);
      replayButton.setAttribute('aria-label', `Replay session ${session.name || 'Unnamed Session'}`);
      replayButton.addEventListener('click', () => replaySession(session.id));
      sessionActions.appendChild(replayButton);
      
      // Connection metrics button
      const metricsButton = document.createElement('button');
      metricsButton.className = 'connection-metrics-btn';
      metricsButton.innerHTML = '<i class="fas fa-chart-line"></i> Connection Metrics';
      metricsButton.setAttribute('data-id', session.id);
      metricsButton.setAttribute('aria-label', `View connection metrics for ${session.name || 'Unnamed Session'}`);
      metricsButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the replay action
        if (typeof openConnectionMetrics === 'function') {
          openConnectionMetrics(session.id);
        } else {
          console.error('openConnectionMetrics function not found');
        }
      });
      sessionActions.appendChild(metricsButton);
      
      // Edit button
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-secondary';
      editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
      editButton.setAttribute('data-id', session.id);
      editButton.setAttribute('aria-label', `Edit session ${session.name || 'Unnamed Session'}`);
      editButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the replay action
        openRenameModal(session);
      });
      sessionActions.appendChild(editButton);
      
      // Delete button
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-danger';
      deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete';
      deleteButton.setAttribute('data-id', session.id);
      deleteButton.setAttribute('aria-label', `Delete session ${session.name || 'Unnamed Session'}`);
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the replay action
        deleteSession(session.id);
      });
      sessionActions.appendChild(deleteButton);
      
      sessionItem.appendChild(sessionActions);
      
      // Add keyboard event handling for accessibility
      sessionItem.addEventListener('keydown', e => {
        // Enter or Space to replay the session
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          replaySession(session.id);
        }
      });
      
      sessionsList.appendChild(sessionItem);
    });
  }
  
  /**
   * Show a toast notification
   * @param {string} message - The message to show
   * @param {string} type - The type of notification: 'success', 'error', 'warning', or 'info'
   * @param {number} duration - Duration in milliseconds (default: 5000, 0 for persistent)
   */
  function showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    
    // Icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'error') icon = 'times-circle';
    
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
      </div>
      <button class="close-toast" aria-label="Close notification">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Add close button functionality
    const closeBtn = toast.querySelector('.close-toast');
    closeBtn.addEventListener('click', () => {
      toastContainer.removeChild(toast);
    });
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Auto-dismiss after duration (except for errors which require manual dismissal)
    if (duration > 0 && type !== 'error') {
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, duration);
    }
    
    // Announce to screen readers
    announceForScreenReaders(message);
  }
  
  /**
   * Announce a message to screen readers using the aria-live region
   */
  function announceForScreenReaders(message) {
    const announcer = document.getElementById('screenReaderAnnouncer');
    if (announcer) {
      announcer.textContent = message;
    }
  }
  
  /**
   * Start a recording session
   */
  async function startRecording() {
    if (state.isRecording) {
      showToast('A recording is already in progress', 'warning');
      return;
    }
    
    const url = urlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL to record', 'warning');
      urlInput.focus();
      return;
    }
    
    try {
      // Show loading state first
      startSessionBtn.disabled = true;
      statusText.textContent = 'Starting recording...';
      recordingStatus.classList.add('loading');
      
      // Make API request to start recording
      const response = await fetch('/api/recording/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start recording: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to start recording');
      }
      
      // Store process ID for later reference
      state.currentRecordingProcess = data.processId;
      state.tempScriptPath = data.outputPath; // Changed from tempScriptPath to outputPath as returned by API
      
      // Verify recording status from the status API before updating UI
      const statusResponse = await fetch(`/api/recording/status/${data.processId}`);
      
      if (!statusResponse.ok) {
        throw new Error(`Failed to verify recording status: ${statusResponse.status}`);
      }
      
      const statusData = await statusResponse.json();
      
      // Only update UI to recording state if status API confirms recording is active
      if (statusData.status === 'recording' && statusData.isRunning) {
        state.isRecording = true;
        saveSessionBtn.disabled = false;
        recordingStatus.classList.remove('loading');
        recordingStatus.classList.add('active'); // Using the active class from CSS
        statusText.textContent = 'Recording...';
        
        showToast('Recording started successfully', 'success');
        announceForScreenReaders('Recording started. Navigate the website to record your actions.');
        
        // Start polling for recording status to keep UI in sync with backend
        startRecordingStatusPolling(data.processId);
        
        // Save recording process ID to localStorage to recover on page refresh
        localStorage.setItem('currentRecordingProcess', data.processId);
      } else {
        throw new Error('Recording process started but is not running. Try again.');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Reset UI state
      state.isRecording = false;
      startSessionBtn.disabled = false;
      saveSessionBtn.disabled = true;
      recordingStatus.classList.remove('loading');
      recordingStatus.classList.remove('active');
      statusText.textContent = 'Ready';
      
      showToast(`Failed to start recording: ${error.message}`, 'error');
    }
  }

  // Connection and status management variables
  let currentRecordingPid = null;
  let isRecording = false;
  let recordingStatusPollingInterval = null;
  let errorCount = 0;
  const MAX_ERROR_COUNT = 5; // Number of consecutive errors before showing warning
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;
  const CONNECTION_CHECK_DELAY = 2000; // 2 seconds between status checks
  let lastKnownStatus = null;
  let isReconnecting = false;

  /**
   * Record a connection event on the backend
   * @param {string} processId - The process ID
   * @param {'connected'|'disconnected'|'warning'|'reconnecting'|'reconnected'|'failed'} eventType - The event type
   * @param {string} details - Optional details about the event
   * @param {number} duration - Optional duration in milliseconds
   * @returns {Promise<Object>} - The response from the server
   */
  async function recordConnectionEvent(processId, eventType, details = '', duration = null) {
    try {
      const response = await fetch(`/api/recording/connection-event/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType,
          details,
          duration
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to record connection event:', error);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error recording connection event:', error);
      return null;
    }
  }
  
  /**
   * Recover a session by process ID
   * @param {string} processId - The process ID to recover
   * @returns {Promise<Object>} - The recovered session or null
   */
  async function recoverSession(processId) {
    try {
      const response = await fetch(`/api/recording/recover/${processId}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to recover session:', error);
        return null;
      }
      
      const data = await response.json();
      return data.session;
    } catch (error) {
      console.error('Error recovering session:', error);
      return null;
    }
  }
  
  /**
   * Update connection status UI based on status
   * @param {string} status - Status type: 'connected', 'disconnected', 'warning', 'reconnecting', or 'idle'
   * @param {string} customMessage - Optional custom message to display
   */
  function updateConnectionStatus(status, customMessage = null) {
    const connectionStatusEl = document.getElementById('connectionStatus');
    const reconnectBtn = document.getElementById('reconnectBtn');
    connectionStatusEl.className = 'connection-status';
    lastKnownStatus = status;
    
    switch (status) {
      case 'connected':
        connectionStatusEl.classList.add('connected');
        connectionStatusEl.textContent = 'Connected';
        reconnectBtn.style.display = 'none';
        break;
      case 'disconnected':
        connectionStatusEl.classList.add('disconnected');
        connectionStatusEl.textContent = 'Disconnected';
        reconnectBtn.style.display = 'inline-flex';
        break;
      case 'warning':
        connectionStatusEl.classList.add('warning');
        connectionStatusEl.textContent = customMessage || 'Connection issues';
        reconnectBtn.style.display = 'inline-flex';
        break;
      case 'reconnecting':
        connectionStatusEl.classList.add('warning');
        connectionStatusEl.textContent = 'Reconnecting...';
        reconnectBtn.style.display = 'none';
        break;
      default: // idle
        connectionStatusEl.classList.add('idle');
        connectionStatusEl.textContent = 'Not recording';
        reconnectBtn.style.display = 'none';
        break;
    }
    
    // Log the status change
    console.log(`Connection status changed to: ${status}${customMessage ? ' - ' + customMessage : ''}`);
    
    // Announce status change for screen readers
    if (window.announceToScreenReader) {
      window.announceToScreenReader(`Connection status: ${connectionStatusEl.textContent}`);
    }
  }
  
  /**
   * Start polling for recording status to keep UI in sync
   * @param {string} pid - The process ID to monitor
   */
  async function startRecordingStatusPolling(pid) {
    if (!pid) return;
    
    // Save the current recording PID to localStorage for session recovery
    localStorage.setItem('currentRecordingPid', pid);
    currentRecordingPid = pid;
    
    clearInterval(recordingStatusPollingInterval);
    errorCount = 0;
    reconnectAttempts = 0;
    isReconnecting = false;
    
    // Initial status check
    try {
      const status = await checkRecordingStatus(pid);
      logMessage('info', `Recording session started with process ID: ${pid}`);
      updateConnectionStatus('connected');
      
      // Start polling for status updates
      recordingStatusPollingInterval = setInterval(async () => {
        if (isReconnecting) return; // Skip polling if already reconnecting
        
        try {
          const status = await checkRecordingStatus(pid);
          
          // Process crash detection - if status was recording but now stopped
          if (lastKnownStatus === 'recording' && status.status === 'stopped') {
            handleProcessCrash(pid);
            return;
          }
          
          // If we get here, reset error count
          if (errorCount > 0) {
            showToast('Connection restored', 'success');
            logMessage('success', 'Connection to recording process restored');
          }
          errorCount = 0;
        } catch (error) {
          errorCount++;
          console.error(`Status check failed (${errorCount}/${MAX_ERROR_COUNT}):`, error);
          
          if (errorCount === 1) {
            // First error, show a warning
            showToast('Connection issue detected', 'warning');
          } else if (errorCount === 3) {
            // After a few errors, update status to warning
            updateConnectionStatus('warning', 'Connection unstable');
          } else if (errorCount >= MAX_ERROR_COUNT) {
            // After MAX_ERROR_COUNT errors, try to reconnect
            await tryReconnectToRecording(pid);
          }
        }
      }, CONNECTION_CHECK_DELAY);
      
      return status;
    } catch (error) {
      console.error('Initial status check failed:', error);
      updateConnectionStatus('disconnected');
      showToast('Failed to connect to recording session.', 'error');
      logMessage('error', `Failed to connect to recording session: ${error.message || error}`);
      return null;
    }
  }
  
  /**
   * Check the status of a recording or replay process
   * @param {string} pid - The process ID to check
   * @returns {Promise<object>} - The status response data
   */
  async function checkRecordingStatus(pid) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      
      const response = await fetch(`/api/recording/status/${pid}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get recording status');
      }
      
      const statusText = document.getElementById('statusText');
      const recordingStatusIndicator = document.getElementById('recordingStatus');
      
      if (data.status === 'recording' && data.isRunning) {
        statusText.textContent = 'Recording';
        recordingStatusIndicator.classList.add('active');
        isRecording = true;
        updateConnectionStatus('connected');
      } else if (data.status === 'replaying' && data.isRunning) {
        statusText.textContent = 'Replaying';
        recordingStatusIndicator.classList.add('active');
        document.getElementById('stopReplayBtn').disabled = false;
        updateConnectionStatus('connected');
      } else {
        statusText.textContent = 'Ready';
        recordingStatusIndicator.classList.remove('active');
        isRecording = false;
        updateConnectionStatus('idle');
        clearInterval(recordingStatusPollingInterval);
        recordingStatusPollingInterval = null;
        localStorage.removeItem('currentRecordingPid');
        
        // If the process stopped unexpectedly and wasn't a user-initiated stop
        if ((data.status === 'stopped' || data.status === 'replay_stopped') && 
            currentRecordingPid === pid) {
          currentRecordingPid = null;
          showToast('Recording session ended unexpectedly', 'warning');
          logMessage('warning', `Process ${pid} ended with status: ${data.status}`);
        }
      }
      
      return data;
    } catch (error) {
      // Handle AbortController timeout
      if (error.name === 'AbortError') {
        throw new Error('Connection timed out');
      }
      
      throw error;
    }
  }

  /**
   * Attempt to reconnect to a recording session
   * @param {string} pid - The process ID to reconnect to
   * @returns {Promise<boolean>} - Whether reconnection was successful
   */
  async function tryReconnectToRecording(pid) {
    if (isReconnecting) return false;
    
    try {
      isReconnecting = true;
      reconnectAttempts++;
      
      updateConnectionStatus('reconnecting');
      showToast(`Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, 'info');
      logMessage('info', `Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      
      // Record the reconnection attempt event
      await recordConnectionEvent(
        pid,
        'reconnecting',
        `Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`
      );
      
      // Try to recover the session first
      const recoveredSession = await recoverSession(pid);
      if (recoveredSession) {
        console.log('Session recovered:', recoveredSession);
      }
      
      // Try with a longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
      
      const response = await fetch(`/api/recording/status/${pid}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.isRunning) {
          // Record successful reconnection
          const reconnectDuration = reconnectAttempts * 10000; // Approximate duration based on timeouts
          await recordConnectionEvent(
            pid,
            'reconnected',
            'Reconnection successful',
            reconnectDuration
          );
          
          updateConnectionStatus('connected');
          showToast('Reconnection successful!', 'success');
          logMessage('success', 'Reconnected to recording session');
          errorCount = 0;
          reconnectAttempts = 0;
          isReconnecting = false;
          return true;
        } else if (data.success && !data.isRunning) {
          // Process exists but not running
          await recordConnectionEvent(
            pid,
            'failed',
            'Process exists but is not running'
          );
          
          handleDeadProcess(pid);
          isReconnecting = false;
          return false;
        }
      }
      
      // Max reconnect attempts reached
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        await recordConnectionEvent(
          pid,
          'failed',
          `Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`
        );
        
        handleMaxReconnectFailed(pid);
        isReconnecting = false;
        return false;
      }
      
      // Still have more attempts - keep showing reconnecting state
      showToast('Reconnection failed. Trying again shortly...', 'warning');
      isReconnecting = false;
      return false;
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      
      // Max reconnect attempts reached
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        await recordConnectionEvent(
          pid,
          'failed',
          `Maximum reconnection attempts reached with error: ${error.message || 'Unknown error'}`
        );
        
        handleMaxReconnectFailed(pid);
      } else {
        showToast(`Reconnection attempt failed: ${error.message}`, 'error');
      }
      
      isReconnecting = false;
      return false;
    }
  }

  /**
   * Handle a detected process crash
   * @param {string} pid - Process ID that crashed
   */
  async function handleProcessCrash(pid) {
    logMessage('error', `Recording process ${pid} crashed or stopped unexpectedly`);
    updateConnectionStatus('disconnected', 'Process crashed');
    showToast('Recording process crashed or stopped unexpectedly', 'error');
    
    // Record the connection event
    await recordConnectionEvent(
      pid, 
      'failed', 
      'Process crashed or stopped unexpectedly'
    );
    
    // Clean up on the server
    try {
      await fetch(`/api/recording/cleanup/${pid}`, { method: 'POST' });
      logMessage('info', `Cleaned up crashed process ${pid}`);
    } catch (error) {
      console.error('Failed to clean up crashed process:', error);
    }
    
    clearInterval(recordingStatusPollingInterval);
  }

  /**
   * Handle a dead process (exists in backend but not running)
   * @param {string} pid - The process ID to handle
   */
  async function handleDeadProcess(pid) {
    updateConnectionStatus('disconnected');
    showToast('Recording process is no longer running', 'error');
    logMessage('error', `Process ${pid} is tracked but not running. Cleaning up...`);
    
    // Clean up backend process tracking
    try {
      await fetch(`/api/recording/cleanup/${pid}`, { method: 'POST' });
      logMessage('info', `Cleanup request sent for process ${pid}`);
    } catch (error) {
      console.error('Failed to send cleanup request:', error);
    }
    
    // Clean up UI state
    resetUIState();
  }

  /**
   * Handle max reconnect attempts failed
   * @param {string} pid - The process ID that failed reconnection
   */
  async function handleMaxReconnectFailed(pid) {
    updateConnectionStatus('disconnected');
    showToast('Could not reconnect after multiple attempts. Session ended.', 'error');
    logMessage('error', `Failed to reconnect to process ${pid} after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    
    // Clean up backend process tracking
    try {
      await fetch(`/api/recording/cleanup/${pid}`, { method: 'POST' });
      logMessage('info', `Cleanup request sent for process ${pid}`);
    } catch (error) {
      console.error('Failed to send cleanup request:', error);
    }
    
    // Clean up UI state
    resetUIState();
  }

  /**
   * Reset UI state after connection issues
   */
  function resetUIState() {
    const statusText = document.getElementById('statusText');
    const recordingStatusIndicator = document.getElementById('recordingStatus');
    
    statusText.textContent = 'Ready';
    recordingStatusIndicator.classList.remove('active');
    isRecording = false;
    currentRecordingPid = null;
    clearInterval(recordingStatusPollingInterval);
    recordingStatusPollingInterval = null;
    localStorage.removeItem('currentRecordingPid');
    
    // Re-enable start button
    document.getElementById('startSessionBtn').disabled = false;
    document.getElementById('saveSessionBtn').disabled = true;
    document.getElementById('stopReplayBtn').disabled = true;
  }
  
  /**
   * Add a log message to the logs container
   * @param {string} type - The type of log: 'info', 'error', 'warning', 'success'
   * @param {string} message - The log message to display
   */
  function logMessage(type, message) {
    const logItem = document.createElement('div');
    logItem.className = `log-message log-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    logItem.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
    
    replayLogs.appendChild(logItem);
    replayLogs.scrollTop = replayLogs.scrollHeight;
  }

  window.addEventListener('online', async () => {
  console.log('Network connection restored');
  showToast('Network connection restored', 'success');
  
  // If we have a saved recording process, record the event and try to reconnect
  const savedProcessId = localStorage.getItem('currentRecordingProcess');
  if (savedProcessId) {
    // Record the network restored event
    await recordConnectionEvent(
      savedProcessId,
      'reconnecting',
      'Network connection restored'
    );
    
    // Try to reconnect if we're not already polling
    if (!state.recordingStatusInterval) {
      tryReconnectToRecording(savedProcessId);
    }
  }
});

window.addEventListener('offline', async () => {
  console.log('Network connection lost');
  showToast('Network connection lost', 'error');
  
  // Update connection status
  updateConnectionStatus('disconnected', 'Network offline');
  
  // Record the disconnection event if we have an active recording
  const savedProcessId = localStorage.getItem('currentRecordingProcess');
  if (savedProcessId) {
    await recordConnectionEvent(
      savedProcessId,
      'disconnected',
      'Network connection lost'
    );
  }
  
  // If we were polling, stop it but don't remove the process ID from localStorage
  if (state.recordingStatusInterval) {
    clearInterval(state.recordingStatusInterval);
    state.recordingStatusInterval = null;
  }
});

// Setup reconnect button
reconnectBtn.addEventListener('click', () => {
  const savedProcessId = localStorage.getItem('currentRecordingProcess');
  if (savedProcessId) {
    showToast('Attempting to reconnect to recording session...', 'info');
    tryReconnectToRecording(savedProcessId);
  } else {
    showToast('No active recording session found', 'warning');
    reconnectBtn.style.display = 'none';
  }
});

window.addEventListener('load', async () => {
    // Set initial button states
    saveSessionBtn.disabled = true;
    stopReplayBtn.disabled = true;
    
    // Set initial sort button text
    sortSessionsBtn.innerHTML = '<i class="fas fa-sort-down"></i> Newest First';
    
    // Check if there's an active recording session from localStorage
    const savedRecordingProcess = localStorage.getItem('currentRecordingProcess');
    if (savedRecordingProcess) {
      try {
        // Update UI to show we're checking connection
        connectionStatus.textContent = 'Checking connection...';
        connectionStatus.className = 'connection-status idle';
        
        // First attempt to recover the session using our backend session recovery
        const recoveredSession = await recoverSession(savedRecordingProcess);
        if (recoveredSession) {
          logMessage('info', `Recovered session: ${recoveredSession.name} after page reload`);
          
          // Record the reconnection event
          await recordConnectionEvent(
            savedRecordingProcess,
            'reconnected',
            'Session recovered after page reload/browser restart'
          );
        }
        
        // Use a longer timeout for initial connection attempt
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
        
        const timestamp = Date.now();
        const response = await fetch(`/api/recording/status/${savedRecordingProcess}?t=${timestamp}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.status === 'recording' && data.isRunning) {
            // Recording is still active, restore the UI state
            state.isRecording = true;
            state.currentRecordingProcess = savedRecordingProcess;
            
            // Update UI
            startSessionBtn.disabled = true;
            saveSessionBtn.disabled = false;
            statusText.textContent = 'Recording...';
            recordingStatus.classList.add('active');
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'connection-status connected';
            reconnectBtn.style.display = 'none';
            
            // Start the polling for status updates
            startRecordingStatusPolling(savedRecordingProcess);
            
            showToast('Reconnected to active recording session', 'success');
            announceForScreenReaders('Recording session is still active');
          } else {
            // Recording is not active anymore, clear saved data
            localStorage.removeItem('currentRecordingProcess');
            connectionStatus.textContent = 'Not recording';
            connectionStatus.className = 'connection-status idle';
            reconnectBtn.style.display = 'none';
            
            // Record the disconnection event if we have a recovered session
            if (recoveredSession) {
              await recordConnectionEvent(
                savedRecordingProcess,
                'disconnected',
                'Recording process no longer active'
              );
            }
            
            showToast('Previous recording session is no longer active', 'info');
          }
        } else {
          // Status endpoint error, but don't clear saved data immediately
          // Show reconnect button instead
          connectionStatus.textContent = 'Connection failed';
          connectionStatus.className = 'connection-status disconnected';
          reconnectBtn.style.display = 'inline-block';
          
          // Record the warning event if we have a recovered session
          if (recoveredSession) {
            await recordConnectionEvent(
              savedRecordingProcess,
              'warning',
              'Could not connect to recording process, but session was recovered'
            );
          }
          
          showToast('Could not connect to previous recording session', 'warning');
        }
      } catch (error) {
        console.error('Error checking saved recording process:', error);
        // Don't remove the saved process ID to allow for reconnection attempts
        connectionStatus.textContent = 'Connection failed';
        connectionStatus.className = 'connection-status disconnected';
        reconnectBtn.style.display = 'inline-block';
        showToast('Could not verify recording status', 'error');
      }
    } else {
      // No saved recording process
      connectionStatus.textContent = 'Not recording';
      connectionStatus.className = 'connection-status idle';
      reconnectBtn.style.display = 'none';
    }
    
    // Load sessions from the server
    loadSessions();
  });
});

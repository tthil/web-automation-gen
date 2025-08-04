/**
 * Connection Metrics Visualization Module
 * Provides functionality to visualize session connection events and metrics.
 */

// DOM Elements
const connectionMetricsModal = document.getElementById('connectionMetricsModal');
const closeConnectionMetricsModal = document.getElementById('closeConnectionMetricsModal');
const closeConnectionMetricsBtn = document.getElementById('closeConnectionMetricsBtn');
const connectionEventTimeline = document.getElementById('connectionEventTimeline');
const disconnectionCountElement = document.getElementById('disconnectionCount');
const reconnectionCountElement = document.getElementById('reconnectionCount');
const totalDowntimeElement = document.getElementById('totalDowntime');
const connectionStatusElement = document.getElementById('connectionStatus');
const connectionQualityElement = document.getElementById('connectionQuality');

// Current session being viewed
let currentSessionId = null;

// Initialize event listeners
function initConnectionMetricsListeners() {
    closeConnectionMetricsModal.addEventListener('click', closeMetricsModal);
    closeConnectionMetricsBtn.addEventListener('click', closeMetricsModal);
    
    // Close on click outside
    window.addEventListener('click', (event) => {
        if (event.target === connectionMetricsModal) {
            closeMetricsModal();
        }
    });
}

/**
 * Open the connection metrics modal for a session
 * @param {string} sessionId - ID of the session to view metrics for
 */
async function openConnectionMetrics(sessionId) {
    try {
        currentSessionId = sessionId;
        
        // Fetch session data from server
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch session data');
        }
        
        const session = await response.json();
        
        // Reset the UI
        connectionEventTimeline.innerHTML = '';
        
        if (session) {
            // Update modal title with session name
            document.getElementById('connectionMetricsTitle').textContent = 
                `Connection Metrics: ${session.name || 'Unnamed Session'}`;
            
            // Calculate and display metrics
            displayConnectionMetrics(session);
            
            // Render event timeline
            renderEventTimeline(session);
        } else {
            // Show error message if session not found
            connectionEventTimeline.innerHTML = '<div class="event-placeholder">Session data not available</div>';
            resetMetricsUI();
        }
        
        // Show the modal
        connectionMetricsModal.style.display = 'block';
        connectionMetricsModal.setAttribute('aria-hidden', 'false');
        
        // Announce for screen readers
        if (typeof window.announceToScreenReader === 'function') {
            window.announceToScreenReader('Connection metrics dialog opened');
        }
    } catch (error) {
        console.error('Error opening connection metrics:', error);
        showToast('Failed to load connection metrics', 'error');
    }
}

/**
 * Close the connection metrics modal
 */
function closeMetricsModal() {
    connectionMetricsModal.style.display = 'none';
    connectionMetricsModal.setAttribute('aria-hidden', 'true');
    currentSessionId = null;
    
    // Announce for screen readers
    if (typeof window.announceToScreenReader === 'function') {
        window.announceToScreenReader('Connection metrics dialog closed');
    }
}

/**
 * Reset metrics UI elements to default values
 */
function resetMetricsUI() {
    disconnectionCountElement.textContent = '0';
    reconnectionCountElement.textContent = '0';
    totalDowntimeElement.textContent = '0s';
    connectionStatusElement.textContent = 'Unknown';
    connectionStatusElement.className = '';
}

/**
 * Calculate and display connection metrics for a session
 * @param {Object} session - Session data object
 */
function displayConnectionMetrics(session) {
    if (!session || !session.connectionEvents || !Array.isArray(session.connectionEvents)) {
        resetMetricsUI();
        return;
    }
    
    const events = session.connectionEvents;
    updateMetricsUI(events, session);
}

/**
 * Update UI with calculated metrics
 * @param {Array} events - Connection events
 * @param {Object} session - Session data
 */
function updateMetricsUI(events, session) {
    // Default values
    let disconnectionCount = 0;
    let reconnectionCount = 0;
    let totalDowntimeMs = 0;
    let sessionStatus = 'Unknown';
    let statusClass = '';
    
    // Count events by type
    events.forEach(event => {
        if (event.type === 'disconnected') {
            disconnectionCount++;
        } else if (event.type === 'reconnected') {
            reconnectionCount++;
            // Add duration if available
            if (event.duration) {
                totalDowntimeMs += parseInt(event.duration, 10);
            }
        }
    });
    
    // Format downtime
    let formattedDowntime;
    if (totalDowntimeMs < 1000) {
        formattedDowntime = `${totalDowntimeMs}ms`;
    } else if (totalDowntimeMs < 60000) {
        formattedDowntime = `${(totalDowntimeMs / 1000).toFixed(1)}s`;
    } else {
        formattedDowntime = `${Math.floor(totalDowntimeMs / 60000)}m ${Math.floor((totalDowntimeMs % 60000) / 1000)}s`;
    }
    
    // Calculate connection quality score
    const quality = window.connectionCharts.calculateConnectionQuality(events);
    
    // Determine session status
    if (session.completed) {
        sessionStatus = 'Completed';
        statusClass = 'completed';
    } else if (session.active) {
        sessionStatus = 'Active';
        statusClass = 'active';
    } else if (events.length > 0) {
        // Get the most recent event to determine current status
        const lastEvent = events[events.length - 1];
        if (lastEvent.type === 'disconnected' || lastEvent.type === 'failed') {
            sessionStatus = 'Disconnected';
            statusClass = 'failed';
        } else if (lastEvent.type === 'reconnected' || lastEvent.type === 'connected') {
            sessionStatus = 'Connected';
            statusClass = 'completed';
        } else if (lastEvent.type === 'reconnecting') {
            sessionStatus = 'Reconnecting';
            statusClass = 'active';
        }
    }
    
    // Update UI elements
    disconnectionCountElement.textContent = disconnectionCount;
    reconnectionCountElement.textContent = reconnectionCount;
    totalDowntimeElement.textContent = formattedDowntime;
    
    connectionQualityElement.textContent = `${quality.score}/100 (${quality.label})`;
    connectionQualityElement.style.color = quality.color;
    
    connectionStatusElement.textContent = sessionStatus;
    connectionStatusElement.className = `metric-value ${statusClass}`;
    
    // Create connection quality chart
    window.connectionCharts.createConnectionQualityChart(events);
    
    // Render event timeline
    // Note: We don't render here since it's handled in displayConnectionMetrics
}

/**
 * Render the timeline of connection events
 * @param {Object} session - Session data object
 */
function renderEventTimeline(session) {
    if (!session || !session.connectionEvents || !Array.isArray(session.connectionEvents) || session.connectionEvents.length === 0) {
        connectionEventTimeline.innerHTML = '<div class="event-placeholder">No connection events recorded for this session</div>';
        return;
    }
    
    // Clear existing content
    connectionEventTimeline.innerHTML = '';
    
    // Sort events by timestamp (newest first)
    const events = [...session.connectionEvents].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Create and append event elements
    events.forEach(event => {
        const eventElement = createEventElement(event);
        connectionEventTimeline.appendChild(eventElement);
    });
}

/**
 * Create a DOM element for a connection event
 * @param {Object} event - Connection event object
 * @returns {HTMLElement} - The created event element
 */
function createEventElement(event) {
    const eventElement = document.createElement('div');
    eventElement.className = `connection-event ${event.type}`;
    
    // Format the timestamp
    const timestamp = new Date(event.timestamp);
    const formattedTime = timestamp.toLocaleString();
    
    // Create the event content
    const content = document.createElement('div');
    content.className = 'event-content';
    
    // Event header with type and time
    const header = document.createElement('div');
    header.className = 'event-header';
    
    const type = document.createElement('span');
    type.className = 'event-type';
    type.textContent = event.type;
    
    const time = document.createElement('span');
    time.className = 'event-time';
    time.textContent = formattedTime;
    
    header.appendChild(type);
    header.appendChild(time);
    content.appendChild(header);
    
    // Event details
    if (event.details) {
        const details = document.createElement('div');
        details.className = 'event-details';
        details.textContent = event.details;
        content.appendChild(details);
    }
    
    // Event duration (if applicable)
    if (event.duration) {
        const duration = document.createElement('div');
        duration.className = 'event-duration';
        
        // Format duration display
        const durationMs = parseInt(event.duration, 10);
        let durationText = '';
        
        if (durationMs < 1000) {
            durationText = `Duration: ${durationMs}ms`;
        } else if (durationMs < 60000) {
            durationText = `Duration: ${Math.round(durationMs / 100) / 10}s`;
        } else {
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.round((durationMs % 60000) / 1000);
            durationText = `Duration: ${minutes}m ${seconds}s`;
        }
        
        duration.textContent = durationText;
        content.appendChild(duration);
    }
    
    eventElement.appendChild(content);
    return eventElement;
}

// Initialize module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initConnectionMetricsListeners();
});

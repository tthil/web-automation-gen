/**
 * Dashboard Integration Module
 * Integrates connection metrics into the main dashboard
 */

// Dashboard connection metrics container
let dashboardMetricsContainer = null;
let sessionMetricsCache = {}; // Cache for session metrics data

/**
 * Initialize the dashboard integration for connection metrics
 */
function initializeDashboardMetrics() {
    // Create dashboard metrics container if it doesn't exist
    if (!document.getElementById('dashboardMetricsContainer')) {
        createDashboardMetricsContainer();
    }
    
    // Register event listeners
    document.addEventListener('sessionCreated', handleSessionUpdate);
    document.addEventListener('sessionUpdated', handleSessionUpdate);
    document.addEventListener('connectionStatusChanged', updateDashboardStatus);
}

/**
 * Create the dashboard metrics container
 */
function createDashboardMetricsContainer() {
    // Create container
    dashboardMetricsContainer = document.createElement('div');
    dashboardMetricsContainer.id = 'dashboardMetricsContainer';
    dashboardMetricsContainer.className = 'dashboard-metrics-container';
    dashboardMetricsContainer.setAttribute('aria-live', 'polite');
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Connection Health';
    title.className = 'dashboard-metrics-title';
    dashboardMetricsContainer.appendChild(title);
    
    // Create metrics panel
    const metricsPanel = document.createElement('div');
    metricsPanel.className = 'dashboard-metrics-panel';
    
    // Add metrics items
    const currentStatus = createMetricItem('connectionDashboardStatus', 'Current Status', '-');
    const qualityScore = createMetricItem('connectionDashboardQuality', 'Quality Score', '-');
    const activeAlerts = createMetricItem('connectionDashboardAlerts', 'Active Alerts', '0');
    
    metricsPanel.appendChild(currentStatus);
    metricsPanel.appendChild(qualityScore);
    metricsPanel.appendChild(activeAlerts);
    
    dashboardMetricsContainer.appendChild(metricsPanel);
    
    // Create quick filters
    const filters = document.createElement('div');
    filters.className = 'dashboard-filters';
    filters.innerHTML = `
        <span>Quick filters:</span>
        <button class="filter-btn" data-filter="connected">Connected</button>
        <button class="filter-btn" data-filter="disconnected">Disconnected</button>
        <button class="filter-btn" data-filter="warning">Warnings</button>
        <button class="filter-btn" data-filter="all">All</button>
    `;
    
    // Add filter event listeners
    filters.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            applyEventFilter(filter);
        });
    });
    
    dashboardMetricsContainer.appendChild(filters);
    
    // Add to the dashboard
    const dashboardContainer = document.querySelector('.dashboard-container') || 
                               document.querySelector('#mainContent') || 
                               document.querySelector('main');
                               
    if (dashboardContainer) {
        dashboardContainer.insertBefore(dashboardMetricsContainer, dashboardContainer.firstChild);
    }
}

/**
 * Create a metric item for the dashboard
 * @param {string} id - Element ID
 * @param {string} label - Metric label
 * @param {string} value - Initial value
 * @returns {HTMLElement} - The metric item element
 */
function createMetricItem(id, label, value) {
    const item = document.createElement('div');
    item.className = 'dashboard-metric-item';
    
    const labelElement = document.createElement('div');
    labelElement.className = 'metric-item-label';
    labelElement.textContent = label;
    
    const valueElement = document.createElement('div');
    valueElement.className = 'metric-item-value';
    valueElement.id = id;
    valueElement.textContent = value;
    
    item.appendChild(labelElement);
    item.appendChild(valueElement);
    
    return item;
}

/**
 * Handle session update events
 * @param {Event} event - Custom event with session data
 */
async function handleSessionUpdate(event) {
    // Only fetch metrics for active session
    if (!event.detail || !event.detail.sessionId) return;
    
    try {
        const sessionId = event.detail.sessionId;
        
        // Fetch session data if not in cache
        if (!sessionMetricsCache[sessionId]) {
            const response = await fetch(`/api/sessions/${sessionId}`);
            if (!response.ok) throw new Error('Failed to fetch session data');
            
            const session = await response.json();
            if (session && session.connectionEvents) {
                sessionMetricsCache[sessionId] = session;
                updateDashboardMetrics(session);
            }
        }
    } catch (error) {
        console.error('Error updating dashboard metrics:', error);
    }
}

/**
 * Update dashboard metrics with session data
 * @param {Object} session - Session data
 */
function updateDashboardMetrics(session) {
    if (!session || !session.connectionEvents || !dashboardMetricsContainer) return;
    
    // Calculate connection quality
    const quality = window.connectionCharts.calculateConnectionQuality(session.connectionEvents);
    
    // Update quality score
    const qualityElement = document.getElementById('connectionDashboardQuality');
    if (qualityElement) {
        qualityElement.textContent = `${quality.score}/100`;
        qualityElement.style.color = quality.color;
    }
    
    // Count alerts (warnings, disconnections, failures)
    let alertCount = 0;
    session.connectionEvents.forEach(event => {
        if (['disconnected', 'warning', 'failed'].includes(event.type)) {
            alertCount++;
        }
    });
    
    // Update alerts count
    const alertsElement = document.getElementById('connectionDashboardAlerts');
    if (alertsElement) {
        alertsElement.textContent = alertCount.toString();
        if (alertCount > 0) {
            alertsElement.classList.add('has-alerts');
        } else {
            alertsElement.classList.remove('has-alerts');
        }
    }
}

/**
 * Update dashboard connection status
 * @param {Event} event - Connection status change event
 */
function updateDashboardStatus(event) {
    if (!event.detail || !dashboardMetricsContainer) return;
    
    const statusElement = document.getElementById('connectionDashboardStatus');
    if (!statusElement) return;
    
    const status = event.detail.status;
    let statusClass = '';
    
    switch (status) {
        case 'connected':
        case 'reconnected':
            statusClass = 'connected';
            break;
        case 'disconnected':
        case 'failed':
            statusClass = 'disconnected';
            break;
        case 'reconnecting':
        case 'warning':
            statusClass = 'warning';
            break;
        default:
            statusClass = '';
    }
    
    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.className = `metric-item-value ${statusClass}`;
    
    // Show notification for critical status changes
    if (['disconnected', 'failed', 'reconnected'].includes(status)) {
        showDashboardNotification(status, event.detail.details);
    }
}

/**
 * Show dashboard notification for connection events
 * @param {string} status - Connection status
 * @param {string} details - Event details
 */
function showDashboardNotification(status, details) {
    // Only show if toast notification function exists
    if (typeof showToast !== 'function') return;
    
    let title = '';
    let type = '';
    
    switch (status) {
        case 'disconnected':
            title = 'Connection Lost';
            type = 'error';
            break;
        case 'reconnected':
            title = 'Connection Restored';
            type = 'success';
            break;
        case 'failed':
            title = 'Connection Failed';
            type = 'error';
            break;
        default:
            title = 'Connection Status Changed';
            type = 'info';
    }
    
    showToast(`${title}${details ? ': ' + details : ''}`, type);
}

/**
 * Apply event filter to the connection timeline
 * @param {string} filter - Filter type
 */
function applyEventFilter(filter) {
    const timeline = document.getElementById('connectionEventTimeline');
    if (!timeline) return;
    
    // Remove active class from all filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected filter
    const activeBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Apply filter to timeline events
    const events = timeline.querySelectorAll('.connection-event');
    events.forEach(event => {
        if (filter === 'all') {
            event.style.display = 'block';
        } else {
            if (event.classList.contains(filter)) {
                event.style.display = 'block';
            } else {
                event.style.display = 'none';
            }
        }
    });
    
    // Show filter message if no matching events
    let visibleCount = 0;
    events.forEach(event => {
        if (event.style.display !== 'none') {
            visibleCount++;
        }
    });
    
    // Handle no events matching filter
    const placeholderElement = timeline.querySelector('.event-placeholder');
    if (visibleCount === 0 && !placeholderElement) {
        const placeholder = document.createElement('div');
        placeholder.className = 'event-placeholder';
        placeholder.textContent = `No ${filter !== 'all' ? filter + ' ' : ''}events found`;
        timeline.appendChild(placeholder);
    } else if (visibleCount > 0 && placeholderElement) {
        placeholderElement.remove();
    }
    
    // Announce filter application to screen readers
    if (typeof window.announceToScreenReader === 'function') {
        window.announceToScreenReader(`Filtered timeline to show ${filter} events. ${visibleCount} events match the filter.`);
    }
}

// Add filter controls to connection metrics modal
function addFilterControlsToModal() {
    const modalHeader = document.querySelector('.connection-metrics-modal .modal-header');
    if (!modalHeader) return;
    
    const filterContainer = document.createElement('div');
    filterContainer.className = 'event-filters';
    filterContainer.innerHTML = `
        <label for="eventTypeFilter">Filter events: </label>
        <select id="eventTypeFilter" aria-label="Filter connection events by type">
            <option value="all">All events</option>
            <option value="connected">Connected only</option>
            <option value="disconnected">Disconnected only</option>
            <option value="warning">Warnings only</option>
            <option value="reconnecting">Reconnecting only</option>
            <option value="reconnected">Reconnected only</option>
            <option value="failed">Failed only</option>
        </select>
    `;
    
    modalHeader.appendChild(filterContainer);
    
    // Add event listener
    document.getElementById('eventTypeFilter').addEventListener('change', (e) => {
        applyEventFilter(e.target.value);
    });
}

// Initialize dashboard integration on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboardMetrics();
    addFilterControlsToModal();
    
    // Add styles for dashboard metrics
    const style = document.createElement('style');
    style.textContent = `
        .dashboard-metrics-container {
            background-color: var(--secondary-color, #f5f5f5);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .dashboard-metrics-title {
            margin-top: 0;
            color: var(--text-color, #333);
            font-size: 1.2rem;
            border-bottom: 1px solid var(--border-color, #ddd);
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        
        .dashboard-metrics-panel {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .dashboard-metric-item {
            padding: 10px;
            border-radius: 6px;
            background-color: var(--card-bg, #fff);
            text-align: center;
        }
        
        .metric-item-label {
            font-size: 0.9rem;
            color: var(--secondary-text-color, #666);
            margin-bottom: 5px;
        }
        
        .metric-item-value {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--primary-text-color, #333);
        }
        
        .metric-item-value.connected {
            color: #28a745;
        }
        
        .metric-item-value.disconnected {
            color: #dc3545;
        }
        
        .metric-item-value.warning {
            color: #ffc107;
        }
        
        .metric-item-value.has-alerts {
            color: #dc3545;
        }
        
        .dashboard-filters {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
        }
        
        .dashboard-filters span {
            font-size: 0.9rem;
            color: var(--secondary-text-color, #666);
        }
        
        .filter-btn {
            background-color: var(--tertiary-color, #e9ecef);
            border: none;
            border-radius: 15px;
            padding: 5px 12px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .filter-btn:hover {
            background-color: var(--hover-color, #d1d3d6);
        }
        
        .filter-btn.active {
            background-color: var(--primary-color, #007bff);
            color: #fff;
        }
        
        .event-filters {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        #eventTypeFilter {
            padding: 5px;
            border-radius: 4px;
            border: 1px solid var(--border-color, #ddd);
            background-color: var(--card-bg, #fff);
        }
    `;
    
    document.head.appendChild(style);
});

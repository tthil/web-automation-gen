/**
 * Connection Charts Module
 * Provides chart-based visualization of connection metrics and quality
 */

// Chart instance
let qualityChart = null;

/**
 * Calculate connection quality score based on connection events
 * @param {Array} events - Connection events array
 * @returns {Object} - Quality score data
 */
function calculateConnectionQuality(events) {
    if (!events || !Array.isArray(events) || events.length === 0) {
        return {
            score: 0,
            label: 'N/A',
            color: '#6c757d'
        };
    }
    
    // Count events by type
    const eventCounts = {
        connected: 0,
        disconnected: 0,
        warning: 0,
        reconnecting: 0,
        reconnected: 0,
        failed: 0
    };
    
    // Calculate total session time
    let totalSessionTimeMs = 0;
    let totalDowntimeMs = 0;
    
    // First and last event timestamps
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    
    if (firstEvent && lastEvent) {
        const startTime = new Date(firstEvent.timestamp).getTime();
        const endTime = new Date(lastEvent.timestamp).getTime();
        totalSessionTimeMs = endTime - startTime;
    }
    
    // Process each event
    events.forEach(event => {
        // Count by type
        if (eventCounts.hasOwnProperty(event.type)) {
            eventCounts[event.type]++;
        }
        
        // Add duration if available
        if (event.duration) {
            totalDowntimeMs += parseInt(event.duration, 10);
        }
    });
    
    // Calculate metrics
    const metrics = {
        downTimePercent: totalSessionTimeMs > 0 ? (totalDowntimeMs / totalSessionTimeMs) * 100 : 0,
        disconnectionFrequency: totalSessionTimeMs > 0 ? (eventCounts.disconnected / (totalSessionTimeMs / (60 * 1000))) : 0,
        reconnectSuccess: eventCounts.disconnected > 0 ? (eventCounts.reconnected / eventCounts.disconnected) * 100 : 100
    };
    
    // Calculate quality score (0-100)
    // Formula: 100 - (downtime% * 0.5) - (disconnection frequency * 10) + (reconnect success * 0.2)
    let score = 100;
    score -= metrics.downTimePercent * 0.5; // Penalize downtime percentage
    score -= metrics.disconnectionFrequency * 10; // Heavily penalize frequent disconnections
    score += metrics.reconnectSuccess * 0.2; // Reward successful reconnections
    
    // Clamp score between 0-100
    score = Math.max(0, Math.min(100, score));
    score = Math.round(score);
    
    // Determine label and color based on score
    let label, color;
    if (score >= 90) {
        label = 'Excellent';
        color = '#28a745'; // Success green
    } else if (score >= 75) {
        label = 'Good';
        color = '#4caf50'; // Light green
    } else if (score >= 60) {
        label = 'Fair';
        color = '#ffc107'; // Warning yellow
    } else if (score >= 40) {
        label = 'Poor';
        color = '#fd7e14'; // Orange
    } else {
        label = 'Critical';
        color = '#dc3545'; // Danger red
    }
    
    return {
        score,
        label,
        color,
        metrics
    };
}

/**
 * Create or update the connection quality chart
 * @param {Array} events - Connection events array
 */
function createConnectionQualityChart(events) {
    const canvas = document.getElementById('connectionQualityChart');
    
    if (!canvas) {
        console.error('Chart canvas element not found');
        return;
    }
    
    // Clean up existing chart if it exists
    if (qualityChart) {
        qualityChart.destroy();
    }
    
    if (!events || !Array.isArray(events) || events.length === 0) {
        // No events to display
        return;
    }
    
    // Sort events chronologically
    const sortedEvents = [...events].sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Prepare data for the chart
    const labels = [];
    const connectionStates = [];
    const reconnectionAttempts = [];
    const annotations = [];
    
    // Define state values for different event types
    const stateValues = {
        connected: 100,
        reconnected: 90,
        warning: 60,
        reconnecting: 40,
        disconnected: 10,
        failed: 0
    };
    
    // Process events for chart data
    sortedEvents.forEach((event, index) => {
        // Format timestamp for label
        const timestamp = new Date(event.timestamp);
        const label = timestamp.toLocaleTimeString();
        
        labels.push(label);
        
        // Get connection state value based on event type
        const stateValue = stateValues[event.type] || 50;
        connectionStates.push(stateValue);
        
        // Track reconnection attempts
        if (event.type === 'reconnecting') {
            reconnectionAttempts.push(1);
        } else {
            reconnectionAttempts.push(0);
        }
        
        // Add annotation for significant events
        if (['disconnected', 'failed', 'reconnected'].includes(event.type)) {
            annotations.push({
                type: 'line',
                xMin: index,
                xMax: index,
                borderColor: event.type === 'reconnected' ? '#28a745' : '#dc3545',
                borderWidth: 2,
                label: {
                    content: event.type.charAt(0).toUpperCase() + event.type.slice(1),
                    enabled: true,
                    position: 'top'
                }
            });
        }
    });
    
    // Create chart
    qualityChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Connection State',
                    data: connectionStates,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Reconnection Attempts',
                    data: reconnectionAttempts,
                    borderColor: '#fd7e14',
                    backgroundColor: 'rgba(253, 126, 20, 0.6)',
                    borderWidth: 1,
                    pointRadius: 5,
                    pointStyle: 'triangle',
                    type: 'scatter',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Connection Quality'
                    },
                    ticks: {
                        callback: function(value) {
                            if (value === 100) return 'Connected';
                            if (value === 60) return 'Warning';
                            if (value === 10) return 'Disconnected';
                            if (value === 0) return 'Failed';
                            return '';
                        }
                    }
                },
                y1: {
                    min: 0,
                    max: 1,
                    display: false,
                    position: 'right'
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const event = sortedEvents[index];
                            if (!event) return '';
                            
                            if (context.datasetIndex === 0) {
                                // Connection state tooltip
                                let label = event.type.charAt(0).toUpperCase() + event.type.slice(1);
                                if (event.details) {
                                    label += `: ${event.details}`;
                                }
                                if (event.duration) {
                                    const duration = parseInt(event.duration);
                                    if (duration < 1000) {
                                        label += ` (${duration}ms)`;
                                    } else {
                                        label += ` (${Math.round(duration / 1000)}s)`;
                                    }
                                }
                                return label;
                            }
                            return 'Reconnection attempt';
                        }
                    }
                },
                annotation: {
                    annotations: annotations
                }
            }
        }
    });
}

// Export functions
window.connectionCharts = {
    calculateConnectionQuality,
    createConnectionQualityChart
};

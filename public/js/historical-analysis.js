/**
 * Historical Connection Analysis Module
 * Tracks and analyzes historical connection trends across sessions
 */

// Store for historical data
const historicalData = {
    sessions: [],
    trends: {},
    lastUpdated: null
};

// Track if data has been loaded
let dataInitialized = false;

/**
 * Initialize historical analysis
 */
async function initializeHistoricalAnalysis() {
    // Load data from localStorage
    loadHistoricalData();
    
    // Fetch latest session data
    await refreshHistoricalData();
    
    // Set up periodic refresh (every 15 minutes)
    setInterval(refreshHistoricalData, 15 * 60 * 1000);
    
    // Add event listener for new sessions
    document.addEventListener('sessionCreated', handleNewSession);
    document.addEventListener('sessionUpdated', handleSessionUpdate);
}

/**
 * Load historical data from localStorage
 */
function loadHistoricalData() {
    try {
        const savedData = localStorage.getItem('connectionHistoricalData');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            Object.assign(historicalData, parsed);
        }
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

/**
 * Save historical data to localStorage
 */
function saveHistoricalData() {
    try {
        localStorage.setItem('connectionHistoricalData', JSON.stringify(historicalData));
    } catch (error) {
        console.error('Error saving historical data:', error);
    }
}

/**
 * Refresh historical data from API
 */
async function refreshHistoricalData() {
    try {
        // Fetch all sessions
        const response = await fetch('/api/sessions');
        if (!response.ok) return;
        
        const sessions = await response.json();
        
        // Process each session
        sessions.forEach(processSessionForHistory);
        
        // Calculate trends
        calculateHistoricalTrends();
        
        // Update last refreshed timestamp
        historicalData.lastUpdated = new Date().toISOString();
        
        // Save updated data
        saveHistoricalData();
        
        // Mark as initialized
        dataInitialized = true;
        
        // Notify that historical data is ready
        document.dispatchEvent(new CustomEvent('historicalDataReady', {
            detail: {
                trends: historicalData.trends
            }
        }));
    } catch (error) {
        console.error('Error refreshing historical data:', error);
    }
}

/**
 * Handle new session created event
 * @param {Event} event - Session created event
 */
function handleNewSession(event) {
    if (!event.detail || !event.detail.sessionId) return;
    
    // Fetch the new session
    fetch(`/api/sessions/${event.detail.sessionId}`)
        .then(response => response.json())
        .then(session => {
            processSessionForHistory(session);
            calculateHistoricalTrends();
            saveHistoricalData();
        })
        .catch(error => console.error('Error handling new session:', error));
}

/**
 * Handle session updated event
 * @param {Event} event - Session updated event
 */
function handleSessionUpdate(event) {
    if (!event.detail || !event.detail.sessionId) return;
    
    // Fetch the updated session
    fetch(`/api/sessions/${event.detail.sessionId}`)
        .then(response => response.json())
        .then(session => {
            processSessionForHistory(session);
            calculateHistoricalTrends();
            saveHistoricalData();
        })
        .catch(error => console.error('Error handling session update:', error));
}

/**
 * Process a session for historical data
 * @param {Object} session - Session data
 */
function processSessionForHistory(session) {
    if (!session || !session.id || !session.connectionEvents) return;
    
    // Check if session already exists in history
    const existingIndex = historicalData.sessions.findIndex(s => s.id === session.id);
    
    // Calculate connection quality
    const quality = window.connectionCharts?.calculateConnectionQuality(session.connectionEvents);
    if (!quality) return;
    
    // Create history entry
    const historyEntry = {
        id: session.id,
        name: session.name || 'Unnamed Session',
        createdAt: session.createdAt,
        updatedAt: session.updatedAt || session.createdAt,
        url: session.url,
        qualityScore: quality.score,
        qualityLabel: quality.label,
        metrics: {
            disconnectionCount: quality.metrics?.disconnectionFrequency || 0,
            downTimePercent: quality.metrics?.downTimePercent || 0,
            reconnectSuccess: quality.metrics?.reconnectSuccess || 100
        },
        eventCounts: countEventTypes(session.connectionEvents),
        durationMs: calculateSessionDuration(session)
    };
    
    // Update or add session
    if (existingIndex !== -1) {
        historicalData.sessions[existingIndex] = historyEntry;
    } else {
        historicalData.sessions.push(historyEntry);
    }
}

/**
 * Count events by type
 * @param {Array} events - Connection events
 * @returns {Object} - Counts by type
 */
function countEventTypes(events) {
    const counts = {
        connected: 0,
        disconnected: 0,
        warning: 0,
        reconnecting: 0,
        reconnected: 0,
        failed: 0
    };
    
    if (!Array.isArray(events)) return counts;
    
    events.forEach(event => {
        if (counts.hasOwnProperty(event.type)) {
            counts[event.type]++;
        }
    });
    
    return counts;
}

/**
 * Calculate session duration in milliseconds
 * @param {Object} session - Session data
 * @returns {number} - Duration in milliseconds
 */
function calculateSessionDuration(session) {
    if (!session.connectionEvents || session.connectionEvents.length === 0) {
        return 0;
    }
    
    // Sort events by timestamp
    const events = [...session.connectionEvents].sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Get first and last event timestamps
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    
    const startTime = new Date(firstEvent.timestamp).getTime();
    const endTime = new Date(lastEvent.timestamp).getTime();
    
    return endTime - startTime;
}

/**
 * Calculate historical trends
 */
function calculateHistoricalTrends() {
    // Skip if no sessions
    if (historicalData.sessions.length === 0) {
        historicalData.trends = {};
        return;
    }
    
    // Sort sessions by creation date (newest first)
    const sortedSessions = [...historicalData.sessions].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Calculate time periods
    const now = new Date();
    const periods = {
        day: {
            sessions: sortedSessions.filter(s => {
                const date = new Date(s.createdAt);
                return (now - date) < 24 * 60 * 60 * 1000;
            })
        },
        week: {
            sessions: sortedSessions.filter(s => {
                const date = new Date(s.createdAt);
                return (now - date) < 7 * 24 * 60 * 60 * 1000;
            })
        },
        month: {
            sessions: sortedSessions.filter(s => {
                const date = new Date(s.createdAt);
                return (now - date) < 30 * 24 * 60 * 60 * 1000;
            })
        },
        all: {
            sessions: sortedSessions
        }
    };
    
    // Calculate trends for each period
    Object.keys(periods).forEach(period => {
        const sessionSet = periods[period].sessions;
        
        if (sessionSet.length === 0) {
            periods[period].metrics = null;
        } else {
            periods[period].metrics = {
                averageQualityScore: calculateAverage(sessionSet, 'qualityScore'),
                averageDowntimePercent: calculateAverage(sessionSet, s => s.metrics.downTimePercent),
                totalSessions: sessionSet.length,
                disconnectionRate: calculateAverage(sessionSet, s => s.eventCounts.disconnected / Math.max(1, s.durationMs / (60 * 1000))),
                reconnectionSuccessRate: calculateAverage(sessionSet, s => s.metrics.reconnectSuccess),
                qualityDistribution: calculateQualityDistribution(sessionSet),
                trendDirection: calculateTrendDirection(sessionSet, 'qualityScore')
            };
        }
    });
    
    // Store calculated trends
    historicalData.trends = periods;
}

/**
 * Calculate average value from session array
 * @param {Array} sessions - Array of session objects
 * @param {string|Function} property - Property name or accessor function
 * @returns {number} - Average value
 */
function calculateAverage(sessions, property) {
    if (sessions.length === 0) return 0;
    
    let total = 0;
    
    sessions.forEach(session => {
        let value;
        
        if (typeof property === 'function') {
            value = property(session);
        } else {
            value = session[property];
        }
        
        total += Number(value) || 0;
    });
    
    return total / sessions.length;
}

/**
 * Calculate quality score distribution
 * @param {Array} sessions - Array of session objects
 * @returns {Object} - Distribution of quality scores
 */
function calculateQualityDistribution(sessions) {
    const distribution = {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        critical: 0
    };
    
    sessions.forEach(session => {
        const label = session.qualityLabel ? session.qualityLabel.toLowerCase() : null;
        
        if (label && distribution.hasOwnProperty(label)) {
            distribution[label]++;
        }
    });
    
    return distribution;
}

/**
 * Calculate trend direction (improving, declining, stable)
 * @param {Array} sessions - Array of session objects
 * @param {string} property - Property to track trend for
 * @returns {string} - Trend direction
 */
function calculateTrendDirection(sessions, property) {
    if (sessions.length < 3) return 'stable';
    
    // Get sessions ordered by time (oldest first)
    const orderedSessions = [...sessions].sort((a, b) => {
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    // Split into segments
    const third = Math.floor(orderedSessions.length / 3);
    
    if (third === 0) return 'stable';
    
    const firstSegment = orderedSessions.slice(0, third);
    const lastSegment = orderedSessions.slice(-third);
    
    // Calculate averages
    const firstAvg = calculateAverage(firstSegment, property);
    const lastAvg = calculateAverage(lastSegment, property);
    
    // Determine trend direction
    const changePct = ((lastAvg - firstAvg) / firstAvg) * 100;
    
    if (Math.abs(changePct) < 5) {
        return 'stable';
    } else if (changePct > 0) {
        return 'improving';
    } else {
        return 'declining';
    }
}

/**
 * Get a specified time period's trends
 * @param {string} period - Time period ('day', 'week', 'month', 'all')
 * @returns {Object} - Trend data for the period
 */
function getTrendsByPeriod(period) {
    if (!dataInitialized) {
        return null;
    }
    
    const validPeriods = ['day', 'week', 'month', 'all'];
    const validPeriod = validPeriods.includes(period) ? period : 'week';
    
    return historicalData.trends[validPeriod] || null;
}

/**
 * Get sessions by quality score range
 * @param {number} minScore - Minimum quality score
 * @param {number} maxScore - Maximum quality score
 * @returns {Array} - Filtered sessions
 */
function getSessionsByQualityRange(minScore, maxScore) {
    return historicalData.sessions.filter(session => {
        return session.qualityScore >= minScore && session.qualityScore <= maxScore;
    });
}

/**
 * Compare two sessions by quality metrics
 * @param {string} sessionId1 - First session ID
 * @param {string} sessionId2 - Second session ID
 * @returns {Object} - Comparison results
 */
function compareSessionQuality(sessionId1, sessionId2) {
    const session1 = historicalData.sessions.find(s => s.id === sessionId1);
    const session2 = historicalData.sessions.find(s => s.id === sessionId2);
    
    if (!session1 || !session2) {
        return null;
    }
    
    return {
        qualityDifference: session2.qualityScore - session1.qualityScore,
        downtimeDifference: session2.metrics.downTimePercent - session1.metrics.downTimePercent,
        disconnectionDifference: session2.metrics.disconnectionCount - session1.metrics.disconnectionCount,
        reconnectionDifference: session2.metrics.reconnectSuccess - session1.metrics.reconnectSuccess,
        overallImprovement: (session2.qualityScore - session1.qualityScore) > 0
    };
}

/**
 * Get all sessions for a specific URL
 * @param {string} url - URL to filter by
 * @returns {Array} - Filtered sessions
 */
function getSessionsByUrl(url) {
    return historicalData.sessions.filter(session => session.url === url);
}

/**
 * Generate insights from historical data
 * @returns {Array} - Array of insight objects
 */
function generateInsights() {
    if (!dataInitialized || historicalData.sessions.length === 0) {
        return [];
    }
    
    const insights = [];
    
    // Get trend data
    const weekTrends = historicalData.trends.week;
    
    if (weekTrends && weekTrends.metrics) {
        // Quality trend insight
        insights.push({
            type: 'quality',
            title: `Connection quality is ${weekTrends.metrics.trendDirection}`,
            details: `Average quality score is ${weekTrends.metrics.averageQualityScore.toFixed(1)} over the last week.`,
            trend: weekTrends.metrics.trendDirection
        });
        
        // Reconnection success insight
        if (weekTrends.metrics.reconnectionSuccessRate < 80) {
            insights.push({
                type: 'warning',
                title: 'Low reconnection success rate',
                details: `Only ${weekTrends.metrics.reconnectionSuccessRate.toFixed(1)}% of disconnections successfully reconnect.`,
                trend: 'declining'
            });
        }
        
        // High disconnection rate insight
        if (weekTrends.metrics.disconnectionRate > 2) {
            insights.push({
                type: 'warning',
                title: 'High disconnection rate',
                details: `Sessions are experiencing an average of ${weekTrends.metrics.disconnectionRate.toFixed(1)} disconnections per minute.`,
                trend: 'declining'
            });
        }
        
        // URL-specific insights
        const urlGroups = {};
        historicalData.sessions.forEach(session => {
            if (!session.url) return;
            
            if (!urlGroups[session.url]) {
                urlGroups[session.url] = [];
            }
            
            urlGroups[session.url].push(session);
        });
        
        // Find URL with lowest quality scores
        let lowestQualityUrl = null;
        let lowestQualityScore = 100;
        
        Object.keys(urlGroups).forEach(url => {
            const sessions = urlGroups[url];
            if (sessions.length < 3) return;
            
            const avgQuality = calculateAverage(sessions, 'qualityScore');
            if (avgQuality < lowestQualityScore) {
                lowestQualityScore = avgQuality;
                lowestQualityUrl = url;
            }
        });
        
        if (lowestQualityUrl && lowestQualityScore < 70) {
            insights.push({
                type: 'url',
                title: 'Problematic website identified',
                details: `Sessions on ${new URL(lowestQualityUrl).hostname} have an average quality score of ${lowestQualityScore.toFixed(1)}.`,
                url: lowestQualityUrl
            });
        }
    }
    
    return insights;
}

/**
 * Create a historical chart for trends
 * @param {string} canvasId - Canvas element ID
 * @param {string} period - Time period ('day', 'week', 'month', 'all')
 */
function createHistoricalChart(canvasId, period = 'week') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !dataInitialized) return;
    
    const ctx = canvas.getContext('2d');
    
    // Get trend data
    const trendData = historicalData.trends[period];
    if (!trendData || !trendData.sessions || trendData.sessions.length < 2) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Not enough data to display historical trends', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Sort sessions by date (oldest first)
    const sessions = [...trendData.sessions].sort((a, b) => {
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    // Prepare data
    const labels = sessions.map(session => {
        const date = new Date(session.createdAt);
        return date.toLocaleDateString();
    });
    
    const qualityData = sessions.map(session => session.qualityScore);
    const downtimeData = sessions.map(session => session.metrics.downTimePercent);
    
    // Create chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Quality Score',
                    data: qualityData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Downtime %',
                    data: downtimeData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quality Score'
                    },
                    min: 0,
                    max: 100
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Downtime %'
                    },
                    min: 0,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Export public API
window.connectionHistory = {
    initialize: initializeHistoricalAnalysis,
    getTrendsByPeriod,
    getSessionsByQualityRange,
    compareSessionQuality,
    getSessionsByUrl,
    generateInsights,
    createHistoricalChart
};

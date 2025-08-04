import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { 
  Session, 
  ReplayResult, 
  ConnectionEvent, 
  HistoricalMetrics, 
  ConnectionAlert 
} from '../types/session';

// Path constants
const METADATA_DIR = path.join(process.cwd(), 'metadata');
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');
const ALERTS_DIR = path.join(process.cwd(), 'alerts');
const HISTORY_DIR = path.join(process.cwd(), 'history');

/**
 * Ensure all necessary directories exist
 */
async function ensureDirectoriesExist(): Promise<void> {
  const directories = [METADATA_DIR, SESSIONS_DIR, ALERTS_DIR, HISTORY_DIR];
  
  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch {
      // Directory doesn't exist, create it
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }
}

/**
 * Get all saved sessions
 */
export const getSessions = async (): Promise<Session[]> => {
  try {
    await ensureDirectoriesExist();
    const files = await fs.readdir(METADATA_DIR);
    const metadataFiles = files.filter(file => file.endsWith('.json'));
    
    const sessions = await Promise.all(
      metadataFiles.map(async (file) => {
        const data = await fs.readFile(path.join(METADATA_DIR, file), 'utf-8');
        return JSON.parse(data) as Session;
      })
    );
    
    // Sort by creation date, newest first
    return sessions.sort((a: Session, b: Session) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
};

/**
 * Get a specific session by ID
 */
export const getSession = async (id: string): Promise<Session | null> => {
  try {
    await ensureDirectoriesExist();
    const metadataPath = path.join(METADATA_DIR, `${id}.json`);
    const data = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(data) as Session;
  } catch (error) {
    console.error(`Error getting session ${id}:`, error);
    return null;
  }
};

/**
 * Save a new session with enhanced tracking capabilities
 */
export const saveSession = async (
  url: string, 
  scriptPath: string, 
  name?: string,
  processId?: string,
  tags?: string[]
): Promise<Session> => {
  try {
    await ensureDirectoriesExist();
    
    // Create unique ID
    const id = uuidv4();
    
    // Generate session name if not provided
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const sessionName = name || `Session_${timestamp}`;
    
    // Create session metadata with connection tracking
    const session: Session = {
      id,
      name: sessionName,
      url,
      scriptPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      processId,
      tags,
      connectionMetrics: {
        disconnectionCount: 0,
        totalDisconnectionTime: 0,
        reconnectionCount: 0,
        completedNormally: false // Will be set to true when session completes normally
      },
      connectionEvents: [
        {
          timestamp: new Date().toISOString(),
          type: 'connected',
          details: 'Session started'
        }
      ]
    };
    
    // Save metadata
    await fs.writeFile(
      path.join(METADATA_DIR, `${id}.json`),
      JSON.stringify(session, null, 2)
    );
    
    return session;
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
};

/**
 * Add a connection event to a session with enhanced metrics
 */
export const addConnectionEvent = async (
  sessionId: string, 
  eventType: 'connected' | 'disconnected' | 'warning' | 'reconnecting' | 'reconnected' | 'failed',
  details?: string,
  duration?: number,
  latency?: number,
  qualityIndicator?: number
): Promise<Session | null> => {
  try {
    const session = await getSession(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return null;
    }
    
    // Initialize arrays/objects if they don't exist
    if (!session.connectionEvents) {
      session.connectionEvents = [];
    }
    
    if (!session.connectionMetrics) {
      session.connectionMetrics = {
        disconnectionCount: 0,
        totalDisconnectionTime: 0,
        reconnectionCount: 0,
        completedNormally: false,
        qualityScore: 100, // Start with perfect score
        averageLatency: 0,
        maxLatency: 0,
        stabilityPercentage: 100, // Start with perfect stability
        reconnectionSuccessRate: 1, // Start with perfect reconnection rate
        failedReconnectionCount: 0
      };
    }
    
    // Add the event with enhanced metrics
    const newEvent: ConnectionEvent = {
      timestamp: new Date().toISOString(),
      type: eventType,
      details,
      duration,
      latency,
      qualityIndicator
    };
    
    session.connectionEvents.push(newEvent);
    session.updatedAt = new Date().toISOString();
    
    // Update metrics based on event type
    switch (eventType) {
      case 'disconnected':
        session.connectionMetrics.disconnectionCount++;
        if (duration) {
          session.connectionMetrics.totalDisconnectionTime += duration;
        }
        // Update stability percentage
        updateStabilityMetrics(session);
        break;
        
      case 'reconnected':
        session.connectionMetrics.reconnectionCount++;
        // Update reconnection success rate
        if (session.connectionMetrics.reconnectionCount > 0) {
          const totalAttempts = session.connectionMetrics.reconnectionCount + 
                               (session.connectionMetrics.failedReconnectionCount || 0);
          session.connectionMetrics.reconnectionSuccessRate = 
            session.connectionMetrics.reconnectionCount / totalAttempts;
        }
        break;
        
      case 'failed':
        // Increment failed reconnection count
        session.connectionMetrics.failedReconnectionCount = 
          (session.connectionMetrics.failedReconnectionCount || 0) + 1;
        
        // Update reconnection success rate
        if (session.connectionMetrics.reconnectionCount > 0 || session.connectionMetrics.failedReconnectionCount > 0) {
          const totalAttempts = session.connectionMetrics.reconnectionCount + 
                               session.connectionMetrics.failedReconnectionCount;
          session.connectionMetrics.reconnectionSuccessRate = 
            session.connectionMetrics.reconnectionCount / totalAttempts;
        }
        break;
        
      case 'connected':
        // If it's the first event, don't increment anything
        if (session.connectionEvents.length > 1) {
          session.connectionMetrics.reconnectionCount++;
          // Update reconnection success rate
          if (session.connectionMetrics.reconnectionCount > 0) {
            const totalAttempts = session.connectionMetrics.reconnectionCount + 
                                 (session.connectionMetrics.failedReconnectionCount || 0);
            session.connectionMetrics.reconnectionSuccessRate = 
              session.connectionMetrics.reconnectionCount / totalAttempts;
          }
        }
        break;
    }
    
    // Update latency metrics if provided
    if (latency !== undefined) {
      // Update max latency
      if (latency > (session.connectionMetrics.maxLatency || 0)) {
        session.connectionMetrics.maxLatency = latency;
      }
      
      // Update average latency
      const latencyEvents = session.connectionEvents.filter(e => e.latency !== undefined);
      if (latencyEvents.length > 0) {
        const totalLatency = latencyEvents.reduce((sum, event) => sum + (event.latency || 0), 0);
        session.connectionMetrics.averageLatency = totalLatency / latencyEvents.length;
      }
    }
    
    // Calculate overall quality score
    session.connectionMetrics.qualityScore = calculateQualityScore(session);
    
    // Check if this event should generate an alert
    await checkAndGenerateAlerts(session, eventType);
    
    // Save the updated session
    await fs.writeFile(
      path.join(METADATA_DIR, `${sessionId}.json`),
      JSON.stringify(session, null, 2)
    );
    
    // Update historical metrics
    await updateHistoricalMetrics(session);
    
    return session;
  } catch (error) {
    console.error(`Error adding connection event to session ${sessionId}:`, error);
    return null;
  }
};

/**
 * Mark a session as completed normally and finalize metrics
 */
export const completeSession = async (id: string): Promise<Session | null> => {
  try {
    const session = await getSession(id);
    if (!session) {
      console.error(`Session ${id} not found`);
      return null;
    }
    
    if (!session.connectionMetrics) {
      session.connectionMetrics = {
        disconnectionCount: 0,
        totalDisconnectionTime: 0,
        reconnectionCount: 0,
        completedNormally: true,
        qualityScore: 100,
        averageLatency: 0,
        maxLatency: 0,
        stabilityPercentage: 100,
        reconnectionSuccessRate: 1,
        failedReconnectionCount: 0
      };
    } else {
      session.connectionMetrics.completedNormally = true;
      
      // Finalize metrics
      session.connectionMetrics.qualityScore = calculateQualityScore(session);
      updateStabilityMetrics(session);
    }
    
    // Add completion event
    if (!session.connectionEvents) {
      session.connectionEvents = [];
    }
    
    session.connectionEvents.push({
      timestamp: new Date().toISOString(),
      type: 'connected',
      details: 'Session completed normally'
    });
    
    session.updatedAt = new Date().toISOString();
    
    // Save the updated session
    await fs.writeFile(
      path.join(METADATA_DIR, `${id}.json`),
      JSON.stringify(session, null, 2)
    );
    
    // Update historical metrics one final time
    await updateHistoricalMetrics(session);
    
    return session;
  } catch (error) {
    console.error(`Error completing session ${id}:`, error);
    return null;
  }
};

/**
 * Recover a session by process ID
 * This is used when a page reload or browser refresh happens
 */
export const recoverSessionByProcessId = async (processId: string): Promise<Session | null> => {
  try {
    await ensureDirectoriesExist();
    const sessions = await getSessions();
    
    // Find the session with the matching process ID
    const session = sessions.find(s => s.processId === processId);
    
    if (!session) {
      return null;
    }
    
    // Add a recovery event
    await addConnectionEvent(session.id, 'reconnected', 'Session recovered after page reload');
    
    return session;
  } catch (error) {
    console.error(`Error recovering session by process ID ${processId}:`, error);
    return null;
  }
};

/**
 * Calculate quality score for a session based on multiple factors
 * @param session Session to calculate quality score for
 * @returns Quality score from 0-100
 */
function calculateQualityScore(session: Session): number {
  if (!session.connectionMetrics) {
    return 100; // Default to perfect score if no metrics available
  }
  
  // Base score starts at 100
  let score = 100;
  
  // Factor 1: Disconnection frequency
  // Each disconnection reduces score by 5 points, up to a maximum of 30 points
  const disconnectionPenalty = Math.min(session.connectionMetrics.disconnectionCount * 5, 30);
  score -= disconnectionPenalty;
  
  // Factor 2: Total disconnection time
  // Long disconnection times reduce score proportionally
  // Calculate session duration
  const sessionStart = new Date(session.createdAt).getTime();
  const sessionEnd = session.updatedAt ? 
    new Date(session.updatedAt).getTime() : 
    new Date().getTime();
  const sessionDuration = sessionEnd - sessionStart;
  
  // Calculate percentage of time disconnected
  const disconnectionPercentage = Math.min(
    (session.connectionMetrics.totalDisconnectionTime / sessionDuration) * 100,
    100 // Cap at 100%
  );
  
  // Apply penalty based on disconnection percentage
  // Up to 40 points penalty for 100% disconnect time
  const disconnectionTimePenalty = Math.min(disconnectionPercentage * 0.4, 40);
  score -= disconnectionTimePenalty;
  
  // Factor 3: Reconnection success rate
  // Apply penalty for failed reconnections
  if (session.connectionMetrics.reconnectionSuccessRate !== undefined &&
      session.connectionMetrics.reconnectionCount > 0) {
    const reconnectionPenalty = 
      (1 - session.connectionMetrics.reconnectionSuccessRate) * 20;
    score -= reconnectionPenalty;
  }
  
  // Factor 4: Latency
  // Higher average latency reduces score
  if (session.connectionMetrics.averageLatency !== undefined) {
    // Normalize latency penalty
    // 0ms = 0 penalty, 1000ms (1s) or more = 10 point penalty
    const latencyPenalty = Math.min(session.connectionMetrics.averageLatency / 100, 10);
    score -= latencyPenalty;
  }
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Update stability metrics for a session
 * @param session Session to update stability metrics for
 */
function updateStabilityMetrics(session: Session): void {
  if (!session.connectionMetrics || !session.connectionEvents) {
    return;
  }
  
  // Calculate session duration
  const sessionStart = new Date(session.createdAt).getTime();
  const sessionEnd = session.updatedAt ? 
    new Date(session.updatedAt).getTime() : 
    new Date().getTime();
  const sessionDuration = sessionEnd - sessionStart;
  
  // Calculate stable time (total time - disconnection time)
  const stableTime = Math.max(0, sessionDuration - session.connectionMetrics.totalDisconnectionTime);
  
  // Calculate stability percentage
  session.connectionMetrics.stabilityPercentage = 
    Math.round((stableTime / sessionDuration) * 100);
}

/**
 * Check metrics and generate alerts if necessary
 * @param session Session to check metrics for
 * @param eventType Type of the most recent event
 */
async function checkAndGenerateAlerts(session: Session, eventType: string): Promise<void> {
  if (!session.connectionMetrics) {
    return;
  }
  
  const alerts: ConnectionAlert[] = [];
  const metrics = session.connectionMetrics;
  
  // Alert 1: Poor connection quality
  if (metrics.qualityScore !== undefined && metrics.qualityScore < 60) {
    const severity = metrics.qualityScore < 40 ? 'critical' : 
                     metrics.qualityScore < 50 ? 'warning' : 'info';
                     
    alerts.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      severity,
      type: 'quality',
      message: `Poor connection quality (${metrics.qualityScore}/100) detected for session ${session.name}`,
      sessionId: session.id,
      acknowledged: false,
      context: {
        qualityScore: metrics.qualityScore,
        url: session.url
      }
    });
  }
  
  // Alert 2: Multiple disconnections
  if (metrics.disconnectionCount >= 3) {
    const severity = metrics.disconnectionCount >= 5 ? 'critical' : 'warning';
    
    alerts.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      severity,
      type: 'disconnection',
      message: `Excessive disconnections (${metrics.disconnectionCount}) detected for session ${session.name}`,
      sessionId: session.id,
      acknowledged: false,
      context: {
        disconnectionCount: metrics.disconnectionCount,
        url: session.url
      }
    });
  }
  
  // Alert 3: Poor reconnection success
  if (metrics.reconnectionSuccessRate !== undefined && 
      metrics.reconnectionSuccessRate < 0.7 && 
      (metrics.reconnectionCount + (metrics.failedReconnectionCount || 0)) >= 3) {
    
    const severity = metrics.reconnectionSuccessRate < 0.5 ? 'critical' : 'warning';
    
    alerts.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      severity,
      type: 'reconnection',
      message: `Low reconnection success rate (${Math.round(metrics.reconnectionSuccessRate * 100)}%) for session ${session.name}`,
      sessionId: session.id,
      acknowledged: false,
      context: {
        reconnectionSuccessRate: metrics.reconnectionSuccessRate,
        reconnectionCount: metrics.reconnectionCount,
        failedReconnectionCount: metrics.failedReconnectionCount,
        url: session.url
      }
    });
  }
  
  // Alert 4: Excessive downtime
  const sessionStart = new Date(session.createdAt).getTime();
  const sessionEnd = session.updatedAt ? 
    new Date(session.updatedAt).getTime() : 
    new Date().getTime();
  const sessionDuration = sessionEnd - sessionStart;
  
  const downtimePercentage = (metrics.totalDisconnectionTime / sessionDuration) * 100;
  
  if (downtimePercentage > 20 && metrics.totalDisconnectionTime > 10000) { // >20% and >10s
    const severity = downtimePercentage > 40 ? 'critical' : 'warning';
    
    alerts.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      severity,
      type: 'downtime',
      message: `Excessive downtime (${Math.round(downtimePercentage)}%) detected for session ${session.name}`,
      sessionId: session.id,
      acknowledged: false,
      context: {
        downtimePercentage: Math.round(downtimePercentage),
        totalDowntime: metrics.totalDisconnectionTime,
        url: session.url
      }
    });
  }
  
  // Save generated alerts
  for (const alert of alerts) {
    await saveAlert(alert);
  }
}

/**
 * Save an alert to the alerts directory
 * @param alert Alert to save
 */
async function saveAlert(alert: ConnectionAlert): Promise<void> {
  try {
    await ensureDirectoriesExist();
    await fs.writeFile(
      path.join(ALERTS_DIR, `${alert.id}.json`),
      JSON.stringify(alert, null, 2)
    );
  } catch (error) {
    console.error(`Error saving alert:`, error);
  }
}

/**
 * Update historical metrics with the latest session data
 * @param session Session with updated metrics
 */
async function updateHistoricalMetrics(session: Session): Promise<void> {
  try {
    await ensureDirectoriesExist();
    
    // Get current date for period calculations
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // Define the periods to update
    const periods = [
      { name: 'day', startTime: today },
      { name: 'week', startTime: weekStart },
      { name: 'month', startTime: monthStart },
      { name: 'all', startTime: '2000-01-01T00:00:00.000Z' } // Effectively all-time
    ];
    
    // Update each period
    for (const period of periods) {
      await updateMetricsForPeriod(period.name, period.startTime, session);
    }
  } catch (error) {
    console.error(`Error updating historical metrics:`, error);
  }
}

/**
 * Update metrics for a specific time period
 * @param periodName Name of the period (day, week, month, all)
 * @param startTime Start time for the period (ISO string)
 * @param newSession Latest session with metrics to incorporate
 */
async function updateMetricsForPeriod(
  periodName: string, 
  startTime: string,
  newSession: Session
): Promise<void> {
  try {
    // Filename for this period's metrics
    const filename = `metrics_${periodName}.json`;
    const filePath = path.join(HISTORY_DIR, filename);
    
    // Default metrics structure
    let metrics: HistoricalMetrics = {
      period: periodName,
      startTime,
      endTime: new Date().toISOString(),
      averageQualityScore: newSession.connectionMetrics?.qualityScore || 100,
      averageDisconnectionCount: newSession.connectionMetrics?.disconnectionCount || 0,
      averageDowntimePercentage: 0,
      sessionCount: 1,
      trend: 'stable'
    };
    
    try {
      // Try to read existing metrics file
      const data = await fs.readFile(filePath, 'utf-8');
      const existingMetrics = JSON.parse(data) as HistoricalMetrics;
      
      // Get sessions since the start time to recalculate averages
      const sessions = await getSessionsSince(startTime);
      
      // Calculate new averages
      const sessionCount = sessions.length;
      const qualityScores = sessions
        .filter(s => s.connectionMetrics?.qualityScore !== undefined)
        .map(s => s.connectionMetrics!.qualityScore!);
        
      const disconnectionCounts = sessions
        .map(s => s.connectionMetrics?.disconnectionCount || 0);
      
      const downtimePercentages = sessions.map(s => {
        if (!s.connectionMetrics) return 0;
        
        const sessionStart = new Date(s.createdAt).getTime();
        const sessionEnd = s.updatedAt ? 
          new Date(s.updatedAt).getTime() : 
          new Date().getTime();
        const sessionDuration = sessionEnd - sessionStart;
        
        return (s.connectionMetrics.totalDisconnectionTime / sessionDuration) * 100;
      });
      
      // Calculate problem sessions
      const problemSessions = sessions.filter(s => 
        (s.connectionMetrics?.qualityScore !== undefined && s.connectionMetrics.qualityScore < 60) ||
        (s.connectionMetrics?.disconnectionCount || 0) >= 3 ||
        (s.connectionMetrics?.reconnectionSuccessRate !== undefined && 
         s.connectionMetrics.reconnectionSuccessRate < 0.7)
      );
      
      // Update metrics
      metrics = {
        period: periodName,
        startTime,
        endTime: new Date().toISOString(),
        averageQualityScore: calculateAverage(qualityScores),
        averageDisconnectionCount: calculateAverage(disconnectionCounts),
        averageDowntimePercentage: calculateAverage(downtimePercentages),
        sessionCount,
        problemSessionCount: problemSessions.length
      };
      
      // Calculate trend if we have previous data
      if (existingMetrics.averageQualityScore) {
        const changePercentage = 
          ((metrics.averageQualityScore - existingMetrics.averageQualityScore) / 
           existingMetrics.averageQualityScore) * 100;
        
        metrics.changePercentage = Math.round(changePercentage * 10) / 10; // Round to 1 decimal place
        
        if (metrics.changePercentage > 5) {
          metrics.trend = 'improving';
        } else if (metrics.changePercentage < -5) {
          metrics.trend = 'declining';
        } else {
          metrics.trend = 'stable';
        }
      }
      
    } catch (error) {
      // File doesn't exist or is invalid, use the default metrics
      console.log(`Creating new metrics file for period ${periodName}`);
    }
    
    // Save updated metrics
    await fs.writeFile(filePath, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.error(`Error updating metrics for period ${periodName}:`, error);
  }
}

/**
 * Calculate average of an array of numbers
 */
function calculateAverage(values: number[]): number {
  if (!values.length) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10; // Round to 1 decimal place
}

/**
 * Get sessions created since a specified timestamp
 */
async function getSessionsSince(startTime: string): Promise<Session[]> {
  const sessions = await getSessions();
  const startTimestamp = new Date(startTime).getTime();
  
  return sessions.filter(session => 
    new Date(session.createdAt).getTime() >= startTimestamp
  );
}

/**
 * Get all alerts for a session
 */
export const getSessionAlerts = async (sessionId: string): Promise<ConnectionAlert[]> => {
  try {
    await ensureDirectoriesExist();
    const files = await fs.readdir(ALERTS_DIR);
    const alertFiles = files.filter(file => file.endsWith('.json'));
    
    const allAlerts = await Promise.all(
      alertFiles.map(async (file) => {
        const data = await fs.readFile(path.join(ALERTS_DIR, file), 'utf-8');
        return JSON.parse(data) as ConnectionAlert;
      })
    );
    
    // Filter alerts for this session and sort by timestamp (newest first)
    return allAlerts
      .filter(alert => alert.sessionId === sessionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error(`Error getting alerts for session ${sessionId}:`, error);
    return [];
  }
};

/**
 * Acknowledge or dismiss an alert
 */
export const acknowledgeAlert = async (alertId: string): Promise<boolean> => {
  try {
    await ensureDirectoriesExist();
    const alertPath = path.join(ALERTS_DIR, `${alertId}.json`);
    
    try {
      const data = await fs.readFile(alertPath, 'utf-8');
      const alert = JSON.parse(data) as ConnectionAlert;
      
      // Mark as acknowledged
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      
      // Save updated alert
      await fs.writeFile(alertPath, JSON.stringify(alert, null, 2));
      
      return true;
    } catch {
      // Alert not found
      return false;
    }
  } catch (error) {
    console.error(`Error acknowledging alert ${alertId}:`, error);
    return false;
  }
};

/**
 * Get historical metrics for a specific period
 */
export const getHistoricalMetrics = async (period: string): Promise<HistoricalMetrics | null> => {
  try {
    await ensureDirectoriesExist();
    const filename = `metrics_${period}.json`;
    const filePath = path.join(HISTORY_DIR, filename);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as HistoricalMetrics;
    } catch {
      // Metrics for this period don't exist yet
      return null;
    }
  } catch (error) {
    console.error(`Error getting historical metrics for period ${period}:`, error);
    return null;
  }
};

/**
 * Delete a session by ID
 */
export const removeSession = async (id: string): Promise<boolean> => {
  try {
    await ensureDirectoriesExist();
    const metadataPath = path.join(METADATA_DIR, `${id}.json`);
    const session = await getSession(id);
    
    if (!session) {
      return false;
    }
    
    // Delete the metadata file
    await fs.unlink(metadataPath);
    
    // Delete the script file if it exists
    if (session.scriptPath) {
      try {
        await fs.access(session.scriptPath);
        await fs.unlink(session.scriptPath);
      } catch (e) {
        // File might not exist, ignore error
        console.log(`Script file not found: ${session.scriptPath}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error removing session ${id}:`, error);
    return false;
  }
};

/**
 * Execute a session by ID
 */
export const executeSession = async (id: string): Promise<ReplayResult> => {
  try {
    const session = await getSession(id);
    
    if (!session) {
      return {
        success: false,
        message: `Session with ID ${id} not found`,
        logs: []
      };
    }
    
    // Check if script file exists
    try {
      await fs.access(session.scriptPath);
    } catch (e) {
      return {
        success: false,
        message: `Script file not found: ${session.scriptPath}`,
        logs: []
      };
    }
    
    // Execute the script using Playwright
    const logs: string[] = [];
    logs.push(`Starting replay of session: ${session.name}`);
    logs.push(`Navigating to URL: ${session.url}`);
    
    // Execute the script in a new process
    const process = exec(`npx playwright test ${session.scriptPath} --headed`);
    
    // Return immediately with process ID for real-time logs later
    return {
      success: true,
      message: 'Session replay started',
      logs,
      processId: process.pid?.toString()
    };
  } catch (error) {
    console.error(`Error executing session ${id}:`, error);
    return {
      success: false,
      message: 'Error executing session',
      logs: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
};

/**
 * Start a new recording session
 */
export const startRecordingSession = async (url: string): Promise<{
  success: boolean;
  message: string;
  processId?: string;
  outputPath?: string;
}> => {
  try {
    // Generate a temporary filename for the codegen output
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const outputPath = path.join(SESSIONS_DIR, `session_${timestamp}.ts`);
    
    // Start the Playwright codegen process
    // Ensure URL is properly quoted to avoid shell interpretation issues
    const escapedUrl = url.replace(/"/g, '\\"');
    const process = exec(`npx playwright codegen "${escapedUrl}" --output "${outputPath}"`);
    
    return {
      success: true,
      message: 'Recording session started',
      processId: process.pid?.toString(),
      outputPath
    };
  } catch (error) {
    console.error('Error starting recording session:', error);
    return {
      success: false,
      message: `Error starting recording session: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// ensureDirectoriesExist function is already defined above

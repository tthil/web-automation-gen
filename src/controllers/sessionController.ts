import { Request, Response } from 'express';
import { 
  getSessions, 
  saveSession,
  getSession,
  removeSession,
  executeSession,
  getSessionAlerts,
  acknowledgeAlert,
  getHistoricalMetrics
} from '../services/sessionService';

/**
 * Get all saved sessions
 */
export const getAllSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await getSessions();
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving sessions', error });
  }
};

/**
 * Get a specific session by ID
 */
export const getSessionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const session = await getSession(id);
    
    if (!session) {
      res.status(404).json({ message: `Session with ID ${id} not found` });
      return;
    }
    
    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving session', error });
  }
};

/**
 * Create a new session record
 */
export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, scriptPath, name } = req.body;
    
    if (!url) {
      res.status(400).json({ message: 'URL is required' });
      return;
    }
    
    // Use default script path if not provided
    const finalScriptPath = scriptPath || 'default';
    
    
    const session = await saveSession(url, finalScriptPath, name);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error creating session', error });
  }
};

/**
 * Delete a session by ID
 */
export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await removeSession(id);
    
    if (!deleted) {
      res.status(404).json({ message: `Session with ID ${id} not found` });
      return;
    }
    
    res.status(200).json({ message: `Session ${id} successfully deleted` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting session', error });
  }
};

/**
 * Replay/execute a session by ID
 */
export const replaySession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await executeSession(id);
    
    if (!result.success) {
      res.status(404).json({ message: result.message });
      return;
    }
    
    res.status(200).json({ message: 'Session replay started', logs: result.logs });
  } catch (error) {
    res.status(500).json({ message: 'Error replaying session', error });
  }
};

/**
 * Get alerts for a specific session
 */
export const getAlertsForSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const alerts = await getSessionAlerts(id);
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving session alerts', error });
  }
};

/**
 * Acknowledge or dismiss an alert
 */
export const dismissAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { alertId } = req.params;
    const success = await acknowledgeAlert(alertId);
    
    if (!success) {
      res.status(404).json({ message: `Alert with ID ${alertId} not found` });
      return;
    }
    
    res.status(200).json({ message: 'Alert acknowledged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error acknowledging alert', error });
  }
};

/**
 * Get historical metrics for a specified time period
 */
export const getHistoricalMetricsForPeriod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period } = req.params;
    
    // Validate period
    if (!['day', 'week', 'month', 'all'].includes(period)) {
      res.status(400).json({ message: 'Invalid period. Must be one of: day, week, month, all' });
      return;
    }
    
    const metrics = await getHistoricalMetrics(period);
    
    if (!metrics) {
      // No metrics available yet for this period
      res.status(200).json({ 
        period,
        available: false,
        message: `No historical metrics available yet for period: ${period}` 
      });
      return;
    }
    
    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving historical metrics', error });
  }
};

/**
 * Get all available historical metrics (all periods)
 */
export const getAllHistoricalMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const periods = ['day', 'week', 'month', 'all'] as const;
    type Period = typeof periods[number];
    const metricsPromises = periods.map(period => getHistoricalMetrics(period));
    
    const results = await Promise.all(metricsPromises);
    const metrics: Record<Period, any> = {} as Record<Period, any>;
    
    periods.forEach((period, index) => {
      metrics[period] = results[index] || { available: false };
    });
    
    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving historical metrics', error });
  }
};

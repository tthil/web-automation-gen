import express from 'express';
import { Request, Response } from 'express';
import { 
  getAllSessions, 
  createSession, 
  getSessionById, 
  deleteSession,
  replaySession,
  getAlertsForSession,
  dismissAlert,
  getHistoricalMetricsForPeriod,
  getAllHistoricalMetrics
} from '../controllers/sessionController';
import { addConnectionEvent, completeSession } from '../services/sessionService';

const router = express.Router();

// Middleware to log all requests to this router
router.use((req: Request, res: Response, next) => {
  console.log(`Session Router: ${req.method} ${req.originalUrl} (params: ${JSON.stringify(req.params)})`);
  next();
});

// Base routes - no params
router.get('/', getAllSessions);
router.post('/', createSession);

// Specific path routes - must be before /:id routes
router.get('/metrics/history', getAllHistoricalMetrics);
router.get('/metrics/history/:period', getHistoricalMetricsForPeriod);
router.put('/alerts/:alertId', dismissAlert);

// Debug endpoint for testing
router.get('/debug', (req: Request, res: Response) => {
  res.json({ message: 'Debug endpoint works' });
});

// ===== Session ID routes =====
// GET session by ID
router.get('/:id', getSessionById);

// DELETE session
router.delete('/:id', deleteSession);

// POST replay a session
router.post('/:id/replay', replaySession);

// PUT complete a session
router.put('/:id/complete', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    console.log(`Complete session endpoint hit for ID: ${id}`);
    
    const session = await completeSession(id);
    
    if (!session) {
      return res.status(404).json({ message: `Session with ID ${id} not found` });
    }
    
    res.status(200).json({ 
      message: `Session ${id} successfully completed`,
      session
    });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ message: 'Error completing session', error });
  }
});

// ==== THE PROBLEMATIC ENDPOINT ====
// POST add event to session
router.post('/:id/events', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    console.log(`🔔 EVENTS ENDPOINT HIT FOR SESSION ${id}`);
    console.log(`Request body:`, req.body);
    
    const { type, details, duration, latency, qualityIndicator } = req.body;
    
    // Validate required fields
    if (!type) {
      return res.status(400).json({ message: 'Event type is required' });
    }
    
    const validTypes = ['connected', 'disconnected', 'warning', 'reconnecting', 'reconnected', 'failed'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: `Invalid event type. Must be one of: ${validTypes.join(', ')}` 
      });
    }
    
    const updatedSession = await addConnectionEvent(id, type, details, duration, latency, qualityIndicator);
    
    if (!updatedSession) {
      return res.status(404).json({ message: `Session with ID ${id} not found` });
    }
    
    console.log(`✅ Event added successfully to session ${id}`);
    res.status(200).json({ 
      message: `${type} event added to session`,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error adding event to session:', error);
    res.status(500).json({ message: 'Error adding connection event', error });
  }
});

// GET session metrics
router.get('/:id/metrics', getSessionById);

// GET session alerts
router.get('/:id/alerts', getAlertsForSession);

export const simpleSessionRoutes = router;

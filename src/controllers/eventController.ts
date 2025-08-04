import { Request, Response } from 'express';
import { addConnectionEvent } from '../services/sessionService';

export async function handleSessionEvent(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.params.id;
    console.log(`🚨 SESSION EVENT HANDLER for session ${sessionId}`);
    console.log(`Request body:`, req.body);
    
    const { type, details, duration, latency, qualityIndicator } = req.body;
    
    // Validate required fields
    if (!type) {
      res.status(400).json({ message: 'Event type is required' });
      return;
    }
    
    const validTypes = ['connected', 'disconnected', 'warning', 'reconnecting', 'reconnected', 'failed'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ 
        message: `Invalid event type. Must be one of: ${validTypes.join(', ')}` 
      });
      return;
    }
    
    const updatedSession = await addConnectionEvent(
      sessionId, 
      type, 
      details, 
      duration, 
      latency, 
      qualityIndicator
    );
    
    if (!updatedSession) {
      res.status(404).json({ message: `Session with ID ${sessionId} not found` });
      return;
    }
    
    console.log(`✅ Event added successfully to session ${sessionId}`);
    res.status(200).json({ 
      message: `${type} event added to session`,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error adding event to session:', error);
    res.status(500).json({ message: 'Error adding connection event', error });
  }
}

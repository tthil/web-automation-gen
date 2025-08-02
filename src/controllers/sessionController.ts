import { Request, Response } from 'express';
import { 
  getSessions, 
  saveSession,
  getSession,
  removeSession,
  executeSession
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
    
    if (!url || !scriptPath) {
      res.status(400).json({ message: 'URL and script path are required' });
      return;
    }
    
    const session = await saveSession(url, scriptPath, name);
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

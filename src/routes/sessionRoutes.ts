import express from 'express';
import { 
  getAllSessions, 
  createSession, 
  getSessionById, 
  deleteSession,
  replaySession
} from '../controllers/sessionController';

const router = express.Router();

// GET all sessions
router.get('/', getAllSessions);

// GET specific session by ID
router.get('/:id', getSessionById);

// POST create a new session
router.post('/', createSession);

// DELETE a session
router.delete('/:id', deleteSession);

// POST replay a session
router.post('/:id/replay', replaySession);

export const sessionRoutes = router;

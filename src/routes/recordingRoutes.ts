import express from 'express';
import { 
  startRecording,
  stopRecording,
  getLogs,
} from '../controllers/recordingController';

const router = express.Router();

// POST start a new recording session
router.post('/record', startRecording);

// POST stop a recording or replay process
router.post('/stop/:pid', stopRecording);

// GET logs for a running process
router.get('/logs/:pid', getLogs);

export const recordingRoutes = router;

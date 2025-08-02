import express from 'express';
import path from 'path';
import fs from 'fs';

// Import controllers directly
import {
  getAllSessions,
  getSessionById,
  createSession,
  deleteSession,
  replaySession
} from './controllers/sessionController';

import {
  startRecording,
  stopRecording,
  getLogs
} from './controllers/recordingController';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Direct test endpoint to verify routing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Session routes - directly defined
app.get('/api/sessions', getAllSessions);
app.get('/api/sessions/:id', getSessionById);
app.post('/api/sessions', createSession);
app.delete('/api/sessions/:id', deleteSession);
app.post('/api/sessions/:id/replay', replaySession);

// Recording routes - directly defined
app.post('/api/recording/record', startRecording);
app.post('/api/recording/stop/:pid', stopRecording);
app.get('/api/recording/logs/:pid', getLogs);

// Serve static files - AFTER API routes to prevent conflicts
app.use(express.static(path.join(__dirname, '../public')));

// Root route for SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Catch-all route for SPA - placed AFTER all API routes and static files
// This ensures API routes take precedence
app.use((req, res, next) => {
  // Skip API requests to avoid interference with API routes
  if (req.path.startsWith('/api/')) {
    next();
  } else {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// Create necessary directories
const ensureDirectoriesExist = () => {
  const fs = require('fs');
  const dirs = [
    path.join(__dirname, '../sessions'),
    path.join(__dirname, '../metadata')
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
};

// Ensure directories exist before starting server
ensureDirectoriesExist();

// Start the server
console.log('Starting server...');
try {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
}

export default app;

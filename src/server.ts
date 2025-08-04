import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

// Import routers and utilities
import { simpleSessionRoutes } from './routes/simpleSessionRoutes';
import { printRoutes } from './routeDebug';

import {
  startRecording,
  stopRecording,
  getLogs,
  getRecordingStatus
} from './controllers/recordingController';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Detailed request logging middleware
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log(`Request params: ${JSON.stringify(req.params)}`);
  console.log(`Request query: ${JSON.stringify(req.query)}`);
  console.log(`Request body: ${JSON.stringify(req.body)}`);
  console.log(`Path: ${req.path}`);
  next();
});

// Direct test endpoint to verify routing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Use session routes via router - this will handle ALL session routes including /:id/events
app.use('/api/sessions', simpleSessionRoutes);

// Recording routes - directly defined
app.post('/api/recording/start', startRecording); // Note: this seems to be 'start' in the frontend code, not 'record'
app.post('/api/recording/stop/:pid', stopRecording);
app.get('/api/recording/logs/:pid', getLogs);
app.get('/api/recording/status/:pid', getRecordingStatus);

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
    path.join(__dirname, '../metadata'),
    path.join(__dirname, '../alerts'),
    path.join(__dirname, '../history')
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

// Route debugging will be done below

// Start the server
console.log('Starting server...');
try {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Print all registered routes for debugging
    printRoutes(app);
  });
} catch (error) {
  console.error('Failed to start server:', error);
}

export default app;

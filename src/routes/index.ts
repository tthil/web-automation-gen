import { Express } from 'express';
import path from 'path';
import { sessionRoutes } from './sessionRoutes';
import { recordingRoutes } from './recordingRoutes';

/**
 * Set up all application routes
 * @param app Express application instance
 */
export const setupRoutes = (app: Express): void => {
  // API Routes
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/recording', recordingRoutes);
  
  // Serve the main HTML file for all other routes (SPA style)
  // Use a more specific pattern to avoid conflicts with API routes
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });
  
  // Catch-all route for SPA navigation
  app.use((req, res, next) => {
    // Skip API requests
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });
};

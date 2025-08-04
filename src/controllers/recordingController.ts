import { Request, Response } from 'express';
import * as path from 'path';
import { ProcessManager } from '../utils/processManager';
import * as sessionService from '../services/sessionService';

// Process manager to keep track of running processes
const processManager = ProcessManager.getInstance();

/**
 * Start a new recording session
 */
export const startRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, sessionName, tags } = req.body;
    
    if (!url) {
      res.status(400).json({ success: false, message: 'URL is required' });
      return;
    }
    
    const result = await sessionService.startRecordingSession(url);
    
    if (!result.success) {
      res.status(500).json({ success: false, message: result.message });
      return;
    }
    
    // If we have a process ID, register it with the process manager
    if (result.processId) {
      processManager.registerProcess(result.processId, 'recording');
      
      // Create a new enhanced session with connection tracking
      const session = await sessionService.saveSession(
        url,
        result.outputPath || '',  // Ensure it's always a string
        sessionName,
        result.processId,
        Array.isArray(tags) ? tags : tags ? [tags] : undefined
      );
      
      // Register a listener for process termination to update connection events
      const process = processManager.getProcess(result.processId);
      if (process && process.process) {
        process.process.on('exit', (code: number | null) => {
          // If code is 0, it was normal termination
          if (code === 0) {
            sessionService.completeSession(session.id).catch((err: Error) => {
              console.error(`Error completing session ${session.id}:`, err);
            });
          } else {
            // Abnormal termination
            sessionService.addConnectionEvent(
              session.id,
              'failed',
              `Process terminated abnormally with code ${code}`
            ).catch((err: Error) => {
              console.error(`Error adding termination event to session ${session.id}:`, err);
            });
          }
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Recording session started',
      processId: result.processId,
      outputPath: result.outputPath
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error starting recording: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

/**
 * Stop a recording or replay process
 */
export const stopRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pid } = req.params;
    
    if (!pid) {
      res.status(400).json({ success: false, message: 'Process ID is required' });
      return;
    }
    
    // Get the session associated with this process ID before stopping it
    try {
      // Try to find the session by process ID to mark it as completed
      const session = await sessionService.recoverSessionByProcessId(pid);
      
      if (session) {
        // Add a connection event for manual stop
        await sessionService.addConnectionEvent(
          session.id,
          'disconnected',
          'Recording manually stopped by user'
        );
        
        // Mark the session as completed normally
        await sessionService.completeSession(session.id);
        console.log(`Session ${session.id} marked as completed normally`);
      }
    } catch (sessionError) {
      // Don't fail the whole request if session completion fails
      console.error(`Error completing session for process ${pid}:`, sessionError);
    }
    
    const success = processManager.killProcess(pid);
    
    if (!success) {
      res.status(404).json({ success: false, message: `Process ${pid} not found or already stopped` });
      return;
    }
    
    res.status(200).json({ success: true, message: 'Process stopped successfully' });
  } catch (error) {
    console.error('Error stopping process:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error stopping process: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

/**
 * Get logs for a running process
 */
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pid } = req.params;
    
    if (!pid) {
      res.status(400).json({ success: false, message: 'Process ID is required' });
      return;
    }
    
    const logs = processManager.getLogs(pid);
    const isRunning = processManager.isProcessRunning(pid);
    
    res.status(200).json({
      logs,
      completed: !isRunning,
      success: !logs.some((log: { type: string }) => log.type === 'error')
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error getting logs: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

/**
 * Record a connection event for a session
 */
export const recordConnectionEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { processId } = req.params;
    const { eventType, details, duration } = req.body;
    
    if (!processId) {
      res.status(400).json({ success: false, message: 'Process ID is required' });
      return;
    }
    
    if (!eventType || !['connected', 'disconnected', 'warning', 'reconnecting', 'reconnected', 'failed'].includes(eventType)) {
      res.status(400).json({ success: false, message: 'Valid event type is required' });
      return;
    }
    
    // First, try to find the session by processId
    const session = await sessionService.recoverSessionByProcessId(processId);
    
    if (!session) {
      res.status(404).json({ success: false, message: 'No active session found for this process ID' });
      return;
    }
    
    // Record the connection event
    const updatedSession = await sessionService.addConnectionEvent(
      session.id,
      eventType as 'connected' | 'disconnected' | 'warning' | 'reconnecting' | 'reconnected' | 'failed',
      details,
      duration
    );
    
    if (!updatedSession) {
      res.status(500).json({ success: false, message: 'Failed to record connection event' });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Connection event recorded',
      session: {
        id: updatedSession.id,
        name: updatedSession.name,
        connectionMetrics: updatedSession.connectionMetrics
      }
    });
  } catch (error) {
    console.error('Error recording connection event:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error recording connection event: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

/**
 * Recover a session by process ID
 */
export const recoverSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { processId } = req.params;
    
    if (!processId) {
      res.status(400).json({ success: false, message: 'Process ID is required' });
      return;
    }
    
    const session = await sessionService.recoverSessionByProcessId(processId);
    
    if (!session) {
      res.status(404).json({ success: false, message: 'No active session found for this process ID' });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Session recovered successfully',
      session: {
        id: session.id,
        name: session.name,
        url: session.url,
        createdAt: session.createdAt,
        connectionMetrics: session.connectionMetrics
      }
    });
  } catch (error) {
    console.error('Error recovering session:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error recovering session: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

/**
 * Get status of a recording process
 */
export const getRecordingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pid } = req.params;
    
    if (!pid) {
      res.status(400).json({ success: false, message: 'Process ID is required' });
      return;
    }
    
    const isRunning = processManager.isProcessRunning(pid);
    const processType = processManager.getProcessType(pid);
    
    // Determine the status based on whether the process is running and its type
    let status = 'unknown';
    if (isRunning && processType === 'recording') {
      status = 'recording';
    } else if (!isRunning && processType === 'recording') {
      status = 'stopped';
    } else if (isRunning && processType === 'replay') {
      status = 'replaying';
    } else if (!isRunning && processType === 'replay') {
      status = 'replay_stopped';
    }
    
    res.status(200).json({
      success: true,
      processId: pid,
      status,
      isRunning
    });
  } catch (error) {
    console.error('Error getting recording status:', error);
    res.status(500).json({ 
      success: false, 
      message: `Error getting status: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

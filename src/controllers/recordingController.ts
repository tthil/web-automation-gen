import { Request, Response } from 'express';
import { startRecordingSession } from '../services/sessionService';
import { ProcessManager } from '../utils/processManager';

// Process manager to keep track of running processes
const processManager = ProcessManager.getInstance();

/**
 * Start a new recording session
 */
export const startRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    
    if (!url) {
      res.status(400).json({ success: false, message: 'URL is required' });
      return;
    }
    
    const result = await startRecordingSession(url);
    
    if (!result.success) {
      res.status(500).json({ success: false, message: result.message });
      return;
    }
    
    // If we have a process ID, register it with the process manager
    if (result.processId) {
      processManager.registerProcess(result.processId, 'recording');
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

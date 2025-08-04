/**
 * Utility to manage running processes
 */

import { ChildProcess } from 'child_process';

// Log entry type
interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

// Process info type
interface ProcessInfo {
  process: ChildProcess | null;
  type: 'recording' | 'replay';
  logs: LogEntry[];
}

export class ProcessManager {
  private static instance: ProcessManager;
  private processes: Map<string, ProcessInfo> = new Map();
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }
  
  /**
   * Register a new process
   * @param processId Process ID
   * @param type Type of process
   * @param process Optional ChildProcess object
   */
  public registerProcess(processId: string, type: 'recording' | 'replay', process?: ChildProcess): void {
    this.processes.set(processId, {
      process: process || null,
      type,
      logs: [
        {
          timestamp: new Date().toISOString(),
          message: `Started ${type} process with ID: ${processId}`,
          type: 'info'
        }
      ]
    });
    
    // Clean up process when it exits
    if (process) {
      process.on('exit', (code) => {
        this.addLog(processId, `Process exited with code ${code}`, code === 0 ? 'success' : 'error');
        
        // Keep the logs but mark the process as null
        const info = this.processes.get(processId);
        if (info) {
          info.process = null;
        }
      });
      
      // Capture stdout
      process.stdout?.on('data', (data) => {
        this.addLog(processId, data.toString().trim());
      });
      
      // Capture stderr
      process.stderr?.on('data', (data) => {
        this.addLog(processId, data.toString().trim(), 'error');
      });
    }
  }
  
  /**
   * Kill a running process
   * @param processId Process ID
   * @returns Whether the process was successfully killed
   */
  public killProcess(processId: string): boolean {
    const info = this.processes.get(processId);
    
    if (!info || !info.process) {
      return false;
    }
    
    try {
      // Kill the process
      const success = info.process.kill();
      
      if (success) {
        this.addLog(processId, 'Process stopped by user', 'info');
        info.process = null;
      }
      
      return success;
    } catch (error) {
      console.error(`Error killing process ${processId}:`, error);
      return false;
    }
  }
  
  /**
   * Check if a process is still running
   * @param processId Process ID
   * @returns Whether the process is running
   */
  public isProcessRunning(processId: string): boolean {
    const info = this.processes.get(processId);
    return !!(info && info.process);
  }
  
  /**
   * Add a log entry for a process
   * @param processId Process ID
   * @param message Log message
   * @param type Log type
   */
  public addLog(
    processId: string, 
    message: string, 
    type: 'info' | 'error' | 'success' = 'info'
  ): void {
    const info = this.processes.get(processId);
    
    if (info) {
      info.logs.push({
        timestamp: new Date().toISOString(),
        message,
        type
      });
    }
  }
  
  /**
   * Get all logs for a process
   * @param processId Process ID
   * @returns Array of log entries
   */
  public getLogs(processId: string): LogEntry[] {
    const info = this.processes.get(processId);
    return info ? info.logs : [];
  }
  
  /**
   * Get the type of a process (recording or replay)
   * @param processId Process ID
   * @returns Process type or undefined if not found
   */
  public getProcessType(processId: string): 'recording' | 'replay' | undefined {
    const info = this.processes.get(processId);
    return info ? info.type : undefined;
  }
  
  /**
   * Get the process info for a given process ID
   * @param processId Process ID
   * @returns ProcessInfo object or undefined if not found
   */
  public getProcess(processId: string): ProcessInfo | undefined {
    return this.processes.get(processId);
  }
  
  /**
   * Clean up old processes and logs
   * Removes processes that have been completed for more than 1 hour
   */
  public cleanUp(): void {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    this.processes.forEach((info, id) => {
      // Skip running processes
      if (info.process) {
        return;
      }
      
      // Check the timestamp of the last log
      const lastLog = info.logs[info.logs.length - 1];
      
      if (lastLog && new Date(lastLog.timestamp) < oneHourAgo) {
        this.processes.delete(id);
      }
    });
  }
}

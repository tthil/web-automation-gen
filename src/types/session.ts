/**
 * Represents a saved session in the application
 */
export interface Session {
  /** Unique identifier for the session */
  id: string;
  
  /** Human-readable name for the session */
  name: string;
  
  /** URL that the session was recorded from */
  url: string;
  
  /** Path to the TypeScript file containing the session script */
  scriptPath: string;
  
  /** ISO timestamp when the session was created */
  createdAt: string;
}

/**
 * Result of a session replay operation
 */
export interface ReplayResult {
  /** Whether the replay was successfully started */
  success: boolean;
  
  /** Message describing the result */
  message: string;
  
  /** Log entries from the replay process */
  logs: string[];
  
  /** Optional ID of the process running the replay */
  processId?: string;
}

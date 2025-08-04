/**
 * Represents a connection event during a recording session
 */
export interface ConnectionEvent {
  /** Timestamp when the event occurred */
  timestamp: string;
  
  /** Type of connection event */
  type: 'connected' | 'disconnected' | 'warning' | 'reconnecting' | 'reconnected' | 'failed';
  
  /** Duration of the event in milliseconds (for disconnections) */
  duration?: number;
  
  /** Any additional details about the event */
  details?: string;
  
  /** Latency at the time of the event (in ms) */
  latency?: number;
  
  /** Network quality indicator at the time of the event (0-100) */
  qualityIndicator?: number;
}

/**
 * Represents a saved session in the application
 */
/**
 * Historical time-based statistics for connection metrics
 */
export interface HistoricalMetrics {
  /** Period this data covers (e.g., 'day', 'week', 'month', 'all') */
  period: string;
  
  /** Start timestamp for this period */
  startTime: string;
  
  /** End timestamp for this period */
  endTime: string;
  
  /** Average quality score for this period */
  averageQualityScore: number;
  
  /** Average disconnection count per session */
  averageDisconnectionCount: number;
  
  /** Average downtime percentage */
  averageDowntimePercentage: number;
  
  /** Total sessions included in this period */
  sessionCount: number;
  
  /** Quality trend direction (improving, declining, stable) */
  trend?: 'improving' | 'declining' | 'stable';
  
  /** Percentage change from previous period */
  changePercentage?: number;
  
  /** Sessions with issues during this period */
  problemSessionCount?: number;
}

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
  
  /** ISO timestamp when the session was last modified */
  updatedAt?: string;
  
  /** Connection quality metrics for the session */
  connectionMetrics?: {
    /** Total number of disconnections during recording */
    disconnectionCount: number;
    
    /** Total time disconnected in milliseconds */
    totalDisconnectionTime: number;
    
    /** Number of successful reconnections */
    reconnectionCount: number;
    
    /** Whether the session completed normally or was interrupted */
    completedNormally: boolean;
    
    /** Overall connection quality score (0-100) */
    qualityScore?: number;
    
    /** Average latency during the session (in ms) */
    averageLatency?: number;
    
    /** Maximum latency recorded during the session (in ms) */
    maxLatency?: number;
    
    /** Percentage of time the connection was in a stable state */
    stabilityPercentage?: number;
    
    /** Reconnection success rate (0-1) */
    reconnectionSuccessRate?: number;
    
    /** Failed reconnection attempts */
    failedReconnectionCount?: number;
  };
  
  /** Detailed log of connection events during the session */
  connectionEvents?: ConnectionEvent[];
  
  /** Process ID associated with this recording session */
  processId?: string;
  
  /** Additional tags for the session */
  tags?: string[];
}

/**
 * Result of a session replay operation
 */
/**
 * Alert generated from connection metrics
 */
export interface ConnectionAlert {
  /** Unique identifier for the alert */
  id: string;
  
  /** Timestamp when the alert was generated */
  timestamp: string;
  
  /** Alert severity level */
  severity: 'info' | 'warning' | 'critical';
  
  /** Alert type */
  type: 'quality' | 'disconnection' | 'reconnection' | 'downtime';
  
  /** Human-readable message */
  message: string;
  
  /** ID of the session that triggered this alert */
  sessionId: string;
  
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
  
  /** Timestamp when the alert was acknowledged (if applicable) */
  acknowledgedAt?: string;
  
  /** Additional context about the alert */
  context?: Record<string, any>;
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

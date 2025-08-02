import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { Session, ReplayResult } from '../types/session';

// Path constants
const METADATA_DIR = path.join(process.cwd(), 'metadata');
const SESSIONS_DIR = path.join(process.cwd(), 'sessions');

/**
 * Get all saved sessions
 */
export const getSessions = async (): Promise<Session[]> => {
  try {
    await ensureDirectoriesExist();
    const files = await fs.readdir(METADATA_DIR);
    const metadataFiles = files.filter(file => file.endsWith('.json'));
    
    const sessions = await Promise.all(
      metadataFiles.map(async (file) => {
        const data = await fs.readFile(path.join(METADATA_DIR, file), 'utf-8');
        return JSON.parse(data) as Session;
      })
    );
    
    // Sort by creation date, newest first
    return sessions.sort((a: Session, b: Session) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
};

/**
 * Get a specific session by ID
 */
export const getSession = async (id: string): Promise<Session | null> => {
  try {
    await ensureDirectoriesExist();
    const metadataPath = path.join(METADATA_DIR, `${id}.json`);
    const data = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(data) as Session;
  } catch (error) {
    console.error(`Error getting session ${id}:`, error);
    return null;
  }
};

/**
 * Save a new session
 */
export const saveSession = async (
  url: string, 
  scriptPath: string, 
  name?: string
): Promise<Session> => {
  try {
    await ensureDirectoriesExist();
    
    // Create unique ID
    const id = uuidv4();
    
    // Generate session name if not provided
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const sessionName = name || `Session_${timestamp}`;
    
    // Create session metadata
    const session: Session = {
      id,
      name: sessionName,
      url,
      scriptPath,
      createdAt: new Date().toISOString(),
    };
    
    // Save metadata
    await fs.writeFile(
      path.join(METADATA_DIR, `${id}.json`),
      JSON.stringify(session, null, 2)
    );
    
    return session;
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
};

/**
 * Delete a session by ID
 */
export const removeSession = async (id: string): Promise<boolean> => {
  try {
    await ensureDirectoriesExist();
    const metadataPath = path.join(METADATA_DIR, `${id}.json`);
    const session = await getSession(id);
    
    if (!session) {
      return false;
    }
    
    // Delete the metadata file
    await fs.unlink(metadataPath);
    
    // Delete the script file if it exists
    if (session.scriptPath) {
      try {
        await fs.access(session.scriptPath);
        await fs.unlink(session.scriptPath);
      } catch (e) {
        // File might not exist, ignore error
        console.log(`Script file not found: ${session.scriptPath}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error removing session ${id}:`, error);
    return false;
  }
};

/**
 * Execute a session by ID
 */
export const executeSession = async (id: string): Promise<ReplayResult> => {
  try {
    const session = await getSession(id);
    
    if (!session) {
      return {
        success: false,
        message: `Session with ID ${id} not found`,
        logs: []
      };
    }
    
    // Check if script file exists
    try {
      await fs.access(session.scriptPath);
    } catch (e) {
      return {
        success: false,
        message: `Script file not found: ${session.scriptPath}`,
        logs: []
      };
    }
    
    // Execute the script using Playwright
    const logs: string[] = [];
    logs.push(`Starting replay of session: ${session.name}`);
    logs.push(`Navigating to URL: ${session.url}`);
    
    // Execute the script in a new process
    const process = exec(`npx playwright test ${session.scriptPath} --headed`);
    
    // Return immediately with process ID for real-time logs later
    return {
      success: true,
      message: 'Session replay started',
      logs,
      processId: process.pid?.toString()
    };
  } catch (error) {
    console.error(`Error executing session ${id}:`, error);
    return {
      success: false,
      message: 'Error executing session',
      logs: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
};

/**
 * Start a new recording session
 */
export const startRecordingSession = async (url: string): Promise<{
  success: boolean;
  message: string;
  processId?: string;
  outputPath?: string;
}> => {
  try {
    // Generate a temporary filename for the codegen output
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const outputPath = path.join(SESSIONS_DIR, `session_${timestamp}.ts`);
    
    // Start the Playwright codegen process
    // Ensure URL is properly quoted to avoid shell interpretation issues
    const escapedUrl = url.replace(/"/g, '\\"');
    const process = exec(`npx playwright codegen "${escapedUrl}" --output "${outputPath}"`);
    
    return {
      success: true,
      message: 'Recording session started',
      processId: process.pid?.toString(),
      outputPath
    };
  } catch (error) {
    console.error('Error starting recording session:', error);
    return {
      success: false,
      message: `Error starting recording session: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Ensure the required directories exist
 */
async function ensureDirectoriesExist(): Promise<void> {
  try {
    await fs.mkdir(METADATA_DIR, { recursive: true });
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
}

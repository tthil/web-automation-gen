# Web Automation Application - Product Requirements Document

## Overview
The Web Automation application is a local web-based tool that enables users to record web browsing sessions using Playwright's codegen functionality and replay them later. The application provides a simple interface for session management and automation workflow.

## Target Platform
- **Platform**: Local web application (browser-based)
- **Operating System**: macOS
- **Runtime**: Node.js with Playwright

## Core Features

### 1. Session Recording
**Primary Flow:**
1. User enters a target URL in the input field
2. User clicks "Start Session" button
3. Playwright codegen browser opens immediately to the specified URL in headed mode
4. User performs actions in the browser (clicks, form fills, navigation, etc.)
5. User returns to the application and clicks "Save Session" button
6. File save dialog appears for user to choose location and confirm filename
7. Session is saved as TypeScript file and added to the session list
8. UI resets for immediate new session recording

**Technical Requirements:**
- Use Playwright's `playwright codegen` command
- Generate TypeScript code output
- Handle invalid/unreachable URLs with standard browser behavior (404, connection errors, etc.)

### 2. Session Management
**Session List View:**
- Display all saved sessions in a list format
- Show for each session:
  - Session Name (format: `Session_YYYY-MM-DD_HH-MM-SS`)
  - Date Created
  - Target URL
- Allow selection and replay of any saved session
- Include delete functionality for session management

**File Handling:**
- Always prompt user for save location via file save dialog
- Handle filename conflicts by asking user for action (overwrite/rename)
- Store session metadata for list display

### 3. Session Replay
**Replay Flow:**
1. User selects a saved session from the list
2. User clicks replay/run button
3. Session executes in headed browser mode
4. Real-time logs display in a separate panel within the app
5. User can stop/cancel replay at any time
6. Success/failure status shown upon completion
7. Warning notification displayed if replay fails

**Technical Requirements:**
- Execute saved TypeScript files using appropriate runtime
- Show browser window during replay (headed mode)
- Provide real-time logging panel
- Include stop/cancel functionality
- Handle replay failures with simple warning notifications

## User Interface Layout

### Main Application Window
```
┌─────────────────────────────────────────────────────────────┐
│ Web Automation Tool                                    [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ URL: [________________________________] [Start Session]    │
│                                        [Save Session]      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Saved Sessions                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ □ Session_2024-08-02_14-30-45                          │ │
│ │   Created: Aug 2, 2024 2:30 PM                         │ │
│ │   URL: https://example.com                              │ │
│ │   [Replay] [Delete]                                     │ │
│ │                                                         │ │
│ │ □ Session_2024-08-02_15-45-12                          │ │
│ │   Created: Aug 2, 2024 3:45 PM                         │ │
│ │   URL: https://another-site.com                         │ │
│ │   [Replay] [Delete]                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Replay Logs                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [14:32:15] Starting replay of Session_2024-08-02...     │ │
│ │ [14:32:16] Navigating to https://example.com            │ │
│ │ [14:32:17] Clicking element: button[data-id="submit"]   │ │
│ │ [14:32:18] Replay completed successfully                │ │
│ │                                        [Stop Replay]    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Button States and Behavior

### Recording State Management
- **Initial State**: "Start Session" enabled, "Save Session" disabled
- **During Recording**: "Start Session" disabled, "Save Session" enabled
- **After Save**: Both buttons reset to initial state

### Session List Interactions
- Single-click selection highlights session
- "Replay" button executes selected session
- "Delete" button removes session with confirmation dialog

## Error Handling

### URL Validation
- No client-side URL validation required
- Let browser handle invalid URLs naturally (404, DNS errors, etc.)
- Display standard browser error pages

### Replay Failures
- Show simple warning notification: "Session replay failed"
- No detailed error reporting required
- Allow user to retry or cancel

### File Conflicts
- When saving session with existing filename:
  - Show dialog: "File exists. Overwrite or rename?"
  - Provide options for user action

## Application Lifecycle

### Startup
- Load and display previously saved sessions
- Initialize UI in ready state

### Shutdown
- Show confirmation dialog: "Are you sure you want to close the application?"
- Clean up any running processes
- Save application state if needed

## Technical Architecture

### Core Components
1. **Frontend**: Local web application (HTML/CSS/JavaScript)
2. **Backend**: Node.js server for Playwright integration
3. **Session Storage**: Local file system for TypeScript files and metadata
4. **Process Management**: Handle Playwright codegen and execution processes

### Dependencies
- Playwright (with TypeScript support)
- Node.js runtime
- Local web server (Express.js or similar)
- File system APIs for session management

### File Structure
```
/web-automation-app
  /sessions          # Generated TypeScript files
  /metadata          # Session metadata (JSON)
  /public            # Web app frontend files
  /src               # Backend server code
  package.json       # Dependencies and scripts
```

## Success Criteria
1. User can successfully record web interactions using Playwright codegen
2. Generated TypeScript files are properly saved and organized
3. Saved sessions can be reliably replayed with visual feedback
4. Session management (list, delete, replay) works intuitively
5. Real-time logging provides useful feedback during replay
6. Application handles errors gracefully without crashes

## Future Considerations
- Session export/import functionality
- Session scheduling/automation
- Integration with CI/CD pipelines
- Session sharing between users
- Advanced logging and debugging features
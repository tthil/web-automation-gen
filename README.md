# Web Automation Generator

A local web-based tool for recording and replaying web browsing sessions using Playwright's codegen functionality.

## Features

- **Session Recording**: Record web browsing sessions using Playwright codegen
- **Session Management**: Save, list, and delete recorded sessions
- **Session Replay**: Execute saved sessions in a headed browser with real-time logs
- **Simple Interface**: User-friendly UI for managing automation workflows

## Project Structure

```
/web-automation-gen
  /src               # Backend server code
    /controllers     # Request handlers
    /routes          # API routes
    /services        # Business logic
    /utils           # Helper functions
    /types           # TypeScript type definitions
  /public            # Web app frontend files
    /css             # Stylesheets
    /js              # Client-side scripts
    /images          # UI images and icons
  /sessions          # Generated TypeScript files
  /metadata          # Session metadata (JSON)
  /dist              # Compiled JavaScript output
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- macOS (primary supported platform)

## Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Usage

1. Navigate to the web interface (typically http://localhost:3000)
2. Enter a URL and click "Start Session"
3. Perform actions in the Playwright browser that opens
4. Return to the app and click "Save Session"
5. Manage and replay your saved sessions

## Running the Server

```bash
# Development mode
npx ts-node src/server.ts

# Or using npm script (if configured)
npm run dev
```

The server will start on http://localhost:3000 by default.

## API Endpoints

### Session Management

- `GET /api/sessions` - List all saved sessions
- `GET /api/sessions/:id` - Get session details by ID
- `POST /api/sessions` - Create a new session
- `DELETE /api/sessions/:id` - Delete a session
- `POST /api/sessions/:id/replay` - Replay/execute a session

### Recording Control

- `POST /api/recording/record` - Start a new recording session
- `POST /api/recording/stop/:pid` - Stop a recording process
- `GET /api/recording/logs/:pid` - Get logs from a running process

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## License

MIT

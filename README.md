# GitLab Pipeline Status Checker

An Electron-based desktop application for monitoring GitLab pipeline and job statuses by URL.

## Features

- 🔗 **URL-based monitoring** - Simply paste a GitLab job URL to start tracking
- 📊 **Multiple job tracking** - Monitor multiple jobs simultaneously in a list view
- 🔄 **Auto-refresh** - Jobs automatically refresh every 10 seconds while running
- 🔔 **Desktop notifications** - Get notified when jobs complete or fail
- 🔐 **Secure token storage** - GitLab access token stored locally with UI settings
- 💎 **Modern UI** - Clean, responsive interface with real-time status updates

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the application:
   ```bash
   npm start
   ```

2. Configure your GitLab access token:
   - Click the ⚙️ Settings button
   - Enter your GitLab Personal Access Token
   - Click Save

3. Add a job to monitor:
   - Paste a GitLab job URL (e.g., `https://gitlab.example.com/project/name/-/jobs/12345`)
   - Click "Add Job"
   - The job will appear in the list and auto-refresh if it's still running

## GitLab Access Token

To create a GitLab Personal Access Token:

1. Go to your GitLab instance
2. Navigate to Settings → Access Tokens
3. Create a token with `read_api` scope
4. Copy the token and paste it in the app settings

## Supported Job Statuses

- ✅ **Success** - Job completed successfully
- ❌ **Failed** - Job failed
- 🔄 **Running** - Job is currently running (auto-refreshes)
- ⏳ **Pending** - Job is waiting to start (auto-refreshes)
- ⛔ **Canceled** - Job was canceled

## Development

Run in development mode:
```bash
npm run dev
```

## Build & Deploy

To build the application into a standalone Windows executable:

### Prerequisites

- Node.js 18+ installed
- npm installed

### Build Steps

1. **Install dependencies** (including dev dependencies):
   ```bash
   npm install
   ```

2. **Build the installer** (creates NSIS installer):
   ```bash
   npm run build
   ```

3. **Or build a portable executable** (no installation required):
   ```bash
   npm run build:portable
   ```

### Output

After building, the executable files will be located in the `dist/` folder:

- **Installer**: `dist/GitLab Pipeline Checker Setup 1.0.0.exe`
- **Portable**: `dist/GitLab Pipeline Checker 1.0.0.exe` (if using portable build)

### Build Configuration

The build is configured in `package.json` under the `build` section:

- **appId**: `com.gitlab.pipeline-status-checker`
- **productName**: `GitLab Pipeline Checker`
- **Target**: Windows x64 (NSIS installer)

### Customization

To add an application icon:
1. Create an icon file (`.ico` format, recommended 256x256)
2. Update `package.json` build section:
   ```json
   "win": {
     "icon": "path/to/icon.ico"
   }
   ```

## License

MIT

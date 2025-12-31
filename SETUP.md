# Setup Instructions for GitLab Pipeline Status Checker

## Prerequisites
- Node.js (v16 or higher) installed on your system
- GitLab Personal Access Token with `read_api` scope

## Installation Steps

1. **Install Dependencies**
   Open a terminal in this directory and run:
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   npm start
   ```

## First-Time Configuration

1. When the app opens, click the **⚙️ Settings** button in the top-right corner
2. Enter your GitLab Personal Access Token
3. Click **Save**

### How to Get a GitLab Access Token:
- Go to your GitLab instance (e.g., https://gitlab.citigo.com.vn)
- Navigate to: User Settings → Access Tokens
- Create a new token with `read_api` scope
- Copy and paste it into the app settings

## Usage

1. **Add a Job to Monitor:**
   - Copy a GitLab job URL from your browser (e.g., `https://gitlab.citigo.com.vn/citigo/kiotviet-core/-/jobs/4667443`)
   - Paste it into the input field at the top of the app
   - Click **Add Job** or press Enter

2. **Monitor Jobs:**
   - Jobs appear in a list with real-time status updates
   - Running/pending jobs auto-refresh every 10 seconds
   - Completed/failed jobs stop auto-refreshing

3. **Manual Refresh:**
   - Click the **🔄 Refresh** button on any job card to update immediately

4. **Remove Jobs:**
   - Click the **✕ Remove** button to stop monitoring a job

## Features

✅ **Multiple Job Tracking** - Monitor multiple jobs simultaneously  
✅ **Auto-Refresh** - Running jobs update every 10 seconds  
✅ **Desktop Notifications** - Get notified when jobs complete or fail  
✅ **Secure Storage** - Token stored locally on your machine  
✅ **Rich Information** - View job status, duration, pipeline info, and more  

## Troubleshooting

**"GitLab token not configured" error:**
- Make sure you've set your access token in Settings (⚙️)

**"Invalid GitLab job URL format" error:**
- Ensure the URL follows this pattern: `https://gitlab.domain.com/project/path/-/jobs/12345`

**Jobs not updating:**
- Check your internet connection
- Verify your access token is still valid
- Manually refresh the job to see if there's an API error

## File Structure

```
GitHelper/
├── main.js              # Electron main process
├── preload.js           # Preload script for security
├── url-parser.js        # URL parsing utility
├── gitlab-api.js        # GitLab API client
├── index.html           # UI layout
├── styles.css           # Styling
├── renderer.js          # Frontend logic
├── package.json         # Dependencies
└── README.md            # Documentation
```

## Development

For development with auto-reload:
```bash
npm run dev
```

## Support

For issues or questions, check:
- GitLab API documentation: https://docs.gitlab.com/ee/api/
- Electron documentation: https://www.electronjs.org/docs

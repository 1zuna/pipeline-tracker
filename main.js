const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseGitLabJobUrl, parseGitLabPipelineUrl, parseGitLabUrl, parseGitLabRepoUrl } = require('./url-parser');
const GitLabAPI = require('./gitlab-api');

let mainWindow;
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return {};
}

ipcMain.handle('save-token', async (event, token) => {
  const config = loadConfig();
  config.token = token;
  saveConfig(config);
  return { success: true };
});

ipcMain.handle('get-token', async () => {
  const config = loadConfig();
  return config.token || '';
});

ipcMain.handle('fetch-job-status', async (event, url) => {
  const config = loadConfig();
  const token = config.token;

  if (!token) {
    return {
      success: false,
      error: 'GitLab token not configured. Please set it in settings.'
    };
  }

  const parsed = parseGitLabJobUrl(url);
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid GitLab job URL format'
    };
  }

  const api = new GitLabAPI(parsed.baseUrl, token);
  const result = await api.getJobStatus(parsed.projectPath, parsed.jobId);

  if (result.success && Notification.isSupported()) {
    const status = result.data.status;
    if (status === 'success' || status === 'failed') {
      const notification = new Notification({
        title: `Job ${status === 'success' ? 'Completed' : 'Failed'}`,
        body: `${result.data.name} - ${result.data.stage}`
      });
      notification.show();
    }
  }

  return result;
});

ipcMain.handle('fetch-pipeline-status', async (event, url) => {
  const config = loadConfig();
  const token = config.token;

  if (!token) {
    return {
      success: false,
      error: 'GitLab token not configured. Please set it in settings.'
    };
  }

  const parsed = parseGitLabPipelineUrl(url);
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid GitLab pipeline URL format'
    };
  }

  const api = new GitLabAPI(parsed.baseUrl, token);
  const result = await api.getPipelineStatus(parsed.projectPath, parsed.pipelineId);

  if (result.success && Notification.isSupported()) {
    const status = result.data.status;
    if (status === 'success' || status === 'failed') {
      const notification = new Notification({
        title: `Pipeline ${status === 'success' ? 'Completed' : 'Failed'}`,
        body: `Pipeline #${result.data.id} on ${result.data.ref}`
      });
      notification.show();
    }
  }

  return result;
});

ipcMain.handle('get-current-user', async (event, baseUrl) => {
  const config = loadConfig();
  const token = config.token;

  if (!token) {
    return {
      success: false,
      error: 'GitLab token not configured. Please set it in settings.'
    };
  }

  const api = new GitLabAPI(baseUrl, token);
  return await api.getCurrentUser();
});

ipcMain.handle('get-project-jobs', async (event, baseUrl, projectPath, scope) => {
  const config = loadConfig();
  const token = config.token;

  if (!token) {
    return {
      success: false,
      error: 'GitLab token not configured. Please set it in settings.'
    };
  }

  const api = new GitLabAPI(baseUrl, token);
  return await api.getProjectJobs(projectPath, scope);
});

ipcMain.handle('save-auto-track-config', async (event, autoTrackConfig) => {
  const config = loadConfig();
  config.autoTrack = autoTrackConfig;
  saveConfig(config);
  return { success: true };
});

ipcMain.handle('get-auto-track-config', async () => {
  const config = loadConfig();
  return config.autoTrack || { enabled: false, repos: [], pollingInterval: 30 };
});

ipcMain.handle('fetch-status', async (event, url) => {
  const config = loadConfig();
  const token = config.token;

  if (!token) {
    return {
      success: false,
      error: 'GitLab token not configured. Please set it in settings.'
    };
  }

  const parsed = parseGitLabUrl(url);
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid GitLab URL format. Please enter a valid job or pipeline URL.'
    };
  }

  const api = new GitLabAPI(parsed.baseUrl, token);
  
  if (parsed.type === 'pipeline') {
    const result = await api.getPipelineStatus(parsed.projectPath, parsed.pipelineId);
    
    if (result.success && Notification.isSupported()) {
      const status = result.data.status;
      if (status === 'success' || status === 'failed') {
        const notification = new Notification({
          title: `Pipeline ${status === 'success' ? 'Completed' : 'Failed'}`,
          body: `Pipeline #${result.data.id} on ${result.data.ref}`
        });
        notification.show();
      }
    }
    
    return result;
  } else {
    const result = await api.getJobStatus(parsed.projectPath, parsed.jobId);
    
    if (result.success && Notification.isSupported()) {
      const status = result.data.status;
      if (status === 'success' || status === 'failed') {
        const notification = new Notification({
          title: `Job ${status === 'success' ? 'Completed' : 'Failed'}`,
          body: `${result.data.name} on ${result.data.ref}`
        });
        notification.show();
      }
    }
    
    return result;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

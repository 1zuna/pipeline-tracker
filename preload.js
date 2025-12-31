const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchJobStatus: (url) => ipcRenderer.invoke('fetch-job-status', url),
  fetchPipelineStatus: (url) => ipcRenderer.invoke('fetch-pipeline-status', url),
  fetchStatus: (url) => ipcRenderer.invoke('fetch-status', url),
  saveToken: (token) => ipcRenderer.invoke('save-token', token),
  getToken: () => ipcRenderer.invoke('get-token'),
  removeJob: (jobId) => ipcRenderer.invoke('remove-job', jobId),
  getCurrentUser: (baseUrl) => ipcRenderer.invoke('get-current-user', baseUrl),
  getProjectJobs: (baseUrl, projectPath, scope) => ipcRenderer.invoke('get-project-jobs', baseUrl, projectPath, scope),
  saveAutoTrackConfig: (config) => ipcRenderer.invoke('save-auto-track-config', config),
  getAutoTrackConfig: () => ipcRenderer.invoke('get-auto-track-config')
});

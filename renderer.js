const itemsMap = new Map(); // Renamed from jobsMap to handle both jobs and pipelines
const REFRESH_INTERVAL = 10000; // 10 seconds
const AUTO_DELETE_DELAY = 10 * 60 * 1000; // 10 minutes

// Auto-track state
let autoTrackConfig = { enabled: false, repos: [], pollingInterval: 30 };
let autoTrackIntervalId = null;
let currentUser = null;
let seenJobs = new Set(); // Track jobs we've already seen to avoid re-adding dismissed jobs
let finishedJobTimers = new Map(); // Track timers for auto-deleting finished jobs

// DOM Elements
const urlInput = document.getElementById('urlInput');
const addJobBtn = document.getElementById('addJobBtn');
const jobsList = document.getElementById('jobsList');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const tokenInput = document.getElementById('tokenInput');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

// Auto-track DOM elements
const autoTrackHeader = document.getElementById('autoTrackHeader');
const autoTrackContent = document.getElementById('autoTrackContent');
const collapseIcon = document.getElementById('collapseIcon');
const autoTrackMasterSwitch = document.getElementById('autoTrackMasterSwitch');
const pollingIntervalSlider = document.getElementById('pollingIntervalSlider');
const pollingIntervalValue = document.getElementById('pollingIntervalValue');
const repoUrlInput = document.getElementById('repoUrlInput');
const addRepoBtn = document.getElementById('addRepoBtn');
const repoList = document.getElementById('repoList');

// Initialize
async function init() {
  const token = await window.electronAPI.getToken();
  if (token) {
    tokenInput.value = token;
  }
  
  addJobBtn.addEventListener('click', handleAddItem);
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddItem();
  });
  
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
  });
  
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });
  
  saveTokenBtn.addEventListener('click', handleSaveToken);
  
  settingsPanel.addEventListener('click', (e) => {
    if (e.target === settingsPanel) {
      settingsPanel.classList.add('hidden');
    }
  });
  
  // Initialize auto-track UI
  await initAutoTrack();
}

async function handleSaveToken() {
  const token = tokenInput.value.trim();
  if (!token) {
    alert('Please enter a valid token');
    return;
  }
  
  await window.electronAPI.saveToken(token);
  alert('Token saved successfully!');
  settingsPanel.classList.add('hidden');
}

async function handleAddItem() {
  const url = urlInput.value.trim();
  if (!url) {
    alert('Please enter a valid GitLab job or pipeline URL');
    return;
  }
  
  urlInput.disabled = true;
  addJobBtn.disabled = true;
  addJobBtn.textContent = 'Adding...';
  
  const result = await window.electronAPI.fetchStatus(url);
  
  if (result.success) {
    const isPipeline = result.data.type === 'pipeline';
    const itemKey = isPipeline ? `pipeline-${result.data.id}` : `job-${result.data.id}`;
    
    if (!itemsMap.has(itemKey)) {
      itemsMap.set(itemKey, {
        url,
        data: result.data,
        type: isPipeline ? 'pipeline' : 'job',
        intervalId: null
      });
      renderItems();
      startAutoRefresh(itemKey);
    }
    urlInput.value = '';
  } else {
    alert(`Error: ${result.error}`);
  }
  
  urlInput.disabled = false;
  addJobBtn.disabled = false;
  addJobBtn.textContent = 'Add';
}

async function refreshItem(itemKey) {
  const item = itemsMap.get(itemKey);
  if (!item) return;
  
  const result = await window.electronAPI.fetchStatus(item.url);
  
  if (result.success) {
    const previousStatus = item.data.status;
    item.data = result.data;
    renderItems();
    
    // Stop auto-refresh if item is completed
    const status = result.data.status;
    if (status === 'success' || status === 'failed' || status === 'canceled') {
      stopAutoRefresh(itemKey);
      
      // Schedule auto-deletion for finished jobs (after 10 minutes)
      scheduleAutoDelete(itemKey);
    }
  }
}

function startAutoRefresh(itemKey) {
  const item = itemsMap.get(itemKey);
  if (!item || item.intervalId) return;
  
  const status = item.data.status;
  if (status === 'running' || status === 'pending' || status === 'created') {
    item.intervalId = setInterval(() => refreshItem(itemKey), REFRESH_INTERVAL);
  }
}

function stopAutoRefresh(itemKey) {
  const item = itemsMap.get(itemKey);
  if (item && item.intervalId) {
    clearInterval(item.intervalId);
    item.intervalId = null;
  }
}

function removeItem(itemKey) {
  stopAutoRefresh(itemKey);
  
  // Clear auto-delete timer if exists
  if (finishedJobTimers.has(itemKey)) {
    clearTimeout(finishedJobTimers.get(itemKey));
    finishedJobTimers.delete(itemKey);
  }
  
  itemsMap.delete(itemKey);
  renderItems();
}

function renderItems() {
  if (itemsMap.size === 0) {
    jobsList.innerHTML = `
      <div class="empty-state">
        <p>No jobs or pipelines being monitored. Add a URL above to start.</p>
      </div>
    `;
    return;
  }
  
  jobsList.innerHTML = '';
  
  itemsMap.forEach((item, itemKey) => {
    const card = item.type === 'pipeline' 
      ? createPipelineCard(itemKey, item)
      : createJobCard(itemKey, item);
    jobsList.appendChild(card);
  });
}

function createJobCard(itemKey, item) {
  const data = item.data;
  const card = document.createElement('div');
  card.className = `job-card status-${data.status}`;
  
  const isAutoRefreshing = item.intervalId !== null;
  const isAutoTracked = item.autoTracked === true;
  const duration = data.duration ? formatDuration(data.duration) : 'N/A';
  const startedAt = data.startedAt ? new Date(data.startedAt).toLocaleString() : 'N/A';
  
  card.innerHTML = `
    <div class="job-header">
      <div class="job-title">
        <span class="item-type-badge job-badge">Job</span>
        ${data.name}
        ${isAutoTracked ? '<span class="auto-tracked-badge">Auto</span>' : ''}
      </div>
      <div class="job-actions">
        <button class="refresh-btn" data-key="${itemKey}">🔄 Refresh</button>
        <button class="remove-btn" data-key="${itemKey}">✕ Remove</button>
      </div>
    </div>
    
    <div class="job-info">
      <div class="info-item">
        <span class="info-label">Status</span>
        <span class="info-value">
          <span class="status-badge status-${data.status}">${data.status}</span>
        </span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Stage</span>
        <span class="info-value">${data.stage}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Branch</span>
        <span class="info-value">${data.ref}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Duration</span>
        <span class="info-value">${duration}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Pipeline ID</span>
        <span class="info-value">#${data.pipeline.id}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Started At</span>
        <span class="info-value">${startedAt}</span>
      </div>
    </div>
    
    <div class="job-meta">
      ${isAutoRefreshing ? '<span class="auto-refresh-indicator"></span> Auto-refreshing every 10s' : ''}
      ${data.user ? `Started by ${data.user.name} (@${data.user.username})` : ''}
    </div>
  `;
  
  // Attach event listeners properly to avoid type mismatch issues
  card.querySelector('.refresh-btn').addEventListener('click', () => refreshItem(itemKey));
  card.querySelector('.remove-btn').addEventListener('click', () => removeItem(itemKey));
  
  return card;
}

function createPipelineCard(itemKey, item) {
  const data = item.data;
  const card = document.createElement('div');
  card.className = `job-card pipeline-card status-${data.status}`;
  
  const isAutoRefreshing = item.intervalId !== null;
  const duration = data.duration ? formatDuration(data.duration) : 'N/A';
  const startedAt = data.startedAt ? new Date(data.startedAt).toLocaleString() : 'N/A';
  
  // Build stages HTML
  let stagesHtml = '';
  if (data.stages && Object.keys(data.stages).length > 0) {
    stagesHtml = '<div class="pipeline-stages">';
    for (const [stageName, jobs] of Object.entries(data.stages)) {
      stagesHtml += `
        <div class="pipeline-stage">
          <div class="stage-name">${stageName}</div>
          <div class="stage-jobs">
            ${jobs.map(job => `
              <div class="stage-job status-${job.status}" title="${job.name} - ${job.status}">
                <span class="job-status-icon">${getStatusIcon(job.status)}</span>
                <span class="job-name">${job.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    stagesHtml += '</div>';
  }
  
  card.innerHTML = `
    <div class="job-header">
      <div class="job-title">
        <span class="item-type-badge pipeline-badge">Pipeline</span>
        Pipeline #${data.id}
      </div>
      <div class="job-actions">
        <button class="refresh-btn" data-key="${itemKey}">🔄 Refresh</button>
        <button class="remove-btn" data-key="${itemKey}">✕ Remove</button>
      </div>
    </div>
    
    <div class="job-info">
      <div class="info-item">
        <span class="info-label">Status</span>
        <span class="info-value">
          <span class="status-badge status-${data.status}">${data.status}</span>
        </span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Branch</span>
        <span class="info-value">${data.ref}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Duration</span>
        <span class="info-value">${duration}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Jobs</span>
        <span class="info-value">${data.jobs ? data.jobs.length : 0}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Started At</span>
        <span class="info-value">${startedAt}</span>
      </div>
      
      <div class="info-item">
        <span class="info-label">Source</span>
        <span class="info-value">${data.source || 'N/A'}</span>
      </div>
    </div>
    
    ${stagesHtml}
    
    <div class="job-meta">
      ${isAutoRefreshing ? '<span class="auto-refresh-indicator"></span> Auto-refreshing every 10s' : ''}
      ${data.user ? `Started by ${data.user.name} (@${data.user.username})` : ''}
    </div>
  `;
  
  // Attach event listeners properly to avoid type mismatch issues
  card.querySelector('.refresh-btn').addEventListener('click', () => refreshItem(itemKey));
  card.querySelector('.remove-btn').addEventListener('click', () => removeItem(itemKey));
  
  return card;
}

function getStatusIcon(status) {
  switch (status) {
    case 'success': return '✓';
    case 'failed': return '✗';
    case 'running': return '⟳';
    case 'pending': return '◯';
    case 'canceled': return '⊘';
    case 'skipped': return '⊝';
    case 'manual': return '▶';
    case 'created': return '◔';
    default: return '•';
  }
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Global functions for backward compatibility (not used anymore but kept for safety)
window.refreshJobManually = (itemKey) => refreshItem(String(itemKey));
window.removeJobManually = (itemKey) => removeItem(String(itemKey));

// ==================== Auto-Track Functions ====================

async function initAutoTrack() {
  // Load saved config
  autoTrackConfig = await window.electronAPI.getAutoTrackConfig();
  
  // Setup UI event listeners
  autoTrackHeader.addEventListener('click', (e) => {
    // Don't toggle if clicking on the switch
    if (e.target.closest('.toggle-switch')) return;
    toggleAutoTrackCollapse();
  });
  
  autoTrackMasterSwitch.checked = autoTrackConfig.enabled;
  autoTrackMasterSwitch.addEventListener('change', handleMasterSwitchChange);
  
  pollingIntervalSlider.value = autoTrackConfig.pollingInterval || 30;
  pollingIntervalValue.textContent = `${pollingIntervalSlider.value}s`;
  pollingIntervalSlider.addEventListener('input', handlePollingIntervalChange);
  
  addRepoBtn.addEventListener('click', handleAddRepo);
  repoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddRepo();
  });
  
  // Render repos
  renderRepoList();
  
  // Start auto-tracking if enabled
  if (autoTrackConfig.enabled) {
    startAutoTracking();
  }
}

function toggleAutoTrackCollapse() {
  const isHidden = autoTrackContent.classList.contains('hidden');
  autoTrackContent.classList.toggle('hidden');
  collapseIcon.textContent = isHidden ? '▼' : '▶';
}

async function handleMasterSwitchChange() {
  autoTrackConfig.enabled = autoTrackMasterSwitch.checked;
  await saveAutoTrackConfig();
  
  if (autoTrackConfig.enabled) {
    startAutoTracking();
  } else {
    stopAutoTracking();
  }
}

async function handlePollingIntervalChange() {
  autoTrackConfig.pollingInterval = parseInt(pollingIntervalSlider.value);
  pollingIntervalValue.textContent = `${autoTrackConfig.pollingInterval}s`;
  await saveAutoTrackConfig();
  
  // Restart auto-tracking with new interval
  if (autoTrackConfig.enabled) {
    stopAutoTracking();
    startAutoTracking();
  }
}

function parseRepoUrl(url) {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    let pathname = urlObj.pathname.replace(/\/-\/.*$/, '').replace(/\/+$/, '');
    
    if (!pathname || pathname === '/') {
      return null;
    }
    
    const projectPath = pathname.substring(1);
    
    return {
      baseUrl,
      projectPath,
      pipelinesUrl: `${baseUrl}/${projectPath}/-/pipelines`
    };
  } catch (error) {
    return null;
  }
}

async function handleAddRepo() {
  const url = repoUrlInput.value.trim();
  if (!url) {
    alert('Please enter a valid GitLab repo URL');
    return;
  }
  
  const parsed = parseRepoUrl(url);
  if (!parsed) {
    alert('Invalid GitLab repo URL format');
    return;
  }
  
  // Check if repo already exists
  const exists = autoTrackConfig.repos.some(r => 
    r.baseUrl === parsed.baseUrl && r.projectPath === parsed.projectPath
  );
  
  if (exists) {
    alert('This repo is already in the list');
    return;
  }
  
  autoTrackConfig.repos.push({
    url,
    baseUrl: parsed.baseUrl,
    projectPath: parsed.projectPath,
    pipelinesUrl: parsed.pipelinesUrl,
    enabled: true
  });
  
  await saveAutoTrackConfig();
  renderRepoList();
  repoUrlInput.value = '';
  
  // Immediately poll this repo if auto-tracking is enabled
  if (autoTrackConfig.enabled) {
    pollRepoForJobs(autoTrackConfig.repos[autoTrackConfig.repos.length - 1]);
  }
}

async function toggleRepoEnabled(index) {
  autoTrackConfig.repos[index].enabled = !autoTrackConfig.repos[index].enabled;
  await saveAutoTrackConfig();
  renderRepoList();
}

async function removeRepo(index) {
  autoTrackConfig.repos.splice(index, 1);
  await saveAutoTrackConfig();
  renderRepoList();
}

async function saveAutoTrackConfig() {
  await window.electronAPI.saveAutoTrackConfig(autoTrackConfig);
}

function renderRepoList() {
  if (autoTrackConfig.repos.length === 0) {
    repoList.innerHTML = `
      <div class="empty-repo-state">
        <p>No repos configured. Add a repo URL above to start auto-tracking.</p>
      </div>
    `;
    return;
  }
  
  repoList.innerHTML = '';
  
  autoTrackConfig.repos.forEach((repo, index) => {
    const repoItem = document.createElement('div');
    repoItem.className = `repo-item ${repo.enabled ? '' : 'disabled'}`;
    
    const displayPath = repo.projectPath.length > 40 
      ? '...' + repo.projectPath.slice(-37)
      : repo.projectPath;
    
    repoItem.innerHTML = `
      <div class="repo-info">
        <span class="repo-path" title="${repo.projectPath}">${displayPath}</span>
      </div>
      <div class="repo-actions">
        <button class="repo-pipeline-btn" title="Open pipelines page">🔗</button>
        <label class="toggle-switch small">
          <input type="checkbox" ${repo.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
        <button class="repo-remove-btn" title="Remove repo">✕</button>
      </div>
    `;
    
    repoItem.querySelector('.repo-pipeline-btn').addEventListener('click', () => {
      window.open(repo.pipelinesUrl, '_blank');
    });
    
    repoItem.querySelector('.toggle-switch input').addEventListener('change', () => {
      toggleRepoEnabled(index);
    });
    
    repoItem.querySelector('.repo-remove-btn').addEventListener('click', () => {
      removeRepo(index);
    });
    
    repoList.appendChild(repoItem);
  });
}

async function startAutoTracking() {
  if (autoTrackIntervalId) {
    clearInterval(autoTrackIntervalId);
  }
  
  // Initial poll
  await pollAllRepos();
  
  // Start periodic polling
  const intervalMs = (autoTrackConfig.pollingInterval || 30) * 1000;
  autoTrackIntervalId = setInterval(pollAllRepos, intervalMs);
}

function stopAutoTracking() {
  if (autoTrackIntervalId) {
    clearInterval(autoTrackIntervalId);
    autoTrackIntervalId = null;
  }
}

async function pollAllRepos() {
  const enabledRepos = autoTrackConfig.repos.filter(r => r.enabled);
  
  for (const repo of enabledRepos) {
    await pollRepoForJobs(repo);
  }
}

async function pollRepoForJobs(repo) {
  // Fetch current user if not cached
  if (!currentUser) {
    const userResult = await window.electronAPI.getCurrentUser(repo.baseUrl);
    if (userResult.success) {
      currentUser = userResult.data;
    } else {
      console.error('Failed to get current user:', userResult.error);
      return;
    }
  }
  
  // Fetch running/pending jobs
  const jobsResult = await window.electronAPI.getProjectJobs(repo.baseUrl, repo.projectPath, ['running', 'pending']);
  
  if (!jobsResult.success) {
    console.error(`Failed to fetch jobs for ${repo.projectPath}:`, jobsResult.error);
    return;
  }
  
  // Filter jobs by current user
  const myJobs = jobsResult.data.filter(job => 
    job.user && job.user.username === currentUser.username
  );
  
  // Add jobs that aren't already tracked
  for (const job of myJobs) {
    const itemKey = `job-${job.id}`;
    
    // Skip if already tracked or previously seen
    if (itemsMap.has(itemKey) || seenJobs.has(job.id)) {
      continue;
    }
    
    // Mark as seen
    seenJobs.add(job.id);
    
    // Build the job URL
    const jobUrl = job.webUrl || `${repo.baseUrl}/${repo.projectPath}/-/jobs/${job.id}`;
    
    // Add to tracking
    itemsMap.set(itemKey, {
      url: jobUrl,
      data: job,
      type: 'job',
      intervalId: null,
      autoTracked: true
    });
    
    renderItems();
    startAutoRefresh(itemKey);
    
    // Show notification for new auto-tracked job
    showNotification(
      'New Job Detected',
      `${job.name} on ${job.ref} (${job.status})`
    );
  }
}

function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

function scheduleAutoDelete(itemKey) {
  // Clear any existing timer
  if (finishedJobTimers.has(itemKey)) {
    clearTimeout(finishedJobTimers.get(itemKey));
  }
  
  // Schedule deletion after 10 minutes
  const timer = setTimeout(() => {
    removeItem(itemKey);
    finishedJobTimers.delete(itemKey);
  }, AUTO_DELETE_DELAY);
  
  finishedJobTimers.set(itemKey, timer);
}

// Initialize app
init();

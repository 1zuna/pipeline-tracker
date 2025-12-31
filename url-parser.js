/**
 * Parse GitLab job URL to extract project path and job ID
 * @param {string} url - GitLab job URL (e.g., https://gitlab.citigo.com.vn/citigo/kiotviet-core/-/jobs/4667443)
 * @returns {object|null} - {baseUrl, projectPath, jobId, type} or null if invalid
 */
function parseGitLabJobUrl(url) {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // Match pattern: /project/path/-/jobs/12345
    const match = urlObj.pathname.match(/^(.+)\/-\/jobs\/(\d+)/);
    
    if (!match) {
      return null;
    }
    
    const projectPath = match[1].substring(1); // Remove leading slash
    const jobId = match[2];
    
    return {
      baseUrl,
      projectPath: encodeURIComponent(projectPath),
      jobId,
      type: 'job'
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse GitLab pipeline URL to extract project path and pipeline ID
 * @param {string} url - GitLab pipeline URL (e.g., https://gitlab.citigo.com.vn/citigo/retail-nomad/-/pipelines/1785959)
 * @returns {object|null} - {baseUrl, projectPath, pipelineId, type} or null if invalid
 */
function parseGitLabPipelineUrl(url) {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // Match pattern: /project/path/-/pipelines/12345
    const match = urlObj.pathname.match(/^(.+)\/-\/pipelines\/(\d+)/);
    
    if (!match) {
      return null;
    }
    
    const projectPath = match[1].substring(1); // Remove leading slash
    const pipelineId = match[2];
    
    return {
      baseUrl,
      projectPath: encodeURIComponent(projectPath),
      pipelineId,
      type: 'pipeline'
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse any GitLab URL (job or pipeline)
 * @param {string} url - GitLab URL
 * @returns {object|null} - Parsed result with type field or null if invalid
 */
function parseGitLabUrl(url) {
  // Try pipeline first, then job
  const pipelineResult = parseGitLabPipelineUrl(url);
  if (pipelineResult) return pipelineResult;
  
  const jobResult = parseGitLabJobUrl(url);
  if (jobResult) return jobResult;
  
  return null;
}

/**
 * Parse GitLab repo URL to extract base URL and project path
 * @param {string} url - GitLab repo URL (e.g., https://gitlab.citigo.com.vn/citigo/kv2.kv4forDev)
 * @returns {object|null} - {baseUrl, projectPath, pipelinesUrl} or null if invalid
 */
function parseGitLabRepoUrl(url) {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // Remove trailing slashes and /-/ paths
    let pathname = urlObj.pathname.replace(/\/-\/.*$/, '').replace(/\/+$/, '');
    
    if (!pathname || pathname === '/') {
      return null;
    }
    
    const projectPath = pathname.substring(1); // Remove leading slash
    
    return {
      baseUrl,
      projectPath: projectPath,
      projectPathEncoded: encodeURIComponent(projectPath),
      pipelinesUrl: `${baseUrl}/${projectPath}/-/pipelines`
    };
  } catch (error) {
    return null;
  }
}

module.exports = { parseGitLabJobUrl, parseGitLabPipelineUrl, parseGitLabUrl, parseGitLabRepoUrl };

const axios = require('axios');

class GitLabAPI {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.client = axios.create({
      baseURL: `${baseUrl}/api/v4`,
      headers: {
        'PRIVATE-TOKEN': token
      }
    });
  }

  async getJobStatus(projectPath, jobId) {
    try {
      const response = await this.client.get(`/projects/${projectPath}/jobs/${jobId}`);
      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          status: response.data.status,
          stage: response.data.stage,
          ref: response.data.ref,
          duration: response.data.duration,
          startedAt: response.data.started_at,
          finishedAt: response.data.finished_at,
          webUrl: response.data.web_url,
          pipeline: {
            id: response.data.pipeline.id,
            ref: response.data.pipeline.ref,
            status: response.data.pipeline.status
          },
          user: response.data.user ? {
            name: response.data.user.name,
            username: response.data.user.username
          } : null
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getPipelineStatus(projectPath, pipelineId) {
    try {
      const [pipelineResponse, jobsResponse] = await Promise.all([
        this.client.get(`/projects/${projectPath}/pipelines/${pipelineId}`),
        this.client.get(`/projects/${projectPath}/pipelines/${pipelineId}/jobs`)
      ]);
      
      const pipeline = pipelineResponse.data;
      const jobs = jobsResponse.data;
      
      // Group jobs by stage
      const stages = {};
      jobs.forEach(job => {
        if (!stages[job.stage]) {
          stages[job.stage] = [];
        }
        stages[job.stage].push({
          id: job.id,
          name: job.name,
          status: job.status,
          duration: job.duration,
          startedAt: job.started_at,
          finishedAt: job.finished_at,
          webUrl: job.web_url,
          allowFailure: job.allow_failure
        });
      });
      
      return {
        success: true,
        data: {
          id: pipeline.id,
          type: 'pipeline',
          status: pipeline.status,
          ref: pipeline.ref,
          sha: pipeline.sha,
          webUrl: pipeline.web_url,
          createdAt: pipeline.created_at,
          updatedAt: pipeline.updated_at,
          startedAt: pipeline.started_at,
          finishedAt: pipeline.finished_at,
          duration: pipeline.duration,
          coverage: pipeline.coverage,
          source: pipeline.source,
          user: pipeline.user ? {
            name: pipeline.user.name,
            username: pipeline.user.username,
            avatarUrl: pipeline.user.avatar_url
          } : null,
          stages,
          jobs: jobs.map(job => ({
            id: job.id,
            name: job.name,
            status: job.status,
            stage: job.stage,
            duration: job.duration,
            startedAt: job.started_at,
            finishedAt: job.finished_at,
            webUrl: job.web_url,
            allowFailure: job.allow_failure
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getPipelineInfo(projectPath, pipelineId) {
    try {
      const response = await this.client.get(`/projects/${projectPath}/pipelines/${pipelineId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getJobLog(projectPath, jobId) {
    try {
      const response = await this.client.get(`/projects/${projectPath}/jobs/${jobId}/trace`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/user');
      return {
        success: true,
        data: {
          id: response.data.id,
          username: response.data.username,
          name: response.data.name,
          email: response.data.email,
          avatarUrl: response.data.avatar_url
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getProjectJobs(projectPath, scope = ['running', 'pending']) {
    try {
      const scopeParams = scope.map(s => `scope[]=${s}`).join('&');
      const response = await this.client.get(`/projects/${encodeURIComponent(projectPath)}/jobs?${scopeParams}&per_page=100`);
      return {
        success: true,
        data: response.data.map(job => ({
          id: job.id,
          name: job.name,
          status: job.status,
          stage: job.stage,
          ref: job.ref,
          duration: job.duration,
          startedAt: job.started_at,
          finishedAt: job.finished_at,
          webUrl: job.web_url,
          pipeline: {
            id: job.pipeline.id,
            ref: job.pipeline.ref,
            status: job.pipeline.status
          },
          user: job.user ? {
            id: job.user.id,
            name: job.user.name,
            username: job.user.username
          } : null
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = GitLabAPI;

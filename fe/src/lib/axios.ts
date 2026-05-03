import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('syncra_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const workspaceId = localStorage.getItem('syncra_workspace_id');
  if (workspaceId) {
    config.headers['X-Workspace-Id'] = workspaceId;
  }

  return config;
});

export default api;

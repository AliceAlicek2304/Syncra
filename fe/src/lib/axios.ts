import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `${import.meta.env.BASE_URL}api/v1`.replace(/\/+$/, ''),
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (error.response?.data?.code === 'oauth_token_revoked') {
        const provider = error.response.data.provider ?? 'google';
        sessionStorage.setItem('oauth_revoked_provider', provider);
        // Do NOT redirect - allow component-level handling (D-04)
      } else {
        localStorage.removeItem('syncra_access_token');
        window.location.href = `${import.meta.env.BASE_URL || '/'}login`.replace(/\/+$/, '/').replace(/\/+/, '/');
      }
    } else {
      // We'll handle global errors via a callback registered from ToastContext
      if (globalErrorHandler) {
        globalErrorHandler(error.response?.data?.message || error.message || 'An error occurred');
      }
    }
    return Promise.reject(error);
  }
);

let globalErrorHandler: ((message: string) => void) | null = null;

export const registerErrorHandler = (handler: (message: string) => void) => {
  globalErrorHandler = handler;
};

export default api;

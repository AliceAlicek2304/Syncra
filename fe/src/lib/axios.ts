import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `${import.meta.env.BASE_URL}api/v1`.replace(/\/+$/, ''),
  headers: {
    'Content-Type': 'application/json',
  },
});

type RequestListener = (pendingCount: number, activeUrls: string[]) => void;
type RequestConfigWithGlobalError = {
  skipGlobalError?: boolean;
};

const listeners = new Set<RequestListener>();
let activeCount = 0;
const activeUrls: string[] = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener(activeCount, [...activeUrls]));
};

export const subscribeToRequests = (listener: RequestListener) => {
  listeners.add(listener);
  // Immediate invocation for current state
  listener(activeCount, [...activeUrls]);
  return () => {
    listeners.delete(listener);
  };
};

api.interceptors.request.use((config) => {
  activeCount++;
  if (config.url) {
    activeUrls.push(config.url);
  }
  notifyListeners();

  const token = localStorage.getItem('syncra_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const lowercaseUrl = config.url?.toLowerCase() || '';
  const isMeRequest = lowercaseUrl.includes('users/me') || lowercaseUrl.includes('auth/me');
  const isAdminRequest = lowercaseUrl.includes('/admin');

  if (isMeRequest || isAdminRequest) {
    delete config.headers['X-Workspace-Id'];
    delete config.headers['X-Profile-Id'];
  } else {
    if (config.headers['X-Workspace-Id'] === '') {
      delete config.headers['X-Workspace-Id'];
    } else if (config.headers['X-Workspace-Id'] == null) {
      const workspaceId = localStorage.getItem('syncra_workspace_id');
      if (workspaceId) {
        config.headers['X-Workspace-Id'] = workspaceId;
      }
    }

    if (config.headers['X-Profile-Id'] === '') {
      delete config.headers['X-Profile-Id'];
    } else if (config.headers['X-Profile-Id'] == null) {
      const profileId = localStorage.getItem('syncra_profile_id');
      if (profileId) {
        config.headers['X-Profile-Id'] = profileId;
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    activeCount = Math.max(0, activeCount - 1);
    if (response.config?.url) {
      const idx = activeUrls.indexOf(response.config.url);
      if (idx !== -1) {
        activeUrls.splice(idx, 1);
      }
    }
    notifyListeners();
    return response;
  },
  (error) => {
    activeCount = Math.max(0, activeCount - 1);
    if (error.config?.url) {
      const idx = activeUrls.indexOf(error.config.url);
      if (idx !== -1) {
        activeUrls.splice(idx, 1);
      }
    }
    notifyListeners();

    if (error.response?.status === 401) {
      if (error.response?.data?.code === 'oauth_token_revoked') {
        const provider = error.response.data.provider ?? 'google';
        sessionStorage.setItem('oauth_revoked_provider', provider);
        // Do NOT redirect - allow component-level handling (D-04)
      } else if (error.response?.data?.code === 'invalid_credentials') {
        // Do NOT redirect - allow form-level handling for bad passwords
      } else {
        localStorage.removeItem('syncra_access_token');
        localStorage.removeItem('syncra_workspace_id');
        localStorage.removeItem('syncra_profile_id');
        window.location.href = `${import.meta.env.BASE_URL || '/'}login`.replace(/\/+$/, '/').replace(/\/+/, '/');
      }
    } else if (!(error.config as RequestConfigWithGlobalError | undefined)?.skipGlobalError) {
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


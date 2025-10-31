import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAccessToken, getRefreshToken, clearTokens, setTokens, getRoleId } from './authStorage';
import { isMockApiEnabled, mockApiHandler } from './mockApi';
import { store } from 'store';
import { logoutAsync } from 'store/slices/auth';
import { fetchQBConnectionStatus } from 'store/slices/integrations';

const axiosServices = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1/'
});

// Always send cookies (for HttpOnly refresh token)
axiosServices.defaults.withCredentials = true;

let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (error: unknown) => void;
}[] = [];
let retryCount = 0;
const MAX_RETRY_ATTEMPTS = 2;

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  failedQueue = [];
};

axiosServices.interceptors.request.use(
  async (config) => {
    const accessToken = getAccessToken();
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const state = store.getState();
    const currentRole = state.auth?.currentRole;
    if (currentRole?.id && config.headers) {
      config.headers['X-Role-ID'] = currentRole.id;
    } else {
      const roleId = getRoleId();
      if (roleId && config.headers) {
        config.headers['X-Role-ID'] = roleId;
      }
    }

    // Attach kiosk token for kiosk-originated actions so backend can resolve employee without user auth context
    try {
      const kioskToken = (state as any)?.kiosk?.token as string | null;
      if (kioskToken && config.headers) {
        // Custom header understood by our backend
        config.headers['X-Kiosk-Token'] = kioskToken;
      }
    } catch {}

    // Handle mock API if enabled (excluding employee endpoints)
    if (isMockApiEnabled()) {
      const url = config.url || '';
      // Only use mock API for non-employee endpoints
      if (!url.includes('/employee/')) {
        const mockResponse = await mockApiHandler.handleRequest(config);
        if (mockResponse) {
          // Simple adapter to return mock response
          config.adapter = async () => mockResponse;
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosServices.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryQB?: boolean };

    // Handle QuickBooks API 401 or 400 token errors
    const isQBEndpoint = originalRequest.url?.includes('/qb/') || originalRequest.url?.includes('/company/');
    const isTokenError =
      error.response?.data?.detail?.toLowerCase()?.includes('token') ||
      error.response?.data?.detail?.toLowerCase()?.includes('authentication') ||
      error.response?.data?.message?.toLowerCase()?.includes('token');

    if ((error.response?.status === 401 || (error.response?.status === 400 && isTokenError)) && isQBEndpoint && !originalRequest._retryQB) {
      originalRequest._retryQB = true;

      try {
        const state = store.getState();
        const companyId = state.integrations?.quickbooks?.connection?.companyId;

        if (companyId) {
          await axios.post(
            `${import.meta.env.VITE_APP_API_URL}/quickbooks/refresh/`,
            {
              company_id: companyId
            },
            {
              headers: {
                Authorization: `Bearer ${getAccessToken()}`,
                'X-Role-ID': getRoleId() || ''
              }
            }
          );

          // Re-fetch connection status to update Redux state with new token validity
          await store.dispatch(fetchQBConnectionStatus(companyId) as any);

          return axiosServices(originalRequest);
        }
      } catch (refreshError) {
        const state = store.getState();
        if (state.integrations?.quickbooks) {
          state.integrations.quickbooks.connection.status = 'expired';
        }
        return Promise.reject(error);
      }
    }

    // Handle regular auth 401 errors
    // Skip redirect for auth-related pages that handle their own flows
    const authPages = ['/login', '/register', '/verify-email', '/verify-email-pending', '/forgot-password', '/reset-password'];
    const isOnAuthPage = authPages.some((page) => window.location.href.includes(page));

    if (error.response?.status === 401 && !originalRequest._retry && !isOnAuthPage) {
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        retryCount = 0;
        clearTokens();
        // Dispatch logout and let AuthGuard handle redirect via React Router
        store.dispatch(logoutAsync());
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (originalRequest.headers && token) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
              }
              resolve(axiosServices(originalRequest));
            },
            reject
          });
        });
      }

      isRefreshing = true;
      retryCount++;

      try {
        const refreshToken = getRefreshToken();
        let access: string | null = null;
        let refresh: string | null = null;

        if (!refreshToken) {
          // Fallback to cookie-based refresh
          const { data } = await axios.post(`${import.meta.env.VITE_APP_API_URL}/auth/refresh-cookie/`, null, { withCredentials: true });
          access = data.access;
          refresh = getRefreshToken() || 'cookie';
        } else {
          const { data } = await axios.post(`${import.meta.env.VITE_APP_API_URL}/auth/refresh/`, { refresh: refreshToken });
          access = data.access;
          refresh = data.refresh;
        }

        if (!access) {
          throw new Error('No access token from refresh');
        }

        setTokens(access, refresh || '');
        axiosServices.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        processQueue(null, access);
        retryCount = 0;

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${access}`;
        }

        return axiosServices(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        // Dispatch logout and let AuthGuard handle redirect via React Router
        store.dispatch(logoutAsync());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosServices;

export async function fetcher(args: string | [string, AxiosRequestConfig]) {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await axiosServices.get(url, { ...config });

  return res.data;
}

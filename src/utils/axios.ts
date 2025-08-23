import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAccessToken, getRefreshToken, clearTokens, setTokens, getRoleId } from './authStorage';
import { isMockApiEnabled, mockApiHandler } from './mockApi';
import { store } from 'store';
import { logoutAsync } from 'store/slices/auth';

const axiosServices = axios.create({ baseURL: import.meta.env.VITE_APP_API_URL });

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

    // Handle mock API if enabled
    if (isMockApiEnabled()) {
      const mockResponse = await mockApiHandler.handleRequest(config);
      if (mockResponse) {
        // Simple adapter to return mock response
        config.adapter = async () => mockResponse;
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

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && !window.location.href.includes('/login')) {
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        retryCount = 0;
        clearTokens();
        store.dispatch(logoutAsync());
        window.location.href = '/login';
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
        if (!refreshToken) {
          processQueue(error, null);
          clearTokens();
          store.dispatch(logoutAsync());
          window.location.pathname = '/login';
          return Promise.reject(error);
        }

        const { data } = await axios.post(`${import.meta.env.VITE_APP_API_URL}/auth/refresh/`, { refresh: refreshToken });

        const { access, refresh } = data;
        setTokens(access, refresh);

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
        store.dispatch(logoutAsync());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error.response?.data || 'Unknown Error');
  }
);

export default axiosServices;

export async function fetcher(args: string | [string, AxiosRequestConfig]) {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await axiosServices.get(url, { ...config });

  return res.data;
}

import axios, { AxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, clearTokens, setTokens } from './authStorage';

const axiosServices = axios.create({ baseURL: import.meta.env.VITE_APP_API_URL });

axiosServices.interceptors.request.use(
  async (config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

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

axiosServices.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${import.meta.env.VITE_APP_API_URL}/auth/refresh/`, { refresh: refreshToken });

        const { access, refresh } = response.data;
        setTokens(access, refresh);
        axiosServices.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        processQueue(null, access);

        originalRequest.headers['Authorization'] = `Bearer ${access}`;
        return axiosServices(originalRequest);
      } catch (err) {
        clearTokens();
        window.location.href = '/login';
        processQueue(err, null);
        return Promise.reject(err);
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

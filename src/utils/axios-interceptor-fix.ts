// Add this to your axios interceptor for auto token refresh:

import axios from 'axios';
import qbApi from 'api/qb';

// Response interceptor for handling 401s
axiosServices.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a QuickBooks API call that got 401
    if (
      error.response?.status === 401 &&
      originalRequest.url.includes('/company/') &&
      originalRequest.url.includes('/qb/') &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Extract company ID from the URL
        const match = originalRequest.url.match(/\/company\/([a-f0-9-]+)\//);
        if (match && match[1]) {
          const companyId = match[1];

          // Try to refresh the token
          await qbApi.refreshToken(companyId);

          // Retry the original request
          return axiosServices(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - user needs to reconnect
        // Dispatch an action to show "Reconnect" button
        store.dispatch(setQuickBooksExpired());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Add a periodic token refresh (runs every 45 minutes)
export const startTokenRefreshTimer = (companyId: string) => {
  const REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes

  setInterval(async () => {
    try {
      const status = await qbApi.getConnectionStatus(companyId);

      // If token expires in less than 15 minutes, refresh it
      if (status.token_expires_in && status.token_expires_in < 900) {
        await qbApi.refreshToken(companyId);
        console.log('Token refreshed proactively');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }, REFRESH_INTERVAL);
};

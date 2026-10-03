import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'cx_access_token';
const REFRESH_KEY = 'cx_refresh_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string) => localStorage.setItem(REFRESH_KEY, t),
  clearRefresh: () => localStorage.removeItem(REFRESH_KEY),
};

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export const client = axios.create({ baseURL, withCredentials: true });

// Request interceptor: attach Authorization header
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.get();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Response interceptor: on 401, attempt refresh then retry once
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Wait for the in-flight refresh, then retry
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (!newToken) return reject(error);
            original.headers!.Authorization = `Bearer ${newToken}`;
            resolve(client(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken: string | undefined =
          res.data?.data?.accessToken ?? res.data?.accessToken;
        if (newToken) {
          tokenStorage.set(newToken);
          onRefreshed(newToken);
          original.headers!.Authorization = `Bearer ${newToken}`;
          return client(original);
        }
        throw new Error('No token returned by refresh');
      } catch (refreshError) {
        onRefreshed(null);
        tokenStorage.clear();
        tokenStorage.clearRefresh();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export type { AxiosRequestConfig };
export default client;

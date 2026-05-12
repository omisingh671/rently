import axios from "axios";
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from "axios";

import {
  APP_NAME,
  TENANT_SLUG,
  API_PREFIX,
  API_BASE_URL,
  AXIOS_WITH_CREDENTIALS,
  REQUEST_HEADER_AUTH_KEY,
  TOKEN_TYPE,
  APP_HEADER_CLIENT_NAME_KEY,
  TENANT_HEADER_SLUG_KEY,
} from "@/configs/appConfig";

import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "@/features/auth/types";

interface AuthRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  user: AuthUser;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/** Raw axios (no interceptors) **/
export const axiosRaw: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  withCredentials: AXIOS_WITH_CREDENTIALS,
});

/** Main axios instance **/
const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  withCredentials: AXIOS_WITH_CREDENTIALS,
});

/** Read token from store **/
const getAccessToken = (): string | null => {
  return useAuthStore.getState().accessToken;
};

/** Request interceptor **/
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAccessToken();

    if (token && config.headers) {
      config.headers[REQUEST_HEADER_AUTH_KEY] = `${TOKEN_TYPE} ${token}`;
    }

    if (config.headers) {
      config.headers[APP_HEADER_CLIENT_NAME_KEY] = APP_NAME;
      config.headers[TENANT_HEADER_SLUG_KEY] = TENANT_SLUG;
    }

    return config;
  },
);

/** Refresh coordination **/
let isRefreshing = false;

type QueuedRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: AuthRequestConfig;
};

let failedQueue: QueuedRequest[] = [];

const processQueue = (error: unknown | null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      resolve(axiosInstance(config));
    }
  });

  failedQueue = [];
};

/** Response interceptor **/
axiosInstance.interceptors.response.use(
  (response) => response,
  async (err: AxiosError) => {
    const originalConfig = err.config as AuthRequestConfig | undefined;
    if (!originalConfig) return Promise.reject(err);

    const status = err.response?.status;

    const isAuthEndpoint =
      originalConfig.url?.endsWith(API_ENDPOINTS.auth.login) ||
      originalConfig.url?.endsWith(API_ENDPOINTS.auth.refreshToken);

    if (status === 401 && !isAuthEndpoint) {
      if (originalConfig._retry) {
        return Promise.reject(err);
      }

      originalConfig._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalConfig });
        });
      }

      isRefreshing = true;

      try {
        const refreshRes = await axiosRaw.post<ApiEnvelope<RefreshResponse>>(
          API_ENDPOINTS.auth.refreshToken,
        );

        const { accessToken, user } = refreshRes.data.data;

        if (!accessToken || !user) {
          throw new Error("Invalid refresh response");
        }

        // Update store with fresh token
        useAuthStore.getState().setAuth({ user, accessToken });

        // Resolve queued requests
        processQueue(null);

        // Retry original request
        return axiosInstance(originalConfig);
      } catch (refreshError) {
        processQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  },
);

export default axiosInstance;

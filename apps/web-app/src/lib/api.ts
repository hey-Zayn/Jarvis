import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }> = [];
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly REFRESH_TIMEOUT_MS = 10000;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = useAuthStore.getState();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            if (this.failedQueue.length >= this.MAX_QUEUE_SIZE) {
              return Promise.reject(new Error('Token refresh queue full'));
            }
            return new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                const idx = this.failedQueue.findIndex((q) => q.resolve === resolve);
                if (idx > -1) {
                  this.failedQueue.splice(idx, 1);
                }
                reject(new Error('Token refresh timeout'));
              }, this.REFRESH_TIMEOUT_MS);

              this.failedQueue.push({ resolve, reject, timeoutId });
            }).then(() => this.client(originalRequest));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            await useAuthStore.getState().refreshAccessToken();
            this.processQueue(null);
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError as Error);
            useAuthStore.getState().logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: Error | null) {
    this.failedQueue.forEach(({ resolve, reject, timeoutId }) => {
      clearTimeout(timeoutId);
      if (error) reject(error);
      else resolve(null);
    });
    this.failedQueue = [];
  }

  // Auth endpoints
  async register(data: { email: string; password: string; displayName: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async verifyToken(accessToken: string) {
    const response = await this.client.post('/auth/verify-token', { accessToken });
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.client.post('/auth/refresh-token', { refreshToken });
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.client.post('/auth/reset-password', { token, password });
    return response.data;
  }

  async getProfile(accessToken: string) {
    const response = await this.client.get('/auth/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async updateProfile(accessToken: string, data: { displayName: string }) {
    const response = await this.client.patch('/auth/profile', data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  // Agent endpoints
  async startConversation(data: { title?: string; metadata?: Record<string, string> }) {
    const response = await this.client.post('/agent/conversations', data);
    return response.data;
  }

  async sendVoiceCommand(data: {
    conversationId: string;
    transcript: string;
    browserContext?: { url: string; title: string; selectedText: string; pageText: string };
  }) {
    const response = await this.client.post('/agent/voice-command', data);
    return response.data;
  }

  async sendVoiceCommandStream(data: {
    conversationId: string;
    transcript: string;
    browserContext?: { url: string; title: string; selectedText: string; pageText: string };
  }): Promise<ReadableStream<Uint8Array>> {
    const response = await this.client.post(`/voice/stream`, data, {
      responseType: 'stream',
    });
    return response.data;
  }

  async streamAgentResponse(conversationId: string, turnId: string) {
    const response = await this.client.get(`/agent/responses/${conversationId}/${turnId}`, {
      responseType: 'stream',
    });
    return response.data;
  }

  async saveMemory(data: { content: string; metadata?: Record<string, string> }) {
    const response = await this.client.post('/agent/memory', data);
    return response.data;
  }

  async searchMemory(query: string, limit = 5) {
    const response = await this.client.get('/agent/memory/search', {
      params: { query, limit },
    });
    return response.data;
  }

  // Worker endpoints
  async enqueueActionLog(data: {
    idempotencyKey: string;
    actionType: string;
    conversationId: string;
    payload: Record<string, unknown>;
  }) {
    const response = await this.client.post('/worker/action-log', data);
    return response.data;
  }

  async enqueueConversationPersist(data: {
    idempotencyKey: string;
    conversationId: string;
    turnId: string;
    payload: Record<string, unknown>;
  }) {
    const response = await this.client.post('/worker/conversation-persist', data);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
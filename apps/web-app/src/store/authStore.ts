import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '@/lib/api';

let hydrationPromise: Promise<void> | null = null;

export interface User {
  id: string;
  email: string;
  displayName: string;
  voicePreference: 'female' | 'male';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrating: boolean;
  error: string | null;

  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; displayName: string; voicePreference: 'female' | 'male' }) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrating: true,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.login(credentials);

          if (response.status?.ok && response.session) {
            const { userId, email, displayName, voicePreference, accessToken, refreshToken } = response.session;
            set({
              user: {
                id: userId,
                email,
                displayName: displayName || '',
                voicePreference: voicePreference === 'male' ? 'male' : 'female',
                createdAt: '',
                updatedAt: '',
              },
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error(response.status?.message || 'Login failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.register(data);
          if (response.status?.ok && response.session) {
            const { userId, email, displayName, voicePreference, accessToken, refreshToken } = response.session;
            set({
              user: {
                id: userId,
                email,
                displayName: displayName || '',
                voicePreference: voicePreference === 'male' ? 'male' : 'female',
                createdAt: '',
                updatedAt: '',
              },
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error(response.status?.message || 'Registration failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');

        try {
          const response = await apiClient.refreshToken(refreshToken);
          if (response.status?.ok && response.session) {
            const { accessToken, refreshToken: newRefreshToken } = response.session;
            set({ accessToken, refreshToken: newRefreshToken });
          } else {
            throw new Error(response.status?.message || 'Token refresh failed');
          }
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      hydrate: async () => {
        if (hydrationPromise) return hydrationPromise;

        hydrationPromise = (async () => {
        const { accessToken, refreshToken } = get();
        if (!accessToken || !refreshToken) {
          set({ isHydrating: false });
          return;
        }

        set({ isHydrating: true });

        try {
          const response = await apiClient.verifyToken(accessToken);
          if (response.status?.ok && response.tokenStatus === 'TOKEN_STATUS_VALID') {
            // Fetch full profile for displayName, createdAt, updatedAt
            const profileResponse = await apiClient.getProfile(accessToken);
            if (profileResponse.status?.ok && profileResponse.profile) {
              const p = profileResponse.profile;
              set({
                user: {
                  id: p.user_id,
                  email: p.email,
                  displayName: p.display_name || '',
                  voicePreference: p.voice_preference === 'male' ? 'male' : 'female',
                  createdAt: new Date(Number(p.created_at_epoch_millis)).toISOString(),
                  updatedAt: new Date(Number(p.updated_at_epoch_millis)).toISOString(),
                },
                isAuthenticated: true,
                isHydrating: false,
              });
              return;
            }
            // Fallback if profile fetch fails
            set({
              user: {
                id: response.userId,
                email: response.email,
                displayName: '',
                voicePreference: 'female',
                createdAt: '',
                updatedAt: '',
              },
              isAuthenticated: true,
              isHydrating: false,
            });
          } else {
            await get().refreshAccessToken();
          }
        } catch {
          try {
            await get().refreshAccessToken();
          } catch {
            get().logout();
          }
        } finally {
          set({ isHydrating: false });
        }
        })().finally(() => {
          hydrationPromise = null;
        });

        return hydrationPromise;
      },

      setUser: (user) => set({ user }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'jarvis-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

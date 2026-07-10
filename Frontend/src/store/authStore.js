import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user:        null,
      accessToken: null,

      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'sabueso-auth',
      partialize: (s) => ({ user: s.user }),  // accessToken NO se persiste (solo en memoria)
    }
  )
);

import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;

    // No reintentar la propia llamada de refresh para evitar bucle infinito
    if (original.url === '/auth/refresh') return Promise.reject(error);

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh').finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const { data } = await refreshPromise;
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAuth(useAuthStore.getState().user, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.replace('/login');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

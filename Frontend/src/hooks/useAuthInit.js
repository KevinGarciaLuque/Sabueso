import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

export function useAuthInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { user, accessToken, setAuth, logout } = useAuthStore.getState();

    // Sin usuario guardado: mostrar pantalla directamente
    if (!user) {
      setReady(true);
      return;
    }

    // Ya tenemos token en memoria (login reciente, no es recarga de página)
    if (accessToken) {
      setReady(true);
      return;
    }

    // Tenemos usuario pero no token (recarga de página): renovar via cookie
    api.post('/auth/refresh')
      .then(({ data }) => {
        setAuth(user, data.data.accessToken);
      })
      .catch(() => {
        logout();
      })
      .finally(() => setReady(true));
  }, []);

  return ready;
}

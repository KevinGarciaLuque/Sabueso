import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socketSingleton = null;

export function useSocket() {
  const accessToken = useAuthStore(s => s.accessToken);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accessToken) return;

    if (!socketSingleton) {
      socketSingleton = io('/', {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
      });
    }
    socketRef.current = socketSingleton;

    return () => {
      // Don't disconnect on unmount — keep singleton alive for navigation
    };
  }, [accessToken]);

  return socketRef.current;
}

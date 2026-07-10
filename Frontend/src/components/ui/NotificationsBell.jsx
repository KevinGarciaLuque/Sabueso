import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notifApi } from '../../api/index';

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60)   return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: sinLeer = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => notifApi.sinLeer().then(r => r.data.data?.total ?? 0),
    refetchInterval: 30_000,
  });

  const { data: notifs = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => notifApi.listar({ limit: 15 }).then(r => r.data.data),
    enabled: open,
  });

  const marcarTodas = useMutation({
    mutationFn: () => notifApi.marcarTodas(),
    onSuccess: () => {
      qc.invalidateQueries(['notif-count']);
      qc.invalidateQueries(['notificaciones']);
    },
  });

  const marcarUna = useMutation({
    mutationFn: (id) => notifApi.marcarLeida(id),
    onSuccess: () => {
      qc.invalidateQueries(['notif-count']);
      qc.invalidateQueries(['notificaciones']);
    },
  });

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNotifClick = (n) => {
    if (!n.leida) marcarUna.mutate(n.id);
    setOpen(false);
    if (n.url_accion) navigate(n.url_accion);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
      >
        <Bell className="w-4 h-4 shrink-0" />
        <span>Notificaciones</span>
        {sinLeer > 0 && (
          <span className="absolute left-6 top-1.5 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {sinLeer > 99 ? '99+' : sinLeer}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">Notificaciones</h3>
            {sinLeer > 0 && (
              <button onClick={() => marcarTodas.mutate()}
                className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                Marcar todas leídas
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y">
            {notifs.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                Sin notificaciones
              </li>
            ) : notifs.map(n => (
              <li key={n.id}>
                <button
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-orange-50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.leida && <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 shrink-0" />}
                    <div className={!n.leida ? '' : 'ml-4'}>
                      <p className={`text-sm ${!n.leida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.titulo}
                      </p>
                      {n.cuerpo && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.cuerpo}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.creado_en)}</p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

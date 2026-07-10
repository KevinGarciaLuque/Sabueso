import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { solicitudesApi, ofertasApi } from '../../api/index';
import { UrgenciaBadge, EstadoBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { ClipboardList, Tag, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';

export default function StoreDashboard() {
  const { user } = useAuthStore();

  const { data: solicitudes, isLoading: loadingSolicitudes } = useQuery({
    queryKey: ['solicitudes-publicas'],
    queryFn: () => solicitudesApi.listarPublicas({ limit: 10 }).then(r => r.data.data),
  });

  const { data: misOfertas, isLoading: loadingOfertas } = useQuery({
    queryKey: ['mis-ofertas'],
    queryFn: () => ofertasApi.listarMis({ limit: 5 }).then(r => r.data.data),
  });

  if (loadingSolicitudes || loadingOfertas) return <PageLoader />;

  const stats = [
    { label: 'Solicitudes disponibles', value: solicitudes?.total || 0, icon: ClipboardList, color: 'blue' },
    { label: 'Mis ofertas enviadas',    value: misOfertas?.total || 0, icon: Tag,          color: 'orange' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de tienda</h1>
        <p className="text-gray-500 mt-1">Bienvenido, {user?.nombre}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-${s.color}-100 rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 text-${s.color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Solicitudes recientes
          </h2>
          <Link to="/tienda/solicitudes" className="text-sm text-orange-600">Ver todas →</Link>
        </div>

        {!solicitudes?.rows?.length ? (
          <p className="text-center text-gray-400 py-6">No hay solicitudes disponibles ahora</p>
        ) : (
          <div className="divide-y">
            {solicitudes.rows.slice(0, 8).map((s) => (
              <Link key={s.id} to={`/tienda/solicitudes/${s.id}`}
                className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{s.nombre_repuesto}</p>
                  <p className="text-sm text-gray-500">
                    {s.marca_nombre} {s.modelo_nombre} {s.anio} · {s.solicitud_ciudad || s.ciudad || 'Sin ciudad'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <UrgenciaBadge urgencia={s.urgencia} />
                  {s.total_ofertas > 0 && (
                    <span className="text-xs text-gray-400">{s.total_ofertas} oferta{s.total_ofertas !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

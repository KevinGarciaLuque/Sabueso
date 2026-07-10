import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { solicitudesApi } from '../../api/index';
import { EstadoBadge, UrgenciaBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { FileText, Car, Plus, Tag } from 'lucide-react';

export default function ClientDashboard() {
  const { user } = useAuthStore();

  const { data: solicitudes, isLoading } = useQuery({
    queryKey: ['mis-solicitudes'],
    queryFn: () => solicitudesApi.listarMis({ limit: 5 }).then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.nombre} 👋</h1>
        <p className="text-gray-500 mt-1">¿Qué repuesto necesitas hoy?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/cliente/solicitudes/nueva"
          className="card flex items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
            <Plus className="w-6 h-6 text-orange-600 group-hover:text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Nueva solicitud</p>
            <p className="text-sm text-gray-500">Publica lo que necesitas</p>
          </div>
        </Link>

        <Link to="/cliente/vehiculos"
          className="card flex items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Car className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Mis vehículos</p>
            <p className="text-sm text-gray-500">Administra tu garage</p>
          </div>
        </Link>

        <Link to="/cliente/solicitudes"
          className="card flex items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Mis solicitudes</p>
            <p className="text-sm text-gray-500">Ver ofertas recibidas</p>
          </div>
        </Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Solicitudes recientes</h2>
          <Link to="/cliente/solicitudes" className="text-sm text-orange-600 hover:text-orange-700">
            Ver todas →
          </Link>
        </div>

        {solicitudes?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No tienes solicitudes aún</p>
            <Link to="/cliente/solicitudes/nueva" className="mt-3 btn-primary inline-block text-sm">
              Crear primera solicitud
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {solicitudes?.map((s) => (
              <Link key={s.id} to={`/cliente/solicitudes/${s.id}`}
                className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{s.nombre_repuesto}</p>
                  <p className="text-sm text-gray-500">
                    {s.marca_nombre} {s.modelo_nombre} {s.anio} · {s.ciudad || 'Sin ciudad'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.total_ofertas > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                      <Tag className="w-3 h-3" /> {s.total_ofertas}
                    </span>
                  )}
                  <EstadoBadge estado={s.estado} />
                  <UrgenciaBadge urgencia={s.urgencia} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

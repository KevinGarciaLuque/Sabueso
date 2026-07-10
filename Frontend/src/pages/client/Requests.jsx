import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { solicitudesApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { EstadoBadge, UrgenciaBadge } from '../../components/ui/Badge';
import { FileText, Plus, Tag, Eye, Car } from 'lucide-react';

const ESTADOS = ['', 'PUBLICADA', 'RECIBIENDO_OFERTAS', 'OFERTA_SELECCIONADA', 'COMPLETADA', 'CANCELADA'];

export default function Requests() {
  const [estado, setEstado] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['mis-solicitudes', estado],
    queryFn: () => solicitudesApi.listarMis({ estado: estado || undefined, limit: 30 }).then(r => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis solicitudes</h1>
          <p className="text-gray-500 mt-1">{data?.meta?.total || 0} solicitudes</p>
        </div>
        <Link to="/cliente/solicitudes/nueva" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva solicitud
        </Link>
      </div>

      {/* Filtro estados */}
      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map(e => (
          <button key={e || 'todas'} onClick={() => setEstado(e)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              estado === e
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:border-orange-300'
            }`}>
            {e || 'Todas'}
          </button>
        ))}
      </div>

      {/* Lista vacía */}
      {data?.data?.length === 0 && (
        <div className="card text-center py-16">
          <FileText className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {estado ? 'Sin solicitudes con ese estado' : 'No tienes solicitudes'}
          </h3>
          {!estado && (
            <Link to="/cliente/solicitudes/nueva" className="btn-primary inline-flex items-center gap-2 mt-4">
              <Plus className="w-4 h-4" /> Crear primera solicitud
            </Link>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {data?.data?.map(s => (
          <Link key={s.id} to={`/cliente/solicitudes/${s.id}`}
            className="card flex items-center justify-between gap-4 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group p-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{s.nombre_repuesto}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                  {s.marca_nombre && (
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {s.marca_nombre} {s.modelo_nombre} {s.anio}
                    </span>
                  )}
                  {s.ciudad && <span>· {s.ciudad}</span>}
                  <span>· {new Date(s.creado_en).toLocaleDateString('es-HN')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {s.total_ofertas > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  <Tag className="w-3 h-3" /> {s.total_ofertas}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Eye className="w-3 h-3" /> {s.vistas}
              </span>
              <UrgenciaBadge urgencia={s.urgencia} />
              <EstadoBadge estado={s.estado} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

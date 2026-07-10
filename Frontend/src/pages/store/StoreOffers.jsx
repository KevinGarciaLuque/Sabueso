import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ofertasApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { UrgenciaBadge } from '../../components/ui/Badge';
import { Tag, ArrowRight } from 'lucide-react';

const ESTADO_LABEL = {
  ENVIADA:    'Enviada',
  VISTA:      'Vista',
  RESPONDIDA: 'Respondida',
  ACEPTADA:   'Aceptada',
  RECHAZADA:  'Rechazada',
  VENCIDA:    'Vencida',
  RETIRADA:   'Retirada',
};

const ESTADO_COLOR = {
  ENVIADA:    'bg-blue-100 text-blue-700',
  VISTA:      'bg-gray-100 text-gray-600',
  RESPONDIDA: 'bg-orange-100 text-orange-700',
  ACEPTADA:   'bg-green-100 text-green-700',
  RECHAZADA:  'bg-red-100 text-red-700',
  VENCIDA:    'bg-gray-100 text-gray-500',
  RETIRADA:   'bg-gray-100 text-gray-500',
};

const TIPO_LABEL = {
  ORIGINAL_OEM:    'Original OEM',
  ORIGINAL_USADO:  'Original usado',
  GENERICO_NUEVO:  'Genérico nuevo',
  REMANUFACTURADO: 'Remanufacturado',
  RECONSTRUIDO:    'Reconstruido',
  ALTERNATIVO:     'Alternativo',
  DESARMADERO:     'Desarmadero',
};

const FILTROS = ['', 'ENVIADA', 'VISTA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA'];

export default function StoreOffers() {
  const [estado, setEstado] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['mis-ofertas-tienda', estado],
    queryFn: () => ofertasApi.listarMis({ estado: estado || undefined, limit: 50 }).then(r => r.data),
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader />;

  const ofertas = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis ofertas</h1>
          <p className="text-gray-500 mt-1">Ofertas que has enviado a las solicitudes</p>
        </div>
        <span className="text-sm text-gray-500">{data?.meta?.total ?? ofertas.length} en total</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTROS.map(f => (
          <button key={f || 'all'} onClick={() => setEstado(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              estado === f ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f ? ESTADO_LABEL[f] : 'Todas'}
          </button>
        ))}
      </div>

      {ofertas.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Tag className="w-12 h-12 mx-auto text-gray-200 mb-3" />
          <p>No has enviado ofertas todavía.</p>
          <Link to="/tienda/solicitudes" className="text-orange-600 text-sm mt-2 inline-block">
            Ver solicitudes disponibles →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ofertas.map(o => (
            <div key={o.id} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{o.nombre_repuesto || 'Repuesto'}</p>
                    {o.urgencia && <UrgenciaBadge urgencia={o.urgencia} />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {TIPO_LABEL[o.tipo_repuesto] || o.tipo_repuesto}
                    {o.solicitud_ciudad ? ` · ${o.solicitud_ciudad}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Enviada el {new Date(o.creado_en).toLocaleDateString('es-HN')}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">L {Number(o.precio_total ?? o.precio).toLocaleString('es-HN')}</p>
                  <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${ESTADO_COLOR[o.estado] || 'bg-gray-100 text-gray-600'}`}>
                    {ESTADO_LABEL[o.estado] || o.estado}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex justify-end">
                <Link to={`/tienda/solicitudes/${o.solicitud_id}`}
                  className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1">
                  Ver solicitud <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

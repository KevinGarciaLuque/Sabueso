import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { solicitudesApi, catalogoApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { UrgenciaBadge } from '../../components/ui/Badge';
import { Search, Filter, Tag, Car, MapPin, Clock } from 'lucide-react';

export default function StoreRequests() {
  const [filtros, setFiltros] = useState({ q: '', urgencia: '', marcaId: '', ciudad: '' });
  const [showFiltros, setShowFiltros] = useState(false);

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas'],
    queryFn: () => catalogoApi.marcas().then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['solicitudes-publicas', filtros],
    queryFn: () => solicitudesApi.listarPublicas({
      q:        filtros.q       || undefined,
      urgencia: filtros.urgencia|| undefined,
      marcaId:  filtros.marcaId || undefined,
      ciudad:   filtros.ciudad  || undefined,
      limit: 30,
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const setFiltro = (k, v) => setFiltros(f => ({ ...f, [k]: v }));

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bandeja de solicitudes</h1>
          <p className="text-gray-500 mt-1">{data?.meta?.total || 0} solicitudes disponibles</p>
        </div>
        <button onClick={() => setShowFiltros(!showFiltros)}
          className="btn-secondary flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      {/* Barra búsqueda */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={filtros.q} onChange={e => setFiltro('q', e.target.value)}
          className="input-field pl-10" placeholder="Buscar repuesto (tijera, amortiguador, pastillas...)" />
      </div>

      {/* Filtros expandibles */}
      {showFiltros && (
        <div className="card grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Marca vehículo</label>
            <select value={filtros.marcaId} onChange={e => setFiltro('marcaId', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Urgencia</label>
            <select value={filtros.urgencia} onChange={e => setFiltro('urgencia', e.target.value)} className="input-field text-sm">
              <option value="">Todas</option>
              <option value="CRITICA">Crítica</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
            <input value={filtros.ciudad} onChange={e => setFiltro('ciudad', e.target.value)}
              className="input-field text-sm" placeholder="Tegucigalpa..." />
          </div>
          <div className="flex items-end">
            <button onClick={() => setFiltros({ q:'', urgencia:'', marcaId:'', ciudad:'' })}
              className="btn-secondary text-sm w-full">Limpiar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      {data?.data?.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No hay solicitudes con esos filtros</div>
      ) : (
        <div className="space-y-3">
          {data?.data?.map(s => (
            <Link key={s.id} to={`/tienda/solicitudes/${s.id}`}
              className="card flex items-center justify-between gap-4 hover:shadow-md hover:border-orange-200 transition-all p-4 group">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {s.nombre_repuesto}
                  </p>
                  <UrgenciaBadge urgencia={s.urgencia} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                  {s.marca_nombre && (
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {s.marca_nombre} {s.modelo_nombre} {s.anio}
                    </span>
                  )}
                  {s.ciudad && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {s.ciudad}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(s.creado_en).toLocaleDateString('es-HN')}
                  </span>
                  {s.condicion_aceptada !== 'CUALQUIERA' && (
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                      Solo {s.condicion_aceptada.toLowerCase()}
                    </span>
                  )}
                  {s.presupuesto_max && (
                    <span className="text-green-600 font-medium">
                      Máx. L {Number(s.presupuesto_max).toLocaleString('es-HN')}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {s.total_ofertas > 0 && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {s.total_ofertas} oferta{s.total_ofertas !== 1 ? 's' : ''}
                  </p>
                )}
                <span className="text-xs text-orange-500 font-medium mt-1 block">Ver y ofertar →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

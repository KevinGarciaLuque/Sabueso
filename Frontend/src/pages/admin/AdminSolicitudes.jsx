import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader } from '../../components/ui/Spinner';
import { EstadoBadge, UrgenciaBadge } from '../../components/ui/Badge';
import { Search } from 'lucide-react';

const ESTADOS = ['', 'PUBLICADA', 'RECIBIENDO_OFERTAS', 'OFERTA_SELECCIONADA', 'COMPLETADA', 'CANCELADA', 'EXPIRADA'];

export default function AdminSolicitudes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const estado = searchParams.get('estado') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-solicitudes', estado, busqueda],
    queryFn: () => api.get('/solicitudes/admin', {
      params: { estado: estado || undefined, q: busqueda || undefined, limit: 30 }
    }).then(r => r.data),
    keepPreviousData: true,
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
        <span className="text-sm text-gray-500">{data?.meta?.total ?? '—'} registros</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map(e => (
          <button key={e || 'todas'} onClick={() => setSearchParams(e ? { estado: e } : {})}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              estado === e ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-orange-300'
            }`}>
            {e || 'Todas'}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Buscar repuesto..." />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Repuesto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vehículo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ciudad</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Urgencia</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.data?.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.nombre_repuesto}</td>
                <td className="px-4 py-3 text-gray-500">
                  {s.marca_nombre} {s.modelo_nombre} {s.anio || ''}
                </td>
                <td className="px-4 py-3 text-gray-500">{s.ciudad || '—'}</td>
                <td className="px-4 py-3"><UrgenciaBadge urgencia={s.urgencia} /></td>
                <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                <td className="px-4 py-3 text-gray-400">{new Date(s.creado_en).toLocaleDateString('es-HN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.data?.length && (
          <p className="text-center text-gray-400 py-8">No hay solicitudes</p>
        )}
      </div>
    </div>
  );
}

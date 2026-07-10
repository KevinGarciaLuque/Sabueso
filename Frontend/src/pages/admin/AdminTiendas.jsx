import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tiendasApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, XCircle, Eye, Search } from 'lucide-react';

const ESTADO_OPTIONS = ['', 'PENDIENTE', 'EN_REVISION', 'VERIFICADA', 'RECHAZADA', 'SUSPENDIDA', 'BLOQUEADA'];
const ESTADO_BADGE = {
  PENDIENTE:   'yellow', EN_REVISION: 'blue', VERIFICADA: 'green',
  RECHAZADA:   'red',    SUSPENDIDA:  'red',  BLOQUEADA:  'gray',
};

export default function AdminTiendas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const estado  = searchParams.get('estado') || '';
  const qc      = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tiendas', estado, busqueda],
    queryFn: () => tiendasApi.listarAdmin({ estado: estado || undefined, q: busqueda || undefined, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }) => tiendasApi.cambiarEstado(id, estado),
    onSuccess: () => { qc.invalidateQueries(['admin-tiendas']); toast.success('Estado actualizado'); },
    onError:   () => toast.error('Error al actualizar'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tiendas</h1>
        <span className="text-sm text-gray-500">{data?.meta?.total || 0} tiendas</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        {ESTADO_OPTIONS.map(e => (
          <button key={e || 'todas'} onClick={() => setSearchParams(e ? { estado: e } : {})}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              estado === e ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-orange-300'
            }`}>
            {e || 'Todas'}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Buscar tienda..." />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tienda</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Registrada</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.data?.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{t.nombre_comercial}</td>
                <td className="px-4 py-3 text-gray-500">{t.email}</td>
                <td className="px-4 py-3 text-gray-500">{t.plan_nombre || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={ESTADO_BADGE[t.estado] || 'gray'}>{t.estado}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(t.creado_en).toLocaleDateString('es-HN')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/tiendas/${t.id}`}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Ver detalles">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {t.estado === 'PENDIENTE' || t.estado === 'EN_REVISION' ? (
                      <>
                        <button onClick={() => cambiarEstado.mutate({ id: t.id, estado: 'VERIFICADA' })}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded transition-colors" title="Aprobar">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => cambiarEstado.mutate({ id: t.id, estado: 'RECHAZADA' })}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors" title="Rechazar">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : t.estado === 'VERIFICADA' ? (
                      <button onClick={() => cambiarEstado.mutate({ id: t.id, estado: 'SUSPENDIDA' })}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors" title="Suspender">
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.data?.length && (
          <p className="text-center text-gray-400 py-8">No se encontraron tiendas</p>
        )}
      </div>
    </div>
  );
}

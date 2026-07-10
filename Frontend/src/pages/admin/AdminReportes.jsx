import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { TIPO_REPORTE_LABEL, ESTADO_REPORTE_BADGE, ESTADO_REPORTE_LABEL } from '../../utils/constants';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ESTADO_OPTIONS = ['', 'ABIERTO', 'EN_REVISION', 'RESUELTO', 'DESCARTADO'];

export default function AdminReportes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [resolviendo, setResolviendo] = useState(null); // { id, estado }
  const estado = searchParams.get('estado') || '';
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reportes', estado, page],
    queryFn: () => adminApi.reportes({ estado: estado || undefined, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  });

  const cambiarFiltro = (e) => {
    setPage(1);
    setSearchParams(e ? { estado: e } : {});
  };

  const marcarEnRevision = useMutation({
    mutationFn: (id) => adminApi.resolverReporte(id, { estado: 'EN_REVISION' }),
    onSuccess: () => { qc.invalidateQueries(['admin-reportes']); toast.success('Marcado en revisión'); },
    onError: () => toast.error('Error al actualizar'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <span className="text-sm text-gray-500">{data?.meta?.total || 0} reportes</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        {ESTADO_OPTIONS.map(e => (
          <button key={e || 'todos'} onClick={() => cambiarFiltro(e)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              estado === e ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-orange-300'
            }`}>
            {e ? ESTADO_REPORTE_LABEL[e] : 'Todos'}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tienda reportada</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reportado por</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.data?.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 align-top">
                <td className="px-4 py-3 font-medium text-gray-900">{r.tienda_nombre || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{TIPO_REPORTE_LABEL[r.tipo] || r.tipo}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs">
                  <p className="line-clamp-2">{r.descripcion}</p>
                  {r.nota_admin && (
                    <p className="mt-1 text-xs text-gray-400 italic">Nota: {r.nota_admin}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  <p>{r.reportante_nombre}</p>
                  <p className="text-xs text-gray-400">{r.reportante_email}</p>
                </td>
                <td className="px-4 py-3 text-gray-400">{new Date(r.creado_en).toLocaleDateString('es-HN')}</td>
                <td className="px-4 py-3">
                  <Badge variant={ESTADO_REPORTE_BADGE[r.estado] || 'gray'}>{ESTADO_REPORTE_LABEL[r.estado] || r.estado}</Badge>
                </td>
                <td className="px-4 py-3">
                  {['RESUELTO', 'DESCARTADO'].includes(r.estado) ? (
                    r.resuelto_por_nombre && <span className="text-xs text-gray-400">por {r.resuelto_por_nombre}</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.estado === 'ABIERTO' && (
                        <button onClick={() => marcarEnRevision.mutate(r.id)}
                          className="text-xs text-blue-600 hover:underline">En revisión</button>
                      )}
                      <button onClick={() => setResolviendo({ id: r.id, estado: 'RESUELTO' })}
                        className="text-xs text-green-600 hover:underline">Resolver</button>
                      <button onClick={() => setResolviendo({ id: r.id, estado: 'DESCARTADO' })}
                        className="text-xs text-gray-500 hover:underline">Descartar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.data?.length && (
          <p className="text-center text-gray-400 py-8">No se encontraron reportes</p>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => p - 1)} disabled={!data.meta.hasPrev}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-300">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">Página {data.meta.page} de {data.meta.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!data.meta.hasNext}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-300">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {resolviendo && (
        <ResolverModal resolviendo={resolviendo} onClose={() => setResolviendo(null)} />
      )}
    </div>
  );
}

function ResolverModal({ resolviendo, onClose }) {
  const [nota, setNota] = useState('');
  const qc = useQueryClient();

  const resolver = useMutation({
    mutationFn: () => adminApi.resolverReporte(resolviendo.id, { estado: resolviendo.estado, notaAdmin: nota || undefined }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-reportes']);
      toast.success(resolviendo.estado === 'RESUELTO' ? 'Reporte resuelto' : 'Reporte descartado');
      onClose();
    },
    onError: () => toast.error('Error al actualizar el reporte'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {resolviendo.estado === 'RESUELTO' ? 'Resolver reporte' : 'Descartar reporte'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={3} className="input-field"
              placeholder="Detalle de la resolución o motivo del descarte..." />
          </div>
          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={() => resolver.mutate()} disabled={resolver.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {resolver.isPending && <Spinner size="sm" />}
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

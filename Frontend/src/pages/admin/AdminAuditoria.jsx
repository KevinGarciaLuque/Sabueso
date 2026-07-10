import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Search, ChevronLeft, ChevronRight, ShieldAlert, ListTree } from 'lucide-react';

export default function AdminAuditoria() {
  const [tab, setTab] = useState('auditoria'); // 'auditoria' | 'intentos'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
        <p className="text-gray-500 mt-1">Registro de acciones administrativas e intentos de acceso</p>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('auditoria')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            tab === 'auditoria' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}>
          <ListTree className="w-4 h-4" /> Acciones
        </button>
        <button onClick={() => setTab('intentos')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            tab === 'intentos' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}>
          <ShieldAlert className="w-4 h-4" /> Intentos de acceso
        </button>
      </div>

      {tab === 'auditoria' ? <TabAuditoria /> : <TabIntentos />}
    </div>
  );
}

function TabAuditoria() {
  const [accion, setAccion] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-auditoria', accion, page],
    queryFn: () => adminApi.auditoria({ accion: accion || undefined, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={accion} onChange={e => { setPage(1); setAccion(e.target.value); }}
          className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-full text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Filtrar por acción..." />
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tienda</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Acción</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tabla / Registro</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.data?.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(a.creado_en).toLocaleString('es-HN')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {a.nombre || '—'}
                      {a.email && <p className="text-xs text-gray-400">{a.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.tenant_nombre || '—'}</td>
                    <td className="px-4 py-3"><Badge variant="blue">{a.accion}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{a.tabla ? `${a.tabla} #${a.registro_id ?? '—'}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{a.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && (
              <p className="text-center text-gray-400 py-8">No se encontraron registros</p>
            )}
          </div>
          <Paginador meta={data?.meta} page={page} setPage={setPage} />
        </>
      )}
    </div>
  );
}

function TabIntentos() {
  const [soloFallidos, setSoloFallidos] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-intentos', soloFallidos, page],
    queryFn: () => adminApi.intentos({ fallidos: soloFallidos ? '1' : undefined, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-gray-600 w-fit">
        <input type="checkbox" checked={soloFallidos}
          onChange={e => { setPage(1); setSoloFallidos(e.target.checked); }}
          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
        Solo intentos fallidos
      </label>

      {isLoading ? <PageLoader /> : (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.data?.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(i.creado_en).toLocaleString('es-HN')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{i.email}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i.ip || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={i.exitoso ? 'green' : 'red'}>{i.exitoso ? 'Exitoso' : 'Fallido'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.data?.length && (
              <p className="text-center text-gray-400 py-8">No se encontraron registros</p>
            )}
          </div>
          <Paginador meta={data?.meta} page={page} setPage={setPage} />
        </>
      )}
    </div>
  );
}

function Paginador({ meta, page, setPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4">
      <button onClick={() => setPage(p => p - 1)} disabled={!meta.hasPrev}
        className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-300">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-gray-500">Página {page} de {meta.totalPages}</span>
      <button onClick={() => setPage(p => p + 1)} disabled={!meta.hasNext}
        className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-300">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

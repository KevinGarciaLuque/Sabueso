import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { disputasApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { AlertTriangle, ShieldCheck, CheckCircle, X } from 'lucide-react';

const MOTIVO_LABEL = {
  REPUESTO_INCOMPATIBLE:  'Repuesto incompatible',
  PRODUCTO_DIFERENTE:     'Producto diferente',
  PRODUCTO_DANADO:        'Producto dañado',
  NO_RECIBIDO:            'No recibido',
  GARANTIA_NO_RESPETADA:  'Garantía no respetada',
  PRECIO_DIFERENTE:       'Precio diferente',
  PIEZA_INCOMPLETA:       'Pieza incompleta',
  OTRO:                   'Otro',
};

const ESTADO_BADGE = {
  ABIERTA: 'red', ESPERANDO_TIENDA: 'orange', ESPERANDO_CLIENTE: 'yellow',
  EN_REVISION: 'blue', RESUELTA_CLIENTE: 'green', RESUELTA_TIENDA: 'green', CERRADA: 'gray',
};

const TABS = ['Disputas', 'Garantías'];

export default function StoreDisputes() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [resolucion, setResolucion] = useState('');

  const { data: disputas, isLoading: loadD } = useQuery({
    queryKey: ['disputas-tienda'],
    queryFn: () => disputasApi.disputasTienda({ limit: 50 }).then(r => r.data.data),
  });

  const { data: garantias, isLoading: loadG } = useQuery({
    queryKey: ['garantias-tienda'],
    queryFn: () => disputasApi.garantiasTienda({ limit: 50 }).then(r => r.data.data),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado, resolucion }) => disputasApi.cambiarEstado(id, { estado, resolucion }),
    onSuccess: () => { qc.invalidateQueries(['disputas-tienda']); toast.success('Estado actualizado'); setExpanded(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Disputas y garantías</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === i ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        loadD ? <PageLoader /> : (
          <div className="space-y-3">
            {!disputas?.length ? (
              <div className="card p-10 text-center text-gray-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Sin disputas activas.</p>
              </div>
            ) : disputas.map(d => (
              <div key={d.id} className="card p-4">
                <div className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">Orden #{d.orden_numero}</span>
                      <Badge variant={ESTADO_BADGE[d.estado] || 'gray'}>{d.estado.replace(/_/g,' ')}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{MOTIVO_LABEL[d.motivo]}</p>
                    <p className="text-sm text-gray-400">Cliente: {d.cliente_nombre} {d.cliente_apellido}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(d.creado_en).toLocaleDateString('es-HN')}</span>
                </div>

                {expanded === d.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <p className="text-sm font-medium text-gray-700">Cambiar estado:</p>
                    <div className="flex flex-wrap gap-2">
                      {['ESPERANDO_CLIENTE','EN_REVISION','RESUELTA_TIENDA','CERRADA'].map(e => (
                        <button key={e} disabled={d.estado === e}
                          onClick={() => cambiarEstado.mutate({ id: d.id, estado: e, resolucion: resolucion || null })}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            d.estado === e ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
                          }`}>
                          {e.replace(/_/g,' ')}
                        </button>
                      ))}
                    </div>
                    <textarea value={resolucion} onChange={e => setResolucion(e.target.value)}
                      placeholder="Resolución o nota (opcional)..."
                      className="input text-sm" rows={2} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 1 && (
        loadG ? <PageLoader /> : (
          <div className="space-y-3">
            {!garantias?.length ? (
              <div className="card p-10 text-center text-gray-400">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Sin garantías registradas.</p>
              </div>
            ) : garantias.map(g => (
              <div key={g.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Orden #{g.orden_numero}</p>
                  <p className="text-sm text-gray-500">
                    {g.cliente_nombre} {g.cliente_apellido}
                  </p>
                  <p className="text-sm text-gray-400">
                    Vence: {g.fecha_vence ? new Date(g.fecha_vence).toLocaleDateString('es-HN') : 'Sin fecha'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  g.estado === 'ACTIVA' ? 'bg-green-50 text-green-600' :
                  g.estado === 'VENCIDA' ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-500'
                }`}>
                  {g.estado}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

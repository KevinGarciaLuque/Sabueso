import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ordenesApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { ShoppingBag, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

const ESTADO_LABEL = {
  PENDIENTE_CONFIRMACION: 'Pendiente confirmación',
  CONFIRMADA:             'Confirmada',
  PREPARANDO:             'Preparando',
  LISTA_PARA_RETIRO:      'Lista para retiro',
  ENVIADA:                'Enviada',
  ENTREGADA:              'Entregada',
  CANCELADA:              'Cancelada',
};

const ESTADO_COLOR = {
  PENDIENTE_CONFIRMACION: 'badge-orange',
  CONFIRMADA:             'badge-blue',
  PREPARANDO:             'badge-blue',
  ENTREGADA:              'badge-green',
  CANCELADA:              'bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full',
};

const SIGUIENTE_ACCION = {
  PENDIENTE_CONFIRMACION: 'Confirmar orden',
  CONFIRMADA:             'Marcar preparando',
  PREPARANDO:             'Marcar entregada',
};

function OrdenCard({ orden }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const avanzar = useMutation({
    mutationFn: () => ordenesApi.avanzar(orden.id),
    onSuccess: (r) => {
      toast.success(`Orden actualizada a ${ESTADO_LABEL[r.data.data?.estado] || 'nuevo estado'}`);
      qc.invalidateQueries(['ordenes-tienda']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const cancelar = useMutation({
    mutationFn: () => ordenesApi.cancelar(orden.id),
    onSuccess: () => { toast.success('Orden cancelada'); qc.invalidateQueries(['ordenes-tienda']); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const accion = SIGUIENTE_ACCION[orden.estado];

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-sm text-gray-500">{orden.numero}</p>
          <p className="font-semibold text-gray-900 mt-0.5">{orden.nombre_repuesto || 'Orden de repuesto'}</p>
          <p className="text-sm text-gray-500">
            {orden.cliente_nombre} {orden.cliente_apellido}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={ESTADO_COLOR[orden.estado] || 'badge-orange'}>
            {ESTADO_LABEL[orden.estado] || orden.estado}
          </span>
          <p className="font-bold text-gray-900">L {Number(orden.total).toLocaleString('es-HN')}</p>
          <button onClick={() => setExpanded(v => !v)} className="p-1 hover:bg-gray-100 rounded-lg">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 text-gray-600">
            <div><p className="text-xs text-gray-400">Subtotal</p><p>L {Number(orden.total - orden.costo_envio).toLocaleString('es-HN')}</p></div>
            <div><p className="text-xs text-gray-400">Envío</p><p>L {Number(orden.costo_envio).toLocaleString('es-HN')}</p></div>
            <div><p className="text-xs text-gray-400">Entrega</p><p>{orden.metodo_entrega?.replace(/_/g, ' ') || '—'}</p></div>
            <div><p className="text-xs text-gray-400">Fecha</p><p>{new Date(orden.creado_en).toLocaleDateString('es-HN')}</p></div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {accion && (
              <button onClick={() => avanzar.mutate()} disabled={avanzar.isPending}
                className="btn-primary text-sm flex items-center gap-1.5">
                {avanzar.isPending ? <Spinner size="sm" /> : <ArrowRight className="w-4 h-4" />}
                {accion}
              </button>
            )}
            {!['CANCELADA','ENTREGADA'].includes(orden.estado) && (
              <button onClick={() => cancelar.mutate()} disabled={cancelar.isPending}
                className="btn-secondary text-sm text-red-500 hover:text-red-600">
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoreOrders() {
  const [estado, setEstado] = useState('');
  const ESTADOS = ['', 'PENDIENTE_CONFIRMACION', 'CONFIRMADA', 'PREPARANDO', 'ENTREGADA', 'CANCELADA'];

  const { data, isLoading } = useQuery({
    queryKey: ['ordenes-tienda', estado],
    queryFn: () => ordenesApi.tienda({ estado: estado || undefined, limit: 30 }).then(r => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Órdenes recibidas</h1>
        <p className="text-gray-500 mt-1">{data?.meta?.total || 0} órdenes</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map(e => (
          <button key={e || 'todas'} onClick={() => setEstado(e)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              estado === e ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-orange-300'
            }`}>
            {e ? (ESTADO_LABEL[e] || e) : 'Todas'}
          </button>
        ))}
      </div>

      {data?.data?.length === 0 ? (
        <div className="card text-center py-16">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Sin órdenes con esos filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data?.map(o => <OrdenCard key={o.id} orden={o} />)}
        </div>
      )}
    </div>
  );
}

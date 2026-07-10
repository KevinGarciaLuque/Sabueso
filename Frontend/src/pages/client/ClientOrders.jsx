import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ordenesApi, califApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { StarRating } from '../../components/ui/StarRating';
import { ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';

const ESTADO_COLOR = {
  PENDIENTE_CONFIRMACION: 'badge-orange',
  CONFIRMADA:             'badge-blue',
  PREPARANDO:             'badge-blue',
  LISTA_PARA_RETIRO:      'badge-green',
  ENVIADA:                'badge-blue',
  ENTREGADA:              'badge-green',
  CANCELADA:              'bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full',
};

const ESTADO_LABEL = {
  PENDIENTE_CONFIRMACION: 'Pendiente confirmación',
  CONFIRMADA:             'Confirmada',
  PREPARANDO:             'Preparando',
  LISTA_PARA_RETIRO:      'Lista para retiro',
  ENVIADA:                'Enviada',
  ENTREGADA:              'Entregada',
  CANCELADA:              'Cancelada',
};

function RatingForm({ ordenId, onDone }) {
  const [ratings, setRatings] = useState({ calidad: 0, compatibilidad: 0, precio: 0, atencion: 0, rapidez: 0 });
  const [comentario, setComentario] = useState('');

  const calificar = useMutation({
    mutationFn: () => califApi.calificar({ ordenId, ...ratings, comentario }),
    onSuccess: () => { toast.success('¡Gracias por tu calificación!'); onDone(); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Error al calificar'),
  });

  const campos = [
    ['calidad',        'Calidad del repuesto'],
    ['compatibilidad', 'Compatibilidad'],
    ['precio',         'Precio / valor'],
    ['atencion',       'Atención al cliente'],
    ['rapidez',        'Rapidez de entrega'],
  ];

  const listo = Object.values(ratings).every(v => v > 0);

  return (
    <div className="border-t pt-4 mt-4 space-y-4">
      <h4 className="font-semibold text-gray-800">Califica esta compra</h4>
      <div className="space-y-3">
        {campos.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 w-44">{label}</span>
            <StarRating value={ratings[key]} onChange={v => setRatings(r => ({ ...r, [key]: v }))} />
          </div>
        ))}
      </div>
      <textarea value={comentario} onChange={e => setComentario(e.target.value)}
        rows={2} className="input-field text-sm"
        placeholder="Comentario opcional..." />
      <button
        onClick={() => calificar.mutate()}
        disabled={!listo || calificar.isPending}
        className="btn-primary w-full flex items-center justify-center gap-2">
        {calificar.isPending && <Spinner size="sm" />}
        Enviar calificación
      </button>
    </div>
  );
}

function OrdenCard({ orden }) {
  const [expanded, setExpanded] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const qc = useQueryClient();

  const cancelar = useMutation({
    mutationFn: () => ordenesApi.cancelar(orden.id),
    onSuccess: () => { toast.success('Orden cancelada'); qc.invalidateQueries(['mis-ordenes']); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-sm text-gray-500">{orden.numero}</p>
          <p className="font-semibold text-gray-900 mt-0.5">{orden.nombre_repuesto || 'Orden de repuesto'}</p>
          <p className="text-sm text-gray-500">{orden.tienda_nombre}</p>
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
        <div className="mt-4 pt-4 border-t space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 text-gray-600">
            <div><p className="text-xs text-gray-400">Subtotal</p><p>L {Number(orden.total - orden.costo_envio).toLocaleString('es-HN')}</p></div>
            <div><p className="text-xs text-gray-400">Envío</p><p>L {Number(orden.costo_envio).toLocaleString('es-HN')}</p></div>
            <div><p className="text-xs text-gray-400">Entrega</p><p>{orden.metodo_entrega?.replace(/_/g, ' ') || '—'}</p></div>
            <div><p className="text-xs text-gray-400">Fecha</p><p>{new Date(orden.creado_en).toLocaleDateString('es-HN')}</p></div>
          </div>

          <div className="flex gap-2 flex-wrap pt-1">
            {!['CANCELADA','ENTREGADA'].includes(orden.estado) && (
              <button onClick={() => cancelar.mutate()} disabled={cancelar.isPending}
                className="btn-secondary text-sm text-red-500 hover:text-red-600">
                Cancelar orden
              </button>
            )}
            {orden.estado === 'ENTREGADA' && !orden.calificacion_id && !showRating && (
              <button onClick={() => setShowRating(true)} className="btn-primary text-sm">
                Calificar tienda
              </button>
            )}
            {orden.calificacion_id && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">✓ Ya calificaste esta orden</span>
            )}
          </div>

          {showRating && (
            <RatingForm ordenId={orden.id} onDone={() => {
              setShowRating(false);
              qc.invalidateQueries(['mis-ordenes']);
            }} />
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientOrders() {
  const [estado, setEstado] = useState('');
  const ESTADOS = ['', 'PENDIENTE_CONFIRMACION', 'CONFIRMADA', 'PREPARANDO', 'ENTREGADA', 'CANCELADA'];

  const { data, isLoading } = useQuery({
    queryKey: ['mis-ordenes', estado],
    queryFn: () => ordenesApi.mis({ estado: estado || undefined, limit: 30 }).then(r => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis órdenes</h1>
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
          <p className="text-gray-400">No tienes órdenes aún</p>
          <p className="text-sm text-gray-300 mt-1">Selecciona una oferta en tus solicitudes para crear una orden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data?.map(o => <OrdenCard key={o.id} orden={o} />)}
        </div>
      )}
    </div>
  );
}

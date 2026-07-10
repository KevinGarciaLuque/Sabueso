import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { disputasApi, ordenesApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Plus, X, AlertTriangle, ShieldCheck } from 'lucide-react';

const MOTIVO_LABEL = {
  REPUESTO_INCOMPATIBLE:  'Repuesto incompatible',
  PRODUCTO_DIFERENTE:     'Producto diferente al ofrecido',
  PRODUCTO_DANADO:        'Producto dañado',
  NO_RECIBIDO:            'No recibido',
  GARANTIA_NO_RESPETADA:  'Garantía no respetada',
  PRECIO_DIFERENTE:       'Precio diferente al acordado',
  PIEZA_INCOMPLETA:       'Pieza incompleta',
  OTRO:                   'Otro',
};

const ESTADO_BADGE = {
  ABIERTA:            'red',
  ESPERANDO_TIENDA:   'orange',
  ESPERANDO_CLIENTE:  'yellow',
  EN_REVISION:        'blue',
  RESUELTA_CLIENTE:   'green',
  RESUELTA_TIENDA:    'green',
  CERRADA:            'gray',
};

const abrirSchema = z.object({
  ordenId:     z.coerce.number().int().positive('Selecciona una orden'),
  motivo:      z.string().min(1, 'Selecciona un motivo'),
  descripcion: z.string().min(10, 'Describe el problema (mínimo 10 caracteres)').max(2000),
});

function NuevaDisputaModal({ ordenes, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(abrirSchema),
  });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Abrir disputa</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
          <div>
            <label className="label">Orden *</label>
            <select {...register('ordenId')} className="input">
              <option value="">— Selecciona una orden —</option>
              {ordenes.map(o => (
                <option key={o.id} value={o.id}>#{o.numero} — {o.estado}</option>
              ))}
            </select>
            {errors.ordenId && <p className="error-text">{errors.ordenId.message}</p>}
          </div>
          <div>
            <label className="label">Motivo *</label>
            <select {...register('motivo')} className="input">
              <option value="">— Selecciona un motivo —</option>
              {Object.entries(MOTIVO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {errors.motivo && <p className="error-text">{errors.motivo.message}</p>}
          </div>
          <div>
            <label className="label">Descripción *</label>
            <textarea {...register('descripcion')} className="input" rows={4}
              placeholder="Describe el problema con detalle..." />
            {errors.descripcion && <p className="error-text">{errors.descripcion.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Spinner size="sm" /> : 'Abrir disputa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientDisputes() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: disputas = [], isLoading } = useQuery({
    queryKey: ['mis-disputas'],
    queryFn: () => disputasApi.misDisputas().then(r => r.data.data),
  });

  const { data: garantias = [] } = useQuery({
    queryKey: ['mis-garantias'],
    queryFn: () => disputasApi.misGarantias().then(r => r.data.data),
  });

  const { data: ordenesData } = useQuery({
    queryKey: ['mis-ordenes-todas'],
    queryFn: () => ordenesApi.mis({ limit: 50 }).then(r => r.data.data),
  });

  const abrir = useMutation({
    mutationFn: (data) => disputasApi.abrir(data),
    onSuccess: () => { qc.invalidateQueries(['mis-disputas']); toast.success('Disputa abierta'); setShowNew(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al abrir disputa'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Disputas y garantías</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva disputa
        </button>
      </div>

      {/* Garantías activas */}
      {garantias.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" /> Mis garantías activas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {garantias.filter(g => g.estado === 'ACTIVA').map(g => (
              <div key={g.id} className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Orden #{g.orden_numero}</p>
                    <p className="text-sm text-gray-500">{g.tienda_nombre}</p>
                  </div>
                  <span className="text-xs bg-green-50 text-green-600 font-medium px-2 py-0.5 rounded-full">
                    Activa
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-500 space-y-1">
                  <p>Vence: {g.fecha_vence ? new Date(g.fecha_vence).toLocaleDateString('es-HN') : 'N/A'}</p>
                  {g.numero_serie && <p>Serie: {g.numero_serie}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disputas */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" /> Mis disputas
        </h2>
        {disputas.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No tienes disputas abiertas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputas.map(d => (
              <div key={d.id} className="card p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">Orden #{d.orden_numero}</span>
                    <Badge variant={ESTADO_BADGE[d.estado] || 'gray'}>{d.estado.replace(/_/g,' ')}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{MOTIVO_LABEL[d.motivo]}</p>
                  <p className="text-sm text-gray-400">{d.tienda_nombre}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(d.creado_en).toLocaleDateString('es-HN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NuevaDisputaModal
          ordenes={ordenesData || []}
          onClose={() => setShowNew(false)}
          onSave={(data) => abrir.mutate(data)}
        />
      )}
    </div>
  );
}

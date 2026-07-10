import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { catalogoApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { CreditCard, AlertTriangle, Edit2, X, Check } from 'lucide-react';

const ESTADO_COLOR = {
  ACTIVA:    'badge-green',
  PRUEBA:    'badge-blue',
  VENCIDA:   'bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full',
  CANCELADA: 'bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-0.5 rounded-full',
};

function EditModal({ sub, planes, onClose, onSaved }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      planId:   sub.plan_id || '',
      estado:   sub.estado  || 'ACTIVA',
      fechaFin: sub.fecha_fin ? sub.fecha_fin.slice(0, 10) : '',
    },
  });

  const guardar = useMutation({
    mutationFn: (data) => {
      const payload = {};
      if (data.planId)   payload.planId   = Number(data.planId);
      if (data.estado)   payload.estado   = data.estado;
      if (data.fechaFin) payload.fechaFin = data.fechaFin;
      return api.patch(`/tiendas/${sub.tenant_id}/membresia`, payload);
    },
    onSuccess: () => { toast.success('Membresía actualizada'); onSaved(); onClose(); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Error al actualizar'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Editar membresía — {sub.nombre_comercial}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(d => guardar.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select {...register('planId')} className="input-field">
              {planes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} — L {Number(p.precio).toLocaleString('es-HN')}/mes</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select {...register('estado')} className="input-field">
              <option value="ACTIVA">Activa</option>
              <option value="PRUEBA">Prueba</option>
              <option value="VENCIDA">Vencida</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
            <input {...register('fechaFin')} type="date" className="input-field" />
          </div>
          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={isSubmitting || guardar.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {(isSubmitting || guardar.isPending) && <Spinner size="sm" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminMembresias() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState('');
  const [editando, setEditando] = useState(null);
  const ESTADOS = ['', 'ACTIVA', 'PRUEBA', 'VENCIDA', 'CANCELADA'];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-membresias', estado],
    queryFn: () => api.get('/tiendas/membresias', { params: { estado: estado || undefined, limit: 50 } }).then(r => r.data),
  });

  const { data: planes = [] } = useQuery({
    queryKey: ['planes'],
    queryFn: () => catalogoApi.planes().then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  const subs = data?.data || [];

  // Summary counts
  const counts = subs.reduce((acc, s) => {
    acc[s.estado] = (acc[s.estado] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Control de membresías</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['ACTIVA','Activas','text-green-600'],['PRUEBA','En prueba','text-blue-600'],['VENCIDA','Vencidas','text-red-600'],['CANCELADA','Canceladas','text-gray-500']].map(([k,l,c]) => (
          <div key={k} className="card text-center py-3">
            <p className={`text-3xl font-bold ${c}`}>{counts[k] || 0}</p>
            <p className="text-sm text-gray-500 mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex gap-2 flex-wrap">
        {ESTADOS.map(e => (
          <button key={e || 'todas'} onClick={() => setEstado(e)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              estado === e ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-orange-300'
            }`}>
            {e || 'Todas'}{e && counts[e] ? ` (${counts[e]})` : ''}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {['Tienda','Plan','Estado','Vence','Días','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {subs.map(s => {
              const dias = Number(s.dias_restantes);
              const diasColor = dias <= 3 ? 'text-red-600 font-bold' : dias <= 7 ? 'text-orange-500 font-medium' : 'text-gray-600';
              return (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.nombre_comercial}</p>
                    <p className="text-xs text-gray-400">{s.tienda_estado}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{s.plan_nombre}</td>
                  <td className="px-4 py-3">
                    <span className={ESTADO_COLOR[s.estado] || 'badge-orange'}>{s.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.fecha_fin ? new Date(s.fecha_fin).toLocaleDateString('es-HN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {s.fecha_fin ? (
                      <span className={diasColor}>
                        {dias > 0 ? `${dias}d` : dias === 0 ? 'Hoy' : 'Vencida'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditando(s)}
                      className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-500 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {subs.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-200" />
            Sin suscripciones con esos filtros
          </div>
        )}
      </div>

      {editando && (
        <EditModal
          sub={editando}
          planes={planes}
          onClose={() => setEditando(null)}
          onSaved={() => qc.invalidateQueries(['admin-membresias'])}
        />
      )}
    </div>
  );
}

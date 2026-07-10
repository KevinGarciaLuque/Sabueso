import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Users, Plus, X, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react';

const TIPO_LABEL = {
  PROPIETARIO:    'Propietario',
  ADMINISTRADOR:  'Administrador',
  VENDEDOR:       'Vendedor',
  BODEGA:         'Bodega',
  CAJERO:         'Cajero',
  REPARTIDOR:     'Repartidor',
};

const TIPO_COLOR = {
  PROPIETARIO:   'badge-orange',
  ADMINISTRADOR: 'badge-blue',
  VENDEDOR:      'badge-green',
  BODEGA:        'bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-0.5 rounded-full',
  CAJERO:        'bg-yellow-100 text-yellow-700 text-xs font-medium px-2.5 py-0.5 rounded-full',
  REPARTIDOR:    'bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full',
};

const schema = z.object({
  nombre:   z.string().min(2).max(80).trim(),
  apellido: z.string().min(2).max(80).trim(),
  email:    z.string().email('Email inválido').toLowerCase().trim(),
  tipo:     z.enum(['ADMINISTRADOR','VENDEDOR','BODEGA','CAJERO','REPARTIDOR']),
});

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copiar">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  );
}

export default function StoreUsers() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [tempCreds, setTempCreds] = useState(null);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['tienda-usuarios'],
    queryFn: () => api.get('/tiendas/me/usuarios').then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'VENDEDOR' },
  });

  const crear = useMutation({
    mutationFn: (data) => api.post('/tiendas/me/usuarios', data),
    onSuccess: (res) => {
      const { passwordTemporal, id } = res.data.data;
      setTempCreds({ email: '', passwordTemporal, id });
      toast.success('Usuario creado');
      reset();
      setShowForm(false);
      qc.invalidateQueries(['tienda-usuarios']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al crear usuario'),
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }) => api.patch(`/tiendas/me/usuarios/${id}/activo`, { activo }),
    onSuccess: (_, { activo }) => {
      toast.success(activo ? 'Usuario activado' : 'Usuario desactivado');
      qc.invalidateQueries(['tienda-usuarios']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipo de trabajo</h1>
          <p className="text-gray-500 mt-1">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} en tu tienda</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Agregar usuario'}
        </button>
      </div>

      {/* Credenciales temporales */}
      {tempCreds && (
        <div className="card border-green-300 bg-green-50">
          <h3 className="font-semibold text-green-800 mb-2">Usuario creado — comparte estas credenciales</h3>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Contraseña temporal:</span>
              <span className="font-bold text-green-700">{tempCreds.passwordTemporal}</span>
              <CopyButton text={tempCreds.passwordTemporal} />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">El colaborador debe cambiar su contraseña al iniciar sesión por primera vez.</p>
          <button onClick={() => setTempCreds(null)} className="mt-3 text-xs text-green-700 underline">Cerrar</button>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Nuevo usuario</h2>
          <form onSubmit={handleSubmit(d => crear.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input {...register('nombre')} className="input-field" />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                <input {...register('apellido')} className="input-field" />
                {errors.apellido && <p className="text-red-500 text-xs mt-1">{errors.apellido.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input {...register('email')} type="email" className="input-field" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select {...register('tipo')} className="input-field">
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="BODEGA">Bodega</option>
                  <option value="CAJERO">Cajero</option>
                  <option value="REPARTIDOR">Repartidor</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={isSubmitting || crear.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {(isSubmitting || crear.isPending) && <Spinner size="sm" />}
                Crear usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {usuarios.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Solo tú eres el único usuario de la tienda</p>
        </div>
      ) : (
        <div className="card divide-y">
          {usuarios.map(u => (
            <div key={u.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.activo ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                  {u.nombre[0]}{u.apellido[0]}
                </div>
                <div className="min-w-0">
                  <p className={`font-medium text-sm ${u.activo ? 'text-gray-900' : 'text-gray-400'}`}>
                    {u.nombre} {u.apellido}
                    {!u.activo && <span className="ml-2 text-xs text-gray-400">(inactivo)</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={TIPO_COLOR[u.tipo] || 'badge-orange'}>{TIPO_LABEL[u.tipo] || u.tipo}</span>
                {u.tipo !== 'PROPIETARIO' && (
                  <button
                    onClick={() => toggleActivo.mutate({ id: u.id, activo: !u.activo })}
                    disabled={toggleActivo.isPending}
                    title={u.activo ? 'Desactivar' : 'Activar'}
                    className="text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    {u.activo
                      ? <ToggleRight className="w-6 h-6 text-orange-500" />
                      : <ToggleLeft  className="w-6 h-6" />
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { tiendasApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Plus, Pencil, Trash2, MapPin, X, Star } from 'lucide-react';

const schema = z.object({
  nombre:       z.string().min(2, 'Requerido').max(150).trim(),
  direccion:    z.string().max(300).optional().or(z.literal('')),
  ciudad:       z.string().max(100).optional().or(z.literal('')),
  departamento: z.string().max(100).optional().or(z.literal('')),
  telefono:     z.string().max(20).optional().or(z.literal('')),
  email:        z.string().email('Email inválido').optional().or(z.literal('')),
  esPrincipal:  z.boolean().optional(),
});

function SucursalModal({ suc, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: suc
      ? { nombre: suc.nombre, direccion: suc.direccion || '', ciudad: suc.ciudad || '',
          departamento: suc.departamento || '', telefono: suc.telefono || '',
          email: suc.email || '', esPrincipal: !!suc.es_principal }
      : { esPrincipal: false },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{suc ? 'Editar sucursal' : 'Nueva sucursal'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input {...register('nombre')} className="input" placeholder="Ej: Sucursal Centro" />
            {errors.nombre && <p className="error-text">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="label">Dirección</label>
            <input {...register('direccion')} className="input" placeholder="Calle, colonia..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ciudad</label>
              <input {...register('ciudad')} className="input" placeholder="Tegucigalpa" />
            </div>
            <div>
              <label className="label">Departamento</label>
              <input {...register('departamento')} className="input" placeholder="Francisco Morazán" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Teléfono</label>
              <input {...register('telefono')} className="input" placeholder="+504 XXXX-XXXX" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('esPrincipal')} type="checkbox" className="rounded" />
            <span className="text-sm text-gray-700">Marcar como sucursal principal</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Spinner size="sm" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StoreSucursales() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'new' | { suc }

  const { data: sucursales = [], isLoading } = useQuery({
    queryKey: ['mis-sucursales'],
    queryFn: () => tiendasApi.sucursales().then(r => r.data.data),
  });

  const crear = useMutation({
    mutationFn: (data) => tiendasApi.crearSucursal(data),
    onSuccess: () => { qc.invalidateQueries(['mis-sucursales']); toast.success('Sucursal creada'); setModal(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al crear'),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, data }) => tiendasApi.actualizarSucursal(id, data),
    onSuccess: () => { qc.invalidateQueries(['mis-sucursales']); toast.success('Sucursal actualizada'); setModal(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al actualizar'),
  });

  const eliminar = useMutation({
    mutationFn: (id) => tiendasApi.eliminarSucursal(id),
    onSuccess: () => { qc.invalidateQueries(['mis-sucursales']); toast.success('Sucursal desactivada'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al eliminar'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva sucursal
        </button>
      </div>

      {sucursales.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Aún no tienes sucursales registradas.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sucursales.map((s) => (
            <div key={s.id} className={`card p-5 space-y-2 ${!s.activa ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{s.nombre}</h3>
                    {s.es_principal ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3" /> Principal
                      </span>
                    ) : null}
                    {!s.activa && (
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactiva</span>
                    )}
                  </div>
                  {(s.ciudad || s.departamento) && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 inline mr-1" />
                      {[s.ciudad, s.departamento].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModal({ suc: s })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!s.es_principal && (
                    <button
                      onClick={() => { if (confirm('¿Desactivar esta sucursal?')) eliminar.mutate(s.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {s.direccion && <p className="text-sm text-gray-500">{s.direccion}</p>}
              <div className="flex gap-4 text-sm text-gray-500">
                {s.telefono && <span>📞 {s.telefono}</span>}
                {s.email    && <span>✉️ {s.email}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'new' && (
        <SucursalModal
          onClose={() => setModal(null)}
          onSave={(data) => crear.mutate(data)}
        />
      )}
      {modal?.suc && (
        <SucursalModal
          suc={modal.suc}
          onClose={() => setModal(null)}
          onSave={(data) => actualizar.mutate({ id: modal.suc.id, data })}
        />
      )}
    </div>
  );
}

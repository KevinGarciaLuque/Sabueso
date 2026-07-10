import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { tiendasApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Store, Phone, Mail, MapPin, FileText, Shield } from 'lucide-react';

const schema = z.object({
  nombre_comercial:  z.string().min(2).max(150),
  razon_social:      z.string().max(200).optional().or(z.literal('')),
  rtn:               z.string().max(20).optional().or(z.literal('')),
  telefono:          z.string().max(20).optional().or(z.literal('')),
  descripcion:       z.string().max(1000).optional().or(z.literal('')),
  politica_garantia: z.string().max(2000).optional().or(z.literal('')),
});

export default function StoreConfig() {
  const qc = useQueryClient();

  const { data: tienda, isLoading } = useQuery({
    queryKey: ['mi-tienda'],
    queryFn: () => tiendasApi.miTienda().then(r => r.data.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (tienda) {
      reset({
        nombre_comercial:  tienda.nombre_comercial  || '',
        razon_social:      tienda.razon_social       || '',
        rtn:               tienda.rtn                || '',
        telefono:          tienda.telefono           || '',
        descripcion:       tienda.descripcion        || '',
        politica_garantia: tienda.politica_garantia  || '',
      });
    }
  }, [tienda, reset]);

  const guardar = useMutation({
    mutationFn: (data) => {
      const payload = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== '') payload[k] = v;
      }
      return tiendasApi.actualizarMia(payload);
    },
    onSuccess: () => {
      toast.success('Tienda actualizada');
      qc.invalidateQueries(['mi-tienda']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error al guardar'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de tienda</h1>
        <p className="text-gray-500 mt-1">Información pública de tu negocio</p>
      </div>

      {/* Info rápida */}
      <div className="card grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <span>{tienda?.email}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>{[tienda?.ciudad, tienda?.departamento].filter(Boolean).join(', ') || 'Sin ciudad'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            tienda?.estado === 'VERIFICADA' ? 'bg-green-100 text-green-700' :
            tienda?.estado === 'PENDIENTE'  ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>{tienda?.estado}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Store className="w-4 h-4 text-gray-400" />
          sabueso.hn/{tienda?.slug}
        </div>
      </div>

      {/* Formulario */}
      <div className="card">
        <form onSubmit={handleSubmit(d => guardar.mutate(d))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial *</label>
            <input {...register('nombre_comercial')} className="input-field" />
            {errors.nombre_comercial && <p className="text-red-500 text-xs mt-1">{errors.nombre_comercial.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razón social</label>
              <input {...register('razon_social')} className="input-field" placeholder="Repuestos S.A. de C.V." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RTN</label>
              <input {...register('rtn')} className="input-field font-mono" placeholder="0801-1990-000001" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-3.5 h-3.5 inline mr-1" />Teléfono
            </label>
            <input {...register('telefono')} className="input-field" placeholder="+504 2222-3333" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-3.5 h-3.5 inline mr-1" />Descripción de la tienda
            </label>
            <textarea {...register('descripcion')} rows={3} className="input-field"
              placeholder="Especialistas en repuestos japoneses, más de 15 años en el mercado..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Shield className="w-3.5 h-3.5 inline mr-1" />Política de garantía
            </label>
            <textarea {...register('politica_garantia')} rows={3} className="input-field"
              placeholder="Describe las condiciones de garantía que ofrece tu tienda..." />
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={() => reset()} disabled={!isDirty}
              className="btn-secondary flex-1">
              Descartar cambios
            </button>
            <button type="submit" disabled={isSubmitting || guardar.isPending || !isDirty}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {(isSubmitting || guardar.isPending) && <Spinner size="sm" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

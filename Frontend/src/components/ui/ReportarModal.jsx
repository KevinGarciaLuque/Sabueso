import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/index';
import { Spinner } from './Spinner';
import { X, Flag } from 'lucide-react';
import { TIPO_REPORTE_LABEL } from '../../utils/constants';

const schema = z.object({
  tipo:        z.enum(['SPAM', 'PRECIO_INCORRECTO', 'OFERTA_FALSA', 'MALA_ATENCION', 'FRAUDE', 'OTRO']),
  descripcion: z.string().min(10, 'Describe el problema con al menos 10 caracteres').max(1000),
});

export function ReportarModal({ tenantId, tenantNombre, onClose }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'OTRO', descripcion: '' },
  });

  const enviar = useMutation({
    mutationFn: (data) => adminApi.crearReporte({ ...data, tenantId }),
    onSuccess: () => {
      toast.success('Reporte enviado. El equipo de Sabueso lo revisará.');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'No se pudo enviar el reporte'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" /> Reportar tienda
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => enviar.mutate(d))} className="p-5 space-y-4">
          {tenantNombre && (
            <p className="text-sm text-gray-500">
              Estás reportando a <span className="font-medium text-gray-800">{tenantNombre}</span>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <select {...register('tipo')} className="input-field">
              {Object.entries(TIPO_REPORTE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <textarea {...register('descripcion')} rows={4} className="input-field"
              placeholder="Cuéntanos qué pasó..." />
            {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>}
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={isSubmitting || enviar.isPending}
              className="btn-danger flex-1 flex items-center justify-center gap-2">
              {(isSubmitting || enviar.isPending) && <Spinner size="sm" />}
              Enviar reporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

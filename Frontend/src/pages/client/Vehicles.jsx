import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { vehiculosApi } from '../../api/index';
import { PageLoader } from '../../components/ui/Spinner';
import VehicleForm from './VehicleForm';
import { Car, Plus, Edit2, Trash2, Fuel, Settings, AlertCircle } from 'lucide-react';

export default function Vehicles() {
  const [showForm, setShowForm]     = useState(false);
  const [editing,  setEditing]      = useState(null);   // vehiculo a editar
  const [deleting, setDeleting]     = useState(null);   // id a eliminar
  const qc = useQueryClient();

  const { data: vehiculos = [], isLoading } = useQuery({
    queryKey: ['vehiculos'],
    queryFn: () => vehiculosApi.listar().then(r => r.data.data),
  });

  const eliminar = useMutation({
    mutationFn: (id) => vehiculosApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries(['vehiculos']);
      toast.success('Vehículo eliminado');
      setDeleting(null);
    },
    onError: () => toast.error('Error al eliminar'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis vehículos</h1>
          <p className="text-gray-500 mt-1">Agrega tus vehículos para solicitudes más precisas</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agregar vehículo
        </button>
      </div>

      {/* Lista vacía */}
      {vehiculos.length === 0 && (
        <div className="card text-center py-16">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Sin vehículos registrados</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Registra tu vehículo para que las tiendas identifiquen la pieza correcta más fácilmente.
          </p>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="btn-primary mx-auto flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar mi primer vehículo
          </button>
        </div>
      )}

      {/* Grid de vehículos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehiculos.map(v => (
          <div key={v.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <Car className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {v.marca_nombre || 'Sin marca'} {v.modelo_nombre || ''}
                  </h3>
                  <p className="text-sm text-gray-500">{v.anio} · {v.version_nombre || 'Sin versión'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(v); setShowForm(true); }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleting(v.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
              {v.motor && (
                <div className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-gray-400" />
                  Motor {v.motor}
                </div>
              )}
              {v.combustible && (
                <div className="flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-gray-400" />
                  {v.combustible.charAt(0) + v.combustible.slice(1).toLowerCase()}
                </div>
              )}
              {v.transmision && (
                <div className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-gray-400" />
                  {v.transmision.charAt(0) + v.transmision.slice(1).toLowerCase()}
                </div>
              )}
              {v.vin && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                    VIN: {v.vin}
                  </span>
                </div>
              )}
              {v.color && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ background: v.color.toLowerCase() }} />
                  {v.color}
                </div>
              )}
              {v.placa && (
                <div className="flex items-center gap-1.5">
                  🪪 {v.placa}
                </div>
              )}
            </div>

            {v.observaciones && (
              <p className="mt-3 text-xs text-gray-400 border-t pt-3">{v.observaciones}</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal formulario */}
      {showForm && (
        <VehicleForm
          vehiculo={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); qc.invalidateQueries(['vehiculos']); }}
        />
      )}

      {/* Confirm delete */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Eliminar vehículo</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => eliminar.mutate(deleting)}
                disabled={eliminar.isPending}
                className="btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { inventarioApi, catalogoApi } from '../../api/index';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Plus, Pencil, Trash2, X, Package, Search, Minus } from 'lucide-react';
import { TIPO_REPUESTO_LABEL, CONDICION_LABEL } from '../../utils/constants';

const schema = z.object({
  nombre:          z.string().min(2, 'Requerido').max(200).trim(),
  descripcion:     z.string().max(1000).optional().or(z.literal('')),
  categoriaId:     z.coerce.number().int().positive().optional().nullable(),
  numeroOem:       z.string().max(80).optional().or(z.literal('')),
  numeroAlterno:   z.string().max(80).optional().or(z.literal('')),
  marcaFabricante: z.string().max(100).optional().or(z.literal('')),
  tipo:            z.enum(['ORIGINAL_OEM','ORIGINAL_USADO','GENERICO_NUEVO','REMANUFACTURADO',
                           'RECONSTRUIDO','ALTERNATIVO','DESARMADERO']),
  condicion:       z.enum(['NUEVO','USADO','COMO_NUEVO','REPARADO','CON_DETALLES']),
  precio:          z.coerce.number().min(0),
  costoEnvio:      z.coerce.number().min(0),
  existencia:      z.coerce.number().int().min(0),
  garantiaDias:    z.coerce.number().int().min(0),
});

function ProductoModal({ prod, categorias, onClose, onSave }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: prod ? {
      nombre: prod.nombre, descripcion: prod.descripcion || '',
      categoriaId: prod.categoria_id || '', numeroOem: prod.numero_oem || '',
      numeroAlterno: prod.numero_alterno || '', marcaFabricante: prod.marca_fabricante || '',
      tipo: prod.tipo, condicion: prod.condicion,
      precio: prod.precio, costoEnvio: prod.costo_envio,
      existencia: prod.existencia, garantiaDias: prod.garantia_dias,
    } : {
      tipo: 'GENERICO_NUEVO', condicion: 'NUEVO',
      precio: 0, costoEnvio: 0, existencia: 0, garantiaDias: 0,
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-6">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-lg font-semibold">{prod ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input {...register('nombre')} className="input" placeholder="Tijera delantera izquierda" />
            {errors.nombre && <p className="error-text">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea {...register('descripcion')} className="input" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Categoría</label>
              <select {...register('categoriaId')} className="input">
                <option value="">— Sin categoría —</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.padre_id ? `  › ${c.nombre}` : c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Marca fabricante</label>
              <input {...register('marcaFabricante')} className="input" placeholder="CTR, Kayaba..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Número OEM</label>
              <input {...register('numeroOem')} className="input" placeholder="GJ6A-34-700A" />
            </div>
            <div>
              <label className="label">Número alterno</label>
              <input {...register('numeroAlterno')} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select {...register('tipo')} className="input">
                {Object.entries(TIPO_REPUESTO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Condición</label>
              <select {...register('condicion')} className="input">
                {Object.entries(CONDICION_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Precio (L)</label>
              <input {...register('precio')} type="number" step="0.01" className="input" />
              {errors.precio && <p className="error-text">{errors.precio.message}</p>}
            </div>
            <div>
              <label className="label">Envío (L)</label>
              <input {...register('costoEnvio')} type="number" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">Existencia</label>
              <input {...register('existencia')} type="number" className="input" />
            </div>
            <div>
              <label className="label">Garantía (días)</label>
              <input {...register('garantiaDias')} type="number" className="input" />
            </div>
          </div>
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

export default function StoreInventory() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(null);

  const { data: inventario, isLoading } = useQuery({
    queryKey: ['inventario', busqueda],
    queryFn: () => inventarioApi.listar({ q: busqueda || undefined, limit: 50 }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => catalogoApi.categorias().then(r => r.data.data),
  });

  const crear = useMutation({
    mutationFn: (data) => inventarioApi.crear(data),
    onSuccess: () => { qc.invalidateQueries(['inventario']); toast.success('Producto creado'); setModal(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, data }) => inventarioApi.actualizar(id, data),
    onSuccess: () => { qc.invalidateQueries(['inventario']); toast.success('Producto actualizado'); setModal(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const eliminar = useMutation({
    mutationFn: (id) => inventarioApi.eliminar(id),
    onSuccess: () => { qc.invalidateQueries(['inventario']); toast.success('Producto eliminado'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const ajustarStock = useMutation({
    mutationFn: ({ id, delta }) => inventarioApi.actualizarStock(id, delta),
    onSuccess: () => qc.invalidateQueries(['inventario']),
    onError: () => toast.error('Error al ajustar stock'),
  });

  const productos = inventario?.data || [];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo producto
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="input pl-9 max-w-sm"
          placeholder="Buscar por nombre, OEM..." />
      </div>

      <p className="text-sm text-gray-400">{inventario?.meta?.total ?? 0} productos</p>

      {productos.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Sin productos en inventario.</p>
          <p className="text-xs mt-1">Registra tus piezas para enviarlas automáticamente como oferta cuando sean compatibles con una solicitud.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">OEM</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {productos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.nombre}</p>
                    {p.categoria_nombre && <p className="text-xs text-gray-400">{p.categoria_nombre}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.numero_oem || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {TIPO_REPUESTO_LABEL[p.tipo] || p.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    L {Number(p.precio).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => ajustarStock.mutate({ id: p.id, delta: -1 })}
                        disabled={p.existencia === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className={`w-8 text-center font-medium ${p.existencia === 0 ? 'text-red-500' : p.existencia < 3 ? 'text-orange-500' : 'text-gray-700'}`}>
                        {p.existencia}
                      </span>
                      <button onClick={() => ajustarStock.mutate({ id: p.id, delta: 1 })}
                        className="p-1 rounded hover:bg-gray-200">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ prod: p })}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm('¿Eliminar este producto?')) eliminar.mutate(p.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'new' && (
        <ProductoModal
          categorias={categorias}
          onClose={() => setModal(null)}
          onSave={(data) => crear.mutate(data)}
        />
      )}
      {modal?.prod && (
        <ProductoModal
          prod={modal.prod}
          categorias={categorias}
          onClose={() => setModal(null)}
          onSave={(data) => actualizar.mutate({ id: modal.prod.id, data })}
        />
      )}
    </div>
  );
}

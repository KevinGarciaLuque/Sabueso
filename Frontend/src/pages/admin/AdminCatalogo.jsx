import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Plus, Pencil, ChevronDown, ChevronRight, X, Tag } from 'lucide-react';

/* ── helpers ── */
const TABS = ['Marcas', 'Modelos', 'Categorías'];

function InlineForm({ fields, onSave, onCancel }) {
  const [vals, setVals] = useState(() =>
    Object.fromEntries(fields.map(f => [f.key, f.default ?? '']))
  );
  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(vals); }}
      className="flex flex-wrap gap-2 items-end p-3 bg-gray-50 rounded-lg border"
    >
      {fields.map(f => (
        <div key={f.key} className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{f.label}</label>
          {f.type === 'select' ? (
            <select value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              className="input text-sm py-1.5 min-w-[120px]">
              {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type || 'text'} required={f.required}
              value={vals[f.key]}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              className="input text-sm py-1.5"
              placeholder={f.placeholder || ''} />
          )}
        </div>
      ))}
      <button type="submit" className="btn-primary py-1.5 px-4 text-sm">Guardar</button>
      <button type="button" onClick={onCancel} className="btn-secondary py-1.5 px-3 text-sm">
        <X className="w-4 h-4" />
      </button>
    </form>
  );
}

/* ── Marcas tab ── */
function MarcasTab() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: marcas = [], isLoading } = useQuery({
    queryKey: ['admin-marcas'],
    queryFn: () => api.get('/catalogo/admin/marcas').then(r => r.data.data),
  });

  const crear = useMutation({
    mutationFn: d => api.post('/catalogo/admin/marcas', { nombre: d.nombre, pais: d.pais || null }),
    onSuccess: () => { qc.invalidateQueries(['admin-marcas']); toast.success('Marca creada'); setShowNew(false); },
    onError: e => toast.error(e.response?.data?.message || 'Error'),
  });

  const editar = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/catalogo/admin/marcas/${id}`, d),
    onSuccess: () => { qc.invalidateQueries(['admin-marcas']); toast.success('Actualizada'); setEditing(null); },
    onError: e => toast.error(e.response?.data?.message || 'Error'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, activa }) => api.patch(`/catalogo/admin/marcas/${id}`, { activa: !activa }),
    onSuccess: () => qc.invalidateQueries(['admin-marcas']),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{marcas.length} marcas</p>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm">
          <Plus className="w-4 h-4" /> Nueva marca
        </button>
      </div>
      {showNew && (
        <InlineForm
          fields={[
            { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Toyota' },
            { key: 'pais',   label: 'País',   placeholder: 'Japón' },
          ]}
          onSave={d => crear.mutate(d)}
          onCancel={() => setShowNew(false)}
        />
      )}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Marca</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">País</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Modelos</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Estado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {marcas.map(m => (
              <tr key={m.id} className={`hover:bg-gray-50 ${!m.activa ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 font-medium">{m.nombre}</td>
                <td className="px-4 py-2.5 text-gray-500">{m.pais || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{m.total_modelos}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.activa ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {m.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(m)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggle.mutate({ id: m.id, activa: m.activa })}
                      className="p-1 text-gray-400 hover:text-orange-500 rounded text-xs">
                      {m.activa ? 'Desact.' : 'Activ.'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <InlineForm
          fields={[
            { key: 'nombre', label: 'Nombre', required: true, default: editing.nombre },
            { key: 'pais',   label: 'País',   default: editing.pais || '' },
          ]}
          onSave={d => editar.mutate({ id: editing.id, ...d })}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ── Modelos tab ── */
function ModelosTab() {
  const qc = useQueryClient();
  const [marcaSeleccionada, setMarcaSeleccionada] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const { data: marcas = [] } = useQuery({
    queryKey: ['admin-marcas'],
    queryFn: () => api.get('/catalogo/admin/marcas').then(r => r.data.data),
  });

  const { data: modelos = [], isLoading } = useQuery({
    queryKey: ['admin-modelos', marcaSeleccionada],
    queryFn: () => api.get(`/catalogo/admin/marcas/${marcaSeleccionada}/modelos`).then(r => r.data.data),
    enabled: !!marcaSeleccionada,
  });

  const crear = useMutation({
    mutationFn: d => api.post('/catalogo/admin/modelos', { marcaId: marcaSeleccionada, nombre: d.nombre, tipo: d.tipo }),
    onSuccess: () => { qc.invalidateQueries(['admin-modelos', marcaSeleccionada]); toast.success('Modelo creado'); setShowNew(false); },
    onError: e => toast.error(e.response?.data?.message || 'Error'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, activo }) => api.patch(`/catalogo/admin/modelos/${id}`, { activo: !activo }),
    onSuccess: () => qc.invalidateQueries(['admin-modelos', marcaSeleccionada]),
  });

  const TIPOS = ['SEDAN','HATCHBACK','SUV','PICKUP','VAN','CAMION','MOTO','OTRO'];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <select value={marcaSeleccionada || ''} onChange={e => { setMarcaSeleccionada(e.target.value || null); setShowNew(false); }}
          className="input text-sm py-1.5 max-w-[200px]">
          <option value="">— Selecciona una marca —</option>
          {marcas.filter(m => m.activa).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        {marcaSeleccionada && (
          <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm">
            <Plus className="w-4 h-4" /> Nuevo modelo
          </button>
        )}
      </div>

      {showNew && (
        <InlineForm
          fields={[
            { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Corolla' },
            { key: 'tipo', label: 'Tipo', type: 'select', default: 'SEDAN',
              options: TIPOS.map(t => ({ value: t, label: t })) },
          ]}
          onSave={d => crear.mutate(d)}
          onCancel={() => setShowNew(false)}
        />
      )}

      {marcaSeleccionada && (
        isLoading ? <PageLoader /> : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Modelo</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {modelos.map(m => (
                  <tr key={m.id} className={`hover:bg-gray-50 ${!m.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{m.nombre}</td>
                    <td className="px-4 py-2.5 text-gray-500">{m.tipo}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.activo ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggle.mutate({ id: m.id, activo: m.activo })}
                        className="text-xs text-gray-400 hover:text-orange-500">
                        {m.activo ? 'Desact.' : 'Activ.'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

/* ── Categorías tab ── */
function CategoriasTab() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['admin-categorias'],
    queryFn: () => api.get('/catalogo/admin/categorias').then(r => r.data.data),
  });

  const padres = categorias.filter(c => !c.padre_id);
  const hijos = categorias.filter(c => c.padre_id);

  const crear = useMutation({
    mutationFn: d => api.post('/catalogo/admin/categorias', {
      nombre: d.nombre, slug: d.slug || d.nombre.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, ''),
      padreId: d.padreId ? Number(d.padreId) : null,
    }),
    onSuccess: () => { qc.invalidateQueries(['admin-categorias']); toast.success('Categoría creada'); setShowNew(false); },
    onError: e => toast.error(e.response?.data?.message || 'Error'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, activa }) => api.patch(`/catalogo/admin/categorias/${id}`, { activa: !activa }),
    onSuccess: () => qc.invalidateQueries(['admin-categorias']),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{categorias.length} categorías</p>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm">
          <Plus className="w-4 h-4" /> Nueva categoría
        </button>
      </div>
      {showNew && (
        <InlineForm
          fields={[
            { key: 'nombre',  label: 'Nombre', required: true },
            { key: 'slug',    label: 'Slug (opcional)', placeholder: 'auto-generado' },
            { key: 'padreId', label: 'Categoría padre (opcional)', type: 'select', default: '',
              options: [{ value: '', label: '— Sin padre —' }, ...padres.map(p => ({ value: p.id, label: p.nombre }))] },
          ]}
          onSave={d => crear.mutate(d)}
          onCancel={() => setShowNew(false)}
        />
      )}

      <div className="space-y-2">
        {padres.map(p => (
          <div key={p.id} className="card p-0 overflow-hidden">
            <div className={`flex items-center justify-between px-4 py-3 ${!p.activa ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-500" />
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-gray-400">/{p.slug}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {p.total_solicitudes} solicitudes
                </span>
              </div>
              <button onClick={() => toggle.mutate({ id: p.id, activa: p.activa })}
                className="text-xs text-gray-400 hover:text-orange-500">
                {p.activa ? 'Desactivar' : 'Activar'}
              </button>
            </div>
            {hijos.filter(h => h.padre_id === p.id).map(h => (
              <div key={h.id} className={`flex items-center justify-between px-4 py-2.5 border-t bg-gray-50/50 ${!h.activa ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2 pl-4">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  <span className="text-sm">{h.nombre}</span>
                  <span className="text-xs text-gray-400">/{h.slug}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {h.total_solicitudes} solicitudes
                  </span>
                </div>
                <button onClick={() => toggle.mutate({ id: h.id, activa: h.activa })}
                  className="text-xs text-gray-400 hover:text-orange-500">
                  {h.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Página principal ── */
export default function AdminCatalogo() {
  const [tab, setTab] = useState(0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Catálogo de vehículos</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === i ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <MarcasTab />}
      {tab === 1 && <ModelosTab />}
      {tab === 2 && <CategoriasTab />}
    </div>
  );
}

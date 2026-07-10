import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { PageLoader } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Search, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react';

const TIPO_BADGE = {
  SUPER_ADMIN: 'red', ADMIN_SOPORTE: 'red', ADMIN_COMERCIAL: 'red', MODERADOR: 'red',
  PROPIETARIO: 'blue', ADMINISTRADOR: 'blue', VENDEDOR: 'blue',
  BODEGA: 'blue', CAJERO: 'blue', REPARTIDOR: 'blue',
  CLIENTE: 'green', MECANICO: 'green', TALLER: 'green', EMPRESA: 'green',
};

const TIPOS_PLATAFORMA = ['SUPER_ADMIN','ADMIN_SOPORTE','ADMIN_COMERCIAL','MODERADOR'];
const TIPOS_CLIENTE    = ['CLIENTE','MECANICO','TALLER','EMPRESA'];

export default function AdminUsuarios() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda]   = useState('');
  const [tipo, setTipo]           = useState('');
  const [menuAbierto, setMenuAbierto] = useState(null); // id del usuario con menú abierto

  const { data, isLoading } = useQuery({
    queryKey: ['admin-usuarios', busqueda, tipo],
    queryFn: () => api.get('/usuarios', {
      params: { q: busqueda || undefined, tipo: tipo || undefined, limit: 30 },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const toggleActivo = useMutation({
    mutationFn: ({ id, activo }) => api.patch(`/usuarios/${id}/activo`, { activo }),
    onSuccess: (_, { activo }) => {
      qc.invalidateQueries(['admin-usuarios']);
      toast.success(activo ? 'Usuario activado' : 'Usuario desactivado');
      setMenuAbierto(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const cambiarTipo = useMutation({
    mutationFn: ({ id, tipo }) => api.patch(`/usuarios/${id}/tipo`, { tipo }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-usuarios']);
      toast.success('Rol actualizado');
      setMenuAbierto(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  if (isLoading) return <PageLoader />;

  const usuarios = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <span className="text-sm text-gray-500">{data?.meta?.total ?? 0} registros</span>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Buscar por nombre o email..." />
        </div>
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option value="">Todos los tipos</option>
          <optgroup label="Plataforma">
            {TIPOS_PLATAFORMA.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </optgroup>
          <optgroup label="Tienda">
            {['PROPIETARIO','ADMINISTRADOR','VENDEDOR','BODEGA','CAJERO','REPARTIDOR'].map(t =>
              <option key={t} value={t}>{t}</option>
            )}
          </optgroup>
          <optgroup label="Cliente">
            {TIPOS_CLIENTE.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
        </select>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tienda</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Registrado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{u.nombre} {u.apellido}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={TIPO_BADGE[u.tipo] || 'gray'}>{u.tipo.replace(/_/g,' ')}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{u.tenant_nombre || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.activo ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.creado_en).toLocaleDateString('es-HN')}
                </td>
                <td className="px-4 py-3 relative">
                  <button
                    onClick={() => setMenuAbierto(menuAbierto === u.id ? null : u.id)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded border border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    Acciones <ChevronDown className="w-3 h-3" />
                  </button>

                  {menuAbierto === u.id && (
                    <div className="absolute right-4 top-10 z-20 bg-white rounded-lg shadow-lg border border-gray-200 w-52 py-1"
                      onMouseLeave={() => setMenuAbierto(null)}>
                      {/* Activar / desactivar */}
                      <button
                        onClick={() => toggleActivo.mutate({ id: u.id, activo: !u.activo })}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        {u.activo
                          ? <><ToggleLeft className="w-4 h-4 text-red-400" /> Desactivar cuenta</>
                          : <><ToggleRight className="w-4 h-4 text-green-500" /> Activar cuenta</>
                        }
                      </button>

                      {/* Cambiar rol (solo plataforma) */}
                      {[...TIPOS_PLATAFORMA, ...TIPOS_CLIENTE].includes(u.tipo) && (
                        <>
                          <div className="border-t my-1" />
                          <p className="px-4 py-1 text-xs text-gray-400 font-medium">Cambiar rol a:</p>
                          {[...TIPOS_PLATAFORMA, ...TIPOS_CLIENTE]
                            .filter(t => t !== u.tipo)
                            .map(t => (
                              <button key={t}
                                onClick={() => cambiarTipo.mutate({ id: u.id, tipo: t })}
                                className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 text-gray-600">
                                {t.replace(/_/g,' ')}
                              </button>
                            ))
                          }
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!usuarios.length && (
          <p className="text-center text-gray-400 py-8">No se encontraron usuarios</p>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Los usuarios de tienda (VENDEDOR, BODEGA, etc.) se crean desde el panel de cada tienda en <strong>/tienda/usuarios</strong>.<br/>
        Las cuentas de cliente se crean desde el registro público <strong>/registro</strong>.
      </p>
    </div>
  );
}


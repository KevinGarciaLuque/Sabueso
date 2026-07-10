import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { tiendasApi } from '../../api/index';
import { adminApi } from '../../api/index';
import api from '../../api/axios';
import { PageLoader } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Building2, Users, MapPin, CreditCard, ToggleLeft, ToggleRight } from 'lucide-react';

const ESTADO_OPTIONS = ['PENDIENTE','EN_REVISION','VERIFICADA','RECHAZADA','SUSPENDIDA','BLOQUEADA'];
const ESTADO_BADGE = {
  PENDIENTE: 'yellow', EN_REVISION: 'blue', VERIFICADA: 'green',
  RECHAZADA: 'red',    SUSPENDIDA:  'red',  BLOQUEADA:  'gray',
};

export default function AdminTiendaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tienda', id],
    queryFn: () => tiendasApi.obtenerAdmin(id).then(r => r.data.data),
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['admin-tienda-sucursales', id],
    queryFn: () => api.get(`/tiendas/${id}/sucursales`).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['admin-tienda-usuarios', id],
    queryFn: () => api.get(`/tiendas/${id}/usuarios`).then(r => r.data.data),
    enabled: !!id,
  });

  const cambiarEstado = useMutation({
    mutationFn: (estado) => tiendasApi.cambiarEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries(['admin-tienda', id]);
      qc.invalidateQueries(['admin-tiendas']);
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  if (isLoading) return <PageLoader />;
  if (!data) return (
    <div className="text-center py-20 text-gray-400">
      <p>Tienda no encontrada.</p>
      <Link to="/admin/tiendas" className="text-orange-500 hover:underline mt-2 inline-block">Volver</Link>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.nombre_comercial}</h1>
          <p className="text-sm text-gray-500">slug: {data.slug}</p>
        </div>
        <Badge variant={ESTADO_BADGE[data.estado] || 'gray'} className="ml-auto">{data.estado}</Badge>
      </div>

      {/* Info general */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <Building2 className="w-4 h-4 text-orange-500" /> Información
          </div>
          <dl className="space-y-1.5 text-sm">
            {data.razon_social && <><dt className="text-gray-400">Razón social</dt><dd>{data.razon_social}</dd></>}
            {data.rtn          && <><dt className="text-gray-400">RTN</dt><dd>{data.rtn}</dd></>}
            <dt className="text-gray-400">Email</dt><dd>{data.email}</dd>
            {data.telefono && <><dt className="text-gray-400">Teléfono</dt><dd>{data.telefono}</dd></>}
            <dt className="text-gray-400">Registrada</dt>
            <dd>{new Date(data.creado_en).toLocaleDateString('es-HN')}</dd>
          </dl>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-700">
            <CreditCard className="w-4 h-4 text-orange-500" /> Membresía
          </div>
          <dl className="space-y-1.5 text-sm">
            <dt className="text-gray-400">Plan</dt>
            <dd>{data.plan_nombre || '—'}</dd>
            <dt className="text-gray-400">Estado suscripción</dt>
            <dd>{data.suscripcion_estado || '—'}</dd>
          </dl>
          <p className="text-xs text-gray-400">
            Para cambiar el plan, ve a{' '}
            <Link to="/admin/membresias" className="text-orange-500 hover:underline">Membresías</Link>.
          </p>
        </div>
      </div>

      {/* Cambiar estado */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Cambiar estado de la tienda</h3>
        <div className="flex flex-wrap gap-2">
          {ESTADO_OPTIONS.map(e => (
            <button
              key={e}
              disabled={data.estado === e || cambiarEstado.isPending}
              onClick={() => cambiarEstado.mutate(e)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                data.estado === e
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Sucursales */}
      <div className="card p-5">
        <div className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
          <MapPin className="w-4 h-4 text-orange-500" /> Sucursales ({sucursales.length})
        </div>
        {sucursales.length === 0 ? (
          <p className="text-sm text-gray-400">Sin sucursales registradas.</p>
        ) : (
          <div className="divide-y text-sm">
            {sucursales.map(s => (
              <div key={s.id} className="py-2 flex justify-between">
                <span className="font-medium">{s.nombre}</span>
                <span className="text-gray-500">{[s.ciudad, s.departamento].filter(Boolean).join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usuarios */}
      <div className="card p-5">
        <div className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
          <Users className="w-4 h-4 text-orange-500" /> Equipo ({usuarios.length})
        </div>
        {usuarios.length === 0 ? (
          <p className="text-sm text-gray-400">Sin usuarios registrados.</p>
        ) : (
          <div className="divide-y text-sm">
            {usuarios.map(u => (
              <div key={u.id} className="py-2 flex justify-between items-center">
                <div>
                  <span className="font-medium">{u.nombre} {u.apellido}</span>
                  <span className="text-gray-400 ml-2">{u.email}</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{u.tipo}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

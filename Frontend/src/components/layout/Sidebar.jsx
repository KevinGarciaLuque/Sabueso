import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { chatApi } from '../../api/index';
import { useSocket } from '../../hooks/useSocket';
import { isStoreUser, isPlatformAdmin, ROLES } from '../../utils/constants';
import { NotificationsBell } from '../ui/NotificationsBell';
import {
  LayoutDashboard, Car, FileText, Tag, MessageSquare,
  Store, ClipboardList, BarChart2, LogOut, Settings, Users, ShieldCheck, ShoppingBag, CreditCard,
  Flag, ListTree, UserCircle, Package, AlertTriangle,
} from 'lucide-react';

const clientLinks = [
  { to: '/cliente',             label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/cliente/vehiculos',   label: 'Mis vehículos',icon: Car },
  { to: '/cliente/solicitudes', label: 'Solicitudes',  icon: FileText },
  { to: '/cliente/ordenes',     label: 'Mis órdenes',  icon: ShoppingBag },
  { to: '/cliente/chat',        label: 'Mensajes',     icon: MessageSquare },
  { to: '/cliente/perfil',      label: 'Mi perfil',    icon: UserCircle },
  { to: '/cliente/disputas',    label: 'Disputas',     icon: AlertTriangle },
];

const storeLinks = [
  { to: '/tienda',               label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/tienda/solicitudes',   label: 'Solicitudes',  icon: ClipboardList },
  { to: '/tienda/ofertas',       label: 'Mis ofertas',  icon: Tag },
  { to: '/tienda/ordenes',       label: 'Órdenes',      icon: ShoppingBag },
  { to: '/tienda/inventario',    label: 'Inventario',   icon: Package },
  { to: '/tienda/sucursales',    label: 'Sucursales',   icon: Store },
  { to: '/tienda/chat',          label: 'Mensajes',     icon: MessageSquare },
  { to: '/tienda/estadisticas',  label: 'Estadísticas', icon: BarChart2 },
  { to: '/tienda/configuracion', label: 'Mi tienda',    icon: Settings },
  { to: '/tienda/membresia',     label: 'Membresía',    icon: CreditCard },
  { to: '/tienda/usuarios',      label: 'Mi equipo',    icon: Users },
  { to: '/tienda/disputas',      label: 'Disputas',     icon: AlertTriangle },
];

const adminLinks = [
  { to: '/admin',               label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/admin/tiendas',       label: 'Tiendas',      icon: Store },
  { to: '/admin/usuarios',      label: 'Usuarios',     icon: Users },
  { to: '/admin/solicitudes',   label: 'Solicitudes',  icon: FileText },
  { to: '/admin/reportes',      label: 'Reportes',     icon: Flag },
  { to: '/admin/planes',        label: 'Planes',       icon: ShieldCheck },
  { to: '/admin/membresias',    label: 'Membresías',   icon: CreditCard },
  { to: '/admin/catalogo',      label: 'Catálogo',     icon: ListTree },
];

// Auditoría solo para roles con acceso al log completo (coincide con la restricción del backend)
const auditoriaLink = { to: '/admin/auditoria', label: 'Auditoría', icon: ListTree };
const AUDITORIA_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN_SOPORTE];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const socket = useSocket();
  const qc = useQueryClient();

  const esAdmin = isPlatformAdmin(user?.tipo);

  const { data: unread = 0 } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: () => chatApi.noLeidos().then(r => r.data.data.total),
    enabled: !esAdmin,
    refetchInterval: 30_000,
  });

  // Actualizar el badge en tiempo real cuando llegan mensajes
  useEffect(() => {
    if (!socket || esAdmin) return;
    const refetch = () => qc.invalidateQueries(['chat-unread']);
    socket.on('conversation:updated', refetch);
    socket.on('conversation:read', refetch);
    return () => {
      socket.off('conversation:updated', refetch);
      socket.off('conversation:read', refetch);
    };
  }, [socket, esAdmin, qc]);

  const links = esAdmin
    ? (AUDITORIA_ROLES.includes(user?.tipo) ? [...adminLinks, auditoriaLink] : adminLinks)
    : isStoreUser(user?.tipo)
    ? storeLinks
    : clientLinks;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="text-xl font-bold text-orange-400">Sabueso</span>
        </div>
        <div className="mt-3">
          <p className="text-sm font-medium text-white">{user?.nombre} {user?.apellido}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          {user?.tenantNombre && (
            <p className="text-xs text-orange-300 mt-1">{user.tenantNombre}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => {
          const esChat = to.endsWith('/chat');
          return (
            <NavLink
              key={to}
              to={to}
              end={to.split('/').length === 2}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {esChat && unread > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <NotificationsBell />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-red-400 text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

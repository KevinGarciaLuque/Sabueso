import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';

import { AppLayout } from './components/layout/AppLayout';
import { PageLoader } from './components/ui/Spinner';
import { useAuthInit } from './hooks/useAuthInit';

// Auth
const Login           = lazy(() => import('./pages/auth/Login'));
const Register        = lazy(() => import('./pages/auth/Register'));
const RegisterStore   = lazy(() => import('./pages/auth/RegisterStore'));
const VerifyEmail     = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword  = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword   = lazy(() => import('./pages/auth/ResetPassword'));

// Cliente
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const NewRequest      = lazy(() => import('./pages/client/NewRequest'));
const Requests        = lazy(() => import('./pages/client/Requests'));
const RequestDetail   = lazy(() => import('./pages/client/RequestDetail'));
const Vehicles        = lazy(() => import('./pages/client/Vehicles'));
const ClientProfile   = lazy(() => import('./pages/client/ClientProfile'));

// Tienda
const StoreDashboard      = lazy(() => import('./pages/store/StoreDashboard'));
const StoreRequests       = lazy(() => import('./pages/store/StoreRequests'));
const StoreRequestDetail  = lazy(() => import('./pages/store/StoreRequestDetail'));
const StoreOffers         = lazy(() => import('./pages/store/StoreOffers'));
const StoreConfig         = lazy(() => import('./pages/store/StoreConfig'));
const StoreOrders         = lazy(() => import('./pages/store/StoreOrders'));
const StoreStats          = lazy(() => import('./pages/store/StoreStats'));
const StoreMembership     = lazy(() => import('./pages/store/StoreMembership'));
const StoreUsers          = lazy(() => import('./pages/store/StoreUsers'));
const StoreSucursales     = lazy(() => import('./pages/store/StoreSucursales'));
const StoreInventory      = lazy(() => import('./pages/store/StoreInventory'));
const StoreDisputes       = lazy(() => import('./pages/store/StoreDisputes'));

// Chat (shared)
const Chat = lazy(() => import('./pages/chat/Chat'));

// Cliente extras
const ClientOrders   = lazy(() => import('./pages/client/ClientOrders'));
const ClientDisputes = lazy(() => import('./pages/client/ClientDisputes'));

// Admin
const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTiendas      = lazy(() => import('./pages/admin/AdminTiendas'));
const AdminTiendaDetalle = lazy(() => import('./pages/admin/AdminTiendaDetalle'));
const AdminUsuarios     = lazy(() => import('./pages/admin/AdminUsuarios'));
const AdminSolicitudes  = lazy(() => import('./pages/admin/AdminSolicitudes'));
const AdminPlanes       = lazy(() => import('./pages/admin/AdminPlanes'));
const AdminMembresias   = lazy(() => import('./pages/admin/AdminMembresias'));
const AdminReportes     = lazy(() => import('./pages/admin/AdminReportes'));
const AdminAuditoria    = lazy(() => import('./pages/admin/AdminAuditoria'));
const AdminCatalogo     = lazy(() => import('./pages/admin/AdminCatalogo'));

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppRoutes() {
  const ready = useAuthInit();
  if (!ready) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Públicas */}
        <Route path="/login"                          element={<Login />} />
        <Route path="/registro"                       element={<Register />} />
        <Route path="/registro-tienda"                element={<RegisterStore />} />
        <Route path="/verificar-email/:token"         element={<VerifyEmail />} />
        <Route path="/recuperar-password"             element={<ForgotPassword />} />
        <Route path="/restablecer-password/:token"    element={<ResetPassword />} />
        <Route path="/"                               element={<Navigate to="/login" replace />} />

        {/* Cliente */}
        <Route element={<AppLayout />}>
          <Route path="/cliente"                        element={<ClientDashboard />} />
          <Route path="/cliente/vehiculos"              element={<Vehicles />} />
          <Route path="/cliente/solicitudes"            element={<Requests />} />
          <Route path="/cliente/solicitudes/nueva"      element={<NewRequest />} />
          <Route path="/cliente/solicitudes/:id"        element={<RequestDetail />} />
          <Route path="/cliente/ordenes"                element={<ClientOrders />} />
          <Route path="/cliente/chat"                   element={<Chat />} />
          <Route path="/cliente/perfil"                 element={<ClientProfile />} />
          <Route path="/cliente/disputas"               element={<ClientDisputes />} />
        </Route>

        {/* Tienda */}
        <Route element={<AppLayout />}>
          <Route path="/tienda"                         element={<StoreDashboard />} />
          <Route path="/tienda/solicitudes"             element={<StoreRequests />} />
          <Route path="/tienda/solicitudes/:id"         element={<StoreRequestDetail />} />
          <Route path="/tienda/ofertas"                 element={<StoreOffers />} />
          <Route path="/tienda/ordenes"                 element={<StoreOrders />} />
          <Route path="/tienda/chat"                    element={<Chat />} />
          <Route path="/tienda/estadisticas"            element={<StoreStats />} />
          <Route path="/tienda/configuracion"           element={<StoreConfig />} />
          <Route path="/tienda/membresia"               element={<StoreMembership />} />
          <Route path="/tienda/usuarios"               element={<StoreUsers />} />
          <Route path="/tienda/sucursales"             element={<StoreSucursales />} />
          <Route path="/tienda/inventario"             element={<StoreInventory />} />
          <Route path="/tienda/disputas"               element={<StoreDisputes />} />
        </Route>

        {/* Admin */}
        <Route element={<AppLayout />}>
          <Route path="/admin"               element={<AdminDashboard />} />
          <Route path="/admin/tiendas"       element={<AdminTiendas />} />
          <Route path="/admin/tiendas/:id"   element={<AdminTiendaDetalle />} />
          <Route path="/admin/usuarios"      element={<AdminUsuarios />} />
          <Route path="/admin/solicitudes"   element={<AdminSolicitudes />} />
          <Route path="/admin/planes"        element={<AdminPlanes />} />
          <Route path="/admin/membresias"   element={<AdminMembresias />} />
          <Route path="/admin/reportes"     element={<AdminReportes />} />
          <Route path="/admin/auditoria"    element={<AdminAuditoria />} />
          <Route path="/admin/catalogo"    element={<AdminCatalogo />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#1f2937', color: '#fff', borderRadius: '10px' },
          success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}

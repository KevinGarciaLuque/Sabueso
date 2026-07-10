import api from './axios';

export const solicitudesApi = {
  listarMis:    (params) => api.get('/solicitudes/mis', { params }),
  listarPublicas:(params)=> api.get('/solicitudes/publicas', { params }),
  obtener:      (id)     => api.get(`/solicitudes/${id}`),
  crear:        (data)   => api.post('/solicitudes', data),
  publicar:     (id)     => api.patch(`/solicitudes/${id}/publicar`),
  cancelar:     (id, motivo) => api.patch(`/solicitudes/${id}/cancelar`, { motivo }),
};

export const disputasApi = {
  // Cliente
  abrir:         (data)       => api.post('/disputas', data),
  misDisputas:   ()           => api.get('/disputas/mis'),
  // Tienda
  disputasTienda:(p)          => api.get('/disputas/tienda', { params: p }),
  cambiarEstado: (id, data)   => api.patch(`/disputas/${id}/estado`, data),
  // Garantías
  crearGarantia: (data)       => api.post('/garantias', data),
  misGarantias:  ()           => api.get('/garantias/mis'),
  garantiasTienda:(p)         => api.get('/garantias/tienda', { params: p }),
};

export const ofertasApi = {
  listarMis:      (params) => api.get('/ofertas/mis', { params }),
  listarPorSolicitud: (sid) => api.get(`/ofertas/solicitud/${sid}`),
  obtener:        (id)     => api.get(`/ofertas/${id}`),
  enviar:         (data)   => api.post('/ofertas', data),
  seleccionar:    (id)     => api.patch(`/ofertas/${id}/seleccionar`),
  retirar:        (id)     => api.patch(`/ofertas/${id}/retirar`),
};

export const vehiculosApi = {
  listar:  ()     => api.get('/vehiculos'),
  obtener: (id)   => api.get(`/vehiculos/${id}`),
  crear:   (data) => api.post('/vehiculos', data),
  editar:  (id, data) => api.patch(`/vehiculos/${id}`, data),
  eliminar:(id)   => api.delete(`/vehiculos/${id}`),
};

export const catalogoApi = {
  marcas:    ()   => api.get('/catalogo/marcas'),
  modelos:   (mid)=> api.get(`/catalogo/marcas/${mid}/modelos`),
  versiones: (mid)=> api.get(`/catalogo/modelos/${mid}/versiones`),
  categorias:()   => api.get('/catalogo/categorias'),
  planes:    ()   => api.get('/catalogo/planes'),
};

export const tiendasApi = {
  registrar:      (data) => api.post('/tiendas/register', data),
  miTienda:       ()     => api.get('/tiendas/me'),
  actualizarMia:  (data) => api.patch('/tiendas/me', data),
  listarAdmin:    (p)    => api.get('/tiendas', { params: p }),
  obtenerAdmin:   (id)   => api.get(`/tiendas/${id}`),
  cambiarEstado:  (id, estado) => api.patch(`/tiendas/${id}/estado`, { estado }),
  // Sucursales
  sucursales:         ()         => api.get('/tiendas/me/sucursales'),
  crearSucursal:      (data)     => api.post('/tiendas/me/sucursales', data),
  actualizarSucursal: (id, data) => api.patch(`/tiendas/me/sucursales/${id}`, data),
  eliminarSucursal:   (id)       => api.delete(`/tiendas/me/sucursales/${id}`),
};

export const chatApi = {
  iniciar:          (data) => api.post('/chat/conversaciones', data),
  misConversaciones:()     => api.get('/chat/conversaciones/mis'),
  convsTienda:      ()     => api.get('/chat/conversaciones/tienda'),
  mensajes:         (id, p)=> api.get(`/chat/conversaciones/${id}/mensajes`, { params: p }),
  noLeidos:         ()     => api.get('/chat/unread'),
};

export const ordenesApi = {
  mis:      (p)  => api.get('/ordenes/mis',    { params: p }),
  tienda:   (p)  => api.get('/ordenes/tienda', { params: p }),
  obtener:  (id) => api.get(`/ordenes/${id}`),
  avanzar:  (id) => api.patch(`/ordenes/${id}/avanzar`),
  cancelar: (id) => api.patch(`/ordenes/${id}/cancelar`),
};

export const califApi = {
  calificar:     (data)     => api.post('/calificaciones', data),
  deTienda:      (tenantId) => api.get(`/calificaciones/tienda/${tenantId}`),
};

export const estadisticasApi = {
  tienda: () => api.get('/estadisticas/tienda'),
};

export const uploadsApi = {
  solicitud: (id, fd) => api.post(`/uploads/solicitud/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  oferta:    (id, fd) => api.post(`/uploads/oferta/${id}`,    fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const inventarioApi = {
  listar:         (p)         => api.get('/inventario', { params: p }),
  obtener:        (id)        => api.get(`/inventario/${id}`),
  crear:          (data)      => api.post('/inventario', data),
  actualizar:     (id, data)  => api.patch(`/inventario/${id}`, data),
  eliminar:       (id)        => api.delete(`/inventario/${id}`),
  actualizarStock:(id, delta) => api.patch(`/inventario/${id}/stock`, { delta }),
};

export const adminApi = {
  stats:          ()           => api.get('/stats'),
  reportes:       (p)          => api.get('/admin/reportes', { params: p }),
  resolverReporte:(id, data)   => api.patch(`/admin/reportes/${id}`, data),
  crearReporte:   (data)       => api.post('/reportes', data),
  auditoria:      (p)          => api.get('/admin/auditoria', { params: p }),
  intentos:       (p)          => api.get('/admin/intentos',  { params: p }),
};

export const notifApi = {
  listar:       (p)  => api.get('/notificaciones', { params: p }),
  sinLeer:      ()   => api.get('/notificaciones/sin-leer'),
  marcarLeida:  (id) => api.patch(`/notificaciones/${id}/leer`),
  marcarTodas:  ()   => api.patch('/notificaciones/leer-todas'),
};

-- =============================================================
-- SABUESO - Schema MVP completo
-- MySQL 8.0 | utf8mb4_unicode_ci
-- =============================================================

USE sabueso_db;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- PLANES Y MEMBRESÍAS
-- =============================================================
CREATE TABLE IF NOT EXISTS planes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(80)     NOT NULL,
  codigo        VARCHAR(40)     NOT NULL UNIQUE,
  descripcion   TEXT,
  precio        DECIMAL(10,2)   NOT NULL DEFAULT 0,
  moneda        CHAR(3)         NOT NULL DEFAULT 'HNL',
  periodo       ENUM('mensual','anual','unico') NOT NULL DEFAULT 'mensual',
  max_usuarios  SMALLINT        NOT NULL DEFAULT 1,
  max_sucursales SMALLINT       NOT NULL DEFAULT 1,
  max_ofertas_mes INT           NOT NULL DEFAULT 50,
  tiene_catalogo TINYINT(1)     NOT NULL DEFAULT 0,
  tiene_inventario TINYINT(1)   NOT NULL DEFAULT 0,
  tiene_api     TINYINT(1)      NOT NULL DEFAULT 0,
  tiene_reportes TINYINT(1)     NOT NULL DEFAULT 0,
  prioridad_solicitudes TINYINT(1) NOT NULL DEFAULT 0,
  activo        TINYINT(1)      NOT NULL DEFAULT 1,
  orden         TINYINT         NOT NULL DEFAULT 0,
  creado_en     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================================
-- TENANTS (tiendas de repuestos)
-- =============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_comercial VARCHAR(150)  NOT NULL,
  razon_social    VARCHAR(200),
  rtn             VARCHAR(20)    UNIQUE,
  slug            VARCHAR(100)   NOT NULL UNIQUE,
  estado          ENUM('PENDIENTE','EN_REVISION','VERIFICADA','RECHAZADA','SUSPENDIDA','BLOQUEADA')
                  NOT NULL DEFAULT 'PENDIENTE',
  telefono        VARCHAR(20),
  email           VARCHAR(150)   NOT NULL UNIQUE,
  sitio_web       VARCHAR(200),
  descripcion     TEXT,
  logo_url        VARCHAR(500),
  politica_garantia TEXT,
  datos_adicionales JSON,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS tenant_suscripciones (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id      INT UNSIGNED   NOT NULL,
  plan_id        INT UNSIGNED   NOT NULL,
  estado         ENUM('ACTIVA','VENCIDA','CANCELADA','PRUEBA') NOT NULL DEFAULT 'PRUEBA',
  fecha_inicio   DATE           NOT NULL,
  fecha_fin      DATE,
  renovacion_auto TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id)   REFERENCES planes(id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS tenant_pagos (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id      INT UNSIGNED   NOT NULL,
  suscripcion_id INT UNSIGNED,
  monto          DECIMAL(10,2)  NOT NULL,
  moneda         CHAR(3)        NOT NULL DEFAULT 'HNL',
  metodo         ENUM('TRANSFERENCIA','TARJETA','EFECTIVO','OTRO') NOT NULL,
  referencia     VARCHAR(100),
  estado         ENUM('PENDIENTE','COMPLETADO','RECHAZADO','REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
  comprobante_url VARCHAR(500),
  notas          TEXT,
  creado_en      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (suscripcion_id) REFERENCES tenant_suscripciones(id)
);

-- =============================================================
-- SUCURSALES
-- =============================================================
CREATE TABLE IF NOT EXISTS sucursales (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id      INT UNSIGNED   NOT NULL,
  nombre         VARCHAR(150)   NOT NULL,
  direccion      TEXT,
  ciudad         VARCHAR(100),
  departamento   VARCHAR(100),
  pais           VARCHAR(80)    NOT NULL DEFAULT 'Honduras',
  latitud        DECIMAL(10,8),
  longitud       DECIMAL(11,8),
  telefono       VARCHAR(20),
  email          VARCHAR(150),
  horario        JSON,
  es_principal   TINYINT(1)     NOT NULL DEFAULT 0,
  activa         TINYINT(1)     NOT NULL DEFAULT 1,
  creado_en      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id),
  INDEX idx_ubicacion (latitud, longitud)
);

-- =============================================================
-- USUARIOS Y ROLES
-- =============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED,  -- NULL = cliente o admin plataforma
  nombre          VARCHAR(80)    NOT NULL,
  apellido        VARCHAR(80)    NOT NULL,
  email           VARCHAR(150)   NOT NULL UNIQUE,
  password_hash   VARCHAR(255)   NOT NULL,
  telefono        VARCHAR(20),
  avatar_url      VARCHAR(500),
  tipo            ENUM('SUPER_ADMIN','ADMIN_SOPORTE','ADMIN_COMERCIAL','MODERADOR',
                       'PROPIETARIO','ADMINISTRADOR','VENDEDOR','BODEGA','CAJERO','REPARTIDOR',
                       'CLIENTE','MECANICO','TALLER','EMPRESA') NOT NULL DEFAULT 'CLIENTE',
  email_verificado TINYINT(1)   NOT NULL DEFAULT 0,
  token_verificacion VARCHAR(100) UNIQUE,
  token_reset     VARCHAR(100)   UNIQUE,
  token_reset_exp DATETIME,
  refresh_token   VARCHAR(512),
  dos_factores    TINYINT(1)     NOT NULL DEFAULT 0,
  activo          TINYINT(1)     NOT NULL DEFAULT 1,
  ultimo_acceso   DATETIME,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_tenant (tenant_id),
  INDEX idx_tipo (tipo)
);

CREATE TABLE IF NOT EXISTS intentos_acceso (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(150)   NOT NULL,
  ip           VARCHAR(45),
  user_agent   TEXT,
  exitoso      TINYINT(1)     NOT NULL DEFAULT 0,
  creado_en    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_time (email, creado_en)
);

-- =============================================================
-- CATÁLOGO DE VEHÍCULOS (maestro)
-- =============================================================
CREATE TABLE IF NOT EXISTS marcas (
  id         SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(80)  NOT NULL UNIQUE,
  pais       VARCHAR(60),
  activa     TINYINT(1)   NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS modelos (
  id         SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  marca_id   SMALLINT UNSIGNED NOT NULL,
  nombre     VARCHAR(80)  NOT NULL,
  tipo       ENUM('SEDAN','HATCHBACK','SUV','PICKUP','VAN','CAMION','MOTO','OTRO') DEFAULT 'SEDAN',
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  FOREIGN KEY (marca_id) REFERENCES marcas(id),
  UNIQUE KEY uq_marca_modelo (marca_id, nombre),
  INDEX idx_marca (marca_id)
);

CREATE TABLE IF NOT EXISTS versiones (
  id         SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  modelo_id  SMALLINT UNSIGNED NOT NULL,
  nombre     VARCHAR(100) NOT NULL,
  anio_inicio SMALLINT,
  anio_fin    SMALLINT,
  FOREIGN KEY (modelo_id) REFERENCES modelos(id),
  INDEX idx_modelo (modelo_id)
);

-- =============================================================
-- VEHÍCULOS DEL CLIENTE
-- =============================================================
CREATE TABLE IF NOT EXISTS vehiculos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT UNSIGNED   NOT NULL,
  marca_id     SMALLINT UNSIGNED,
  modelo_id    SMALLINT UNSIGNED,
  version_id   SMALLINT UNSIGNED,
  anio         SMALLINT       NOT NULL,
  motor        VARCHAR(20),
  combustible  ENUM('GASOLINA','DIESEL','HIBRIDO','ELECTRICO','GAS','OTRO'),
  transmision  ENUM('MANUAL','AUTOMATICA','CVT','OTRO'),
  traccion     ENUM('4X2','4X4','AWD','FWD','RWD'),
  color        VARCHAR(40),
  vin          VARCHAR(20),
  placa        VARCHAR(20),
  foto_url     VARCHAR(500),
  observaciones TEXT,
  activo       TINYINT(1)     NOT NULL DEFAULT 1,
  creado_en    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (marca_id)    REFERENCES marcas(id),
  FOREIGN KEY (modelo_id)   REFERENCES modelos(id),
  FOREIGN KEY (version_id)  REFERENCES versiones(id),
  INDEX idx_usuario (usuario_id)
);

-- =============================================================
-- CATEGORÍAS DE REPUESTOS
-- =============================================================
CREATE TABLE IF NOT EXISTS categorias_repuestos (
  id         SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  padre_id   SMALLINT UNSIGNED,
  nombre     VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  icono      VARCHAR(100),
  activa     TINYINT(1)   NOT NULL DEFAULT 1,
  FOREIGN KEY (padre_id) REFERENCES categorias_repuestos(id)
);

-- =============================================================
-- SOLICITUDES
-- =============================================================
CREATE TABLE IF NOT EXISTS solicitudes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT UNSIGNED   NOT NULL,
  vehiculo_id     INT UNSIGNED,
  categoria_id    SMALLINT UNSIGNED,
  nombre_repuesto VARCHAR(200)   NOT NULL,
  descripcion     TEXT,
  lado            ENUM('IZQUIERDO','DERECHO','DELANTERO','TRASERO','CENTRAL','NO_APLICA'),
  posicion        VARCHAR(80),
  cantidad        TINYINT        NOT NULL DEFAULT 1,
  numero_pieza    VARCHAR(80),
  condicion_aceptada ENUM('NUEVO','USADO','CUALQUIERA') NOT NULL DEFAULT 'CUALQUIERA',
  presupuesto_min DECIMAL(10,2),
  presupuesto_max DECIMAL(10,2),
  ciudad          VARCHAR(100),
  departamento    VARCHAR(100),
  latitud         DECIMAL(10,8),
  longitud        DECIMAL(11,8),
  metodo_entrega  ENUM('RETIRO','ENVIO_LOCAL','ENVIO_NACIONAL','CUALQUIERA') DEFAULT 'CUALQUIERA',
  urgencia        ENUM('BAJA','MEDIA','ALTA','CRITICA') NOT NULL DEFAULT 'MEDIA',
  fecha_limite    DATETIME,
  es_privada      TINYINT(1)     NOT NULL DEFAULT 0,
  estado          ENUM('BORRADOR','PUBLICADA','RECIBIENDO_OFERTAS','OFERTA_SELECCIONADA',
                       'EN_NEGOCIACION','EN_PROCESO','COMPLETADA','CANCELADA','EXPIRADA')
                  NOT NULL DEFAULT 'BORRADOR',
  total_ofertas   SMALLINT       NOT NULL DEFAULT 0,
  vistas          INT            NOT NULL DEFAULT 0,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id),
  FOREIGN KEY (vehiculo_id)  REFERENCES vehiculos(id) ON DELETE SET NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias_repuestos(id),
  INDEX idx_usuario (usuario_id),
  INDEX idx_estado (estado),
  INDEX idx_urgencia (urgencia),
  INDEX idx_ciudad (ciudad),
  INDEX idx_creado (creado_en)
);

CREATE TABLE IF NOT EXISTS solicitud_imagenes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id  INT UNSIGNED NOT NULL,
  url           VARCHAR(500) NOT NULL,
  orden         TINYINT      NOT NULL DEFAULT 0,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
  INDEX idx_solicitud (solicitud_id)
);

CREATE TABLE IF NOT EXISTS solicitud_historial (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id  INT UNSIGNED NOT NULL,
  usuario_id    INT UNSIGNED,
  estado_anterior ENUM('BORRADOR','PUBLICADA','RECIBIENDO_OFERTAS','OFERTA_SELECCIONADA',
                       'EN_NEGOCIACION','EN_PROCESO','COMPLETADA','CANCELADA','EXPIRADA'),
  estado_nuevo  ENUM('BORRADOR','PUBLICADA','RECIBIENDO_OFERTAS','OFERTA_SELECCIONADA',
                     'EN_NEGOCIACION','EN_PROCESO','COMPLETADA','CANCELADA','EXPIRADA') NOT NULL,
  nota          TEXT,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE
);

-- =============================================================
-- OFERTAS
-- =============================================================
CREATE TABLE IF NOT EXISTS ofertas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED   NOT NULL,
  sucursal_id     INT UNSIGNED,
  solicitud_id    INT UNSIGNED   NOT NULL,
  vendedor_id     INT UNSIGNED,
  precio          DECIMAL(10,2)  NOT NULL,
  costo_envio     DECIMAL(10,2)  NOT NULL DEFAULT 0,
  precio_total    DECIMAL(10,2)  GENERATED ALWAYS AS (precio + costo_envio) STORED,
  tipo_repuesto   ENUM('ORIGINAL_OEM','ORIGINAL_USADO','GENERICO_NUEVO','REMANUFACTURADO',
                       'RECONSTRUIDO','ALTERNATIVO','DESARMADERO') NOT NULL DEFAULT 'GENERICO_NUEVO',
  condicion       ENUM('NUEVO','USADO','COMO_NUEVO','REPARADO','CON_DETALLES','PARA_RECONSTRUCCION')
                  NOT NULL DEFAULT 'NUEVO',
  marca_fabricante VARCHAR(100),
  numero_oem      VARCHAR(80),
  numero_alterno  VARCHAR(80),
  garantia_dias   SMALLINT       NOT NULL DEFAULT 0,
  disponibilidad  ENUM('INMEDIATA','1_DIA','2_3_DIAS','1_SEMANA','A_PEDIDO') NOT NULL DEFAULT 'INMEDIATA',
  metodo_entrega  ENUM('RETIRO','ENVIO_LOCAL','ENVIO_NACIONAL','MOTORISTA') NOT NULL DEFAULT 'RETIRO',
  metodos_pago    JSON,
  compatibilidad  ENUM('CONFIRMADA_VIN','CONFIRMADA_OEM','POR_REVISAR','REQUIERE_COMPARACION')
                  NOT NULL DEFAULT 'POR_REVISAR',
  incluye_accesorios TINYINT(1)  NOT NULL DEFAULT 0,
  requiere_pieza_vieja TINYINT(1) NOT NULL DEFAULT 0,
  requiere_adaptacion TINYINT(1) NOT NULL DEFAULT 0,
  observaciones   TEXT,
  estado          ENUM('ENVIADA','VISTA','RESPONDIDA','ACEPTADA','RECHAZADA','VENCIDA','RETIRADA')
                  NOT NULL DEFAULT 'ENVIADA',
  vence_en        DATETIME,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id),
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
  FOREIGN KEY (sucursal_id)  REFERENCES sucursales(id) ON DELETE SET NULL,
  FOREIGN KEY (vendedor_id)  REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_solicitud (solicitud_id),
  INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS oferta_imagenes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  oferta_id   INT UNSIGNED NOT NULL,
  url         VARCHAR(500) NOT NULL,
  tipo        ENUM('FOTO','VIDEO') NOT NULL DEFAULT 'FOTO',
  orden       TINYINT      NOT NULL DEFAULT 0,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (oferta_id) REFERENCES ofertas(id) ON DELETE CASCADE,
  INDEX idx_oferta (oferta_id)
);

-- =============================================================
-- CHAT / MENSAJERÍA
-- =============================================================
CREATE TABLE IF NOT EXISTS conversaciones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id    INT UNSIGNED   NOT NULL,
  oferta_id       INT UNSIGNED,
  cliente_id      INT UNSIGNED   NOT NULL,
  tenant_id       INT UNSIGNED   NOT NULL,
  ultimo_mensaje  TEXT,
  ultimo_mensaje_en DATETIME,
  mensajes_sin_leer_cliente  SMALLINT NOT NULL DEFAULT 0,
  mensajes_sin_leer_tienda   SMALLINT NOT NULL DEFAULT 0,
  activa          TINYINT(1)     NOT NULL DEFAULT 1,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id),
  FOREIGN KEY (oferta_id)    REFERENCES ofertas(id) ON DELETE SET NULL,
  FOREIGN KEY (cliente_id)   REFERENCES usuarios(id),
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id),
  INDEX idx_solicitud (solicitud_id),
  INDEX idx_cliente (cliente_id),
  INDEX idx_tenant (tenant_id)
);

CREATE TABLE IF NOT EXISTS mensajes (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversacion_id  INT UNSIGNED   NOT NULL,
  emisor_id        INT UNSIGNED   NOT NULL,
  tipo             ENUM('TEXTO','IMAGEN','VIDEO','UBICACION','SISTEMA') NOT NULL DEFAULT 'TEXTO',
  contenido        TEXT,
  archivo_url      VARCHAR(500),
  leido            TINYINT(1)     NOT NULL DEFAULT 0,
  leido_en         DATETIME,
  creado_en        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (emisor_id)       REFERENCES usuarios(id),
  INDEX idx_conversacion (conversacion_id),
  INDEX idx_emisor (emisor_id),
  INDEX idx_creado (creado_en)
);

-- =============================================================
-- NOTIFICACIONES
-- =============================================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED   NOT NULL,
  tipo          VARCHAR(80)    NOT NULL,
  titulo        VARCHAR(200)   NOT NULL,
  cuerpo        TEXT,
  url_accion    VARCHAR(300),
  leida         TINYINT(1)     NOT NULL DEFAULT 0,
  leida_en      DATETIME,
  datos         JSON,
  creado_en     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario_leida (usuario_id, leida),
  INDEX idx_creado (creado_en)
);

-- =============================================================
-- ÓRDENES (preparado para fase 2)
-- =============================================================
CREATE TABLE IF NOT EXISTS ordenes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED   NOT NULL,
  solicitud_id    INT UNSIGNED,
  oferta_id       INT UNSIGNED,
  cliente_id      INT UNSIGNED   NOT NULL,
  numero          VARCHAR(20)    NOT NULL UNIQUE,
  subtotal        DECIMAL(10,2)  NOT NULL,
  costo_envio     DECIMAL(10,2)  NOT NULL DEFAULT 0,
  impuesto        DECIMAL(10,2)  NOT NULL DEFAULT 0,
  total           DECIMAL(10,2)  NOT NULL,
  moneda          CHAR(3)        NOT NULL DEFAULT 'HNL',
  estado          ENUM('PENDIENTE_CONFIRMACION','CONFIRMADA','PENDIENTE_PAGO','PAGADA',
                       'PREPARANDO','LISTA_PARA_RETIRO','ENVIADA','ENTREGADA',
                       'CANCELADA','REEMBOLSADA','EN_DISPUTA') NOT NULL DEFAULT 'PENDIENTE_CONFIRMACION',
  metodo_entrega  ENUM('RETIRO','ENVIO_LOCAL','ENVIO_NACIONAL','MOTORISTA'),
  direccion_entrega JSON,
  notas           TEXT,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id),
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE SET NULL,
  FOREIGN KEY (oferta_id)    REFERENCES ofertas(id) ON DELETE SET NULL,
  FOREIGN KEY (cliente_id)   REFERENCES usuarios(id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_cliente (cliente_id),
  INDEX idx_estado (estado),
  INDEX idx_numero (numero)
);

-- =============================================================
-- CALIFICACIONES
-- =============================================================
CREATE TABLE IF NOT EXISTS calificaciones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED   NOT NULL,
  orden_id        INT UNSIGNED   NOT NULL UNIQUE,
  cliente_id      INT UNSIGNED   NOT NULL,
  calidad         TINYINT        NOT NULL CHECK (calidad BETWEEN 1 AND 5),
  compatibilidad  TINYINT        NOT NULL CHECK (compatibilidad BETWEEN 1 AND 5),
  precio          TINYINT        NOT NULL CHECK (precio BETWEEN 1 AND 5),
  atencion        TINYINT        NOT NULL CHECK (atencion BETWEEN 1 AND 5),
  rapidez         TINYINT        NOT NULL CHECK (rapidez BETWEEN 1 AND 5),
  promedio        DECIMAL(3,2)   GENERATED ALWAYS AS ((calidad+compatibilidad+precio+atencion+rapidez)/5.0) STORED,
  comentario      TEXT,
  respuesta_tienda TEXT,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id),
  FOREIGN KEY (orden_id)   REFERENCES ordenes(id),
  FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
  INDEX idx_tenant (tenant_id)
);

-- =============================================================
-- TIENDA INSIGNIAS
-- =============================================================
CREATE TABLE IF NOT EXISTS tienda_insignias (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   INT UNSIGNED NOT NULL UNIQUE,
  verificada  TINYINT(1)   NOT NULL DEFAULT 0,
  responde_rapido TINYINT(1) NOT NULL DEFAULT 0,
  destacada   TINYINT(1)   NOT NULL DEFAULT 0,
  total_ventas INT          NOT NULL DEFAULT 0,
  promedio_calificacion DECIMAL(3,2) NOT NULL DEFAULT 0,
  especialidades JSON,
  actualizado_en DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =============================================================
-- AUDITORÍA
-- =============================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED,
  tenant_id     INT UNSIGNED,
  accion        VARCHAR(100)   NOT NULL,
  tabla         VARCHAR(80),
  registro_id   VARCHAR(40),
  datos_antes   JSON,
  datos_despues JSON,
  ip            VARCHAR(45),
  user_agent    TEXT,
  creado_en     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuario_id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_accion (accion),
  INDEX idx_creado (creado_en)
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- FASE 2: INVENTARIO, DISPUTAS Y GARANTÍAS
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Inventario de tienda
CREATE TABLE IF NOT EXISTS productos (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED   NOT NULL,
  sucursal_id     INT UNSIGNED,
  categoria_id    SMALLINT UNSIGNED,
  nombre          VARCHAR(200)   NOT NULL,
  descripcion     TEXT,
  numero_oem      VARCHAR(80),
  numero_alterno  VARCHAR(80),
  marca_fabricante VARCHAR(100),
  tipo            ENUM('ORIGINAL_OEM','ORIGINAL_USADO','GENERICO_NUEVO','REMANUFACTURADO',
                       'RECONSTRUIDO','ALTERNATIVO','DESARMADERO') NOT NULL DEFAULT 'GENERICO_NUEVO',
  condicion       ENUM('NUEVO','USADO','COMO_NUEVO','REPARADO','CON_DETALLES') NOT NULL DEFAULT 'NUEVO',
  precio          DECIMAL(10,2)  NOT NULL DEFAULT 0,
  costo_envio     DECIMAL(10,2)  NOT NULL DEFAULT 0,
  existencia      SMALLINT       NOT NULL DEFAULT 0,
  garantia_dias   SMALLINT       NOT NULL DEFAULT 0,
  foto_url        VARCHAR(500),
  activo          TINYINT(1)     NOT NULL DEFAULT 1,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sucursal_id)  REFERENCES sucursales(id) ON DELETE SET NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias_repuestos(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_oem (numero_oem),
  FULLTEXT idx_ft_nombre (nombre, descripcion)
);

-- Garantías
CREATE TABLE IF NOT EXISTS garantias (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED   NOT NULL,
  orden_id        INT UNSIGNED   NOT NULL,
  cliente_id      INT UNSIGNED   NOT NULL,
  fecha_compra    DATE           NOT NULL,
  duracion_dias   SMALLINT       NOT NULL DEFAULT 0,
  fecha_vence     DATE,
  condiciones     TEXT,
  numero_serie    VARCHAR(80),
  estado          ENUM('ACTIVA','VENCIDA','RECLAMADA','ANULADA') NOT NULL DEFAULT 'ACTIVA',
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id),
  FOREIGN KEY (orden_id)   REFERENCES ordenes(id),
  FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_orden (orden_id)
);

-- Disputas
CREATE TABLE IF NOT EXISTS disputas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED   NOT NULL,
  orden_id        INT UNSIGNED   NOT NULL,
  cliente_id      INT UNSIGNED   NOT NULL,
  garantia_id     INT UNSIGNED,
  motivo          ENUM('REPUESTO_INCOMPATIBLE','PRODUCTO_DIFERENTE','PRODUCTO_DANADO',
                       'NO_RECIBIDO','GARANTIA_NO_RESPETADA','PRECIO_DIFERENTE',
                       'PIEZA_INCOMPLETA','OTRO') NOT NULL DEFAULT 'OTRO',
  descripcion     TEXT           NOT NULL,
  evidencias_urls JSON,
  estado          ENUM('ABIERTA','ESPERANDO_TIENDA','ESPERANDO_CLIENTE',
                       'EN_REVISION','RESUELTA_CLIENTE','RESUELTA_TIENDA','CERRADA')
                  NOT NULL DEFAULT 'ABIERTA',
  resolucion      TEXT,
  resuelto_por    INT UNSIGNED,
  resuelto_en     DATETIME,
  creado_en       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id),
  FOREIGN KEY (orden_id)    REFERENCES ordenes(id),
  FOREIGN KEY (cliente_id)  REFERENCES usuarios(id),
  FOREIGN KEY (garantia_id) REFERENCES garantias(id) ON DELETE SET NULL,
  FOREIGN KEY (resuelto_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_cliente (cliente_id),
  INDEX idx_estado (estado)
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- DATOS SEMILLA
-- =============================================================

-- Planes
INSERT INTO planes (nombre, codigo, descripcion, precio, periodo, max_usuarios, max_sucursales, max_ofertas_mes, tiene_catalogo, tiene_inventario, tiene_reportes, prioridad_solicitudes, orden) VALUES
('Básico',      'BASICO',      'Ideal para tiendas pequeñas que están comenzando.',   599.00, 'mensual', 1, 1, 50,  0, 0, 0, 0, 1),
('Profesional', 'PROFESIONAL', 'Para tiendas en crecimiento con múltiples usuarios.', 1299.00,'mensual', 5, 3, 0,   1, 1, 1, 0, 2),
('Empresarial', 'EMPRESARIAL', 'Para cadenas de repuestos y grandes operaciones.',    2499.00,'mensual', 0, 0, 0,   1, 1, 1, 1, 3);

-- Categorías de repuestos
INSERT INTO categorias_repuestos (nombre, slug) VALUES
('Motor',             'motor'),
('Transmisión',       'transmision'),
('Suspensión',        'suspension'),
('Frenos',            'frenos'),
('Eléctrico',         'electrico'),
('Carrocería',        'carroceria'),
('Dirección',         'direccion'),
('Enfriamiento',      'enfriamiento'),
('Escape',            'escape'),
('Climatización',     'climatizacion'),
('Interior',          'interior'),
('Llantas y Aros',    'llantas-aros');

-- Subcategorías Suspensión
INSERT INTO categorias_repuestos (padre_id, nombre, slug) VALUES
(3, 'Amortiguadores',  'amortiguadores'),
(3, 'Tijeras',         'tijeras'),
(3, 'Terminales',      'terminales'),
(3, 'Bases de amortiguador', 'bases-amortiguador'),
(3, 'Barras estabilizadoras', 'barras-estabilizadoras');

-- Subcategorías Frenos
INSERT INTO categorias_repuestos (padre_id, nombre, slug) VALUES
(4, 'Pastillas',    'pastillas-freno'),
(4, 'Discos',       'discos-freno'),
(4, 'Tambores',     'tambores-freno'),
(4, 'Cilindros',    'cilindros-freno');

-- Marcas principales
INSERT INTO marcas (nombre, pais) VALUES
('Toyota',      'Japón'),
('Mazda',       'Japón'),
('Honda',       'Japón'),
('Nissan',      'Japón'),
('Hyundai',     'Corea del Sur'),
('Kia',         'Corea del Sur'),
('Chevrolet',   'Estados Unidos'),
('Ford',        'Estados Unidos'),
('Mitsubishi',  'Japón'),
('Suzuki',      'Japón'),
('Isuzu',       'Japón'),
('Volkswagen',  'Alemania');

-- Modelos Mazda
INSERT INTO modelos (marca_id, nombre, tipo) VALUES
(2, 'Mazda 3',    'SEDAN'),
(2, 'Mazda 2',    'SEDAN'),
(2, 'Mazda 6',    'SEDAN'),
(2, 'CX-5',       'SUV'),
(2, 'CX-3',       'SUV'),
(2, 'B2600',      'PICKUP');

-- Modelos Toyota
INSERT INTO modelos (marca_id, nombre, tipo) VALUES
(1, 'Corolla',    'SEDAN'),
(1, 'Hilux',      'PICKUP'),
(1, 'RAV4',       'SUV'),
(1, 'Fortuner',   'SUV'),
(1, 'Yaris',      'HATCHBACK'),
(1, 'Camry',      'SEDAN');

-- Admin de plataforma
INSERT INTO usuarios (nombre, apellido, email, password_hash, tipo, email_verificado, activo) VALUES
('Super', 'Admin', 'admin@sabueso.hn',
 '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash_change_on_first_login',
 'SUPER_ADMIN', 1, 1);

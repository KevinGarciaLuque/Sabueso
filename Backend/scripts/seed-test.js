import 'dotenv/config';
import argon2 from 'argon2';
import mysql from 'mysql2/promise';

const db = await mysql.createConnection({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const pass = await argon2.hash('Test1234!');

// ── 1. Asegurar que existe un plan de prueba ────────────────────────────────
const [planes] = await db.query(`SELECT id FROM planes LIMIT 1`);
let planId = planes[0]?.id ?? null;

if (!planId) {
  const [r] = await db.execute(
    `INSERT INTO planes (nombre, codigo, precio, max_usuarios, max_sucursales, max_ofertas_mes)
     VALUES ('Básico', 'BASICO', 0, 5, 2, 100)`
  );
  planId = r.insertId;
  console.log('Plan creado id =', planId);
}

// ── 2. Crear tenant ─────────────────────────────────────────────────────────
const [tenantExist] = await db.query(`SELECT id FROM tenants WHERE email = 'motorepuestos@test.hn'`);
let tenantId = tenantExist[0]?.id ?? null;

if (!tenantId) {
  const [r] = await db.execute(
    `INSERT INTO tenants (nombre_comercial, slug, email, telefono, estado)
     VALUES ('Moto Repuestos HN', 'motorepuestos-hn', 'motorepuestos@test.hn', '99991111', 'VERIFICADA')`
  );
  tenantId = r.insertId;
  console.log('Tenant creado id =', tenantId);
} else {
  console.log('Tenant ya existe id =', tenantId);
}

// ── 3. Crear suscripción activa para el tenant ──────────────────────────────
const [susExist] = await db.query(`SELECT id FROM tenant_suscripciones WHERE tenant_id = ?`, [tenantId]);
if (!susExist.length) {
  await db.execute(
    `INSERT INTO tenant_suscripciones (tenant_id, plan_id, estado, fecha_inicio)
     VALUES (?, ?, 'ACTIVA', CURDATE())`,
    [tenantId, planId]
  );
  console.log('Suscripción creada');
}

// ── 4. Crear usuario PROPIETARIO (tienda) ───────────────────────────────────
const [propExist] = await db.query(`SELECT id FROM usuarios WHERE email = 'tienda@test.hn'`);
if (!propExist.length) {
  await db.execute(
    `INSERT INTO usuarios (nombre, apellido, email, password_hash, tipo, tenant_id, activo, email_verificado)
     VALUES ('Carlos', 'Medina', 'tienda@test.hn', ?, 'PROPIETARIO', ?, 1, 1)`,
    [pass, tenantId]
  );
  console.log('Usuario PROPIETARIO creado');
} else {
  await db.execute(`UPDATE usuarios SET password_hash = ? WHERE email = 'tienda@test.hn'`, [pass]);
  console.log('Usuario PROPIETARIO ya existía, contraseña actualizada');
}

// ── 5. Crear usuario CLIENTE ─────────────────────────────────────────────────
const [clientExist] = await db.query(`SELECT id FROM usuarios WHERE email = 'cliente@test.hn'`);
if (!clientExist.length) {
  await db.execute(
    `INSERT INTO usuarios (nombre, apellido, email, password_hash, tipo, activo, email_verificado)
     VALUES ('María', 'López', 'cliente@test.hn', ?, 'CLIENTE', 1, 1)`,
    [pass]
  );
  console.log('Usuario CLIENTE creado');
} else {
  await db.execute(`UPDATE usuarios SET password_hash = ? WHERE email = 'cliente@test.hn'`, [pass]);
  console.log('Usuario CLIENTE ya existía, contraseña actualizada');
}

await db.end();

console.log('\n✅ Datos de prueba listos:\n');
console.log('  🏪 TIENDA (PROPIETARIO)');
console.log('     Email:      tienda@test.hn');
console.log('     Contraseña: Test1234!');
console.log('     Tienda:     Moto Repuestos HN\n');
console.log('  👤 CLIENTE');
console.log('     Email:      cliente@test.hn');
console.log('     Contraseña: Test1234!\n');

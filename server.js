'use strict';

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// ─── SQL_PASS ────────────────────────────────────────────────────────────────
const SQL_PASS = process.env.SQL_PASS ||
  fs.readFileSync(path.join(__dirname, 'SQL_PASS.txt'), 'utf8').trim();

// ─── Config mssql ────────────────────────────────────────────────────────────
const sqlConfig = {
  server: 'mc100.dos-hermanos.com',
  port: 1433,
  database: 'backupBaseDeDatos',
  user: 'usuario',
  password: SQL_PASS,
  options: { encrypt: false, trustServerCertificate: true }
};

// ─── Pool singleton ──────────────────────────────────────────────────────────
let pool;
async function getPool() {
  if (!pool) pool = await sql.connect(sqlConfig);
  return pool;
}

// ─── Nombres de columnas (ajustar con /api/schema si difieren) ───────────────
const COL = {
  deposito:  'depositonombre',
  producto:  'insumonombre',
  stock:     'Cantidad',
};

// ─── Consumo por kg de producto terminado (coeficientes fijos) ───────────────
const CONSUMO_KG = {
  'ACEITE DE GIRASOL (SNACKS)':                        0.16,
  'AZUCAR BLANCA':                                     0.018,
  'BARBACUE FLAVOR - SABORIZANTE':                     0.055,
  'CAJA CON IMPRESION GENERICA EXCESO EN SODIO':       1.25,
  'CAJA CON IMPRESION GENERICA':                       1.25,
  'CAJA CON IMPRESION GENERICA EXCESO EDULCORANTE':    1.25,
  'CAJA SIN IMPRESION GENERICA':                       1.25,
  'CAJA SNACK MASTER DH CON IMPRESION EXCESO SODIO':   0.4464285,
  'CARAMELIC ONION FLAVOR - SABORIZANTE':              0.0799107,
  'CARBONATO DE CALCIO':                               0.0082276,
  'CEBOLLA MORADA EN POLVO':                           0.019,
  'CHEESE FLAVOR - SABORIZANTE':                       0.0635,
  'CINTA ADHESIVA IMPRESA DOS HERMANOS X 1000 M':      0.003,
  'CLORURO DE SODIO':                                  0.0183333,
  'COLORANTE ACHIOTTE AM 200 WSP (NARANJA)':           0.0374,
  'COLORANTE AMARILLO CNA 839 (AMARILLO)':             0.007,
  'COLORANTE CARAMELO':                                0.0041666,
  'ETIQUETA AMARILLA 50 x 152 (1B)':                   1.2,
  'ETIQUETA AZUL 50 x 152 (2B)':                       1.2,
  'ETIQUETA BLANCA 50 x 152':                          1.2,
  'ETIQUETA CELESTE 50 x 152 (1B)':                    1.2,
  'ETIQUETA GRIS 50 x 152 (1B)':                       1.2,
  'ETIQUETA NARANJA 50 x 152 (2B)':                    1.2,
  'ETIQUETA NEGRO 50 x 152 (1B)':                      1.2,
  'ETIQUETA ROSADA 50 x 152 (1B)':                     1.2,
  'ETIQUETA VERDE 50 x 152 (1B)':                      1.2,
  'ETIQUETA VIOLETA 50 x 152 (1B)':                    1.2,
  'LAMINADO ASADO X 80 GR DH':                         0.063125,
  'LAMINADO CEBOLLA CARAMELIZADA - SP':                0.063125,
  'LAMINADO CREMA Y CEBOLLA X 80 GR DH':               0.063125,
  'LAMINADO JAMON X 80 GR DH':                         0.063125,
  'LAMINADO PICANTE X 60 GR DH':                       0.077,
  'LAMINADO PIZZA X 80 GR DH':                         0.063125,
  'LAMINADO QUESO X 80 GR DH':                         0.063125,
  'LAMINADO RICE SNACK CHEESE FLAVORED x 80gr':        0.15,
  'LAMINADO RICE SNACK GRILLED SMOKED MEAT x 80gr':    0.15,
  'LAMINADO RICE SNACK SOUR CREAM & ONION x 80gr':     0.15,
  'LAMINADO SALAME X 80 GR DH':                        0.063125,
  'LAMINADO SLIM CON SAL DH':                          0.052,
  'LAMINADO SLIM DULCE DH':                            0.052,
  'LAMINADO SLIM SIN SAL DH':                          0.052,
  'LAMINADO TOSTADITAS C/SAL DH':                      0.0516,
  'LAMINADO TOSTADITAS DULCE DH':                      0.0516,
  'LAMINADO TOSTADITAS S S/SAL DH':                    0.0516,
  'LPD 1% - LECHE EN POLVO':                           0.022,
  'PIZZA FLAVOR - SABORIZANTE':                        0.07,
  'SABORIZANTE JALAPEÑO LIMON':                        0.096,
  'SABORIZANTE JAMON':                                 0.052,
  'SALAME - SABORIZANTE':                              0.045,
  'SOUR CREAM & ONION FLAVOR - SABORIZANTE':           0.045,
  'STREECH AUTOMATICO':                                0.03,
  'STREECH MANUAL INFLADOS':                           0.03,
  'SUCRALOSA':                                         0.0004583,
  'BASES CARTON PARA ARROZ':                           0.004,
  'BOLSA CRISTAL 52x70 x 100 mic CM - EXPO':           0.0333,
  'CAJA AROMATICO DH X 500GR':                         2.2,
  'CAJA CARNAROLI DH X 500GR':                         2.2,
  'CAJA KOSHIHIKARI DH X 500GR':                       2.2,
  'CAJA PARBOIL DH X 1KG':                             1.1,
  'CAJA PARBOIL DH X 500GR':                           2.2,
  'CAJA YAMANI DH X 500GR':                            2.2,
  'EMBOLSADORA CRISTAL 1/2KG':                         0.00304,
  'EMBOLSADORA CRISTAL 1KG':                           0.0025,
  'EMBOLSADORA CRISTAL NON GMO LF':                    0.0032,
  'EMBOLSADORA CRISTAL NON GMO PARBOIL':               0.0032,
  'ESQUINEROS':                                        0.004,
  'LAMINADO DOBLE CAROLINA NON GMO X 1 KG':            0.0067,
  'LAMINADO DOBLE CAROLINA NON GMO X 1/2 KG':          0.007,
  'LAMINADO INTEGRAL NON GMO X 1 KG':                  0.0067,
  'LAMINADO LARGO FINO NON GMO DOS HERMANOS X KG':     0.0067,
  'LAMINADO LARGO FINO NON GMO x 1/2 kg':              0.007,
  'LAMINADO LARGO FINO PRODIGIO X 1KG':                0.00618,
  'LAMINADO LF ORGANICO COMPOSTABLE x 1/2 kg':         0.0124,
  'LAMINADO NO SE PASA - PARBOIL NON GMO X KG':        0.0067,
  'LAMINADO PARBOIL NON GMO x 1/2 kg':                 0.007,
  'LAMINADO PARBOIL PRODIGIO X 1KG':                   0.00618,
  'POLIETILENO CARNAROLI DH x 5 kg':                   0.004,
  'POLIETILENO KOSHIHIKARI DH x 5 kg':                 0.004,
  'POLIETILENO LARGO FINO DH x 5 kg':                  0.004,
  'POLIETILENO LF 4/0 FEDERAL x 1 KG':                 0.00525,
  'POLIETILENO PARBOIL DH x 5 kg':                     0.004,
  'POLIETILENO PARBOIL EL FEDERAL 1 kg':               0.00525,
  'TECHO CARTON PARA ARROZ (80 x 100)':                0.004,
  'CAJA CON IMPRESION GENERICA TOSTADAS RECTANGULARES':0.4,
  'LAMINADO TOSTADAS C/SAL DH':                        0.0314285,
  'LAMINADO TOSTADAS S S/SAL DH':                      0.0314285,
  'LAMINADO HARINA x 1/2 kg':                          0.01,
  'LAM TC 42/70 (TERMOCONTRAIBLE ENVASADORA)':         0.0056,
  'CAJA HARINA':                                       0.083333,
  // Aliases: nombres SQL con código al final, espacios extra o texto distinto
  'LAMINADO NO SE PASA - PARBOIL NON GMO DOS HERMANOS X KG': 0.0067,
  'SABORIZANTE JALAPEÑO LIMON VF-318-548-3':           0.096,
  'LAMINADO RICE SNACK GRILLED SMOKED MEAT FLAVORED x 80gr': 0.15,
  'STREECH MANUAL INFLADOS (OLD)':                     0.03,
  'PROVOLETA FLAVOR - SABORIZANTE':                    null,
  'LAM TC 42/70(TERMOCONTRAIBLE ENVASADORA)':          0.0056,
  'TREHALOSA':                                         null,
};

// ─── Normalizar nombre: quita espacios extra, código "(12345)" al final y punto final ──
function normalizeNombre(s) {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\.$/, '')
    .trimEnd();
}

// ─── Lista de insumos activos (fuente: cubo.xls) ─────────────────────────────
const INSUMOS_ACTIVOS = new Set([
  'CAJA HARINA','BASES CARTON PARA ARROZ','BOLSA CRISTAL 52x70 x 100 mic CM - EXPO',
  'CAJA AROMATICO DH X 500GR','CAJA CARNAROLI DH X 500GR','CAJA KOSHIHIKARI DH X 500GR',
  'CAJA PARBOIL DH X 1KG','CAJA PARBOIL DH X 500GR','CAJA YAMANI DH X 500GR',
  'EMBOLSADORA CRISTAL 1/2KG','EMBOLSADORA CRISTAL 1KG','EMBOLSADORA CRISTAL NON GMO LF',
  'EMBOLSADORA CRISTAL NON GMO PARBOIL','ESQUINEROS','ETIQUETA BLANCA 50 x 152',
  'LAM TC 42/70(TERMOCONTRAIBLE ENVASADORA)',
  'LAMINADO DOBLE CAROLINA NON GMO X 1 KG','LAMINADO DOBLE CAROLINA NON GMO X 1/2 KG',
  'LAMINADO INTEGRAL NON GMO X 1 KG','LAMINADO LARGO FINO NON GMO DOS HERMANOS X KG',
  'LAMINADO LARGO FINO NON GMO x 1/2 kg','LAMINADO LARGO FINO PRODIGIO X 1KG',
  'LAMINADO LF ORGANICO COMPOSTABLE x 1/2 kg',
  'LAMINADO NO SE PASA - PARBOIL NON GMO DOS HERMANOS X KG',
  'LAMINADO PARBOIL NON GMO x 1/2 kg','LAMINADO PARBOIL PRODIGIO X 1KG',
  'POLIETILENO CARNAROLI DH x 5 kg','POLIETILENO KOSHIHIKARI DH x 5 kg',
  'POLIETILENO LARGO FINO DH x 5 kg','POLIETILENO LF 4/0 FEDERAL x 1 KG',
  'POLIETILENO PARBOIL DH x 5 kg','POLIETILENO PARBOIL EL FEDERAL 1 kg',
  'STREECH AUTOMATICO','TECHO CARTON PARA ARROZ (80 x 100)',
  'CAJA CON IMPRESION GENERICA TOSTADAS RECTANGULARES',
  'LAMINADO TOSTADAS C/SAL DH','LAMINADO TOSTADAS S S/SAL DH',
  'ACEITE DE GIRASOL (SNACKS)','AZUCAR BLANCA','BARBACUE FLAVOR - SABORIZANTE',
  'CAJA CON IMPRESION GENERICA EXCESO EN SODIO','CAJA CON IMPRESION GENERICA',
  'CAJA CON IMPRESION GENERICA EXCESO EDULCORANTE','CAJA SIN IMPRESION GENERICA',
  'CAJA SNACK MASTER DH CON IMPRESION EXCESO SODIO','CARAMELIC ONION FLAVOR - SABORIZANTE',
  'CARBONATO DE CALCIO','CEBOLLA MORADA EN POLVO','CHEESE FLAVOR - SABORIZANTE',
  'CINTA ADHESIVA IMPRESA DOS HERMANOS X 1000 M','CLORURO DE SODIO',
  'COLORANTE ACHIOTTE AM 200 WSP (NARANJA)','COLORANTE AMARILLO CNA 839 (AMARILLO)',
  'COLORANTE CARAMELO',
  'ETIQUETA AMARILLA 50 x 152 (1B)','ETIQUETA AZUL 50 x 152 (2B)',
  'ETIQUETA CELESTE 50 x 152 (1B)','ETIQUETA GRIS 50 x 152 (1B)',
  'ETIQUETA NARANJA 50 x 152 (2B)','ETIQUETA NEGRO 50 x 152 (1B)',
  'ETIQUETA ROSADA 50 x 152 (1B)','ETIQUETA VERDE 50 x 152 (1B)',
  'ETIQUETA VIOLETA 50 x 152 (1B)',
  'LAMINADO ASADO X 80 GR DH','LAMINADO CEBOLLA CARAMELIZADA - SP',
  'LAMINADO CREMA Y CEBOLLA X 80 GR DH','LAMINADO JAMON X 80 GR DH',
  'LAMINADO PICANTE X 60 GR DH','LAMINADO PIZZA X 80 GR DH',
  'LAMINADO QUESO X 80 GR DH','LAMINADO RICE SNACK CHEESE FLAVORED x 80gr',
  'LAMINADO RICE SNACK GRILLED SMOKED MEAT FLAVORED x 80gr',
  'LAMINADO RICE SNACK SOUR CREAM & ONION x 80gr','LAMINADO SALAME X 80 GR DH',
  'LAMINADO SLIM CON SAL DH','LAMINADO SLIM DULCE DH','LAMINADO SLIM SIN SAL DH',
  'LAMINADO TOSTADITAS C/SAL DH','LAMINADO TOSTADITAS DULCE DH','LAMINADO TOSTADITAS S S/SAL DH',
  'LPD 1% - LECHE EN POLVO','PIZZA FLAVOR - SABORIZANTE','PROVOLETA FLAVOR - SABORIZANTE',
  'SABORIZANTE JALAPEÑO LIMON VF-318-548-3','SABORIZANTE JAMON','SALAME - SABORIZANTE',
  'SOUR CREAM & ONION FLAVOR - SABORIZANTE','STREECH MANUAL INFLADOS','SUCRALOSA','TREHALOSA',
  'LAMINADO HARINA x 1/2 kg',
].map(n => n.trim()));

// ─── Calcular estado a partir del rendimiento ─────────────────────────────────
function calcEstado(stock, rendimiento) {
  if (stock < 0)   return 'negativo';
  if (stock === 0) return 'sin_stock';
  if (rendimiento === null) return 'ok';
  if (rendimiento < 5000)  return 'critico';
  if (rendimiento < 20000) return 'bajo';
  return 'ok';
}

// ─── Registro de accesos ──────────────────────────────────────────────────────
const LOG_FILE = path.join(__dirname, 'accesos.json');
function cargarLog() {
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch { return []; }
}
function guardarAcceso(entrada) {
  const log = cargarLog();
  log.unshift(entrada);               // más recientes primero
  fs.writeFileSync(LOG_FILE, JSON.stringify(log.slice(0, 5000), null, 2));
}

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'insumo.html'));
});

// ─── POST /api/acceso ─────────────────────────────────────────────────────────
app.post('/api/acceso', (req, res) => {
  const nombre = (req.body.nombre || '').trim() || 'Desconocido';
  const email  = (req.body.email  || '').trim();
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
           || req.socket.remoteAddress || 'N/A';
  const ahora = new Date();
  guardarAcceso({
    nombre,
    email,
    ip,
    fecha: ahora.toLocaleDateString('es-AR'),
    hora:  ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    ts:    ahora.toISOString(),
  });
  res.json({ ok: true });
});

// ─── GET /admin/accesos ───────────────────────────────────────────────────────
app.get('/admin/accesos', (req, res) => {
  const log = cargarLog();
  const filas = log.map(e => `
    <tr>
      <td>${e.fecha}</td>
      <td>${e.hora}</td>
      <td><strong>${e.nombre}</strong><br><span style="color:#888;font-size:11px">${e.email||''}</span></td>
      <td style="color:#888;font-size:12px">${e.ip}</td>
    </tr>`).join('');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Accesos — Tablero Insumos</title>
<style>
  body { font-family: 'IBM Plex Sans', sans-serif; background:#f5f4f0; padding:40px; }
  h2 { margin-bottom:20px; }
  table { border-collapse:collapse; width:100%; max-width:700px; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
  th { background:#1a1916; color:#fff; padding:12px 16px; text-align:left; font-size:13px; }
  td { padding:10px 16px; border-bottom:1px solid #eee; font-size:14px; }
  tr:last-child td { border-bottom:none; }
  tr:hover td { background:#f9f8f5; }
</style>
</head>
<body>
<h2>Accesos al Tablero de Insumos</h2>
<p style="color:#888;margin-bottom:20px">${log.length} accesos registrados</p>
<table>
  <thead><tr><th>Fecha</th><th>Hora</th><th>Usuario</th><th>IP</th></tr></thead>
  <tbody>${filas || '<tr><td colspan="4" style="text-align:center;color:#aaa">Sin accesos aún</td></tr>'}</tbody>
</table>
</body>
</html>`);
});

// ─── GET /api/sin-consumo ─────────────────────────────────────────────────────
app.get('/api/sin-consumo', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT [${COL.producto}] AS producto, [${COL.stock}] AS stock
      FROM DHStockInsumos
      WHERE [${COL.stock}] > 0
      ORDER BY [${COL.producto}]
    `);
    const sinConsumo = result.recordset
      .filter(r => !CONSUMO_KG[r.producto])
      .map(r => r.producto);
    res.json(sinConsumo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/schema ─────────────────────────────────────────────────────────
app.get('/api/schema', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query('SELECT TOP 1 * FROM DHStockInsumos');
    const sample = result.recordset[0] || {};
    res.json({ columns: Object.keys(sample), sample });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/insumos ─────────────────────────────────────────────────────────
app.get('/api/insumos', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT
        [${COL.deposito}] AS deposito,
        [${COL.producto}] AS producto,
        [${COL.stock}]    AS stock
      FROM DHStockInsumos
      ORDER BY [${COL.deposito}], [${COL.producto}]
    `);

    const hoy = new Date();
    const fecha = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;

    const items = result.recordset
      .filter(r => {
        if ((r.stock ?? 0) <= 0) return false;
        return INSUMOS_ACTIVOS.has(normalizeNombre(r.producto));
      })
      .map(r => {
        const nombre  = normalizeNombre(r.producto);
        const consumo = CONSUMO_KG[nombre] ?? CONSUMO_KG[r.producto] ?? null;
        const stock   = r.stock ?? 0;
        const rend    = consumo ? +(stock / consumo).toFixed(2) : null;
        return {
          deposito:    r.deposito,
          producto:    normalizeNombre(r.producto),
          stock:       stock,
          consumo_kg:  consumo,
          rendimiento: rend,
          estado:      calcEstado(stock, rend),
        };
      });

    res.json({ fecha, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/stock ──────────────────────────────────────────────────────────
// Devuelve stock total por insumo (suma todos los depósitos) para el tablero de compras
app.get('/api/depositos', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT DISTINCT [${COL.deposito}] AS deposito FROM DHStockInsumos ORDER BY deposito
    `);
    res.json(result.recordset.map(r => r.deposito));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT
        [${COL.deposito}] AS deposito,
        [${COL.producto}] AS producto,
        SUM([${COL.stock}]) AS stock
      FROM DHStockInsumos
      GROUP BY [${COL.deposito}], [${COL.producto}]
    `);

    const hoy = new Date(new Date().toLocaleString('en-US', {timeZone: 'America/Argentina/Buenos_Aires'}));
    const fecha = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()} ${String(hoy.getHours()).padStart(2,'0')}:${String(hoy.getMinutes()).padStart(2,'0')}`;

    // stockMap: nombre -> total stock
    // depositoMap: nombre -> deposito (último depósito encontrado, generalmente uno por artículo)
    const stockMap = {};
    const depositoMap = {};
    for (const r of result.recordset) {
      const nombre = normalizeNombre(r.producto);
      stockMap[nombre] = (stockMap[nombre] || 0) + (r.stock || 0);
      if (nombre !== r.producto) stockMap[r.producto] = (stockMap[r.producto] || 0) + (r.stock || 0);
      depositoMap[nombre] = r.deposito;
      if (nombre !== r.producto) depositoMap[r.producto] = r.deposito;
    }

    res.json({ fecha, stock: stockMap, depositos: depositoMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/tables ─────────────────────────────────────────────────────────
app.get('/api/tables', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_CATALOG = 'backupBaseDeDatos'
      ORDER BY TABLE_TYPE, TABLE_NAME
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/table-sample/:nombre ───────────────────────────────────────────
app.get('/api/table-sample/:nombre', async (req, res) => {
  const nombre = req.params.nombre.replace(/[^a-zA-Z0-9_]/g, '');
  try {
    const p = await getPool();
    const result = await p.request().query(`SELECT TOP 3 * FROM [${nombre}]`);
    res.json({ columns: Object.keys(result.recordset[0] || {}), rows: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pt-stock-raw ────────────────────────────────────────────────────
app.get('/api/pt-stock-raw', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT Producto, Subfamilia, SUM(Kilos) AS kilos, MAX(Fecha) AS fecha
      FROM DHStockEnvasadora
      GROUP BY Producto, Subfamilia
      ORDER BY Subfamilia, Producto
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/pt-envasadora ───────────────────────────────────────────────────
// Mapeo nombre SQL → nombre en el tablero
const PT_MAP = {
  'ARROZ AROMATICO DOS HERMANOS 10x1/2KG':               'ARROZ AROMATICO DH 10x1/2kg',
  'ARROZ CARNAROLI "DOS HERMANOS" 10*1/2 KG':             'ARROZ CARNAROLI DH 10x1/2kg',
  'ARROZ CARNAROLI "DOS HERMANOS" 5 KG':                  'ARROZ CARNAROLI DH 5kg',
  'ARROZ DOBLE "D.H. " 10X1/2KG NON GMO':                 'ARROZ DOBLE DH 10x1/2kg NON GMO',
  'ARROZ DOBLE DH NON GMO 10 X 1 KG':                    'ARROZ DOBLE DH NON GMO 10x1kg',
  'ARROZ INTEGRAL DH NON GMO 10 X 1 KG':                 'ARROZ INTEGRAL DH NON GMO 10x1kg',
  'ARROZ KOSHIHIKARI (P/SUSHI) DH 5KG':                  'ARROZ KOSHIHIKARI DH 5kg',
  'ARROZ KOSHIHIKARI (P/SUSHI)"DOS HERMANOS" 10*1/2 KG': 'ARROZ KOSHIHIKARI DH 10x1/2kg',
  'ARROZ 5/0 "DH " 10X1/2KG NON GMO':                    'ARROZ 5/0 DH 10x1/2kg NON GMO',
  'ARROZ 5/0 DH 5KG':                                    'ARROZ 5/0 DH 5KG',
  'ARROZ 5/0 DH NON GMO 10 X 1KG':                       'ARROZ 5/0 DH NON GMO 10x1kg',
  'ARROZ 5/0 "EL FEDERAL" X 1 KG':                       'ARROZ 5/0 EL FEDERAL 1KG',
  'ARROZ 5/0 "PRODIGIO" X 1 KG':                         'ARROZ 5/0 PRODIGIO 1KG',
  'ARROZ 4/0 "EL FEDERAL" X 1 KG':                       'ARROZ 4/0 EL FEDERAL 1KG',
  'ARROZ PARBOIL "D.H. " X 5 KG':                        'ARROZ PARBOIL DH 5kg',
  'ARROZ PARBOIL "D.H." 10X1/2KG NON GMO':               'ARROZ PARBOIL DH 10x1/2kg NON GMO',
  'ARROZ PARBOIL "DH" 10X1 KG CAJAS':                    'ARROZ PARBOIL DH 10x1kg CAJAS',
  'ARROZ PARBOIL DH 10X500GR CAJA':                      'ARROZ PARBOIL DH 10x500gr CAJA',
  'ARROZ PARBOIL DH NON GMO 10 X 1 KG':                  'ARROZ PARBOIL DH NON GMO 10x1kg',
  'ARROZ PARBOIL "EL FEDERAL" X 1 KG':                   'ARROZ PARBOIL EL FEDERAL 1KG',
  'ARROZ PARBOIL "PRODIGIO" X 1 KG':                     'ARROZ PARBOIL PRODIGIO 1KG',
  'ARROZ YAMANI INTEGRAL DOS HERMANOS 1/2 KG':            'ARROZ YAMANI DH 1/2kg',
};

app.get('/api/pt-envasadora', async (req, res) => {
  try {
    const p = await getPool();
    const result = await p.request().query(`
      SELECT Producto, SUM(Kilos) AS kilos, MAX(Fecha) AS fecha_sql
      FROM DHStockEnvasadora
      GROUP BY Producto
    `);
    const hoy = new Date(new Date().toLocaleString('en-US', {timeZone: 'America/Argentina/Buenos_Aires'}));
    const fecha = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;

    const items = result.recordset
      .filter(r => PT_MAP[r.Producto])
      .map(r => ({
        producto:  PT_MAP[r.Producto],
        stock_kg:  Math.round(r.kilos || 0),
      }));

    res.json({ fecha, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Tablero Insumos corriendo en http://localhost:${PORT}`);
  console.log(`Schema disponible en http://localhost:${PORT}/api/schema`);
});

'use strict';

const functions = require('firebase-functions');
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

// ─── SQL_PASS ────────────────────────────────────────────────────────────────
const SQL_PASS = process.env.SQL_PASS || functions.config().sql?.pass || '';

// ─── Config mssql ────────────────────────────────────────────────────────────
const sqlConfig = {
  server: 'mc100.dos-hermanos.com',
  port: 1433,
  database: 'backupBaseDeDatos',
  user: 'usuario',
  password: SQL_PASS,
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 3, min: 0, idleTimeoutMillis: 30000 }
};

// ─── Pool — en Functions se recrea por instancia ─────────────────────────────
let pool = null;
async function getPool() {
  if (!pool || !pool.connected) {
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

// ─── Nombres de columnas ─────────────────────────────────────────────────────
const COL = {
  deposito: 'depositonombre',
  producto: 'insumonombre',
  stock:    'Cantidad',
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
  'BASES CARTON PARA ARROZ':                           0.001,
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
  'TECHO CARTON PARA ARROZ (80 x 100)':                0.001,
  'CAJA CON IMPRESION GENERICA TOSTADAS RECTANGULARES':0.4,
  'LAMINADO TOSTADAS C/SAL DH':                        0.0314285,
  'LAMINADO TOSTADAS S S/SAL DH':                      0.0314285,
  'LAMINADO HARINA x 1/2 kg':                          0.01,
  'LAM TC 42/70 (TERMOCONTRAIBLE ENVASADORA)':         0.0056,
  'CAJA HARINA':                                       0.083333,
  // Aliases
  'LAMINADO NO SE PASA - PARBOIL NON GMO DOS HERMANOS X KG': 0.0067,
  'SABORIZANTE JALAPEÑO LIMON VF-318-548-3':           0.096,
  'LAMINADO RICE SNACK GRILLED SMOKED MEAT FLAVORED x 80gr': 0.15,
  'STREECH MANUAL INFLADOS (OLD)':                     0.03,
  'PROVOLETA FLAVOR - SABORIZANTE':                    null,
};

// ─── Normalizar nombre ────────────────────────────────────────────────────────
function normalizeNombre(s) {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\.$/, '')
    .trimEnd();
}

// ─── Estado a partir del rendimiento ─────────────────────────────────────────
function calcEstado(stock, rendimiento) {
  if (stock < 0)   return 'negativo';
  if (stock === 0) return 'sin_stock';
  if (rendimiento === null) return 'ok';
  if (rendimiento < 5000)  return 'critico';
  if (rendimiento < 20000) return 'bajo';
  return 'ok';
}

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true }));

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
        const nombre = normalizeNombre(r.producto);
        return (CONSUMO_KG[nombre] !== undefined) || (CONSUMO_KG[r.producto] !== undefined);
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

exports.api = functions.https.onRequest(app);

const express = require('express');
const os = require('os');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || 'v4-postgres';
const ORIGIN = process.env.APP_ORIGIN || 'github';
const DEMO_NAME = process.env.DEMO_NAME || 'demo4';

let pool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.on('error', (e) => console.error('pg pool error', e.message));
}

async function ensureTable() {
  if (!pool) return false;
  await pool.query(`CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL DEFAULT '/',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  return true;
}

app.get('/', (req, res) => {
  res.send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${DEMO_NAME} - ${VERSION}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px}code{background:#f4f4f4;padding:2px 6px;border-radius:4px}</style>
</head>
<body>
<h1>🚀 ${DEMO_NAME} <code>${VERSION}</code></h1>
<p>Origen: <code>${ORIGIN}</code> · DB: <code>${pool ? 'postgres' : 'sin-db'}</code></p>
<p>Hostname: <code>${os.hostname()}</code></p>
<p><a href="/api">/api</a> · <a href="/health">/health</a> · <a href="/api/visits">/api/visits</a></p>
</body></html>`);
});

app.get('/api', (req, res) => {
  res.json({
    demo: DEMO_NAME,
    version: VERSION,
    origin: ORIGIN,
    hostname: os.hostname(),
    db: Boolean(pool),
    time: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  let db = 'none';
  if (pool) {
    try {
      await pool.query('SELECT 1');
      db = 'up';
    } catch (e) {
      db = 'down';
    }
  }
  res.json({ ok: true, version: VERSION, db });
});

app.get('/api/visits', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'sin DATABASE_URL' });
  try {
    await ensureTable();
    await pool.query('INSERT INTO visits(path) VALUES($1)', [req.query.path || '/']);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM visits');
    const last = await pool.query('SELECT id, path, created_at FROM visits ORDER BY id DESC LIMIT 5');
    res.json({ total: rows[0].total, last: last.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`demo listening on ${PORT} ${VERSION} origin=${ORIGIN} db=${Boolean(pool)}`));

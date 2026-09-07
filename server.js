const express = require('express');
const os = require('os');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || 'v4-tasks';
const ORIGIN = process.env.APP_ORIGIN || 'github';
const DEMO_NAME = process.env.DEMO_NAME || 'demo4';

let pool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.on('error', (e) => console.error('pg pool error', e.message));
}

async function ensureTables() {
  if (!pool) return false;
  await pool.query(`CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL DEFAULT '/',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  return true;
}

app.get('/', (req, res) => {
  res.send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${DEMO_NAME} - Tasks ${VERSION}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:32px auto;padding:0 16px}
code{background:#f4f4f4;padding:2px 6px;border-radius:4px}
li{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #eee}
li.done span{text-decoration:line-through;color:#888}
button{cursor:pointer}
input[type=text]{flex:1;padding:8px}
</style>
</head>
<body>
<h1>✅ ${DEMO_NAME} tasks <code>${VERSION}</code></h1>
<p>Origen: <code>${ORIGIN}</code> · DB: <code>${pool ? 'postgres' : 'sin-db'}</code> · Host: <code>${os.hostname()}</code></p>
<form id="f"><input id="t" type="text" placeholder="Nueva tarea..." required maxlength="200"><button>Añadir</button></form>
<ul id="list"></ul>
<p><a href="/api">/api</a> · <a href="/health">/health</a> · <a href="/api/tasks">/api/tasks</a></p>
<script>
async function load(){
  const r = await fetch('/api/tasks'); const j = await r.json();
  const ul = document.getElementById('list'); ul.innerHTML='';
  for (const t of j.tasks || []) {
    const li = document.createElement('li'); if (t.done) li.className='done';
    li.innerHTML = '<input type="checkbox" '+(t.done?'checked':'')+'> <span></span> <button>✕</button>';
    li.querySelector('span').textContent = t.title;
    li.querySelector('input').onchange = async (e) => {
      await fetch('/api/tasks/'+t.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({done:e.target.checked})});
      load();
    };
    li.querySelector('button').onclick = async () => { await fetch('/api/tasks/'+t.id,{method:'DELETE'}); load(); };
    ul.appendChild(li);
  }
}
document.getElementById('f').onsubmit = async (e) => {
  e.preventDefault();
  const v = document.getElementById('t').value.trim(); if (!v) return;
  await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:v})});
  document.getElementById('t').value=''; load();
};
load();
</script>
</body></html>`);
});

app.get('/api', (req, res) => {
  res.json({ demo: DEMO_NAME, version: VERSION, origin: ORIGIN, hostname: os.hostname(), db: Boolean(pool), time: new Date().toISOString() });
});

app.get('/health', async (req, res) => {
  let db = 'none';
  if (pool) {
    try { await pool.query('SELECT 1'); db = 'up'; } catch (e) { db = 'down'; }
  }
  res.json({ ok: true, version: VERSION, db });
});

app.get('/api/visits', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'sin DATABASE_URL' });
  try {
    await ensureTables();
    await pool.query('INSERT INTO visits(path) VALUES($1)', [req.query.path || '/']);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM visits');
    const last = await pool.query('SELECT id, path, created_at FROM visits ORDER BY id DESC LIMIT 5');
    res.json({ total: rows[0].total, last: last.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tasks', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'sin DATABASE_URL' });
  try {
    await ensureTables();
    const { rows } = await pool.query('SELECT id, title, done, created_at FROM tasks ORDER BY id DESC');
    res.json({ tasks: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'sin DATABASE_URL' });
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title requerido' });
  try {
    await ensureTables();
    const { rows } = await pool.query('INSERT INTO tasks(title) VALUES($1) RETURNING id, title, done, created_at', [title]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/tasks/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'sin DATABASE_URL' });
  try {
    await ensureTables();
    const { rows } = await pool.query(
      'UPDATE tasks SET title = COALESCE($1, title), done = COALESCE($2, done) WHERE id = $3 RETURNING id, title, done, created_at',
      [req.body.title ?? null, req.body.done ?? null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'no existe' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'sin DATABASE_URL' });
  try {
    await ensureTables();
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`demo listening on ${PORT} ${VERSION} origin=${ORIGIN} db=${Boolean(pool)}`));

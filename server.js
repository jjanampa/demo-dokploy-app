const express = require('express');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || 'v3-ghcr';
const ORIGIN = process.env.APP_ORIGIN || 'ghcr';
const DEMO_NAME = process.env.DEMO_NAME || 'demo3';

app.get('/', (req, res) => {
  res.send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${DEMO_NAME} - ${VERSION}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px}code{background:#f4f4f4;padding:2px 6px;border-radius:4px}</style>
</head>
<body>
<h1>🚀 ${DEMO_NAME} <code>${VERSION}</code></h1>
<p>Origen: <code>${ORIGIN}</code></p>
<p>Hostname: <code>${os.hostname()}</code></p>
<p><a href="/api">/api</a> · <a href="/health">/health</a></p>
</body></html>`);
});

app.get('/api', (req, res) => {
  res.json({
    demo: DEMO_NAME,
    version: VERSION,
    origin: ORIGIN,
    hostname: os.hostname(),
    time: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => res.json({ ok: true, version: VERSION }));

app.listen(PORT, '0.0.0.0', () => console.log(`demo listening on ${PORT} ${VERSION} origin=${ORIGIN}`));

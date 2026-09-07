# demo-dokploy-app

Demo progresiva Dokploy: app propia → GitHub repo → GHCR imagen.

- Paso 1: imagen Docker manual `ghcr.io/jjanampa/demo-dokploy-app:v1-docker-manual` → `demo3.vexio.dev`
- Paso 2: origen GitHub repo (Dockerfile build en Dokploy)
- Paso 3: origen GHCR imagen construida por GitHub Actions

Endpoints: `/` `/api` `/health`

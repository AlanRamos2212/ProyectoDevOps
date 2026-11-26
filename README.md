# Proyecto DevOps - Finanza

Aplicación demo de finanzas personales para el proyecto de CI/CD y observabilidad.

## Requisitos

- Node.js 22+
- Docker Engine y Docker Compose para ejecutar la aplicación en contenedores

## Desarrollo local

Desde la raíz del repositorio:

```powershell
npm.cmd ci --include=optional
npm.cmd run dev
```

Frontend: <http://localhost:5173> · API: <http://localhost:3000/health>

El usuario inicial es `demo@finanzas.local` / `Demo123!`. Cambia estas credenciales antes de exponer el servidor fuera del entorno de clase.

## Estructura del proyecto

El repositorio usa npm workspaces: `frontend` y `backend` se construyen y prueban por separado, y la raíz mantiene los comandos comunes y Docker Compose.

```text
backend/src/
  config/          Configuración compartida
  controllers/     Lógica de los endpoints
  database/        Conexión y preparación de SQLite
  middleware/      Autenticación y validación de rutas
  routes/          Rutas agrupadas por funcionalidad
  validators/      Esquemas de entrada
frontend/src/
  app/             Composición principal de la aplicación
  features/        Pantallas y componentes por funcionalidad
  shared/          Cliente API y utilidades compartidas
  types/           Tipos comunes del frontend
```

Los archivos de entrada (`backend/src/index.ts`, `backend/src/app.ts` y `frontend/src/main.tsx`) permanecen en sus ubicaciones para conservar scripts, pruebas y configuración Docker.

## Docker

```powershell
docker compose up --build
```

UI: <http://localhost:8080> · API de salud: <http://localhost:3000/health>

Nginx reenvía las rutas `/api/` al backend. SQLite persiste en el volumen `finance_data`.

### OpenTelemetry y OpenObserve

El contenedor del backend precarga la auto-instrumentación de OpenTelemetry. Envía trazas HTTP/Express, spans de consultas SQLite, y métricas de conteo y duración por método, ruta y código HTTP mediante OTLP/HTTP. Los logs JSON del backend salen por `journald` junto con los logs de los contenedores, para que el agente de OpenObserve los recoja.

En despliegues, el workflow toma `OPENOBSERVE_URL` y `OPENOBSERVE_ORG` de las variables del repositorio, y `OPENOBSERVE_AUTHORIZATION` de un secreto. El endpoint OTLP se construye como `/api/<org>` y el stream por defecto de OpenObserve recibe los datos.

## Pruebas

```powershell
npm.cmd run test:backend
npx playwright install chromium
npm.cmd run test:e2e --workspace frontend
```

La suite objetivo tiene 570 casos Jest y 670 casos Playwright. Las pruebas E2E levantan los servicios con Docker Compose, corren con 3 workers y generan el reporte HTML en `frontend/playwright-report/`. GitHub Actions publica el reporte como artifact descargable por 30 días.

## GitHub Actions y EC2

El workflow `.github/workflows/ci.yml` ejecuta Jest y Playwright en cada push a `main` y en pull requests. El despliegue solo se habilita en pushes a `main`, después de que ambos trabajos pasen, y cuando la variable del repositorio `DEPLOY_EC2_ENABLED` esté definida como `true`.

Configura estos secretos en GitHub antes de habilitar el despliegue:

- `EC2_HOST`: DNS público o IP de la instancia.
- `EC2_USERNAME`: usuario SSH, por ejemplo `ubuntu`.
- `EC2_SSH_PRIVATE_KEY`: llave privada para conectarse a EC2.
- `EC2_KNOWN_HOSTS`: clave de host verificada de la instancia.
- `EC2_JWT_SECRET`: secreto aleatorio para firmar sesiones.
- `OPENOBSERVE_AUTHORIZATION`: encabezado Basic del token de ingestión de OpenObserve.

Configura también estas variables del repositorio:

- `OPENOBSERVE_ORG`: ID de organización.
- `OPENOBSERVE_URL`: por defecto `https://api.openobserve.ai`.
- `DEPLOY_EC2_ENABLED`: debe ser `true` para habilitar el deploy condicionado a ambas suites.
- `EC2_DEPLOY_PATH`: opcional; por defecto `/opt/proyectodevops`.

EC2 necesita Docker Engine y Docker Compose. La interfaz queda publicada en el puerto 8080. El deploy SSH solo funcionará si la instancia acepta conexiones desde el runner de GitHub; limitar SSH a la IP de casa permite Instance Connect desde el navegador, pero no al runner hospedado de GitHub. No abras SSH a `0.0.0.0/0`; para CI/CD automatizado conviene integrar AWS Systems Manager.

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

## Docker

```powershell
docker compose up --build
```

UI: <http://localhost:8080> · API de salud: <http://localhost:3000/health>

Nginx reenvía las rutas `/api/` al backend. SQLite persiste en el volumen `finance_data`.

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
- `EC2_USER`: usuario SSH.
- `EC2_SSH_PRIVATE_KEY`: llave privada para conectarse a EC2.
- `EC2_KNOWN_HOSTS`: clave de host verificada de la instancia.
- `EC2_JWT_SECRET`: secreto aleatorio para firmar sesiones.

El nombre de usuario SSH esperado por el workflow es `EC2_USERNAME`.

Variable opcional: `EC2_DEPLOY_PATH` (por defecto `/opt/proyectodevops`). EC2 necesita Docker Engine, Docker Compose y acceso SSH desde GitHub Actions. La interfaz queda publicada en el puerto 8080.

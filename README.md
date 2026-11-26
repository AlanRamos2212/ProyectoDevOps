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

La configuración paso a paso de IAM, SSM, OIDC y GitHub está en [docs/aws-ssm-oidc-setup.md](docs/aws-ssm-oidc-setup.md).

El deploy usa GitHub OIDC y AWS Systems Manager Run Command, sin llaves SSH ni acceso SSH desde los runners hospedados. Para configurarlo:

1. Registra `https://token.actions.githubusercontent.com` como proveedor OIDC en IAM, con audiencia `sts.amazonaws.com`.
2. Crea un rol `GitHubActionsProyectoDevOpsDeployRole` cuya relación de confianza permita únicamente `repo:AlanRamos2212/ProyectoDevOps:ref:refs/heads/main`. Adjunta permisos para `ssm:SendCommand` al documento `AWS-RunShellScript` y a la instancia, `ssm:GetCommandInvocation`, y `ssm:PutParameter` dentro de `/proyectodevops/prod/*`.
3. Al rol de instancia `ProyectoDevOpsSSMInstanceRole`, además de `AmazonSSMManagedInstanceCore`, adjunta permiso `ssm:GetParameter` para `/proyectodevops/prod/*`.
4. En GitHub Actions secrets configura `EC2_JWT_SECRET` y `OPENOBSERVE_AUTHORIZATION` (encabezado Basic del token de ingestión).
5. En GitHub Actions variables configura `AWS_DEPLOY_ROLE_ARN`, `EC2_INSTANCE_ID`, `OPENOBSERVE_ORG` y `DEPLOY_EC2_ENABLED=true`. `AWS_REGION` del workflow es `us-east-2`; `OPENOBSERVE_URL` puede omitirse para usar `https://api.openobserve.ai`.

El workflow cifra los secretos como `SecureString` en Parameter Store y la instancia los recupera al desplegar. La primera ejecución instala Git, AWS CLI, Docker Engine y Compose si faltan. La interfaz queda publicada en el puerto 8080. Mantén el puerto SSH limitado a tu IP; GitHub Actions se conecta a la instancia por Systems Manager.

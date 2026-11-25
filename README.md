# Proyecto DevOps - Finanza

Aplicación demo de finanzas personales para el proyecto de CI/CD y observabilidad.

## Requisitos
- Node.js 22+
- Docker y Docker Compose

## Desarrollo local
1. `npm install`
2. `npm run dev`
3. Frontend: http://localhost:5173 · API: http://localhost:3000/health

Demo: `demo@finanzas.local` / `Demo123!`

## Docker
`docker compose up --build` · UI: http://localhost:8080 · API: http://localhost:3000

Los datos SQLite persisten en el volumen `finance_data`.

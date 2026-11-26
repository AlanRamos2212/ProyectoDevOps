FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install
FROM deps AS build
COPY . .
RUN npm run build -w backend
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
# Auto-instrumentación OTel para HTTP/Express y exporters OTLP.
RUN npm install --prefix /otel --omit=dev --no-audit --no-fund @opentelemetry/auto-instrumentations-node@0.83.1
ENV NODE_PATH=/otel/node_modules
# Resuelve el subpath público de registro durante el build para detectar fallos de OTel
# antes de iniciar el contenedor (los paths internos del paquete no son API pública).
RUN node -e "require.resolve('@opentelemetry/auto-instrumentations-node/register')"
RUN mkdir -p /data
ENV DATABASE_PATH=/data/finance.db
EXPOSE 3000
CMD ["node", "--require", "@opentelemetry/auto-instrumentations-node/register", "dist/index.js"]


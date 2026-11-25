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
RUN mkdir -p /data
ENV DATABASE_PATH=/data/finance.db
EXPOSE 3000
CMD ["node", "dist/index.js"]


# ====================================
# Dockerfile All-in-One
# Frontend React + Backend Express
# ====================================
# Uso: docker build -t messaging-game .
#      docker run -d -p 8080:80 messaging-game
# ====================================

# ----- STAGE 1: Build Frontend -----
FROM node:25-alpine AS frontend-builder

WORKDIR /app

# Copia package files del frontend
COPY package*.json ./

# Installa dipendenze frontend
RUN npm ci

# Copia i file del frontend
COPY src ./src
COPY index.html ./
COPY vite.config.ts ./

# Build frontend (output in build/, non dist/)
RUN npm run build && ls -la build/

# ----- STAGE 2: Build Backend -----
FROM node:25-alpine AS backend-builder

# Installa openssl (richiesto da Prisma)
RUN apk add --no-cache openssl

WORKDIR /app/backend

# Copia package files del backend
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Installa tutte le dipendenze (incluse dev per build)
RUN npm ci

# Copia codice backend
COPY backend/prisma ./prisma
COPY backend/src ./src

# Genera Prisma client e compila TypeScript
RUN npx prisma generate
RUN npm run build

# ----- STAGE 3: Produzione -----
FROM node:25-alpine AS production

# Installa nginx, supervisord e openssl (richiesto da Prisma)
RUN apk add --no-cache nginx supervisor openssl

WORKDIR /app

# ----- Setup Backend -----
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copia Prisma e genera client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copia backend compilato
COPY --from=backend-builder /app/backend/dist ./dist

# Crea directory per database
RUN mkdir -p /app/data

# ----- Setup Frontend (Nginx) -----
WORKDIR /app

# Copia frontend buildato (output è in build/, non dist/)
COPY --from=frontend-builder /app/build /usr/share/nginx/html

# Copia configurazione nginx
COPY nginx.conf /etc/nginx/http.d/default.conf

# ----- Configurazione Supervisord -----
RUN mkdir -p /etc/supervisor.d
COPY <<EOF /etc/supervisor.d/app.ini
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:backend]
command=sh -c "cd /app/backend && npx prisma db push --skip-generate && node dist/index.js"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV=production,PORT=3001,DATABASE_URL="file:/app/data/messaging-game.db",ADMIN_SECRET="%(ENV_ADMIN_SECRET)s"
EOF

# Variabili d'ambiente di default
ENV NODE_ENV=production
ENV ADMIN_SECRET=MESSAGINGAME2025!ADMIN

# Espone porta 80 (nginx serve frontend e fa proxy al backend)
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -q --spider http://localhost/api/health || exit 1

# Avvia supervisord (gestisce nginx + backend)
CMD ["supervisord", "-c", "/etc/supervisord.conf"]

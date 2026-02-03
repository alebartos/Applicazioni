# ====================================
# Dockerfile All-in-One (Aggiornato per CVE)
# Frontend React + Backend Express
# Mitiga: CVE-2026-24842 (node-tar), CVE-2025-60876 (busybox), CVE-2026-24049 (wheel)
# ====================================
# Uso: docker build -t messaging-game .
#      docker run -d -p 8080:80 -e ADMIN_SECRET=your_secret messaging-game
# ====================================

# ----- STAGE 1: Build Frontend -----
FROM node:25-alpine AS frontend-builder

# Aggiornamenti di sicurezza (include busybox >1.37.0 per CVE-2025-60876)
RUN apk update && apk upgrade --no-cache

# Forza node-tar >=7.5.7 per CVE-2026-24842 + aggiorna npm
RUN npm install -g npm@latest node-tar@latest

WORKDIR /app

# Copia package files del frontend
COPY package*.json ./

# Installa dipendenze frontend (con audit)
RUN npm ci --audit --audit-level=moderate

# Copia i file del frontend
COPY src ./src
COPY index.html ./
COPY vite.config.ts ./

# Build frontend (output in build/)
RUN npm run build && ls -la build/

# ----- STAGE 2: Build Backend -----
FROM node:25-alpine AS backend-builder

# Aggiornamenti di sicurezza
RUN apk update && apk upgrade --no-cache

# Installa openssl (richiesto da Prisma)
RUN apk add --no-cache openssl

# Forza node-tar + aggiorna npm per CVE-2026-24842
RUN npm install -g npm@latest node-tar@latest

WORKDIR /app/backend

# Copia package files del backend
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Installa dipendenze backend (con audit)
RUN npm ci --audit --audit-level=moderate

# Copia codice backend
COPY backend/prisma ./prisma
COPY backend/src ./src

# Genera Prisma client e compila TypeScript
RUN npx prisma generate
RUN npm run build

# ----- STAGE 3: Produzione -----
FROM node:25-alpine AS production

# Aggiornamenti critici di sicurezza
RUN apk update && apk upgrade --no-cache

# Forza node-tar per CVE-2026-24842 + aggiorna npm
RUN npm install -g npm@latest node-tar@latest

# Installa nginx, supervisord e openssl
RUN apk add --no-cache nginx supervisor openssl

# Rimuovi pacchetti Python vulnerabili (CVE-2026-24049)
RUN rm -rf /usr/lib/python*/site-packages/wheel* \
           /usr/lib/python*/site-packages/setuptools* \
           /usr/lib/python*/site-packages/pkg_resources* 2>/dev/null || true

WORKDIR /app

# ----- Setup Backend -----
COPY backend/package*.json ./backend/
WORKDIR /app/backend
# Installa solo production deps (con node-tar aggiornato + audit)
RUN npm ci --only=production --audit --audit-level=moderate --legacy-peer-deps

# Copia Prisma e genera client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copia backend compilato
COPY --from=backend-builder /app/backend/dist ./dist

# Crea directory per database
RUN mkdir -p /app/data

# ----- Setup Frontend (Nginx) -----
WORKDIR /app

# Copia frontend buildato
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
environment=NODE_ENV="production",PORT="3001",DATABASE_URL="file:/app/data/messaging-game.db",ADMIN_SECRET="%(ENV_ADMIN_SECRET)s"
EOF

# Variabili d'ambiente
ENV NODE_ENV=production
ENV ADMIN_SECRET=MESSAGINGAME2025!ADMIN

# Espone porta 80
EXPOSE 80

# Healthcheck con busybox wget patched
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -q --spider http://localhost/api/health || exit 1

# Avvia supervisord
CMD ["supervisord", "-c", "/etc/supervisor.d/app.ini"]

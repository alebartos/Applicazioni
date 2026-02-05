# ====================================
# Dockerfile All-in-One (Fix Supervisord)
# Frontend React + Backend Express
# ====================================
# Uso: docker build -t messaging-game .
#      docker run -d -p 8080:80 -e ADMIN_SECRET=your_secret messaging-game
# ====================================


# ----- STAGE 1: Build Frontend -----
FROM node:25-alpine AS frontend-builder

RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*
RUN npm install -g npm@latest tar@7.5.7 && npm cache clean --force

WORKDIR /app
COPY package*.json ./
RUN npm ci --audit --audit-level=moderate && npm cache clean --force
COPY src ./src index.html ./ vite.config.ts ./
RUN npm run build && rm -rf node_modules

# ----- STAGE 2: Build Backend -----
FROM node:25-alpine AS backend-builder

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl && \
    rm -rf /var/cache/apk/*
RUN npm install -g npm@latest tar@7.5.7 && npm cache clean --force

WORKDIR /app/backend
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
RUN npm ci --audit --audit-level=moderate && npm cache clean --force
COPY backend/prisma ./prisma
COPY backend/src ./src
RUN npx prisma generate && npm run build && rm -rf node_modules

# ----- STAGE 3: Produzione -----
FROM node:25-alpine AS production

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache nginx supervisor openssl curl py3-pip && \
    rm -rf /var/cache/apk/*
RUN npm install -g npm@latest tar@7.5.7 && npm cache clean --force

# Upgrade vulnerable packages to latest versions before cleanup
RUN pip install --no-cache-dir --break-system-packages wheel==0.46.2 2>/dev/null || true

# CVE-2026-24049 cleanup + rimuovi file non necessari
RUN rm -rf /usr/lib/python*/site-packages/{wheel,setuptools,pkg_resources}* \
           /usr/share/man/* \
           /tmp/* \
           /root/.npm 2>/dev/null || true

WORKDIR /app
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production --audit --audit-level=moderate --legacy-peer-deps && \
    npm cache clean --force

COPY backend/prisma ./prisma
RUN npx prisma generate && rm -rf /root/.npm
COPY --from=backend-builder /app/backend/dist ./dist
RUN mkdir -p /app/data

WORKDIR /app
COPY --from=frontend-builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/http.d/default.conf

# Supervisord FIXED
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
environment=NODE_ENV="production",PORT="3001",DATABASE_URL="file:/app/data/messaging-game.db"
EOF

ENV NODE_ENV=production
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD curl -f http://localhost/api/health || exit 1

CMD ["supervisord", "-c", "/etc/supervisor.d/app.ini"]

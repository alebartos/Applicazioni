# ====================================
# Dockerfile per il Backend Express
# Multi-stage build: Build + Produzione
# ====================================

# ----- STAGE 1: Build -----
FROM node:25-alpine AS builder

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl && \
    rm -rf /var/cache/apk/*
RUN npm install -g npm@latest tar@7.5.7 && npm cache clean --force

WORKDIR /app

# Copia i file di configurazione
COPY package*.json ./
COPY tsconfig.json ./

# Installa TUTTE le dipendenze (incluse devDependencies per build)
RUN npm ci --audit --audit-level=moderate && npm cache clean --force

# Copia il codice sorgente
COPY prisma ./prisma
COPY src ./src

# Genera il client Prisma
RUN npx prisma generate

# Compila TypeScript
RUN npm run build

# ----- STAGE 2: Produzione -----
FROM node:25-alpine AS production

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache openssl py3-pip && \
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

# Copia solo i file necessari per la produzione
COPY package*.json ./

# Installa solo le dipendenze di produzione
RUN npm ci --only=production --audit --audit-level=moderate --legacy-peer-deps && \
    npm cache clean --force

# Copia Prisma schema e genera client
COPY prisma ./prisma
RUN npx prisma generate && rm -rf /root/.npm

# Copia il codice compilato dalla stage di build
COPY --from=builder /app/dist ./dist

# Crea la directory per il database
RUN mkdir -p /app/data

# Espone la porta del backend
EXPOSE 3001

# Variabili d'ambiente di default
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:/app/data/messaging-game.db"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

# Script di avvio: inizializza il database e avvia il server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]

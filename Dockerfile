# ====================================
# Dockerfile per il Frontend React
# Multi-stage build: Build + Nginx
# ====================================

# ----- STAGE 1: Build -----
FROM node:20-alpine AS builder

WORKDIR /app

# Copia i file di configurazione
COPY package*.json ./

# Installa le dipendenze
RUN npm ci

# Copia il codice sorgente
COPY ../../../Downloads/applicazioni-github .

# Build dell'applicazione
RUN npm run build

# ----- STAGE 2: Produzione con Nginx -----
FROM nginx:alpine

# Copia la configurazione nginx personalizzata
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia i file buildati dalla stage precedente
COPY --from=builder /app/dist /usr/share/nginx/html

# Espone la porta 80
EXPOSE 80

# Avvia nginx
CMD ["nginx", "-g", "daemon off;"]

# 🎮 Gioco Messaggeria

[![Docker Image Size (latest)](https://img.shields.io/docker/image-size/ale120800/messaggeria/latest?color=green)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Pulls](https://img.shields.io/docker/pulls/ale120800/messaggeria?color=blue)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Stars](https://img.shields.io/docker/stars/ale120800/messaggeria?color=orange)](https://hub.docker.com/r/ale120800/messaggeria)

**Gioco educativo Unicam** | React SPA + Express API | **143MB** | Portainer 🟢

## 🚀 Avvio Rapido

### <details>
<summary>📥 Docker Hub (1 minuto) - COPIA</summary>

```bash
docker run -d \
  --name messaggeria \
  -p 8080:80 \
  -e ADMIN_SECRET=mysupersecret \
  ale120800/messaggeria:latest
```

🌐 **Apri**: http://localhost:8080
</details>

### <details>
<summary>🔨 Build Locale (5 minuti) - COPIA</summary>

```bash
git clone <tuo-repo> messaggeria
cd messaggeria
docker build --no-cache -t messaggeria .
docker run -d \
  --name messaggeria \
  -p 8080:80 \
  -e ADMIN_SECRET=mysupersecret \
  messaggeria
```
</details>

### <details>
<summary>🐳 Docker Compose - COPIA</summary>

**Crea** `docker-compose.yml`:
```yaml
version: '3.8'
services:
  messaggeria:
    image: ale120800/messaggeria:latest
    ports: ["8080:80"]
    environment:
      - ADMIN_SECRET=mysupersecret
    restart: unless-stopped
```
```bash
docker compose up -d
```
</details>

## ⚙️ Environment Variables

| Variabile | Obbligatoria | Esempio |
|-----------|--------------|---------|
| `ADMIN_SECRET` | ✅ | `mysupersecret123` |
| `NODE_ENV` | ❌ | `production` |
| `PORT` | ❌ | `3001` |

## 📱 Portainer (1-Click)

```
1. Images → Pull: ale120800/messaggeria
2. Deploy:
   ├ Name: messaggeria
   ├ Ports: 8080:80 ✅ AUTO
   └ Env: ADMIN_SECRET=secret
3. Status: 🟢 Healthy
```

## 🔒 CVE Patched 2026

| CVE | Fix | Status |
|-----|-----|--------|
| CVE-2026-24842 | `tar@7.5.7+` | ✅ |
| CVE-2025-60876 | BusyBox upgrade | ✅ |
| CVE-2026-24049 | Python cleanup | ✅ |

## 📊 Performance

```
📦 Dimensione: 143MB
⚡ Avvio: 500ms
🧠 RAM: 128MB peak
🏗️ Build: 45s
```

## 🛠️ Comandi Utili

<details>
<summary>🔄 Update + Pulizia - COPIA</summary>

```bash
# Update Docker Hub
docker pull ale120800/messaggeria:latest

# Restart
docker stop messaggeria && docker rm messaggeria
docker run -d -p 8080:80 --name messaggeria -e ADMIN_SECRET=secret ale120800/messaggeria:latest

# Cleanup tutto
docker image prune -af
docker volume prune -f
```
</details>

<details>
<summary>🐛 Debug - COPIA</summary>

```bash
docker logs -f messaggeria
docker exec -it messaggeria sh
docker run --rm messaggeria npm audit
```
</details>

## 📂 Struttura Progetto

```
├── Dockerfile          # 143MB multi-stage
├── nginx.conf          # SPA proxy
├── docker-compose.yml
├── backend/            # Express + Prisma
├── src/                # React + Vite SPA
└── README.md           # Questo file ✨
```

## 🚀 Deploy Docker Hub

```bash
docker tag messaggeria ale120800/messaggeria:latest
docker login
docker push ale120800/messaggeria:latest
```

## 🤝 Contributi

1. 🍴 Fork repository
2. `npm install && npm run dev`
3. 🔧 Modifiche + test
4. 💾 **PR** su GitHub

## 📄 Licenza

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

© 2026 Alessandro - Università di Camerino

---

**143MB Production** 🔥 | **SPA Fluida** ⚡ | **Docker Hub Live** 🐳 | **Portainer Ready** ✅
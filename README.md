# Gioco Messaggeria

[![Docker Image Size (latest)](https://img.shields.io/docker/image-size/ale120800/messaggeria/latest?color=green)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Pulls](https://img.shields.io/docker/pulls/ale120800/messaggeria?color=blue)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Stars](https://img.shields.io/docker/stars/ale120800/messaggeria?color=orange)](https://hub.docker.com/r/ale120800/messaggeria)

## Avvio Rapido

<details>
<summary>Docker Hub </summary>

```bash
docker run -d \
  --name messaggeria \
  -p 8080:80 \
  -e ADMIN_SECRET=mysupersecret \
  ale120800/messaggeria:latest
```

</details>

<details>
<summary>Build Locale</summary>

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

<details>
<summary>Docker Compose</summary>

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

🌐 **Apri**: http://'serverip':8080

## Environment Variables

| Variabile | Obbligatoria | Esempio |
|-----------|--------------|---------|
| `ADMIN_SECRET` | ✅ | `mysupersecret123` |
| `NODE_ENV` | ❌ | `production` |
| `PORT` | ❌ | `3001` |


## 🛠️ Comandi Utili

<details>
<summary>Update + Pulizia - COPIA</summary>

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


## 🤝 Contributi

...

## 📄 Licenza

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

© 2026 Alessandro Bartolini, Matteo Polverino, Elena Sofia D'Ascanio - Università di Camerino

---

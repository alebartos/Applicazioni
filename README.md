# 🎮 Gioco Messaggeria

[![Docker Image Size (latest)](https://img.shields.io/docker/image-size/ale120800/messaggeria/latest?color=green)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Pulls](https://img.shields.io/docker/pulls/ale120800/messaggeria?color=blue)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Stars](https://img.shields.io/docker/stars/ale120800/messaggeria?color=orange)](https://hub.docker.com/r/ale120800/messaggeria)

## 🚀 Avvio Rapido (2 comandi)

```bash
# Build locale (150MB)
docker build --no-cache -t messaging-game .

# Run (auto-port 8080:80!)
docker run -d --name game -e ADMIN_SECRET=mysupersecret messaging-game

# O Docker Hub
docker run -d -p 8080:80 --name game -e ADMIN_SECRET=secret ale120800/messaggeria

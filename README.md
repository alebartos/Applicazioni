# Gioco Messaggeria
Questo gioco è stato sviluppato per portare una moderna versione della messaggeria al DADAZEN a Camerino; Ed è stato recentemente testato durante un paio di serate reali.

Inizialmente l'app era stata pensata per essere gestita da due admin non modificabili ma per adattarsi meglio al progetto di Applicazioni Web e stata inserita la possibilità di registrarsi al primo avvio come admin e scegliere la propria password (quindi abbiamo aggiunto piu o meno 1500 righe di codice a quello che era l'app originale);

Inoltre inizialmente il sito si appoggiava a supabase ma questa dipendenza è stata rimossa attraverso un database interno.


[![Docker Image Size (latest)](https://img.shields.io/docker/image-size/ale120800/messaggeria/latest?color=green)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Pulls](https://img.shields.io/docker/pulls/ale120800/messaggeria?color=blue)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Stars](https://img.shields.io/docker/stars/ale120800/messaggeria?color=orange)](https://hub.docker.com/r/ale120800/messaggeria)

## Avvio Rapido
Per avviare il container Docker si può seguire una di queste 3 vie:
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

## Primo Avvio
Al primo avvio verra proposta la creazione di un profilo admin; Una volta creato il primo profilo admin i successivi accessi verranno indirizzati alla landing page (login)

## Funzionalità
Admin:
- Gestione Tavoli
- Avvia/Ferma Gioco
- Log messaggi giocatori
- Sfide

Player:
- Scrivere messaggi (anonimo e non)
- Reazioni emoji
- 

## 🛠️ Comandi Utili

<details>
<summary>Update + Pulizia</summary>

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


## Contributi

...

## Licenza

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

© 2026 Alessandro Bartolini, Matteo Polverino, Elena Sofia D'Ascanio - Università di Camerino

---

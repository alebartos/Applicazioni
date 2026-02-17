# Gioco Messaggeria
Questo gioco è stato sviluppato per portare una moderna versione della messaggeria al DADAZEN a Camerino; Ed è stato recentemente testato durante un paio di serate reali.

Inizialmente l'app era stata pensata per essere gestita da due admin non modificabili ma per adattarsi meglio al progetto di Applicazioni Web è stata inserita la possibilità di registrarsi al primo avvio come admin e scegliere la propria password (quindi abbiamo aggiunto più o meno 1500 righe di codice a quello che era l'app originale);

Inoltre, inizialmente il sito si appoggiava a supabase, ma questa dipendenza è stata rimossa attraverso un database interno.


[![Docker Image Size (latest)](https://img.shields.io/docker/image-size/ale120800/messaggeria/latest?color=green)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Pulls](https://img.shields.io/docker/pulls/ale120800/messaggeria?color=blue)](https://hub.docker.com/r/ale120800/messaggeria)
[![Docker Stars](https://img.shields.io/docker/stars/ale120800/messaggeria?color=orange)](https://hub.docker.com/r/ale120800/messaggeria)

[![CI/CD Pipeline](https://github.com/alebartos/Applicazioni/actions/workflows/ci.yml/badge.svg)](https://github.com/alebartos/Applicazioni/actions/workflows/ci.yml)

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
git clone https://github.com/alebartos/Applicazioni.git messaggeria
cd ./messaggeria
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

## Sicurezza

Il progetto implementa un sistema di sicurezza multi-livello, coprendo tutte le principali categorie di protezione per un'applicazione web.

### Autenticazione e Autorizzazione

**JWT (JSON Web Token)**
- Token firmato con chiave segreta configurabile tramite variabile d'ambiente `JWT_SECRET`
- Scadenza automatica dopo 24 ore
- Ogni richiesta protetta verifica il token + controlla che l'utente esista ancora nel database
- Formato: `Authorization: Bearer <token>`

**Sistema di Ruoli e Permessi**
- Tre livelli: Admin, Staff, Giocatore
- L'admin ha accesso completo a tutte le funzionalita
- Lo staff ha permessi granulari assegnati dall'admin, suddivisi in 9 categorie:
  `manage_tables`, `view_users`, `view_messages`, `send_broadcast`, `manage_countdown`, `view_leaderboard`, `manage_challenges`, `manage_tv`, `manage_game_state`
- Middleware dedicati: `requireAuth`, `requireAdmin`, `requirePermission()`

### Protezione Password

- Hashing con **bcrypt** (10 salt rounds) — confronto in tempo costante che previene timing attacks
- Validazione complessita: minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero
- Le password non vengono mai salvate in chiaro nel database

### Rate Limiting

Quattro livelli di protezione con `express-rate-limit`:

| Livello | Finestra | Max Richieste | Applicato a |
|---------|----------|---------------|-------------|
| Globale | 15 min | 1.000 per IP | Tutte le route |
| Login | 15 min | 5 tentativi | `/api/admin/login`, `/api/staff/login` |
| Operazioni Admin | 5 min | 50 per IP | Gestione tavoli, stato gioco |
| Messaggi | 1 min | 20 per IP | `/api/send-message`, `/api/add-reaction` |

Il rate limiter del login ha `skipSuccessfulRequests: true`, quindi i login riusciti non consumano tentativi.

### Prevenzione XSS (Cross-Site Scripting)

Protezione su piu livelli:

1. **Sanitizzazione input** con libreria `sanitize-html`:
    - Nomi utente: tutti i tag HTML rimossi, max 100 caratteri
    - Messaggi: consentiti solo tag sicuri (`b`, `i`, `em`, `strong`, `br`), max 500 caratteri
2. **Content Security Policy (CSP)** tramite Helmet:
    - Script: solo dall'origine stessa (no inline, no eval)
    - Stili: self + unsafe-inline (necessario per Tailwind CSS)
    - Immagini: self + data URI + HTTPS
3. **Type checking**: controllo esplicito dei tipi prima dell'elaborazione

### Prevenzione SQL Injection

- **Prisma ORM** con query parametrizzate — nessuna query SQL raw nel codice
- Tutti gli accessi al database passano attraverso i metodi Prisma (`findUnique`, `create`, `update`, `delete`)
- Il database SQLite non e esposto direttamente

### Security Headers (Helmet)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

### CORS (Cross-Origin Resource Sharing)

- Whitelist esplicita delle origini consentite (configurabile via `CORS_ORIGIN`)
- Validazione dinamica con callback — le origini sconosciute vengono loggate con warning
- Metodi consentiti: `GET, POST, PUT, DELETE, OPTIONS`
- Header consentiti: `Content-Type, Authorization`

### Altre Misure di Sicurezza

| Misura | Descrizione |
|--------|-------------|
| Anti User-Enumeration | Messaggio di errore generico identico per tutti i fallimenti di login ("Credenziali non valide") |
| Body Size Limit | Payload massimo 100KB (`express.json({ limit: '100kb' })`) per prevenire attacchi DoS |
| Conflitti Codici | Validazione che i codici admin/staff/tavoli non collidano tra loro |
| Cleanup Automatico | Utenti inattivi da piu di 10 minuti vengono rimossi automaticamente |
| Trust Proxy | `trust proxy: 1` configurato per leggere correttamente l'IP reale dietro Nginx |
| Validazione Codici Tavolo | Solo alfanumerici, max 10 caratteri, normalizzati in uppercase |

### Librerie di Sicurezza Utilizzate

```
bcrypt            — Hashing password
express-rate-limit — Rate limiting
helmet            — Security headers + CSP + HSTS
jsonwebtoken      — Generazione e verifica JWT
sanitize-html     — Sanitizzazione HTML/XSS
@prisma/client    — Query parametrizzate (prevenzione SQL injection)
```

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

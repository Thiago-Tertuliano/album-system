# Album — Álbum digital de figurinhas (Copa do Mundo)

Produto Axellion: aplicativo **web + mobile (Android APK)** para álbuns de figurinhas da **Copa do Mundo FIFA**. O colecionador **marca manualmente** o que possui; progresso sincronizado por **conta** entre web e app.

## Documentação

Índice: [`docs/README.md`](docs/README.md)

## Componentes

| Pasta | Descrição |
|-------|-----------|
| [`backend/`](backend/README.md) | API Fastify + PostgreSQL + admin + progresso por usuário |
| [`frontend/web/`](frontend/web/) | App React (catálogo + estúdio admin na web) |
| [`frontend/web/MOBILE.md`](frontend/web/MOBILE.md) | Build Capacitor e APK Android |

## Status (MVP)

- Catálogo, import LastSticker, cache de imagens, painel admin
- Web colecionador: login, progresso %, filtros, repetidas
- Android: Capacitor + pipeline APK (ver MOBILE.md)

## Início rápido

```bash
# Backend
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run admin:create -- --email admin@local.test --password "sua-senha"
npm run dev

# Web
cd ../frontend/web
npm install
npm run dev
```

API: `http://localhost:3333` · Web: `http://localhost:5173`

## Edições MVP

- `fwc-2014` (seed)
- `fwc-2018-int` (import LastSticker)

## ADRs

- [ADR-001](docs/technical/adr/ADR-001-backend-stack.md) — Backend Node
- [ADR-002](docs/technical/adr/ADR-002-admin-hibrido-jwt.md) — Admin JWT
- [ADR-003](docs/technical/adr/ADR-003-mobile-capacitor.md) — Mobile Capacitor

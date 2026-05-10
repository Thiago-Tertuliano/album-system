# ADR-001: Backend do Album em Node.js + TypeScript + Fastify + Drizzle

## Status

Aceita

## Contexto

O Album precisa iterar rápido sobre **catálogo oficial de figurinhas** (JSON/seeds), URLs de imagens e endpoints REST para web/mobile. Havia dúvida entre **Node** e **Go** para a primeira versão do backend.

## Decisão

Usar **Node.js 20+**, **TypeScript**, **Fastify**, **PostgreSQL** e **Drizzle ORm** no diretório `backend/` do repositório `Album-project`.

## Consequências

- **Positivas:** seeds e revisões de checklist Panini sem pipeline de build pesado; ecossistema maduro para futura geração de PDF/listas.
- **Negativas:** outro runtime além de possíveis serviços Go na Axellion — mitigar com documentação clara e contratos API versionados (`/v1`).
- **Revisão:** extrair serviços críticos para Go ou outra linguagem se métricas de CPU/concorrência justificarem.

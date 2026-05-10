# Documentação do projeto Album

Índice da pasta `docs` — Axellion. Leia nesta ordem para onboarding rápido.

| Ordem | Pasta / arquivo | Conteúdo |
|-------|-----------------|----------|
| 1 | [`product/01-visao-e-escopo.md`](product/01-visao-e-escopo.md) | Visão, objetivos, MVP vs roadmap, premissas |
| 2 | [`product/02-personas-e-jornadas.md`](product/02-personas-e-jornadas.md) | Quem usa e fluxos principais |
| 3 | [`product/03-requisitos-funcionais.md`](product/03-requisitos-funcionais.md) | RFs numerados |
| 4 | [`product/04-requisitos-nao-funcionais.md`](product/04-requisitos-nao-funcionais.md) | Performance, segurança, LGPD, acessibilidade |
| 5 | [`product/05-backlog-epicos-e-historias.md`](product/05-backlog-epicos-e-historias.md) | Épicos e histórias priorizadas |
| 6 | [`technical/01-arquitetura.md`](technical/01-arquitetura.md) | Visão de sistema web + mobile + API |
| 7 | [`technical/02-modelo-de-dados.md`](technical/02-modelo-de-dados.md) | Entidades e relacionamentos |
| 8 | [`technical/03-contratos-api-esboco.md`](technical/03-contratos-api-esboco.md) | Esboço de endpoints e payloads |
| 9 | [`technical/04-stack-e-repositorios.md`](technical/04-stack-e-repositorios.md) | Opções de stack e mono/repo |
| 10 | [`design/01-diretrizes-visuais-figurinhas.md`](design/01-diretrizes-visuais-figurinhas.md) | Identidade das “carinhas” e UI do álbum |
| 11 | [`design/02-ux-fluxos-e-telas.md`](design/02-ux-fluxos-e-telas.md) | Mapa de telas e estados |
| 12 | [`compliance/01-propriedade-intelectual-e-marcas.md`](compliance/01-propriedade-intelectual-e-marcas.md) | Riscos FIFA/marcas/imagem — decisões de produto |
| 13 | [`diagrams/README.md`](diagrams/README.md) | Onde versionar diagramas (draw.io, etc.) |
| — | [`../backend/README.md`](../backend/README.md) | Backend (API + Postgres + seed JSON) |
| — | [`technical/adr/ADR-001-backend-stack.md`](technical/adr/ADR-001-backend-stack.md) | ADR — stack Node/TS/Fastify/Drizzle |

## Convenções

- Documentos em **português brasileiro**.
- Requisitos funcionais: prefixo **RF-xxx**; não funcionais: **RNF-xxx**.
- Decisões arquiteturais: pasta `technical/adr/` (ver ADR-001).

## Manutenção

Ao alterar escopo do MVP, atualizar **visão**, **backlog** e **contratos API** na mesma sequência para evitar drift.

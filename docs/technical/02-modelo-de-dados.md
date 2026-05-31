# Modelo de dados — Album

Objetivo: suportar **múltiplas edições** da Copa, **páginas/slots estáveis** e **progresso por usuário** sem perda ao corrigir texto exibido. O backend (`backend/`) implementa **catálogo** com **`album_label`** (texto igual ao verso: `00`, `36x`, `CA1`, `FR03`…) e **`sort_index`** (ordem absoluta no checklist importado).

## Implementação atual (PostgreSQL)

Esquema gerenciado por **Drizzle** — ver `backend/src/db/schema.ts` e migrações em `backend/drizzle/`.

## Importação automática

Checklists podem ser carregados via snapshot Markdown + CLI (`npm run import:laststicker-md`) — ver `backend/data/snapshots/README.md`. **Não** há fetch HTTP direto para LastSticker (Cloudflare).

## Entidades principais

### `editions`

Representa uma Copa (torneio) + álbum associado.

| Campo | Tipo | Notas |
|-------|------|--------|
| id | UUID | PK |
| slug | string único | ex.: `fwc-2014` |
| name | string | Nome exibido |
| year | int | Ano da Copa |
| host_country | string opcional | Texto livre ou código ISO |
| publisher | string | Padrão `Panini` — auditoria do catálogo |
| cover_image_url | string opcional | **Capa do álbum** (CDN/path) |
| sticker_total | int | Total de figurinhas (calculado no seed/import) |
| status | enum texto | `draft`, `published`, `archived` |
| estimated_pack_price_cents | int opcional | Base para **métrica de gasto** (pacote oficial em centavos) |
| collector_notes | JSON opcional | Dicas, origem do import (`import_source`), etc. |
| created_at / updated_at | timestamptz | Auditoria |

### `album_pages`

Página física do álbum — uso para UX **“esta folha inteira”** e navegação rápida.

| Campo | Tipo | Notas |
|-------|------|--------|
| id | UUID | PK |
| edition_id | FK | |
| page_number | int | Ordem visual |
| title | string opcional | ex.: “Brasil” |
| preview_image_url | string opcional | Imagem da página completa |

### `sticker_slots`

Unidade atômica — **um slot = uma figurinha** na UX.

| Campo | Tipo | Notas |
|-------|------|--------|
| id | UUID **estável** | Nunca reusar para outra posição oficial |
| edition_id | FK | |
| page_id | FK opcional | Liga à página derivada da **seção** do checklist |
| album_label | text | **Código oficial no verso / checklist** — UNIQUE por edição |
| sort_index | int | Ordem no arquivo importado (1…N) |
| index_on_page | int opcional | Ordem dentro da página (seção) |
| category | string | `player`, `logo`, `stadium`, `legend`, `intro`, etc. |
| is_special | boolean | Destaque UI para laminadas / metais / updates |
| display_name | string | Pode mudar sem quebrar vínculo se o **id** for preservado |
| team_code / team_name | string opcional | Seleção |
| shirt_number / position | opcional | Jogador |
| image_url | string opcional | Arte da figurinha |
| metadata | JSON opcional | `source_url`, `sticker_type`, `laststicker_section`, etc. |

### `users` (colecionador)

Conta para sincronizar progresso entre web e app mobile. Separado de `admin_users`.

### `user_sticker_progress`

Estado por usuário e slot — fonte da verdade para **owned** / **duplicate_count** (API `/v1/me/...`).

| Campo | Tipo | Notas |
|-------|------|--------|
| user_id | FK | |
| sticker_slot_id | FK | |
| state | enum | `missing`, `owned` |
| duplicate_count | int default 0 | Pós-MVP |
| updated_at | timestamptz | |

**Constraint:** `UNIQUE(user_id, sticker_slot_id)`.

## Integridade

- `UNIQUE(edition_id, album_label)` garante correspondência 1:1 com o código oficial da edição.
- Foreign keys com `ON DELETE CASCADE` da edição para páginas/figurinhas em desenvolvimento; em produção avaliar soft-delete ao haver progresso de usuários.

## Seeds

- JSON versionado em `backend/data/*.json` — ver `backend/README.md`.

## Consultas típicas

1. Listar edições publicadas.
2. Carregar todos os slots de uma edição ordenados por `sort_index`.
3. Carregar páginas com `preview_image_url` para navegação por folha.

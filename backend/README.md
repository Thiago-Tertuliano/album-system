# Album — backend (catálogo Copa)

API REST em **Node.js 20+**, **TypeScript**, **Fastify**, **PostgreSQL**, **Drizzle ORM**.

Objetivo desta fase: **dados base fiéis ao checklist oficial** (`album_label` textual — `00`, `36x`, `FR01`, etc.), ordenação estável (`sort_index`), páginas agrupadas por **seção** do checklist, URLs de **capa** / figurinha / preview de página, e campos para **gasto** (`estimated_pack_price_cents`) e **PDF de faltantes** depois.

## Por Node (e não Go) neste momento

- Seeds/import em **JSON** ou **Markdown** snapshot sem toolchain pesado.
- Ecossistema maduro para PDF quando formos gerar lista de faltantes.

## Como rodar

1. Copie `.env.example` para `.env`.
2. Suba o Postgres:

```bash
docker compose up -d
```

Confira no `.env` se `DATABASE_URL` bate com o container: **`localhost:5433`** e final **`/album`** (igual ao `.env.example`). Porta **5432** costuma ser outro Postgres na máquina, sem o banco `album`.

**Erro `banco de dados "album" não existe`**

- **Volume antigo:** recrie dados do Postgres — `docker compose down -v`, depois `docker compose up -d` (apaga dados locais do volume).
- **Ou** crie o banco manualmente no container:  
  `docker exec album-postgres psql -U album -d postgres -c "CREATE DATABASE album;"`

**Docker: log `exec format error` no `docker-entrypoint.sh`**

Arquitetura da imagem incompatível com o host (comum em **Windows ARM** ou pull multi-arch incorreto). O `docker-compose.yml` fixa **`platform: linux/amd64`** (usa emulação no ARM quando necessário).

```powershell
docker compose down
docker compose pull
docker compose up -d --force-recreate
```

Se ainda falhar, no Docker Desktop verifique **Use Rosetta for x86/amd64 emulation on Apple Silicon** (Mac) ou atualize o Docker / WSL2 (Windows).

**Erro `ECONNREFUSED` na porta 5433**

- O Postgres **dentro do container** pode levar alguns segundos para abrir a porta; `npm run db:migrate` agora **tenta de novo** automaticamente por até ~30s.
- Confira se o container está de pé: `docker compose ps` e `docker logs album-postgres`.
- Outro programa usando **5433** no Windows impede o bind — troque a porta no `docker-compose.yml` e no `DATABASE_URL`.

Opcional: subir só quando estiver saudável — `docker compose up -d` e espere `healthy` em `docker compose ps`.

3. Dependências e migrações (mudanças de schema exigem **`docker compose down -v`** se já existia volume com schema antigo):

```bash
npm install
npm run db:migrate
npm run admin:create -- --email admin@local.test --password "troque-esta-senha"
npm run dev
```

4. **Popular catálogo** — escolha um:

| Modo | Comando |
|------|---------|
| Seed JSON manual | `npm run db:seed` ou `FORCE_SEED=1 npm run db:seed` |
| **Import automático** (snapshot LastSticker em Markdown) | Ver abaixo |

`FORCE_SEED=1` só afeta o slug definido no JSON de seed.

## Importação automática (checklist → Postgres)

Sites como LastSticker usam **Cloudflare**; não há `curl` confiável. O fluxo é:

1. Obter um **arquivo Markdown** da checklist (snapshot versionado ou export manual).
2. Rodar:

**Windows / npm:** evite `--slug` / `--name` no `npm run` (o npm pode tratá-los como config própria). Use **argumentos posicionais** após `--`:

```powershell
npm run import:laststicker-md -- ./data/snapshots/laststicker-panini-fifa-world-cup-2018.md fwc-2018-int "Copa do Mundo Rússia 2018 (LastSticker)" 2018 "Rússia"
```

Ordem: `<arquivo.md> <slug> "<nome>" [ano] [país-sede]`.

Ou chame o TSX direto (flags funcionam):

```bash
npx tsx src/import/cli.ts laststicker-md ./data/snapshots/laststicker-panini-fifa-world-cup-2018.md --slug fwc-2018-int --name "Copa 2018" --year 2018 --host "Rússia"
```

Documentação e limitações: [`data/snapshots/README.md`](data/snapshots/README.md).

O parser gera **uma página (`album_pages`) por seção** na ordem em que aparece no arquivo e preenche `metadata.source_url` quando há link na tabela.

## Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/health` | Saúde |
| POST | `/v1/auth/login` | Login administrativo |
| POST | `/v1/auth/register` | Cadastro colecionador |
| POST | `/v1/auth/collector/login` | Login colecionador |
| GET | `/v1/editions` | Edições `published` |
| GET | `/v1/editions/:slugOuId` | Detalhe |
| GET | `/v1/editions/:slugOuId/stickers?page=&limit=` | Figurinhas (`owned` com token colecionador) |
| PATCH | `/v1/me/editions/:slug/progress` | Atualizar coleção (auth colecionador) |
| GET | `/v1/me/editions/:slug/summary` | Resumo % tenho/faltam |
| GET | `/v1/editions/:slugOuId/pages` | Páginas do álbum |

Rotas em `/v1/admin/*` exigem token **admin**. Progresso do colecionador exige token **collector** (`role` no JWT).

Scripts úteis:

```bash
npm run collector:create -- --email user@test.com --password "senha12345"
npm run db:migrate-legacy-progress   # copia owned legado de sticker_slots
npm run db:set-covers                # capas MVP em /static/covers/
```

Mobile/APK: [`../frontend/web/MOBILE.md`](../frontend/web/MOBILE.md).

No admin web, a importação de uma nova edição pode iniciar automaticamente o job
`cache-sticker-images` para aquela edição. O mesmo job também pode ser disparado
manualmente por `POST /v1/admin/editions/:id/jobs/cache-sticker-images`.

## Formato do seed (`data/*.json`)

Ver [`data/example-edition.json`](data/example-edition.json).

- **`albumLabel`**: código oficial **único por edição** (texto).
- **`sortIndex`**: ordem no checklist (1…N).
- **`category`**, **`isSpecial`**, imagens: como antes.

## Próximos passos sugeridos

- `GET /v1/me/editions/:id/missing` + export/PDF.
- Offline sync no mobile.
- CDN dedicado para imagens em escala.

## Documentação Axellion

Índice geral: [`../docs/README.md`](../docs/README.md).

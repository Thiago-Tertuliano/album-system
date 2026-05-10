# Contratos de API — esboço (Album)

Versão inicial para alinhamento; **OpenAPI** deve ser gerada/adicionada no repositório da API quando o projeto for criado.

Convenções:

- Base URL: `https://api.<dominio>/v1`
- JSON UTF-8
- Erros: envelope `{ "error": { "code", "message", "details?" } }`

## Autenticação

| Método | Uso |
|--------|-----|
| `Bearer` token | Mobile e chamadas web SPA |

Fluxos exatos (signup/login/refresh) dependem do provedor escolhido — documentar na primeira ADR de auth.

---

## Edições

### `GET /editions`

Lista edições **publicadas**.

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "fwc-2002",
      "name": "Copa do Mundo 2002",
      "year": 2002,
      "host_country": "Coreia/Japão",
      "publisher": "Panini",
      "cover_image_url": "https://...",
      "sticker_total": 576,
      "status": "published",
      "estimated_pack_price_cents": null,
      "collector_notes": null
    }
  ]
}
```

### `GET /editions/{editionId}`

Metadados da edição + opcionalmente URLs de recurso.

---

## Slots do álbum

### `GET /editions/{editionId}/stickers`

Retorna figurinhas ordenadas por **`sort_index`**. O campo **`album_label`** é o código oficial (numérico ou alfanumérico, ex. `36x`, `FR01`). Paginação: `?page=&limit=` — backend `/v1/editions/:id/stickers`.

**Response 200**

```json
{
  "edition_id": "uuid",
  "page": 1,
  "limit": 500,
  "total": 682,
  "items": [
    {
      "id": "slot-uuid",
      "album_label": "1",
      "sort_index": 15,
      "page_number": 1,
      "category": "intro",
      "is_special": true,
      "display_name": "Logo oficial",
      "team_code": null,
      "team_name": null,
      "image_url": "https://..."
    }
  ]
}
```

### `GET /editions/{editionId}/pages`

Lista páginas do álbum com `preview_image_url` (folha inteira). Backend: `/v1/editions/:id/pages`.

---

## Progresso do usuário

### `GET /me/editions/{editionId}/progress`

Mapa ou lista compacta de estados.

**Response 200**

```json
{
  "editionId": "uuid",
  "ownedSlotIds": ["uuid", "uuid"],
  "duplicateCountBySlotId": {}
}
```

Alternativa mais verbosa: lista de `{ slotId, state, duplicateCount }` — escolher conforme tamanho payload e estratégia de cache.

### `PATCH /me/editions/{editionId}/progress`

Atualização em lote ou unitária.

**Body (exemplo lote)**

```json
{
  "updates": [
    { "slotId": "uuid", "state": "owned", "duplicateCount": 0 },
    { "slotId": "uuid", "state": "missing" }
  ]
}
```

**Response 200** — eco das alterações aplicadas + timestamps.

---

## Busca (RF-010)

### `GET /editions/{editionId}/slots/search?q=`

Retorna slots cujo `displayName` ou `teamLabel` corresponde ao termo.

---

## Health

### `GET /health`

`200` com `{ "status": "ok" }`.

---

## Versionamento

Prefixo `/v1`; mudanças incompatíveis exigem `/v2` ou negociação de versão.

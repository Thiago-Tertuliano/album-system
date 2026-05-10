# Snapshots de checklist (importação automática)

Arquivos **Markdown** gerados a partir da página de checklist (ex. LastSticker), para importação **offline** no Postgres via:

```powershell
# Preferir argumentos posicionais no npm (Windows) — ver backend/README.md
npm run import:laststicker-md -- ./data/snapshots/laststicker-panini-fifa-world-cup-2018.md fwc-2018-int "Copa do Mundo Rússia 2018 (LastSticker)" 2018 "Rússia"
```

Antes: copie `backend/.env.example` → `backend/.env` e suba o Postgres (`docker compose up -d`).

## Por que não é “curl direto”?

O LastSticker usa **Cloudflare**; requisições automáticas sem navegador costumam falhar. O fluxo recomendado:

1. Abrir a checklist no navegador autenticado como humano.
2. Salvar/exportar conteúdo em Markdown **ou** usar ferramenta que já converteu a página (como no snapshot versionado aqui).
3. Rodar o comando acima com `DATABASE_URL` configurado.

## Fonte / direitos

Os snapshots refletem **dados factuais de checklist** compilados por comunidades; conferir sempre com o **álbum físico oficial** da sua região (682 vs 670 vs atualizações). Avaliar aspectos de **marca/conteúdo** conforme `docs/compliance/` da Axellion.

## Arquivo incluído

| Arquivo | Conteúdo |
|---------|-----------|
| `laststicker-panini-fifa-world-cup-2018.md` | Checklist Panini Copa 2018 (variante internacional + extras na mesma lista LastSticker — validar no seu álbum). |

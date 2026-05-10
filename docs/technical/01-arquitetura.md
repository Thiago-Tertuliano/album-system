# Arquitetura — Album

## Contexto

Sistema composto por:

1. **Cliente web** — navegador; mesmo backend que mobile.
2. **Cliente mobile** — app nativo ou framework multiplataforma.
3. **API** — REST ou GraphQL (decisão em ADR); autenticação stateless (JWT ou sessão + cookie apenas web).
4. **Banco de dados** — relacional recomendado para integridade do catálogo e progresso versionado.
5. **Armazenamento de objetos** (opcional MVP) — CDN para imagens das figurinhas; pode iniciar com URLs estáticas.

## Diagrama lógico (texto)

```
┌─────────────┐     ┌─────────────┐
│  Web App    │     │ Mobile App  │
└──────┬──────┘     └──────┬──────┘
       │                  │
       └────────┬─────────┘
                │ HTTPS
                ▼
         ┌──────────────┐
         │     API      │
         │  (auth +     │
         │   progresso) │
         └──────┬───────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  PostgreSQL │   │ Object/CDN  │
│  (catálogo  │   │ (imagens)   │
│  + user +   │   │             │
│  progresso) │   └─────────────┘
└─────────────┘
```

## Fronteiras

| Componente | Responsabilidade |
|------------|------------------|
| Clientes | UI, cache local leve, chamadas API |
| API | Autorização, regras de consistência, serviços de domínio |
| DB | Persistência transacional |
| CDN/objetos | Entrega de assets de figurinha |

## Multitenancy

Um único deployment multiusuário; isolamento por `user_id` em todas as queries de progresso.

## Sincronização

- MVP: online-first; cliente envia PATCH de estado de slot; servidor é fonte da verdade após confirmação.
- Evolução: fila offline local + reconciliação (ver RNF-005).

## Segurança em alto nível

- TLS obrigatório.
- Tokens com escopo mínimo; refresh seguro.
- Validação de entrada em todos os endpoints mutáveis.

## Próximos documentos

- Detalhe de entidades: `02-modelo-de-dados.md`
- Endpoints: `03-contratos-api-esboco.md`
- Stack: `04-stack-e-repositorios.md`

## ADRs

Decisões estáveis (REST vs GraphQL, RN vs Flutter, provedor auth) devem ser registradas em `technical/adr/` quando fechadas.

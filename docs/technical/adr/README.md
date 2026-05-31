# ADR — Architecture Decision Records

Registrar aqui decisões com formato:

```markdown
# ADR-NNN: Título

## Status
Proposta | Aceita | Substituída por ADR-XXX

## Contexto
...

## Decisão
...

## Consequências
...
```

Numeração sequencial: `ADR-001`, `ADR-002`, ...

Registro:

| ADR | Título |
|-----|--------|
| [ADR-001](./ADR-001-backend-stack.md) | Backend Album — Node.js + TypeScript + Fastify + Drizzle |
| [ADR-002](./ADR-002-admin-hibrido-jwt.md) | Admin híbrido com JWT |
| [ADR-003](./ADR-003-mobile-capacitor.md) | Mobile Android via Capacitor |

Próximos candidatos:

1. Provedor de autenticação social (OAuth).
2. Formato API adicional (GraphQL) se necessário.
3. Provedor de autenticação.
4. Estratégia de hospedagem de imagens (CDN vs embutido).

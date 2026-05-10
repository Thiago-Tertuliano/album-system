# Stack e repositórios — Album

Documento orientativo; **decisão final** registra-se em ADR.

## Opções de frontend (web + mobile)

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **Flutter** (mobile + web) | Um código UI; bom para grades e animações | Web pode ser diferente do esperado para SEO/marketing |
| **React Native + React web** | Ecossistema grande; web madura | Dois targets com bridge nativa |
| **PWA + Capacitor** | Um codebase web instalável | UX nativa e performance variáveis |

Critérios Axellion sugeridos: velocidade de entrega MVP, perfil do time, necessidade de SEO na web pública.

## Backend

| Opção | Notas |
|-------|--------|
| Node (Nest/Fastify) | Bom para time JS fullstack |
| Go | Alto desempenho e binário simples — alinhado a cultura de serviços Axellion quando Go for padrão |
| .NET | Forte tipagem e tooling |

Persistência sugerida: **PostgreSQL**.

## Infraestrutura (referência)

- Containerização (Docker).
- CI: test + lint + build.
- Hospedagem API e DB conforme política Axellion (cloud definida pelo time técnico).

## Organização de repositórios

| Modelo | Quando usar |
|--------|----------------|
| **Monorepo** | Apps + API + pacotes compartilhados (tipos, SDK cliente) |
| **Multirepo** | Separação forte de squads ou ciclos de release diferentes |

Para MVP pequeno, **monorepo** costuma reduzir atrito de tipos compartilhados (`Edition`, `StickerSlot`, DTOs).

## Artefatos a versionar

- Código API e clients.
- Migrações SQL.
- Seeds JSON das edições (ou pipeline gerador).
- Assets ou referências a bucket/CDN (não commitar binários pesados sem LFS).

## Próximo passo

Criar primeira ADR: **Stack mobile/web + linguagem API**.

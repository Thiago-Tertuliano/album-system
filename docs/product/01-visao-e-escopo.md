# Visão e escopo — Album

## Visão do produto

Oferecer um **álbum digital de figurinhas** centrado em **Copas do Mundo**, com experiência **agradável e memorável** (ilustrações consistentes, progressão clara), acessível em **web e mobile**, permitindo que o colecionador **registre manualmente** o que já possui — com caminho de expansão para **todas as edições FIFA World Cup** no catálogo.

## Objetivos de negócio

| Objetivo | Métrica sugerida (pós-MVP) |
|----------|----------------------------|
| Validar engajamento com tema Copa | Retenção D7/D30, sessões por usuário |
| Portfólio Axellion produto próprio | Publicação lojas / web estável |
| Base escalável de edições | Tempo para incluir nova edição (processo + dados + arte) |

## Escopo confirmado (stakeholder)

| Decisão | Escolha |
|---------|---------|
| Canais | Web **e** mobile |
| Mecânica de coleção | Usuário **marca manualmente** figurinhas que tem |
| Domínio temático | Copa do Mundo FIFA — **todas as edições** como **visão de catálogo** |

## Premissas

1. **Catálogo completo de todas as Copas** é um esforço grande (dados + arte + revisão); o **MVP** deve fechar um **subconjunto de edições** acordado em sprint 0.
2. Sincronização entre web e mobile exige **identidade do usuário** (conta) e backend com estado persistido.
3. Experiência visual (“carinhas” bonitas) depende de **guia de arte** e pipeline de produção de assets — documentado em `design/`.

## MVP vs roadmap

### MVP (proposta)

| Incluir | Excluir / adiar |
|---------|-----------------|
| N edições fechadas no lançamento (ex.: 1–3 Copas — número a fixar em planning) | Troca P2P entre usuários |
| Álbum por edição: páginas/slots e estados manualmente | Compra de pacotes virtuais |
| Progresso (% e por página) | Integração com álbum físico (QR/OCR) |
| Conta + sync | Gamificação pesada |
| Busca simples por jogador/time dentro da edição | Marketplace |

### Roadmap (alto nível)

1. Ampliar edições até cobrir **todas** as Copas desejadas (releases incrementais).
2. Modo offline no mobile com sincronização.
3. Opcional: repetidas com contagem, lista de faltantes exportável.
4. Futuro: comunidade/trocas (avaliar compliance e moderação).

## Fora de escopo (explícito)

- Emissão ou venda de figurinhas físicas oficiais.
- Scan automático de coleção física sem definição de produto própria.

## Glossário

| Termo | Significado |
|-------|-------------|
| Edição | Um ano/evento de Copa (ex.: Copa 2002). |
| Slot | Posição de uma figurinha na grade/página do álbum. |
| Álbum (instância) | Visão do usuário sobre uma edição (estados por slot). |

## Referências internas

- Requisitos: `03-requisitos-funcionais.md`
- Riscos legais: `../compliance/01-propriedade-intelectual-e-marcas.md`

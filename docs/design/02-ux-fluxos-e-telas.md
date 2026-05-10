# UX — fluxos e telas (Album)

## Mapa de telas MVP

| # | Tela | Objetivo |
|---|------|----------|
| T1 | Splash / branding | Carga inicial |
| T2 | Login / Cadastro | RF-007 |
| T3 | Lista de edições | Escolher Copa (RF-001) |
| T4 | Detalhe da edição / Álbum | Navegar páginas e slots (RF-002–RF-005) |
| T5 | Busca dentro da edição | RF-010 (P1) |
| T6 | Configurações da conta | Logout RF-009 |
| T7 | Privacidade / Termos | Compliance |

## Fluxos (resumo)

### Abrir edição

`T3` → tap em card → `T4` com estado restaurado do servidor.

### Marcar figurinha

`T4` → tap slot → toggles `missing` ↔ `owned` → feedback imediato + PATCH em background.

### Busca (P1)

Ícone de lupa em `T4` → `T5` → resultado em lista → tap navega para página/slot correspondente com highlight temporário.

## Microcopy sugerido (pt-BR)

| Contexto | Texto |
|----------|--------|
| Slot não obtido | “Não tenho” |
| Slot obtido | “Tenho” |
| Progresso | “Faltam X de Y” |
| Erro de rede | “Não foi possível salvar. Tentar de novo?” |

## Grid vs páginas

- **Mobile:** priorizar **paginação horizontal** (swipe) ou lista vertical de páginas recolhíveis — decisão de UX prototipada em Figma.
- **Web:** teclado ←/→ para página seguinte; botões laterais.

## Acessibilidade (UI)

- Labels: “Figurinha Ronaldo, Brasil, não obtida”
- Foco visível em navegação por teclado (web)

## Artefatos externos

Wireframes e protótipos de alta fidelidade devem morar na ferramenta de design escolhida; esta pasta documenta **decisões** e mapa de telas.

Referência de diagramação futura: `../diagrams/README.md`.

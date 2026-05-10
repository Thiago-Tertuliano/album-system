# Backlog — épicos e histórias (Album)

Priorização **MoSCoW** sugerida para MVP. Ajustar após definir N editions no Sprint 0.

## Épicos

| Épico | Descrição |
|-------|-----------|
| E1 — Fundação | Repo, CI, ambientes, padrões de código |
| E2 — Identidade e dados | Modelo de dados, migrações, seed da primeira edição piloto |
| E3 — API core | Auth, CRUD de progresso por slot, listagem de edições |
| E4 — Web álbum | UI álbum, navegação páginas, marcação, progresso |
| E5 — Mobile álbum | Paridade funcional com web para MVP |
| E6 — Design system | Componentes, tokens, assets figurinha piloto |
| E7 — Conteúdo | Pipeline para novas edições e QA de dados |
| E8 — Compliance | Privacidade, termos, revisão IP/marcas |

## Histórias MVP (exemplos)

### E1 — Fundação

- Como **time**, quero **repositório e CI** para garantir build e testes em cada merge.
- Como **dev**, quero **variáveis de ambiente** documentadas para rodar API e apps localmente.

### E2 — Identidade e dados

- Como **sistema**, preciso de **IDs estáveis de slot** por edição para não invalidar progresso ao corrigir nomes.
- Como **produto**, quero **cadastrar uma edição piloto** com páginas e slots mínimos para demo.

### E3 — API core

- Como **usuário**, quero **registrar e logar** para salvar meu álbum.
- Como **usuário autenticado**, quero **recuperar meu progresso** ao abrir outro dispositivo.
- Como **usuário**, quero **marcar/desmarcar** figurinha e ver o servidor confirmar.

### E4 / E5 — Apps

- Como **usuário**, quero **ver lista de edições** disponíveis e escolher uma.
- Como **usuário**, quero **navegar o álbum** página a página (ou scroll paginado).
- Como **usuário**, quero ver **% completo** da edição.
- Como **usuário**, quero **buscar** um jogador dentro da edição **(P1)**.

### E6 — Design

- Como **design**, quero **guia de figurinha** aplicado a pelo menos 5 slots piloto.
- Como **usuário**, quero **feedback visual claro** entre tenho / não tenho.

### E8 — Compliance

- Como **empresa**, preciso de **Política de Privacidade** vinculada ao app/web.
- Como **DPO/time**, preciso checklist **LGPD** mínimo antes de produção.

## Sprint 0 — decisões pendentes (ações)

| Item | Responsável | Saída |
|------|-------------|--------|
| Quantidade de edições no MVP | Produto | N definido |
| Lista exata das edições MVP | Produto + Conteúdo | Lista fechada |
| Layout álbum: espelha coleção física histórica vs próprio | Produto | Decisão documentada |
| Stack final front mobile/web | Thiago (técnico) | ADR |
| Estratégia IP (oficial licenciado vs inspirado) | Jurídico + Produto | Documento em compliance |

## Pós-MVP (filtrar para roadmap)

- Repetidas com contagem (RF-012).
- Offline + sync.
- Export de faltantes.
- Temas visuais extras por edição.

# Requisitos funcionais — Album

Legenda de prioridade: **P0** = MVP bloqueante; **P1** = MVP desejável; **P2** = pós-MVP.

## Catálogo e álbum

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-001 | O sistema deve listar **edições** de Copa disponíveis para o usuário (liberadas por release). | P0 |
| RF-002 | O usuário deve poder **abrir uma edição** e visualizar o álbum em formato de **páginas ou grade** coerente com o modelo de dados da edição. | P0 |
| RF-003 | Cada posição de figurinha (**slot**) deve exibir identidade visual (arte ou placeholder) e metadados mínimos (ex.: nome quando aplicável). | P0 |
| RF-004 | O usuário deve poder alternar o estado de cada slot para **não tenho** / **tenho** por ação manual explícita. | P0 |
| RF-005 | O sistema deve calcular e exibir **progresso global** da edição (ex.: porcentagem e contagem X/Y). | P0 |
| RF-006 | O sistema deve exibir **progresso por página** quando o álbum for paginado. | P1 |

## Conta e sincronização

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-007 | O usuário deve poder **criar conta** e **autenticar-se** (método exato a definir na stack — email, OAuth, etc.). | P0 |
| RF-008 | O estado das figurinhas deve ser **persistido no servidor** e refletido em web e mobile para o mesmo usuário. | P0 |
| RF-009 | O usuário deve poder **encerrar sessão** com segurança. | P0 |

## Descoberta e filtros

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-010 | O usuário deve poder **buscar** jogador ou seleção **dentro da edição** atual (texto parcial). | P1 |
| RF-011 | O usuário deve poder filtrar slots por **só faltantes** ou **só obtidas** (quando aplicável ao modelo de UI). | P2 |

## Repetidas (opcional)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-012 | O usuário deve poder registrar **quantidade de repetidas** por slot (além de “tenho”). | P2 |
| RF-013 | Listagem ou export simples de **faltantes** para uso externo (clipboard/arquivo). | P2 |

## Administração de conteúdo (mínimo)

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-014 | Deve existir processo para **carregar/atualizar** edições (seed, CMS interno ou pipeline — decisão em ADR). | P0 |
| RF-015 | Versão de conteúdo por edição deve permitir **correções** sem perda do progresso do usuário (vinculação estável por IDs de slot). | P0 |

## Explicitamente não cobertos neste documento

- Pagamentos, loja in-app, P2P de trocas.
- OCR/QR para leitura de álbum físico.

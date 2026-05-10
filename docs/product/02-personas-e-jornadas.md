# Personas e jornadas — Album

## Personas

### P1 — Colecionador casual

- **Motivação:** acompanhar o que falta para “completar” o álbum digital da Copa que está colecionando (ou colecionou).
- **Comportamento:** uso esporádico no mobile; quer marcação rápida e progresso visível.
- **Frustrações:** apps lentos, navegação confusa entre páginas, falta de busca.

### P2 — Nostálgico / arquivo pessoal

- **Motivação:** registrar várias edições ao longo do tempo; comparar elencos e relembrar torneios.
- **Comportamento:** pode usar mais web em telas grandes; exploracao por edição.
- **Frustrações:** inconsistência visual entre edições; dados incorretos (nome errado, jogador no time errado).

### P3 — Organizador de repetidas (fase pós-MVP)

- **Motivação:** saber quantas repetidas tem para facilitar trocas na vida real.
- **Nota:** repetidas com contagem pode entrar cedo se custo baixo — ver backlog.

## Jornadas principais

### J1 — Primeiro acesso (onboarding)

1. Usuário instala app ou abre web.
2. Cria conta ou autentica.
3. Escolhe **uma edição** disponível no catálogo.
4. Vê o álbum vazio (ou tutorial rápido de “toque para marcar”).
5. Marca algumas figurinhas manualmente.
6. Vê barra de progresso atualizar.

**Critério de sucesso:** menos de 2 minutos até primeira figurinha marcada.

### J2 — Marcação em massa (sessão focada)

1. Abre edição e página inicial ou última página visitada.
2. Percorre páginas; alterna estado das figurinhas (tenho / não tenho).
3. Usa busca para localizar jogador específico (RF).
4. Sai; estado persiste em outro dispositivo após sync.

### J3 — Troca de dispositivo

1. Usuário já tem conta.
2. Faz login no segundo canal (web ou mobile).
3. Mesmo progresso aparece após carregar dados.

## Pontos de atenção UX

- **Feedback imediato** ao tocar/clicar em figurinha (estado + microcopy).
- **Indicador de sync** quando offline ou falha de rede (fase posterior ao MVP mínimo se offline não estiver no escopo).
- **Acessibilidade:** contraste, tamanho de toque, leitores de tela nas grades (ver RNF).

## Referências

- Telas detalhadas: `../design/02-ux-fluxos-e-telas.md`

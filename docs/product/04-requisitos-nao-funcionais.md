# Requisitos não funcionais — Album

## Performance

| ID | Requisito |
|----|-----------|
| RNF-001 | Carregamento inicial da edição ativa: meta **< 3 s** em rede 4G média em dispositivo mid-tier (ajustar após benchmark). |
| RNF-002 | Rolagem/paginação do álbum deve manter **60 FPS** onde a plataforma permitir; evitar jank em grades grandes (virtualização). |
| RNF-003 | Operações de marcação de slot devem persistir com latência percebida **< 500 ms** em condições normais (otimistic UI recomendada). |

## Disponibilidade e consistência

| ID | Requisito |
|----|-----------|
| RNF-004 | API deve expor **healthcheck** para monitoramento. |
| RNF-005 | Conflitos de escrita raros (dois dispositivos): estratégia **last-write-wins** ou merge por campo — documentar na ADR de sync. |

## Segança

| ID | Requisito |
|----|-----------|
| RNF-006 | Autenticação com tokens com expiração e renovação segura; armazenamento seguro no mobile (keychain/keystore). |
| RNF-007 | Transporte **HTTPS** obrigatório; headers de segurança padrão na API. |
| RNF-008 | Dados de conta: hashing de senha se senha local; rate limit em login. |

## Privacidade e LGPD (Brasil)

| ID | Requisito |
|----|-----------|
| RNF-009 | Política de privacidade e bases legais para tratamento de dados pessoais (conta, uso). |
| RNF-010 | Fluxo para **exclusão de conta** e exportação de dados sob solicitação (definir prazo interno). |
| RNF-011 | Minimização: não coletar dados desnecessários para o álbum. |

## Acessibilidade

| ID | Requisito |
|----|-----------|
| RNF-012 | Contraste adequado (WCAG 2.1 **AA** como alvo nas telas principais). |
| RNF-013 | Áreas de toque mínimas recomendadas pela plataforma; suporte a **VoiceOver / TalkBack** em elementos interativos da grade (labels significativos). |
| RNF-014 | Tipografia escalável conforme configurações do sistema onde aplicável. |

## Observabilidade

| ID | Requisito |
|----|-----------|
| RNF-015 | Logs estruturados na API (sem PII sensível); correlação por `request_id`. |
| RNF-016 | Métricas de negócio mínimas: cadastros, edições ativas, marcações por dia (definir pipeline). |

## Internacionalização

| ID | Requisito |
|----|-----------|
| RNF-017 | UI em **pt-BR** no MVP; arquitetura de strings preparada para novos idiomas se produto internacionalizar. |

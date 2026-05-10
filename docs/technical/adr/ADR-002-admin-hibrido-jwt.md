# ADR-002: Admin hibrido com JWT

## Status

Aceita.

## Contexto

O produto ja possui seed e importacao por CLI para carregar edicoes, paginas e figurinhas. Esse fluxo e util para desenvolvimento, mas cria dependencia tecnica para operacoes simples de conteudo. A documentacao tambem deixa RF-014 aberto entre seed, CMS interno ou pipeline.

O backend ainda nao possui autenticacao, usuarios ou rotas administrativas. Como o admin altera catalogo publico, ele precisa de protecao antes de ser usado fora de ambiente local.

## Decisao

Implementar um painel admin hibrido:

- importacao guiada de snapshot/checklist Markdown;
- edicao manual para correcoes pontuais;
- rotas administrativas separadas em `/v1/admin`;
- login de administradores com senha e JWT;
- tabela propria `admin_users` para credenciais administrativas.

O fluxo publico de catalogo permanece em `/v1/editions` e segue listando apenas edicoes publicadas.

## Consequencias

- O time ganha um caminho operacional para adicionar novos albuns sem rodar scripts manualmente.
- A regra de importacao existente deve ser reutilizada para evitar divergencia entre CLI e API.
- O JWT resolve o primeiro nivel de protecao, mas ainda exige configuracao segura de `JWT_SECRET`, CORS e criacao controlada do primeiro admin.
- O modelo de progresso por usuario continua como decisao futura e nao deve ser misturado com a credencial administrativa.

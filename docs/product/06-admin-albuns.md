# Admin de Albuns

## Objetivo

Permitir que a Axellion cadastre, revise e publique novas edicoes de albuns sem depender apenas de seed local ou CLI. O painel admin deve acelerar a operacao de conteudo, mantendo os identificadores de catalogo estaveis para nao comprometer progresso de colecionadores em etapas futuras.

## Escopo do MVP

O MVP sera hibrido:

- Importacao guiada de checklist/snapshot Markdown para criar paginas e figurinhas em lote.
- Edicao manual de metadados da edicao, paginas e figurinhas para correcoes pontuais.
- Estados editoriais `draft`, `published` e `archived`.
- Autenticacao de administradores por login e JWT.

## Fluxo Operacional

1. Admin acessa `/admin/login`.
2. Admin cria uma edicao em `draft` com slug, nome, ano, pais-sede, editora e capa.
3. Admin cola um snapshot/checklist Markdown compatível com o parser LastSticker.
4. Backend valida, importa em transacao, gera paginas por secao e recalcula `sticker_total`.
5. Admin revisa e corrige paginas ou figurinhas.
6. Admin publica a edicao, tornando-a visivel em `/v1/editions`.

## Regras de Produto

- `slug` deve ser unico e tratado como identificador publico estavel.
- Importacao de catalogo substitui paginas e figurinhas da edicao selecionada.
- Correcoes manuais devem atualizar `updated_at`.
- Edicoes em `draft` e `archived` nao aparecem no app publico.
- Conteudo importado deve preservar rastreabilidade em `collector_notes` e `metadata`.

## Fora do Escopo

- Cadastro publico de usuarios colecionadores.
- Progresso por usuario e sincronizacao multi-dispositivo.
- Upload de arquivos binarios de imagem.
- Workflow juridico de licenciamento de marcas.
- Trocas P2P, marketplace ou gamificacao pesada.

## Cuidados

- O estado atual de colecao ainda vive em `sticker_slots` e deve ser separado em uma tabela de progresso por usuario antes de qualquer lancamento multiusuario.
- O admin nao deve ser exposto sem `JWT_SECRET` forte e usuario inicial criado por ambiente controlado.
- O uso de catalogos inspirados em albuns reais deve respeitar as diretrizes de propriedade intelectual ja documentadas em `docs/compliance`.

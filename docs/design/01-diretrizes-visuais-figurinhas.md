# Diretrizes visuais — figurinhas e álbum

## Princípios

1. **Legibilidade em miniatura** — O rosto e silhueta devem ser reconhecíveis em thumbnail (~48–72 px de lado na grade).
2. **Família visual única** — Mesmo vocabulário de traço, sombra e cor entre todas as figurinhas de todas as edições (variações sazonais só na moldura/fundo).
3. **Calor humano** — Expressões discretas (determinação, leve sorriso) sem caricatura agressiva.
4. **Acessibilidade** — Contraste entre estado tenho/não tenho não pode depender só de cor.

## Especificações da arte da figurinha

| Aspecto | Diretriz |
|---------|-----------|
| Proporção | Canvas fixo (ex.: 3:4 retrato); **safe zone** central para rosto |
| Traço | Vetorial; espessura normalizada (tokens exportados do design system) |
| Paleta | Primária neutra + acento por **edição** (ano/tema); evitar ruído no fundo do retrato |
| Fundo | Gradiente suave ou padrão geométrico baixo contraste por página/seleção |
| Moldura | Opcional estilo “álbum clássico” com micro emboss; estado **tenho** pode ter bisel dourado sutil |
| Número / código | Tipografia tabular; canto inferior consistente |

## Estados na UI

| Estado | Tratamento visual |
|--------|-------------------|
| Não tenho | Desaturação ~40–60%, ícone opcional de “vazio” |
| Tenho | Saturação plena, moldura completa |
| Repetida (futuro) | Badge numérico discreto |

## Placeholders

Quando não houver arte final:

- Silhueta + `#` da camisa + `displayName`
- Ou ícone genérico por `kind` (`badge`, `stadium`)

## Motion (opcional)

- Micro-scale ao toque (100 ms).
- Confete leve ao completar página (toggle em configurações).

## Entrega de assets

| Formato | Uso |
|---------|-----|
| SVG ou PNG @1x/@2x/@3x | Conforme pipeline do app |
| Nomenclatura | `{edition_slug}_{slot_id}` imutável |

## Revisão de qualidade

Checklist antes de publicar slot:

- [ ] Encaixa na safe zone
- [ ] Nome confere com dados do seed
- [ ] Estados tenho/não tenho testados na grade real

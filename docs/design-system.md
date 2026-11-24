# Design system "Spectrum"

Identidade visual do Melodycam. Os tokens vivem em [`src/tokens.css`](../src/tokens.css) e os componentes em [`src/style.css`](../src/style.css).

## Ideia central: luz é som

As sete notas viram sete cores do espectro. A cor **acompanha a nota em toda a interface**: tecla do teclado, faixa sobre a câmera, mão que está tocando, cartão da nota atual, fita de notas das músicas. Quem toca aprende a associar cor, nome e som sem ler partitura.

| Nota | Token | Cor |
| --- | --- | --- |
| Dó | `--note-do` | `#ff6b8a` |
| Ré | `--note-re` | `#ff9a5c` |
| Mi | `--note-mi` | `#ffd166` |
| Fá | `--note-fa` | `#8ef0a0` |
| Sol | `--note-sol` | `#5fe3e0` |
| Lá | `--note-la` | `#7aa2ff` |
| Si | `--note-si` | `#b68cff` |

Sustenidos (♯) usam a mistura das duas notas vizinhas (`noteColor()` em [`src/notes.ts`](../src/notes.ts)).

## Logo

A marca é uma **lente de câmera** (anel violeta) com **cinco barras** nas cores de Dó a Sol. As barras são, ao mesmo tempo, os cinco dedos de uma mão, um equalizador e as primeiras notas da escala. O nome se escreve em minúsculas, com "cam" em gradiente aurora.

| Arquivo | Uso |
| --- | --- |
| [`public/brand/logo-mark.svg`](../public/brand/logo-mark.svg) | Marca isolada, fundo transparente |
| [`public/brand/logo.svg`](../public/brand/logo.svg) | Marca + nome, com fundo de tinta próprio |
| [`public/favicon.svg`](../public/favicon.svg) | Ícone da aba |

Regras: área livre mínima de metade do diâmetro do anel; tamanho mínimo de 16 px (marca) e 96 px (com nome); não recolorir as barras nem trocar a ordem das cores; em fundo claro, use `logo.svg` (com fundo de tinta) ou a marca sobre um bloco `--ink-1`.

## Cores de base

| Papel | Token | Valor |
| --- | --- | --- |
| Fundo profundo | `--ink-0` | `#07060d` |
| Fundo | `--ink-1` | `#0d0b18` |
| Superfície | `--ink-2` | `#151228` |
| Superfície elevada | `--ink-3` | `#1f1b38` |
| Texto | `--fg` / `--fg-dim` / `--fg-mute` | `#f5f2ff` / `#b9b2d3` / `#837c9f` |
| Marca | `--violet`, `--lilac` | `#8b7cff`, `#d2a6ff` |
| Aurora (gradiente) | `--aurora` | violeta → ciano → âmbar |
| Mão que escolhe | `--hand-select` | `#ffd166` |
| Mão que toca | `--hand-play` | `#5fe3e0` |
| Ao vivo / gravando | `--live` / `--record` | `#8ef0a0` / `#ff7a93` |

O tema é escuro por natureza: a câmera é a imagem e a interface é luz sobre ela. Texto sobre superfícies mantém contraste mínimo de 4,5:1; sobre cor de nota, use `--ink-0`.

## Tipografia

- **Unbounded** (`--font-display`): nome, títulos, símbolos de acorde e nomes de nota. Sempre com tracking negativo (`-0.02em` a `-0.05em`).
- **Manrope** (`--font-ui`): todo o restante. Rótulos em maiúsculas usam 10 px, peso 800 e `letter-spacing: .18em`.

## Espaço, forma e movimento

- Escala de espaço de 4 px (`--s-1` a `--s-6`).
- Raios: `--r-sm` 8, `--r-md` 12, `--r-lg` 18, `--r-xl` 26.
- Painéis são **vidro**: `--glass` + `backdrop-filter` + borda `--line`. Nada opaco cobre a câmera.
- Movimento curto (`--t-fast` 140 ms, `--t-med` 260 ms, `--ease`). Brilho que "respira" só quando há som. `prefers-reduced-motion` desliga tudo.

## Componentes

| Componente | Classe | Notas |
| --- | --- | --- |
| Botão primário | `.btn.primary` | Gradiente aurora, texto `--ink-0`. Uma ação principal por tela |
| Botão secundário | `.btn.ghost` | Vidro com borda |
| Segmentado | `.segmented` | Modos e oitavas; o ativo vira aurora |
| Cartão da nota | `.now` | Borda e brilho na cor da nota; `.sounding` pulsa |
| Tecla | `.key` | Base colorida pela nota; `.lit` acende, `.next` pulsa como guia |
| Fita de notas | `.ribbon` | Próximas notas da música; a atual cresce |
| Acorde | `.chord-button` | Faixa lateral na cor da raiz, número de dedos à esquerda |
| Medidor | `.meter` | Pinça ao vivo, cor `--hand-play` |
| Chip | `.chip` | Estado discreto (fps, motor) |

## Sobre as mãos na câmera

Cada mão tem seu papel pela cor: **âmbar escolhe** (número de dedos no pulso) e **ciano toca** (anel na pinça). No modo Notas, a mão que toca assume a cor da nota sob ela e as oito faixas aparecem sobre a imagem, coloridas pelo espectro.

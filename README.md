# Melodycam

Projeto open source para criar e tocar melodias com gestos diante da câmera.

> **Estado:** protótipo em desenvolvimento. **Melodycam** é o nome definido para o projeto.

## Visão

Transformar movimentos das mãos em notas e acordes, com resposta sonora imediata e feedback visual. A interface funciona como um instrumento em tela cheia: câmera ao fundo, mapa de gestos, osciloscópio e controles de som em painéis translúcidos. Deve funcionar sem conta e sem enviar o vídeo da câmera a um servidor.

## English

**Melodycam** lets you play ambient chords and melodies in the air with your hands, right in your browser. Show your hands to the camera, pinch thumb and index to make a sound, and move your hand up or down to change chords, like reading a score. It works with one hand, on desktop and phone, in English and Portuguese.

- **Chords (ambient):** progressions like Creep, Careless Whisper style and a full C major field, with dark ambient, synthwave and dreamscape pads. Chords glide into each other with no re-attack.
- **Notes:** C D E F G A B C across the screen, sideways or up and down.
- **Songs:** a library of public-domain and original melodies, played one pinch per note or as a score.
- **Private by design:** video is processed locally and never stored or sent. See [PRIVACY.md](PRIVACY.md).
- **Open source:** [MIT](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

```sh
npm install
npm run dev
```

## Documentação

- [Design system "Spectrum"](docs/design-system.md): logo, cores por nota, tipografia e componentes.
- [Especificação do produto](docs/product-spec.md): escopo, interface, requisitos, critérios de aceite e fases.
- [Arquitetura proposta](docs/architecture.md): tecnologias, módulos, dados e decisões técnicas.
- [Processo de desenvolvimento](docs/development.md): fluxo orientado por especificações e contribuição open source.
- [Fluxo Git](docs/git-workflow.md): branches, integração linear e tags de versão.

## Executar localmente

Requer Node.js e npm. No diretório do projeto:

```sh
npm install
npm run dev
```

Abra o endereço `http://127.0.0.1:5173/` mostrado pelo terminal. O comando de desenvolvimento copia os arquivos WebAssembly do MediaPipe e baixa o modelo de mãos uma única vez para `public/models`, então a câmera não depende de rede na hora de ligar. O vídeo é processado no navegador e nunca é enviado a servidor. Para gerar a versão de produção, use `npm run build`.

Para testar a detecção sem webcam, coloque um vídeo em `public/` e abra `/?demo=/seu-video.mp4` (somente em desenvolvimento). Se o vídeo já for uma gravação espelhada de selfie, use "Trocar mãos".

Três modos:

- **Acordes (ambient):** o modo principal. Escolha uma progressão (Creep, Campo de Dó com Dó Ré Mi Fá Sol Lá Si Dó, Dreamscape, Neon, Careless Whisper e I Want to Know What Love Is (inspiradas na harmonia das músicas), Sombra, Névoa, Abismo, Eco e Luz). Progressões de até 5 acordes usam os dedos da mão esquerda; o Campo de Dó, com 8 acordes, usa faixas na tela como o modo Notas. A mão esquerda mostra 1 a 4 dedos para escolher o acorde, e a direita segura a pinça para o pad dark ambient soar. Trocar de dedos muda o acorde ao vivo, com as vozes deslizando para o novo acorde sem reataque (o controle Transição suave ajusta a duração), e subir a mão direita abre o brilho do som. Novas progressões entram em `src/notes.ts`.
- **Notas:** Dó Ré Mi Fá Sol Lá Si Dó. A tela se divide em 8 faixas coloridas; deslize a mão direita e junte os dedos. A mão esquerda com 1, 2 ou 3 dedos troca a oitava.
- **Músicas:** biblioteca com onze melodias, incluindo três originais (Aurora, Maré e Neblina) feitas para combinar com os pads (Escala de Dó, Brilha Brilha Estrelinha, Ode à Alegria, Parabéns pra Você, Jingle Bells, Frère Jacques, Ao Luar e Para Elisa). Cada pinça toca a próxima nota, e "Ouvir" toca a melodia inteira. Novas melodias entram em `src/songs.ts`.

Sem câmera, tudo funciona pelo teclado em tela, pelas teclas A–K ou pela barra de espaço. Há dez timbres, incluindo Abismo e Névoa (dark ambient), Synthwave (supersaw neon) e Dreamscape (pad etéreo com brilho de oitava acima), eco, reverberação, osciloscópio, gravação e projetos em JSON.

## Próximo marco

Validar o instrumento com pessoas usuárias, especialmente confiabilidade dos gestos, resposta do modo Melodia e clareza da interface. A biblioteca de peças e exportação de áudio ficam para uma fase seguinte. Os critérios verificáveis estão na especificação.

## Página sobre o projeto

Clicar na logo abre a página de apresentação (`#/sobre`), com a ideia e a seção de engine. Funciona também em celular.

## Privacidade e licenças

O vídeo da câmera é processado no seu dispositivo e nunca é gravado nem enviado. Um aviso de privacidade (LGPD) aparece antes da primeira ativação. Detalhes em [PRIVACY.md](PRIVACY.md). Licença [MIT](LICENSE); veja também [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) e [SECURITY.md](SECURITY.md).

## Idiomas

O site funciona em **português (BR)** e **inglês**. O idioma inicial segue o navegador e a escolha (botão PT/EN) fica salva. Os textos ficam em `src/i18n.tsx`; para adicionar um idioma, acrescente uma coluna ao dicionário. Em inglês as notas aparecem como C D E F G A B.

## Publicar no GitHub Pages

O workflow `.github/workflows/pages.yml` publica o site a cada push na `main`:

1. No repositório, abra **Settings > Pages** e escolha **Source: GitHub Actions** (uma única vez).
2. Faça merge na `main`. O workflow roda `npm run build` com `BASE_PATH=/<nome-do-repositório>/` e publica a pasta `dist`.
3. O site fica em `https://<usuário>.github.io/<repositório>/` (HTTPS, que a câmera exige). A navegação usa `#/`, então não precisa de configuração extra de rotas.

Para conferir localmente como no Pages:

```sh
$env:BASE_PATH="/melodycam/"; npm run build; npx vite preview
```

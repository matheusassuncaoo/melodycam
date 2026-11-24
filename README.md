# Melodycam

Projeto open source para criar e tocar melodias com gestos diante da câmera.

> **Estado:** protótipo em desenvolvimento. **Melodycam** é o nome definido para o projeto.

## Visão

Transformar movimentos das mãos em notas e acordes, com resposta sonora imediata e feedback visual. A interface funciona como um instrumento em tela cheia: câmera ao fundo, mapa de gestos, osciloscópio e controles de som em painéis translúcidos. Deve funcionar sem conta e sem enviar o vídeo da câmera a um servidor.

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

- **Acordes (ambient):** o modo principal. Escolha uma progressão (Creep: G B C Cm, Sombra, Névoa, Abismo, Eco, Luz). A mão esquerda mostra 1 a 4 dedos para escolher o acorde, e a direita segura a pinça para o pad dark ambient soar. Trocar de dedos muda o acorde ao vivo, e subir a mão direita abre o brilho do som. Novas progressões entram em `src/notes.ts`.
- **Notas:** Dó Ré Mi Fá Sol Lá Si Dó. A tela se divide em 8 faixas coloridas; deslize a mão direita e junte os dedos. A mão esquerda com 1, 2 ou 3 dedos troca a oitava.
- **Músicas:** biblioteca com oito melodias (Escala de Dó, Brilha Brilha Estrelinha, Ode à Alegria, Parabéns pra Você, Jingle Bells, Frère Jacques, Ao Luar e Para Elisa). Cada pinça toca a próxima nota, e "Ouvir" toca a melodia inteira. Novas melodias entram em `src/songs.ts`.

Sem câmera, tudo funciona pelo teclado em tela, pelas teclas A–K ou pela barra de espaço. Há oito timbres (Abismo e Névoa para pads ambient, além de Piano, Sino, Glow, Haze, Drift e Void), eco, reverberação, osciloscópio, gravação e projetos em JSON.

## Próximo marco

Validar o instrumento com pessoas usuárias, especialmente confiabilidade dos gestos, resposta do modo Melodia e clareza da interface. A biblioteca de peças e exportação de áudio ficam para uma fase seguinte. Os critérios verificáveis estão na especificação.

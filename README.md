# Melodycam

Projeto open source para criar e tocar melodias com gestos diante da câmera.

> **Estado:** protótipo em desenvolvimento. **Melodycam** é o nome definido para o projeto.

## Visão

Transformar movimentos das mãos em notas e acordes, com resposta sonora imediata e feedback visual. A interface funciona como um instrumento em tela cheia: câmera ao fundo, mapa de gestos, osciloscópio e controles de som em painéis translúcidos. Deve funcionar sem conta e sem enviar o vídeo da câmera a um servidor.

## Documentação

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

Abra o endereço `http://127.0.0.1:5173/` mostrado pelo terminal. O comando de desenvolvimento copia automaticamente os arquivos WebAssembly da versão instalada do MediaPipe; o modelo de mãos é baixado do servidor público do Google quando a câmera é ativada. O vídeo é processado no navegador e não é enviado a esse servidor. Para gerar a versão de produção, use `npm run build`.

O protótipo atual permite escolher acordes com uma mão e tocar com a outra. No modo Melodia, a altura da mão que toca escolhe notas do acorde. Há quatro presets de sintetizador, eco, reverberação, osciloscópio e controles manuais. Também é possível gravar uma sequência e salvar/abrir um projeto JSON. O rastreamento da câmera usa MediaPipe no navegador.

## Próximo marco

Validar o instrumento com pessoas usuárias, especialmente confiabilidade dos gestos, resposta do modo Melodia e clareza da interface. A biblioteca de peças e exportação de áudio ficam para uma fase seguinte. Os critérios verificáveis estão na especificação.

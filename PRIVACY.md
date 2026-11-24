# Privacidade / Privacy

[Português](#português) · [English](#english)

## Português

**Resumo:** o Melodycam não grava, não envia e não armazena o seu vídeo nem dados pessoais.

### O que o app faz com a câmera
- Pede acesso à câmera **somente depois do seu aceite** (aviso exibido antes da primeira ativação).
- Processa cada quadro de vídeo **no seu dispositivo**, com o modelo MediaPipe Hand Landmarker rodando em WebAssembly/WebGL no navegador.
- Descarta o quadro logo após a leitura. Nenhuma imagem, áudio ou coordenada das mãos é gravada ou transmitida.
- Libera a câmera quando você a desliga ou fecha a página.

### Dados que ficam no seu navegador
Apenas no armazenamento local (`localStorage`), sem sair do dispositivo:

| Chave | Conteúdo | Para quê |
| --- | --- | --- |
| `melodycam-lang` | `pt` ou `en` | lembrar o idioma |
| `melodycam-pinch` | dois números da calibração da pinça | lembrar a calibração |
| `melodycam-consent` | `1` | lembrar que você aceitou o aviso |

Para apagar, limpe os dados do site nas configurações do navegador.

### O que não fazemos
- Sem cadastro, contas, cookies, análise de uso, publicidade ou rastreadores.
- Sem requisições a serviços de terceiros durante o uso: as fontes e o modelo de mãos são servidos pelo próprio site.
  - Exceção técnica: se o arquivo do modelo local estiver ausente (build incompleto), o app tenta baixá-lo de `storage.googleapis.com`, o que expõe o seu IP ao Google. Os builds oficiais incluem o modelo.
- Projetos salvos (`.json`) são baixados para o seu computador e não passam por servidor.

### Hospedagem
O site pode ser publicado no GitHub Pages, que mantém registros de acesso próprios conforme a [política de privacidade do GitHub](https://docs.github.com/pt/site-policy/privacy-policies/github-general-privacy-statement). O projeto em si não recebe esses registros.

### LGPD (Lei nº 13.709/2018)
A base para o acesso à câmera é o **consentimento** (art. 7º, I), dado de forma específica antes da ativação e revogável a qualquer momento ao desligar a câmera e limpar os dados do site. Como nenhum dado pessoal é coletado ou armazenado pelo projeto, não há dados a acessar, corrigir, excluir ou portar. Este texto descreve o funcionamento técnico do software e não substitui aconselhamento jurídico.

### Contato
Dúvidas ou relatos de problemas: abra uma issue em <https://github.com/matheusassuncaoo/melodycam/issues>.

## English

**Summary:** Melodycam does not record, send or store your video or any personal data.

### What the app does with the camera
- Asks for camera access **only after you accept** the notice shown before the first activation.
- Processes every video frame **on your device**, with the MediaPipe Hand Landmarker model running on WebAssembly/WebGL in your browser.
- Discards each frame right after reading it. No image, audio or hand coordinate is recorded or transmitted.
- Releases the camera when you turn it off or close the page.

### Data kept in your browser
Only in local storage (`localStorage`), never leaving your device: `melodycam-lang` (`pt` or `en`), `melodycam-pinch` (two calibration numbers) and `melodycam-consent` (`1`, so the notice is not shown again). Clear the site data in your browser settings to erase them.

### What we do not do
- No sign-up, accounts, cookies, analytics, ads or trackers.
- No requests to third-party services while you use it: fonts and the hand model are served by the site itself.
  - Technical exception: if the bundled model file is missing (an incomplete build), the app falls back to downloading it from `storage.googleapis.com`, which exposes your IP to Google. Official builds include the model.
- Saved projects (`.json`) are downloaded to your computer and never pass through a server.

### Hosting
The site may be published on GitHub Pages, which keeps its own access logs under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The project itself does not receive those logs.

### Legal basis
Camera access is based on your **consent**, given specifically before activation and revocable at any time by turning the camera off and clearing site data (this follows the structure of Brazil's LGPD and is also consistent with GDPR principles of data minimization and local processing). Because no personal data is collected or stored by the project, there is nothing to access, correct, delete or port. This text describes how the software works and is not legal advice.

### Contact
Questions or problems: open an issue at <https://github.com/matheusassuncaoo/melodycam/issues>.

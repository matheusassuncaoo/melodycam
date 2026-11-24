# Security policy / Política de segurança

## Reporting a vulnerability / Como reportar

Please **do not** open a public issue for security problems. Use GitHub's private
vulnerability reporting: **Security > Report a vulnerability** on
<https://github.com/matheusassuncaoo/melodycam/security/advisories/new>.

Não abra uma issue pública para problemas de segurança. Use o relato privado de
vulnerabilidades do GitHub (aba **Security > Report a vulnerability**).

Include the affected version or commit, the steps to reproduce and the impact.
Inclua a versão ou o commit afetado, os passos para reproduzir e o impacto.

## Scope / Escopo

Melodycam is a static web app that runs entirely in the browser. It has no server,
accounts or database. Relevant areas: handling of the camera stream, loading of
project files (`.json`), and third-party dependencies.

O Melodycam é um app estático que roda inteiro no navegador, sem servidor, contas
ou banco de dados. Áreas relevantes: o fluxo da câmera, a abertura de arquivos de
projeto (`.json`) e as dependências de terceiros.

## Supported versions / Versões suportadas

Only the latest commit on `main` is supported. / Apenas o último commit da `main`.

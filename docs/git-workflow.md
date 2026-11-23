# Fluxo Git do Melodycam

Este projeto adota uma variação simples do [OneFlow](https://www.endoflineblog.com/oneflow-a-git-branching-model-and-workflow), inspirada no fluxo apresentado para o Datasus. O objetivo é manter o histórico linear e saber qual commit foi validado e publicado. Como o Melodycam é um projeto open source pequeno, não haverá branches permanentes de release ou hotfix neste início.

## Branches

| Branch | Uso |
| --- | --- |
| `main` | Última versão publicada. Só recebe commits já validados em `develop`. |
| `develop` | Integração das funcionalidades e base da validação contínua. |
| `feat/<nome-curto>` | Trabalho isolado de uma funcionalidade, criado a partir de `develop`. |

Correções seguem `fix/<nome-curto>`. Exemplos: `feat/ambient-presets` e `fix/camera-loading`.

## Integração

1. Abra uma issue com problema, comportamento esperado e critério de aceite.
2. Crie uma branch de `develop` e implemente a mudança com commits pequenos.
3. Atualize sua branch sobre `develop` com `git fetch origin` e `git rebase origin/develop`.
4. Abra um pull request para `develop`. O CI deve executar `npm ci` e `npm run build`. Descreva o teste manual quando houver câmera ou áudio.
5. Integre sem commit de merge. Use rebase merge no GitHub ou fast-forward no Git após o rebase. Mantenha `develop` protegido contra push direto quando houver colaboradores.
6. Para publicar, valide um commit de `develop`, avance `main` por fast-forward até esse commit e crie a tag de produção nele.

Não faça rebase em `main` ou `develop`. Em branch de feature compartilhada, coordene o rebase com os demais colaboradores. Se for necessário atualizar a branch remota após rebase, use `--force-with-lease` somente nela.

## Tags

Tags são criadas apenas para marcos reais de validação ou publicação. Não criar tags para cada commit local.

| Uso | Formato | Exemplo |
| --- | --- | --- |
| Teste de feature | `dev-feat-<nome>-<n>` | `dev-feat-ambient-presets-1` |
| Pacote de desenvolvimento | `dev-v<versão>` | `dev-v0.1.0` |
| Candidata à publicação | `hmg-v<versão>-rc<n>` | `hmg-v0.1.0-rc1` |
| Publicação | `v<versão>` | `v0.1.0` |

A parte numérica usa [SemVer](https://semver.org/). Antes da versão 1.0.0, mudanças podem alterar a interface e o formato de projeto. Cada tag deve apontar para o commit efetivamente validado. Tags publicadas são imutáveis; uma nova tentativa recebe novo número `rc` ou nova versão.

## Commits e pull requests

Use mensagens curtas no formato `feat:`, `fix:`, `docs:`, `refactor:` ou `chore:`. Um pull request deve citar a issue, resumir a mudança, registrar a verificação e atualizar a especificação quando o comportamento mudar. Mudanças de interface devem incluir uma imagem ou vídeo curto, quando possível.

## Estado inicial

O [repositório público](https://github.com/matheusassuncaoo/melodycam) foi identificado em 23/11/2026 com um commit inicial na branch `main`, contendo a licença MIT. `develop` e `feat/ambient-studio` já foram criadas no remoto. Regras de proteção e tags ainda dependem de uma primeira versão validada. Nenhum ambiente de deploy está configurado, portanto os prefixos de validação indicam marcos de código até existir uma esteira de publicação.

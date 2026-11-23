# Desenvolvimento orientado por especificações

## Como transformar uma ideia em entrega

1. Registrar o problema e o comportamento esperado em `docs/product-spec.md`, com ID de requisito e cenário de aceite.
2. Para mudanças arquiteturais, explicar a decisão, alternativas consideradas e condição para revisão em `docs/architecture.md` ou em uma ADR curta.
3. Abrir uma issue pequena ligada ao requisito. Exemplo: “RF-05: acionar e encerrar acorde com a mão de execução”.
4. Implementar a menor fatia que funciona de ponta a ponta, incluindo feedback de interface e caminhos de erro.
5. Verificar com testes apropriados e, para gestos, com sessão manual de câmera. Relatar equipamento, navegador, iluminação e resultado.
6. Atualizar a especificação quando o comportamento real ou a pesquisa com pessoas usuárias mudar uma decisão.

Uma especificação orienta a implementação; ela não substitui validação de usabilidade ou medições de latência.

## Primeiras issues sugeridas

| Ordem | Issue | Evidência de conclusão |
| --- | --- | --- |
| 1 | Base web TypeScript e interface inicial | Abre em localhost e mostra os três caminhos, sem ligar câmera |
| 2 | Ativação e desligamento da câmera | Permissão explícita, erros tratados e trilhas liberadas |
| 3 | Detecção de duas mãos e calibração | Pontos, papéis e estados visíveis em diferentes condições |
| 4 | Seleção e execução de acordes | Mesmo `SoundStart/SoundEnd` por gesto e mouse/teclado |
| 5 | Modo Melodia e gravação | Cenários de toque, desfazer e reprodução concluídos |
| 6 | Biblioteca mínima e Modo Guiado | Peças com autoria/licença e avanço previsível por gesto |
| 7 | Salvar/abrir JSON | Projeto restaurado e erro legível em arquivo inválido |
| 8 | Avaliação de usabilidade e latência | Resultado documentado; escopo ajustado conforme achados |

## Preparação open source

O repositório já tem licença MIT e este projeto inclui `CONTRIBUTING.md` e CI. Antes de solicitar contribuições externas, adicionar código de conduta, templates de issue/PR e política curta de privacidade. Para a biblioteca, manter autoria, origem e licença por peça. Não publicar arquivos de áudio, arranjos ou modelos externos sem verificar a redistribuição permitida.

O fluxo de branches e tags está em [Fluxo Git](git-workflow.md).

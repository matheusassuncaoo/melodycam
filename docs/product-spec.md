# Especificação do produto: Melodycam

**Status:** especificação em evolução; instrumento de acordes e melodia em protótipo. **Data:** 23/11/2026. **Idioma da interface inicial:** português (pt-BR).

## 1. Contexto e objetivo

O [vídeo de referência](https://www.tiktok.com/@connorskinner_/video/7707351137367821590?is_from_webapp=1) foi inspecionado a partir do arquivo enviado pelo proponente (`Download.mp4`, 52,8 segundos). Ele mostra uma pessoa cantando, com pontos de rastreamento sobre **duas mãos**, um guia visual de posições dos dedos, controles de modo/timbre, um **acorde ativo** identificado por símbolo como `E`, `A` ou `Am` e uma linha visual que reage durante a performance. A gravação sugere papéis diferentes para cada mão, mas não permite comprovar a regra exata de disparo, sustentação ou mudança de timbre. Também não mostra uma biblioteca de melodias. A biblioteca e os mapeamentos abaixo são propostas para o MelodyCam.

**Objetivo:** permitir que uma pessoa sem conhecimento de teoria musical consiga produzir acompanhamento harmônico ou uma frase melódica usando as mãos, com resposta audiovisual clara e oportunidade de salvar o resultado.

### Vocabulário

- **Gesto:** posição ou movimento da mão reconhecido pela câmera.
- **Nota:** altura, início, duração e intensidade de um som.
- **Acorde:** conjunto de notas tocadas em conjunto, identificado por cifra como `Am`.
- **Melodia:** sequência editável de notas, com pausas opcionais.
- **Peça da biblioteca:** sequência de notas e metadados disponíveis para interpretação; não contém necessariamente gravação de uma música.
- **Modo Acordes:** uma mão seleciona um acorde e a outra controla sua execução. É a primeira experiência a prototipar por ser a mais próxima do vídeo.
- **Modo Melodia:** a pessoa escolhe e grava notas com gestos.
- **Modo Guiado:** a pessoa interpreta a sequência de uma peça da biblioteca, controlando quando cada evento soa e sua duração.

## 2. Público e princípios

Público inicial: curiosos, educadores musicais, criadores de conteúdo e pessoas que buscam uma experiência lúdica de música. Não presumir leitura de partitura.

1. **Som antes de configuração:** uma interação inicial curta leva ao primeiro som.
2. **Um gesto, uma intenção:** o gesto ativo precisa ter efeito visível antes de produzir som.
3. **Erro recuperável:** notas podem ser desfeitas e a câmera pode ser recalibrada.
4. **Controle explícito:** câmera e áudio começam somente após ação da pessoa.
5. **Acesso sem câmera:** mouse, toque e teclado oferecem o mesmo fluxo essencial.

## 3. Experiência principal

### Tela inicial

O instrumento abre diretamente em uma tela de performance. A pessoa pode ativar a câmera ou tocar sem ela usando os controles visíveis. Um guia rápido explica os gestos e pode ser aberto a qualquer momento. O modo Guiado com biblioteca continua planejado para uma fase futura.

### Tela de performance

```
┌───────────────────────────────────────────────────────────────┐
│ Melodycam    Mãos detectadas    Guia    Câmera               │
├────────────────┬──────────────────────┬───────────────────────┤
│ Mapa de gestos │ Câmera ao fundo       │ Modo Acordes/Melodia  │
│ 1 a 5 dedos    │ Acorde ou nota atual  │ Presets e efeitos     │
│ Pinça para som │ Estado do gesto       │ Eco e espaço          │
├────────────────┴──────────────────────┴───────────────────────┤
│ Osciloscópio                                                  │
│ Segure para tocar  Gravar  Ouvir  Desfazer  Salvar  Abrir     │
└───────────────────────────────────────────────────────────────┘
```

O palco ocupa a tela, com vídeo ao fundo e controles translúcidos de aparência glassmorphism. A esquerda fica o mapa de acordes por dedos; a direita, modo de execução, presets e efeitos. O centro mostra acorde ou nota atual. Um osciloscópio mostra a forma de onda do áudio. A câmera não solicita permissão automaticamente. O feedback tem texto e cor, para não depender só de cor. Quando uma mão necessária some, sons ativos são encerrados com suavidade e o status indica o motivo. A interface permite trocar as funções das mãos para acomodar preferência e espelhamento da câmera.

O protótipo inclui quatro presets ambientes: Void, Haze, Drift e Glow. Cada um ajusta forma de onda, ataque, liberação, filtro, eco e reverberação. Os controles de eco e espaço podem ser ajustados após escolher o preset. No modo Melodia, a altura da mão que executa escolhe uma nota do acorde atual. A mudança de nota durante a pinça reinicia a voz suavemente. Esses mapeamentos são hipóteses de interação a validar com pessoas usuárias.

### Gestos propostos para o protótipo

| Ação | Modo Acordes | Modo Melodia / Guiado | Feedback |
| --- | --- | --- | --- |
| Configurar dedos da mão de seleção | Escolher um acorde entre os disponíveis no tom atual | A definir após o protótipo de acordes | Cifra destacada antes do som |
| Fazer gesto de execução com a outra mão | Iniciar o acorde escolhido | Iniciar nota escolhida ou próximo evento da peça | Cifra/nota destacada e som |
| Manter gesto de execução | Sustentar o acorde | Sustentar a nota | Duração cresce na linha do tempo |
| Encerrar gesto de execução | Encerrar o acorde | Encerrar a nota | Marcador de evento concluído |

O vídeo demonstra poses distintas da mão de seleção, mas não revela o algoritmo. O primeiro teste técnico deve comparar **quantidade de dedos estendidos** e **poses cadastradas** para selecionar acordes. Para execução, experimentar pinça ou movimento deliberado da outra mão; escolher o gesto final por confiabilidade e conforto com pessoas usuárias. Pequenas variações não devem retrigar acordes. O reconhecimento usa histerese, tempo mínimo de estabilidade e calibração ajustável. Se uma mão necessária sair do quadro, o sistema para de emitir som. Modo Melodia pode reutilizar o gesto de execução com uma faixa vertical para selecionar a nota; isso ainda precisa de validação.

## 4. Requisitos funcionais

| ID | Prioridade | Requisito |
| --- | --- | --- |
| RF-01 | MVP | Solicitar permissão da câmera após clique em **Ativar câmera**, com tratamento de negação, ausência de dispositivo e câmera ocupada. |
| RF-02 | MVP | Detectar duas mãos e exibir pontos, papel atribuído e estado de confiança de cada uma em tempo real. |
| RF-03 | MVP | Calibrar poses/gestos de ambas as mãos; oferecer **Recalibrar** e **Trocar mãos**. |
| RF-04 | MVP | Selecionar acordes por uma mão, com cifra e prévia visual antes da execução. |
| RF-05 | MVP | Acionar, sustentar e encerrar o acorde com um gesto da outra mão, encerrando o som ao perder rastreamento. |
| RF-06 | MVP | Oferecer Modo Acordes e Modo Melodia, com escala musical selecionável para as notas. |
| RF-07 | MVP | Registrar eventos de acordes ou notas; oferecer gravar/parar, desfazer último evento e reproduzir a sequência. |
| RF-08 | MVP | Salvar/abrir projeto local em JSON versionado, sem conta. |
| RF-09 | MVP | Permitir tocar e gravar sem câmera por mouse, toque ou teclado. |
| RF-10 | MVP | Exibir ajuda contextual e estados de erro compreensíveis. |
| RF-11 | Pós-MVP | Oferecer Modo Guiado e biblioteca com pelo menos três peças originais ou em domínio público verificadas. |
| RF-12 | Pós-MVP | Exportar performance para MIDI e áudio WAV. |
| RF-13 | Pós-MVP | Editor visual de notas/acordes, BPM, metrônomo e quantização opcional. |
| RF-14 | Pós-MVP | Compartilhar peças próprias em arquivo importável, sem serviço central obrigatório. |

**Biblioteca:** começar com peças em dados estruturados (notas, acordes, pausas, andamento sugerido, tonalidade, autoria e licença), com prévia e filtros simples. Ela é uma expansão proposta pelo proponente, **não um recurso comprovado no vídeo**. Não presumir uma biblioteca de gravações comerciais. O projeto não deve incluir arranjos ou samples protegidos sem licença adequada.

## 5. Requisitos não funcionais e medidas

| ID | Critério de qualidade | Como verificar |
| --- | --- | --- |
| RNF-01 | Processamento de vídeo no dispositivo; nenhum quadro enviado ao servidor | Inspeção de rede e código no fluxo de performance |
| RNF-02 | O fluxo principal funciona em navegador moderno com câmera e contexto seguro (HTTPS ou localhost) | Testes manuais em Chrome/Edge, Firefox e Safari nas versões suportadas |
| RNF-03 | Meta inicial de atraso entre gesto físico e som audível de até 150 ms no percentil 95, em equipamento de referência a definir | Medição com vídeo e captura de saída de áudio sincronizados; medir separadamente detecção e agendamento |
| RNF-04 | Estado legível mesmo sem áudio; alvos de toque confortáveis; navegação por teclado | Auditoria de acessibilidade e teste sem câmera |
| RNF-05 | Áudio não começa automaticamente; câmera pode ser parada a qualquer momento | Teste de permissão, início, parada e liberação de trilhas |
| RNF-06 | Erro de rastreamento não deixa nota presa | Testes de perda de mão, troca de aba e interrupção da câmera |

O orçamento de latência é **meta de produto**, não desempenho já comprovado. Hardware, navegador, iluminação e câmera influenciam o resultado.

## 6. Cenários de aceite do primeiro protótipo

```gherkin
Funcionalidade: iniciar com segurança
  Cenário: a pessoa abre a aplicação
    Dado que a aplicação acabou de carregar
    Então a câmera não está ativa
    E nenhum som é reproduzido
    Quando a pessoa escolhe "Ativar câmera"
    Então o navegador solicita permissão para a câmera

  Cenário: acesso à câmera negado
    Dado que a pessoa negou a câmera
    Então a interface explica como tentar novamente
    E oferece "Experimentar sem câmera"

Funcionalidade: acompanhar uma performance com acordes
  Cenário: escolher e tocar um acorde
    Dado que duas mãos foram detectadas e calibradas
    E o Modo Acordes está ativo
    Quando a pessoa configura os dedos da mão de seleção
    Então a cifra do acorde escolhido aparece antes de soar
    Quando a pessoa faz o gesto de execução com a outra mão
    Então o acorde soa uma vez
    E permanece sustentado enquanto o gesto continua
    Quando a pessoa encerra o gesto
    Então o acorde termina

  Cenário: perda de rastreamento
    Dado que um acorde está soando
    Quando uma das mãos necessárias deixa de ser detectada
    Então o acorde é encerrado
    E a interface mostra qual mão saiu do quadro

Funcionalidade: criar uma frase melódica
  Cenário: tocar uma nota
    Dado que o Modo Melodia está ativo
    Quando a pessoa seleciona uma altura e faz o gesto de execução
    Então a nota escolhida soa e é identificada na interface
    Quando a pessoa encerra o gesto
    Então a nota termina

Funcionalidade: continuidade local
  Cenário: salvar e abrir
    Dado que a pessoa gravou notas ou acordes
    Quando salva o projeto e depois o abre
    Então eventos, durações, escala, tom e andamento são restaurados
```

## 7. Fases sugeridas

| Fase | Entrega verificável |
| --- | --- |
| 0. Prova técnica | Duas mãos + pose de seleção + gesto de execução + acorde sintetizado + medição básica de latência |
| 1. MVP tocável | Onboarding, Acordes e Melodia, gravação, reprodução, JSON e alternativa sem câmera |
| 2. Biblioteca e criação | Modo Guiado, peças licenciadas, editor, MIDI/WAV, metrônomo e quantização |
| 3. Ecossistema | Importação de peças, formatos comunitários, localização e avaliação de recursos colaborativos |

## 8. Decisões a validar com pessoas usuárias

- Nome público definido: **Melodycam**.
- O que mais atrai: acompanhar o canto com acordes, criar notas próprias, interpretar melodias conhecidas ou misturar essas atividades.
- Quais poses de seleção e qual gesto de execução são confortáveis por sessões de 5 a 10 minutos e funcionam em diferentes mãos, câmeras e condições de iluminação.
- Se a prévia da câmera pode ser reduzida ou ocultada após calibração sem perder compreensão.
- Qual é o equipamento mínimo para atingir a meta de latência.

Fazer testes rápidos com pelo menos cinco pessoas que não conheçam o projeto antes de ampliar o conjunto de gestos. Observar tempo até o primeiro som, erros de seleção e execução, capacidade de explicar os controles e taxa de conclusão de uma progressão curta.

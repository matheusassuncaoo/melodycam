import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "pt" | "en";
/** Texto traduzível: uma string neutra ou um par pt/en. */
export type L = string | { pt: string; en: string };

const STORAGE_KEY = "melodycam-lang";

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch { /* armazenamento indisponível */ }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
}

let current: Lang = detect();
export const getLang = (): Lang => current;
export const tr = (value: L, lang: Lang = current): string => typeof value === "string" ? value : value[lang];

/** [português, inglês] */
const D = {
  // estado
  "status.ready": ["Pronto para começar", "Ready to start"],
  "status.readyPlay": ["Pronto para tocar", "Ready to play"],
  "status.cameraOff": ["Câmera desligada", "Camera off"],
  "status.asking": ["Pedindo acesso à câmera…", "Requesting camera access…"],
  "status.loadingModel": ["Carregando o reconhecimento de mãos…", "Loading hand tracking…"],
  "status.showHands": ["Mostre as mãos para a câmera", "Show your hands to the camera"],
  "status.trackingLost": ["Rastreamento interrompido", "Tracking interrupted"],
  "status.playingLabel": ["{label} tocando", "Playing {label}"],
  "status.playing": ["Tocando", "Playing"],
  "status.noHands": ["Não vejo mãos: mostre-as à câmera e acenda uma luz", "I can't see your hands: show them to the camera and add some light"],
  "status.showPlayer": ["Mostre a mão que toca (à direita da tela)", "Show the playing hand (right side of the screen)"],
  "status.showSelector": ["Mostre a mão que escolhe o acorde (à esquerda)", "Show the chord-picking hand (left side)"],
  "status.pinchReady": ["Pronto: junte polegar e indicador", "Ready: pinch thumb and index"],
  "status.pinchNext": ["Junte polegar e indicador", "Pinch thumb and index"],
  "status.moveHint": ["Junte os dedos e suba ou desça", "Pinch, then move up or down"],
  "status.sideHint": ["Deslize para os lados e junte os dedos", "Slide sideways and pinch"],
  "status.staffHint": ["Suba ou desça até a nota destacada e junte os dedos", "Move up or down to the highlighted note and pinch"],
  "status.modeChordsFingers": ["Mão esquerda escolhe, direita toca", "Left hand picks, right hand plays"],
  "status.modeChordsHeight": ["Junte os dedos e suba ou desça para trocar de acorde", "Pinch, then move up or down to change chords"],
  "status.modeNotes": ["Mova a mão e junte os dedos", "Move your hand and pinch"],
  "status.modeSong": ["Junte os dedos para tocar a música", "Pinch to play the song"],
  "status.recording": ["Gravando sua sequência", "Recording your sequence"],
  "status.recorded": ["Gravação concluída", "Recording finished"],
  "status.saved": ["Projeto salvo", "Project saved"],
  "status.opened": ["Projeto aberto: {n} eventos", "Project opened: {n} events"],
  "status.playbackDone": ["Reprodução concluída", "Playback finished"],
  "status.playbackSeq": ["Reproduzindo sequência", "Playing sequence"],
  "status.listening": ["Ouvindo: {title}", "Listening: {title}"],
  // erros
  "err.audio": ["Não foi possível iniciar o áudio. Verifique as permissões do navegador.", "Could not start audio. Check your browser permissions."],
  "err.camera": ["Não foi possível ativar a câmera. {detail} Você ainda pode tocar pelos controles em tela.", "Could not start the camera. {detail} You can still play with the on-screen controls."],
  "err.busy": ["A câmera parece estar em uso por outro programa (Zoom, OBS, Teams, outra aba ou app de câmera). Feche-o e tente de novo.", "The camera seems to be in use by another program (Zoom, OBS, Teams, another tab or camera app). Close it and try again."],
  "err.denied": ["O acesso à câmera foi negado. Libere a permissão no cadeado da barra de endereço.", "Camera access was denied. Allow it from the padlock in the address bar."],
  "err.notFound": ["Nenhuma câmera foi encontrada neste computador.", "No camera was found on this device."],
  "err.secure": ["A câmera exige HTTPS ou localhost.", "The camera requires HTTPS or localhost."],
  "err.preview": ["Prévia da câmera indisponível.", "Camera preview unavailable."],
  "err.unknown": ["Erro desconhecido.", "Unknown error."],
  "err.projectInvalid": ["Arquivo de projeto inválido.", "Invalid project file."],
  "err.projectFormat": ["Formato de projeto não reconhecido.", "Unrecognized project format."],
  "err.projectBig": ["O projeto tem eventos demais.", "The project has too many events."],
  "err.projectEvents": ["O projeto contém eventos inválidos.", "The project contains invalid events."],
  "err.projectOpen": ["Não foi possível abrir o projeto.", "Could not open the project."],
  // cabeçalho
  "head.guide": ["Como tocar", "How to play"],
  "head.swap": ["Trocar mãos", "Swap hands"],
  "head.swapped": ["Mãos invertidas", "Hands swapped"],
  "head.hidePanels": ["Ocultar painéis", "Hide panels"],
  "head.showPanels": ["Mostrar painéis", "Show panels"],
  "head.start": ["Ativar câmera", "Start camera"],
  "head.stop": ["Desligar câmera", "Stop camera"],
  "head.preparing": ["Preparando…", "Preparing…"],
  "head.handOne": ["{n} mão", "{n} hand"],
  "head.handMany": ["{n} mãos", "{n} hands"],
  "head.about": ["Sobre o Melodycam", "About Melodycam"],
  // modos
  "mode.chords": ["Acordes", "Chords"],
  "mode.notes": ["Notas", "Notes"],
  "mode.song": ["Músicas", "Songs"],
  "mode.aria": ["Modo de execução", "Play mode"],
  // acordes
  "chords.progression": ["PROGRESSÃO", "PROGRESSION"],
  "chords.height": ["Subir e descer", "Up and down"],
  "chords.fingers": ["Dedos", "Fingers"],
  "chords.methodAria": ["Como escolher o acorde", "How to pick the chord"],
  "chords.heightEyebrow": ["MÃO QUE TOCA", "PLAYING HAND"],
  "chords.heightTitle": ["Suba e desça com a pinça", "Move up and down while pinching"],
  "chords.heightHelp": ["A tela vira uma partitura: cada faixa é um acorde. Segure a pinça e suba ou desça a mão para trocar de acorde sem soltar. O losango no centro da sua mão é o que escolhe a faixa. Funciona com uma mão só. Mover para os lados abre o brilho.", "The screen becomes a score: each band is a chord. Hold the pinch and move your hand up or down to change chords without letting go. The diamond at the center of your hand picks the band. Works with one hand. Moving sideways opens the brightness."],
  "chords.fingersEyebrow": ["MÃO ESQUERDA", "LEFT HAND"],
  "chords.fingersTitle": ["Mostre de 1 a {n} dedos", "Show 1 to {n} fingers"],
  "chords.fingersHelp": ["Segure a pinça com a direita: o pad sustenta e o acorde muda ao vivo. Subir a mão abre o brilho.", "Hold the pinch with your right hand: the pad sustains and the chord changes live. Raising your hand opens the brightness."],
  // notas
  "notes.eyebrow": ["MÃO QUE TOCA", "PLAYING HAND"],
  "notes.titleX": ["Deslize e junte os dedos", "Slide and pinch"],
  "notes.titleY": ["Suba, desça e junte os dedos", "Move up, down and pinch"],
  "notes.helpX": ["A tela se divide em 8 faixas: {notes}. Com duas mãos, a esquerda com 1, 2 ou 3 dedos muda a oitava.", "The screen splits into 8 bands: {notes}. With two hands, your left hand with 1, 2 or 3 fingers changes the octave."],
  "notes.helpY": ["As 8 notas ficam empilhadas como numa partitura: quanto mais alto, mais agudo ({notes}). O losango no centro da mão escolhe a nota. Funciona com uma mão só.", "The 8 notes are stacked like a score: the higher, the higher the pitch ({notes}). The diamond at the center of your hand picks the note. Works with one hand."],
  "notes.axisAria": ["Direção das notas", "Note direction"],
  "notes.sideways": ["Lados", "Sideways"],
  "notes.updown": ["Subir e descer", "Up and down"],
  "notes.octaveAria": ["Oitava", "Octave"],
  "notes.octave": ["Oitava {oct}, {note}", "{oct} octave, {note}"],
  // músicas
  "song.eyebrow": ["BIBLIOTECA", "LIBRARY"],
  "song.title": ["Toque no seu ritmo", "Play at your own pace"],
  "song.styleAria": ["Estilo de toque", "Play style"],
  "song.sequence": ["Sequência", "Sequence"],
  "song.staff": ["Partitura", "Score"],
  "song.helpSequence": ["Cada pinça toca a próxima nota. Segure para alongar, solte para a pausa.", "Each pinch plays the next note. Hold to sustain, release to rest."],
  "song.helpStaff": ["Suba ou desça até a faixa destacada e junte os dedos. Acertou a nota, a música avança. Funciona com uma mão só.", "Move up or down to the highlighted band and pinch. Hit the right note and the song moves on. Works with one hand."],
  "song.meta": ["{subtitle}, {n} notas", "{subtitle}, {n} notes"],
  "song.listen": ["▶ Ouvir", "▶ Listen"],
  "song.stop": ["Parar", "Stop"],
  "song.restart": ["↺ Reiniciar", "↺ Restart"],
  "song.ribbon": ["Próximas notas", "Next notes"],
  // palco
  "stage.h1a": ["Componha ambient com as ", "Compose ambient with "],
  "stage.h1b": ["suas mãos", "your hands"],
  "stage.p": ["Pads de dark ambient sem instrumento. Junte polegar e indicador para o som soar e suba ou desça a mão para trocar de acorde, como numa partitura. Dá para tocar Creep.", "Dark ambient pads without an instrument. Pinch thumb and index to make sound, then move your hand up or down to change chords, like reading a score. You can play Creep."],
  "stage.small": ["Ou toque agora com o teclado em tela, as teclas A–K ou a barra de espaço.", "Or play now with the on-screen keyboard, the A–K keys or the space bar."],
  "stage.chord": ["ACORDE", "CHORD"],
  "stage.note": ["NOTA", "NOTE"],
  "stage.nextNote": ["PRÓXIMA NOTA", "NEXT NOTE"],
  "stage.aria": ["Instrumento", "Instrument"],
  // leitura e som
  "read.title": ["LEITURA AO VIVO", "LIVE READING"],
  "read.fingers": ["Dedos (escolha)", "Fingers (pick)"],
  "read.pinch": ["Pinça", "Pinch"],
  "read.sensitivity": ["Sensibilidade da pinça", "Pinch sensitivity"],
  "read.calibrate": ["Calibrar pinça", "Calibrate pinch"],
  "read.calibrated": ["Pinça calibrada. Mexer no controle acima volta ao automático.", "Pinch calibrated. Moving the slider above returns to automatic."],
  "read.calOpen": ["Abra a mão: polegar e indicador bem afastados…", "Open your hand: thumb and index far apart…"],
  "read.calClose": ["Agora junte polegar e indicador e segure…", "Now pinch thumb and index and hold…"],
  "read.calFail": ["Não consegui ler a mão. Mostre-a à câmera e tente de novo.", "I couldn't read your hand. Show it to the camera and try again."],
  "read.tip": ["FPS baixo. Mais luz no ambiente faz a webcam captar mais quadros por segundo.", "Low FPS. More light in the room makes the webcam capture more frames per second."],
  "sound.title": ["SOM", "SOUND"],
  "sound.echo": ["Eco", "Echo"],
  "sound.space": ["Espaço", "Space"],
  "sound.glide": ["Transição suave", "Smooth glide"],
  // dock
  "dock.holdChord": ["Segure para tocar", "Hold to play"],
  "dock.playNote": ["Tocar nota", "Play note"],
  "dock.nextNote": ["Próxima nota", "Next note"],
  "dock.space": ["ESPAÇO", "SPACE"],
  "dock.record": ["Gravar", "Record"],
  "dock.stopRec": ["Parar", "Stop"],
  "dock.listen": ["Ouvir", "Listen"],
  "dock.undo": ["Desfazer", "Undo"],
  "dock.save": ["Salvar", "Save"],
  "dock.open": ["Abrir", "Open"],
  "dock.recording": ["Gravando…", "Recording…"],
  "dock.empty": ["Grave para ver a sequência aqui", "Record to see the sequence here"],
  "dock.scope": ["Forma de onda do som", "Sound waveform"],
  "keyboard.aria": ["Teclado de notas", "Note keyboard"],
  // guia
  "guide.eyebrow": ["GUIA RÁPIDO", "QUICK GUIDE"],
  "guide.title": ["Suas mãos são o instrumento.", "Your hands are the instrument."],
  "guide.close": ["Fechar guia", "Close guide"],
  "guide.s1t": ["Ative a câmera", "Start the camera"],
  "guide.s1p": ["Fique de frente, com boa luz e as mãos à vista. As mãos ganham linhas coloridas quando são detectadas.", "Face the camera with good light and your hands in view. Detected hands get colored lines."],
  "guide.s2t": ["Junte os dedos", "Pinch"],
  "guide.s2p": ["Junte polegar e indicador para o som soar. Segure para sustentar e solte para o som se dissolver.", "Pinch thumb and index to make sound. Hold to sustain and release to let it fade."],
  "guide.s3t": ["Suba e desça", "Move up and down"],
  "guide.s3p": ["Com a pinça segurada, suba ou desça a mão: cada faixa é um acorde ou uma nota, como numa partitura. Funciona com uma mão só.", "While pinching, move your hand up or down: each band is a chord or a note, like a score. Works with one hand."],
  "guide.s4t": ["Músicas", "Songs"],
  "guide.s4p": ["Escolha uma melodia. Em Sequência cada pinça toca a próxima nota; em Partitura você sobe e desce até a nota destacada.", "Pick a melody. In Sequence each pinch plays the next note; in Score you move up and down to the highlighted note."],
  "guide.foot": ["Sem câmera: use o teclado em tela, as teclas A S D F G H J K ou a barra de espaço.", "No camera: use the on-screen keyboard, the A S D F G H J K keys or the space bar."],
  "guide.ok": ["Entendi", "Got it"],
  "toast.close": ["Fechar mensagem", "Close message"],
  "lang.aria": ["Idioma", "Language"],
  "project.title": ["Minha criação", "My creation"],
  // landing
  "land.ideia": ["A ideia", "The idea"],
  "land.engine": ["Engine", "Engine"],
  "land.open": ["Abrir o instrumento", "Open the instrument"],
  "land.play": ["Tocar agora", "Play now"],
  "land.how": ["Como funciona", "How it works"],
  "land.lead": ["Toque pads de dark ambient, synthwave e dreamscape no ar. Mostre as mãos à câmera, junte polegar e indicador e suba ou desça para mudar de acorde. Tudo roda direto no navegador.", "Play dark ambient, synthwave and dreamscape pads in the air. Show your hands to the camera, pinch thumb and index, and move up or down to change chords. Everything runs right in your browser."],
  "land.h1": [["Música", "ambient", "com", "as", "suas", "mãos"].join("|"), ["Play", "ambient", "music", "with", "your", "hands"].join("|")],
  "land.h1aria": ["Música ambient com as suas mãos", "Play ambient music with your hands"],
  "land.perk1": ["Sem instalar nada", "Nothing to install"],
  "land.perk2": ["Sem conta", "No account"],
  "land.perk3": ["Seu vídeo não sai do navegador", "Your video never leaves the browser"],
  "land.perk4": ["Celular e computador", "Phone and computer"],
  "land.demoAria": ["Animação: uma mão faz a pinça e sobe pelas faixas de acordes G, B, C e Cm", "Animation: a hand pinches and moves up through the G, B, C and Cm chord bands"],
  "land.hear": ["▶ Ouvir ao vivo", "▶ Hear it live"],
  "land.mute": ["■ Silenciar", "■ Mute"],
  "land.demoCaption": ["Pinça, depois sobe: G, B, C, Cm (no estilo de Creep). O som é o do próprio instrumento.", "Pinch, then move up: G, B, C, Cm (Creep style). The sound is the real instrument."],
  "land.demoTitle": ["Veja o gesto e ouça o resultado", "See the gesture, hear the result"],
  "land.privacyLink": ["Privacidade", "Privacy"],
  "land.license": ["Licença MIT", "MIT license"],
  "priv.title": ["Antes de ligar a câmera", "Before turning on the camera"],
  "priv.lead": ["O Melodycam usa a câmera só para ver suas mãos. Veja o que acontece com os seus dados:", "Melodycam uses the camera only to see your hands. Here is what happens to your data:"],
  "priv.p1t": ["Nada é gravado nem enviado", "Nothing is recorded or sent"],
  "priv.p1p": ["O vídeo é processado no seu dispositivo, quadro a quadro, e descartado na hora. Nenhuma imagem, áudio ou dado das suas mãos sai do navegador ou é armazenado em servidor.", "The video is processed on your device, frame by frame, and discarded right away. No image, audio or hand data leaves your browser or is stored on any server."],
  "priv.p2t": ["Sem cadastro, cookies ou rastreadores", "No sign-up, cookies or trackers"],
  "priv.p2p": ["Não coletamos dados pessoais nem usamos análise de uso. As fontes e o modelo de detecção são servidos pelo próprio site.", "We collect no personal data and use no analytics. Fonts and the hand-tracking model are served by the site itself."],
  "priv.p3t": ["O que fica no seu navegador", "What stays in your browser"],
  "priv.p3p": ["Apenas o idioma, a calibração da pinça e este aceite, no armazenamento local do navegador. Para apagar, limpe os dados do site.", "Only your language, the pinch calibration and this consent, in your browser's local storage. To erase them, clear the site data."],
  "priv.p4t": ["Você no controle", "You are in control"],
  "priv.p4p": ["Pode desligar a câmera quando quiser pelo botão no topo. O código é aberto e pode ser auditado.", "You can stop the camera at any time with the button at the top. The code is open source and can be audited."],
  "priv.law": ["Em linha com a LGPD (Lei 13.709/2018): a base é o seu consentimento, e como nenhum dado pessoal é armazenado, não há o que excluir ou transferir.", "In line with data-protection law (Brazil's LGPD): the basis is your consent, and since no personal data is stored there is nothing to delete or transfer."],
  "priv.more": ["Política completa", "Full policy"],
  "priv.accept": ["Aceitar e ligar a câmera", "Accept and turn on the camera"],
  "priv.decline": ["Agora não", "Not now"],
  "priv.aria": ["Aviso de privacidade", "Privacy notice"],
  "land.spectrumAria": ["As sete notas e suas cores", "The seven notes and their colors"],
  "land.s1eyebrow": ["01 A IDEIA", "01 THE IDEA"],
  "land.s1title": ["Luz é som. Cada nota tem a sua cor.", "Light is sound. Every note has its color."],
  "land.s1p": ["O Melodycam parte de um vídeo em que alguém toca acordes no ar com as mãos. A ideia aqui é fazer isso simples para qualquer pessoa: as sete notas viram sete cores, e a mesma cor aparece no teclado, nas faixas sobre a câmera e nas suas mãos.", "Melodycam starts from a video of someone playing chords in the air with their hands. The idea here is to make that simple for anyone: the seven notes become seven colors, and the same color shows up on the keyboard, on the bands over the camera and on your hands."],
  "land.f1t": ["Ambient com as mãos", "Ambient with your hands"],
  "land.f1p": ["Escolha uma progressão, como Creep, e suba ou desça a mão para trocar o acorde enquanto o pad não para de soar. Timbres dark ambient, synthwave e dreamscape.", "Pick a progression, like Creep, and move your hand up or down to change chords while the pad never stops sounding. Dark ambient, synthwave and dreamscape sounds."],
  "land.f2t": ["Dó Ré Mi Fá Sol Lá Si Dó", "C D E F G A B C"],
  "land.f2p": ["A tela vira uma escala de faixas coloridas. Junte polegar e indicador e a nota soa, sem precisar saber teoria. Dá para tocar com uma mão só.", "The screen becomes a scale of colored bands. Pinch thumb and index and the note sounds, no theory needed. You can play with just one hand."],
  "land.f3t": ["Músicas para tocar", "Songs to play"],
  "land.f3p": ["Melodias conhecidas e originais feitas para combinar com os pads. Cada pinça toca a próxima nota, ou suba e desça como numa partitura.", "Well-known and original melodies made to match the pads. Each pinch plays the next note, or move up and down like reading a score."],
  "land.st1t": ["Ative a câmera", "Start the camera"],
  "land.st1p": ["Fique de frente, com luz e as mãos à vista.", "Face the camera with light and your hands in view."],
  "land.st2t": ["Escolha o acorde", "Pick the chord"],
  "land.st2p": ["Subindo e descendo a mão, como numa partitura, ou pelos dedos.", "Move your hand up and down like a score, or use your fingers."],
  "land.st3t": ["Junte os dedos", "Pinch"],
  "land.st3p": ["Segure para sustentar, solte para o som se dissolver.", "Hold to sustain, release to let the sound fade."],
  "land.stat1": ["progressões de acordes", "chord progressions"],
  "land.stat2": ["timbres", "sounds"],
  "land.stat3": ["melodias na biblioteca", "melodies in the library"],
  "land.stat4": ["vídeos enviados a servidores", "videos sent to servers"],
  "land.s2eyebrow": ["02 ENGINE", "02 ENGINE"],
  "land.s2title": ["Do quadro da câmera ao som, em tempo real.", "From camera frame to sound, in real time."],
  "land.s2p": ["Tudo acontece no seu navegador. O vídeo nunca sai do dispositivo: a câmera alimenta o modelo de mãos, os gestos viram notas e o som é sintetizado na hora.", "Everything happens in your browser. The video never leaves your device: the camera feeds the hand model, gestures become notes and the sound is synthesized on the spot."],
  "land.p1t": ["Câmera", "Camera"],
  "land.p1p": ["getUserMedia em até 960×540. Em ambiente escuro o quadro ganha brilho adaptativo antes da detecção.", "getUserMedia at up to 960×540. In dark rooms the frame gets adaptive brightness before detection."],
  "land.p2t": ["Detecção", "Detection"],
  "land.p2p": ["MediaPipe Hand Landmarker em WebAssembly, com GPU e CPU de reserva. Devolve 21 pontos 3D por mão.", "MediaPipe Hand Landmarker on WebAssembly, with GPU and CPU fallback. Returns 21 3D points per hand."],
  "land.p3t": ["Gestos", "Gestures"],
  "land.p3p": ["Dedos pelo ângulo das articulações, pinça pela razão polegar e indicador sobre a palma, e altura da mão em faixas. Votação, histerese e média móvel removem o tremor.", "Fingers from joint angles, pinch from the thumb-index to palm ratio, and hand height mapped to bands. Voting, hysteresis and smoothing remove jitter."],
  "land.p4t": ["Som", "Sound"],
  "land.p4p": ["Web Audio API: osciladores com vozes desafinadas, filtro, eco, reverb por convolução e vozes que deslizam entre acordes sem reataque.", "Web Audio API: detuned oscillators, filter, echo, convolution reverb and voices that glide between chords without re-attacking."],
  "land.p5t": ["Interface", "Interface"],
  "land.p5p": ["React, TypeScript e Vite. Um canvas desenha as mãos alinhadas ao vídeo e as faixas coloridas por cima.", "React, TypeScript and Vite. A canvas draws the hands aligned with the video and the colored bands on top."],
  "land.ctaTitle": ["Pronto para tocar com as mãos?", "Ready to play with your hands?"],
  "land.ctaP": ["Abra o instrumento, ligue a câmera e escolha o seu primeiro acorde.", "Open the instrument, turn on the camera and pick your first chord."],
  "land.by": ["Desenvolvido por Matheus Assunção da Cunha", "Developed by Matheus Assunção da Cunha"],
  "land.openSource": ["Projeto de código aberto.", "Open source project."],
  "land.github": ["GitHub do Matheus", "Matheus on GitHub"],
  "land.repo": ["Repositório", "Repository"],
  "land.note": ["NOTA", "NOTE"]
} as const satisfies Record<string, readonly [string, string]>;

export type Key = keyof typeof D;

export function t(key: Key, vars?: Record<string, string | number>): string {
  let text: string = D[key][current === "pt" ? 0 : 1];
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value));
  return text;
}

type Ctx = { lang: Lang; setLang: (lang: Lang) => void };
const LangContext = createContext<Ctx>({ lang: current, setLang: () => undefined });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(current);
  const setLang = (next: Lang) => {
    current = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignorado */ }
    setState(next);
  };
  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    document.title = lang === "pt" ? "Melodycam: música nas suas mãos" : "Melodycam: music in your hands";
  }, [lang]);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = (): Ctx => useContext(LangContext);

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return <div className="lang-switch" role="group" aria-label={t("lang.aria")}>
    {(["pt", "en"] as const).map((code) => <button key={code} type="button" className={lang === code ? "active" : ""} onClick={() => setLang(code)} aria-pressed={lang === code}>{code === "pt" ? "PT" : "EN"}</button>)}
  </div>;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { CHORDS, PRESETS, Synth, validateProject, type Project, type RecordedEvent } from "./music";
import { countFingers, isPinching, StableSelection } from "./gestures";
import "./style.css";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "/mediapipe";
const BPM = 100;

function App() {
  const [selected, setSelected] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swapHands, setSwapHands] = useState(false);
  const [status, setStatus] = useState("Pronto para começar");
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState<RecordedEvent[]>([]);
  const [message, setMessage] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [handsDetected, setHandsDetected] = useState(0);
  const [activeInput, setActiveInput] = useState<"camera" | "manual" | null>(null);
  const [presetIndex, setPresetIndex] = useState(0);
  const [echo, setEcho] = useState(PRESETS[0].echo);
  const [space, setSpace] = useState(PRESETS[0].space);
  const [melodyMode, setMelodyMode] = useState(false);
  const [melodyStep, setMelodyStep] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scopeRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef(0);
  const synthRef = useRef(new Synth());
  const selectionRef = useRef(new StableSelection());
  const melodySelectionRef = useRef(new StableSelection());
  const selectedRef = useRef(0);
  const playingRef = useRef(false);
  const soundRequestRef = useRef(0);
  const pinchRef = useRef(false);
  const cameraRef = useRef(false);
  const recordRef = useRef(false);
  const recordingStartRef = useRef(0);
  const noteStartRef = useRef(0);
  const activeEventRef = useRef<{ symbol: string; notes: number[]; type: "chord" | "note" } | null>(null);
  const swapRef = useRef(false);
  const playbackTimersRef = useRef<number[]>([]);
  const melodyModeRef = useRef(false);
  const melodyStepRef = useRef(0);
  const soundingStepRef = useRef(0);
  const scopeFrameRef = useRef(0);

  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { recordRef.current = recording; }, [recording]);
  useEffect(() => { swapRef.current = swapHands; }, [swapHands]);
  useEffect(() => { melodyModeRef.current = melodyMode; }, [melodyMode]);
  useEffect(() => { melodyStepRef.current = melodyStep; }, [melodyStep]);

  useEffect(() => {
    const canvas = scopeRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width && height) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
          canvas.width = Math.floor(width * ratio);
          canvas.height = Math.floor(height * ratio);
        }
        const context = canvas.getContext("2d");
        if (context) {
          context.setTransform(ratio, 0, 0, ratio, 0, 0);
          context.clearRect(0, 0, width, height);
          context.strokeStyle = "rgba(171, 163, 255, 0.08)";
          context.lineWidth = 1;
          for (let i = 1; i < 6; i++) { context.beginPath(); context.moveTo(0, height * i / 6); context.lineTo(width, height * i / 6); context.stroke(); }
          const samples = synthRef.current.getWaveform();
          context.beginPath();
          context.lineWidth = 2;
          context.strokeStyle = playingRef.current ? "#b7a8ff" : "rgba(183, 168, 255, 0.38)";
          context.shadowColor = "#9a82ff";
          context.shadowBlur = playingRef.current ? 18 : 5;
          for (let x = 0; x < width; x++) {
            const sample = samples ? (samples[Math.floor(x / width * samples.length)] - 128) / 128 : Math.sin(x * 0.018 + performance.now() * 0.0005) * 0.045;
            const y = height / 2 + sample * height * 0.42;
            if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
          }
          context.stroke();
          context.shadowBlur = 0;
        }
      }
      scopeFrameRef.current = requestAnimationFrame(draw);
    };
    scopeFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(scopeFrameRef.current);
  }, []);

  const choosePreset = (index: number) => {
    const preset = PRESETS[index];
    setPresetIndex(index);
    setEcho(preset.echo);
    setSpace(preset.space);
    synthRef.current.setPreset(preset);
  };

  const stopSound = useCallback(() => {
    soundRequestRef.current++;
    if (!playingRef.current) return;
    synthRef.current.stop();
    playingRef.current = false;
    setPlaying(false);
    setActiveInput(null);
    if (recordRef.current && activeEventRef.current) {
      const startBeat = Math.max(0, (noteStartRef.current - recordingStartRef.current) / 60000 * BPM);
      const durationBeats = Math.max(0.1, (performance.now() - noteStartRef.current) / 60000 * BPM);
      const played = activeEventRef.current;
      setEvents((current) => [...current, {
        type: played.type, symbol: played.symbol, pitchesMidi: played.notes,
        startBeat: Math.round(startBeat * 100) / 100,
        durationBeats: Math.round(durationBeats * 100) / 100,
        velocity: 0.8
      }]);
    }
    activeEventRef.current = null;
  }, []);

  const startSound = useCallback(async (input: "camera" | "manual", index?: number) => {
    if (playingRef.current) return;
    const request = ++soundRequestRef.current;
    const chord = CHORDS[index ?? selectedRef.current];
    const notes = melodyModeRef.current ? [(chord.notes[melodyStepRef.current] ?? chord.notes[0] + 12) + 12] : chord.notes;
    try {
      await synthRef.current.ready();
      if (request !== soundRequestRef.current || (input === "camera" && !cameraRef.current)) return;
      synthRef.current.play(notes);
      playingRef.current = true;
      noteStartRef.current = performance.now();
      soundingStepRef.current = melodyStepRef.current;
      activeEventRef.current = { type: melodyModeRef.current ? "note" : "chord", symbol: melodyModeRef.current ? `${chord.symbol}:${notes[0]}` : chord.symbol, notes };
      setPlaying(true);
      setActiveInput(input);
      setStatus(`${chord.symbol} ${melodyModeRef.current ? "melodia" : "acorde"} tocando`);
      setMessage("");
    } catch {
      setMessage("Não foi possível iniciar o áudio. Verifique as permissões do navegador.");
    }
  }, []);

  const drawHands = useCallback((hands: NormalizedLandmark[][], selectIndex: number, executeIndex: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const width = video.videoWidth || 960;
    const height = video.videoHeight || 540;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (let handIndex = 0; handIndex < hands.length; handIndex++) {
      const points = hands[handIndex];
      const color = handIndex === selectIndex ? "#d5f480" : handIndex === executeIndex ? "#f4b67d" : "#fff";
      for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, Math.max(2, width / 180), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      for (const [a, b] of [[0, 5], [0, 17], [5, 8], [9, 12], [13, 16], [17, 20], [0, 1], [1, 4]]) {
        ctx.beginPath();
        ctx.moveTo(points[a].x * width, points[a].y * height);
        ctx.lineTo(points[b].x * width, points[b].y * height);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = Math.max(2, width / 300);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }, []);

  const runFrame = useCallback(() => {
    if (!cameraRef.current) return;
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (video && landmarker && video.readyState >= 2) {
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const hands = result.landmarks;
        setHandsDetected((previous) => previous === hands.length ? previous : hands.length);
        const sorted = hands.map((points, index) => ({ points, index, x: points[0].x })).sort((a, b) => b.x - a.x);
        const selecting = sorted[swapRef.current ? 1 : 0];
        const executing = sorted[swapRef.current ? 0 : 1];
        drawHands(hands, selecting?.index ?? -1, executing?.index ?? -1);
        if (selecting) {
          const fingers = countFingers(selecting.points);
          const stable = selectionRef.current.update(fingers, performance.now());
          if (stable > 0 && stable <= CHORDS.length && stable - 1 !== selectedRef.current) {
            selectedRef.current = stable - 1;
            setSelected(stable - 1);
          }
        }
        if (executing) {
          const rawStep = Math.min(3, Math.max(0, Math.floor((1 - executing.points[8].y) * 4)));
          const nextStep = Math.max(0, melodySelectionRef.current.update(rawStep + 1, performance.now()) - 1);
          if (nextStep !== melodyStepRef.current) { melodyStepRef.current = nextStep; setMelodyStep(nextStep); }
          const pinching = isPinching(executing.points, pinchRef.current);
          if (pinching && playingRef.current && melodyModeRef.current && soundingStepRef.current !== nextStep) {
            stopSound();
            void startSound("camera");
          }
          if (pinching && !pinchRef.current) void startSound("camera");
          if (!pinching && pinchRef.current && playingRef.current) stopSound();
          pinchRef.current = pinching;
          setStatus(pinching ? "Gesto de execução detectado" : "Duas mãos detectadas");
        } else {
          pinchRef.current = false;
          if (playingRef.current && hands.length < 2) stopSound();
          setStatus(hands.length === 0 ? "Mostre as mãos para a câmera" : "Mostre a segunda mão para tocar");
        }
      } catch {
        setStatus("Rastreamento interrompido");
        stopSound();
      }
    }
    rafRef.current = requestAnimationFrame(runFrame);
  }, [drawHands, startSound, stopSound]);

  const stopCamera = useCallback(() => {
    cameraRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    selectionRef.current.reset();
    melodySelectionRef.current.reset();
    pinchRef.current = false;
    stopSound();
    setCameraOn(false);
    setHandsDetected(0);
    setStatus("Câmera desligada");
  }, [stopSound]);

  const startCamera = async () => {
    if (loading || cameraRef.current) return;
    void synthRef.current.ready().catch(() => { /* O vídeo continua disponível se o áudio falhar. */ });
    setLoading(true);
    setMessage("");
    setStatus("Pedindo acesso à câmera…");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("A câmera exige HTTPS ou localhost.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Prévia da câmera indisponível.");
      video.srcObject = stream;
      await video.play();
      setStatus("Preparando o reconhecimento das mãos…");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO", numHands: 2,
        minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
      });
      cameraRef.current = true;
      setCameraOn(true);
      setStatus("Mostre as duas mãos para a câmera");
      rafRef.current = requestAnimationFrame(runFrame);
    } catch (error) {
      stopCamera();
      const detail = error instanceof Error ? error.message : "Erro desconhecido";
      setMessage(`Não foi possível ativar a câmera. ${detail} Você ainda pode tocar pelos controles na tela.`);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement) return;
      if (event.code === "Space") { event.preventDefault(); void startSound("manual"); }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < CHORDS.length) { selectedRef.current = index; setSelected(index); }
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.code === "Space") stopSound(); };
    const onVisibility = () => { if (document.hidden) stopSound(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [startSound, stopSound]);

  useEffect(() => () => {
    cameraRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    playbackTimersRef.current.forEach(clearTimeout);
    cancelAnimationFrame(scopeFrameRef.current);
    void synthRef.current.dispose();
  }, []);

  const toggleRecording = () => {
    if (recording) { stopSound(); setRecording(false); setStatus("Gravação concluída"); }
    else { setEvents([]); recordingStartRef.current = performance.now(); setRecording(true); setStatus("Gravando sua sequência"); }
  };

  const playRecording = async () => {
    if (!events.length) return;
    playbackTimersRef.current.forEach(clearTimeout);
    stopSound();
    await synthRef.current.ready();
    setStatus("Reproduzindo sequência");
    for (const event of events) {
      playbackTimersRef.current.push(window.setTimeout(() => {
        synthRef.current.play(event.pitchesMidi);
        setSelected(Math.max(0, CHORDS.findIndex((chord) => chord.symbol === event.symbol)));
      }, event.startBeat * 60000 / BPM));
      playbackTimersRef.current.push(window.setTimeout(() => synthRef.current.stop(),
        (event.startBeat + event.durationBeats) * 60000 / BPM));
    }
    const endBeat = Math.max(...events.map((event) => event.startBeat + event.durationBeats));
    playbackTimersRef.current.push(window.setTimeout(() => setStatus("Reprodução concluída"), endBeat * 60000 / BPM + 250));
  };

  const saveProject = () => {
    const project: Project = {
      schemaVersion: 1, title: "Minha progressão", mode: events.some((event) => event.type === "note") ? "performance" : "chords", tempoBpm: BPM,
      scale: { tonic: "E", type: "major" }, events
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "melodycam-projeto.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Projeto salvo");
  };

  const openProject = async (file?: File) => {
    if (!file) return;
    try {
      const project = validateProject(JSON.parse(await file.text()));
      stopSound();
      setRecording(false);
      setEvents(project.events);
      setMessage("");
      setStatus(`Projeto aberto: ${project.events.length} eventos`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível abrir o projeto.");
    }
  };

  const currentChord = CHORDS[selected];
  const currentNote = (currentChord.notes[melodyStep] ?? currentChord.notes[0] + 12) + 12;
  const noteNames = ["Dó", "Dó#", "Ré", "Ré#", "Mi", "Fá", "Fá#", "Sol", "Sol#", "Lá", "Lá#", "Si"];
  const noteName = `${noteNames[currentNote % 12]}${Math.floor(currentNote / 12) - 1}`;

  return <div className="studio">
    <div className="atmosphere" aria-hidden="true"><div className="aura aura-one" /><div className="aura aura-two" /><div className="grain" /></div>
    <video ref={videoRef} className={`camera-video ${cameraOn ? "is-visible" : ""}`} playsInline muted autoPlay aria-label="Prévia da câmera" />
    <canvas ref={canvasRef} className="hand-overlay" aria-hidden="true" />
    <div className="camera-vignette" aria-hidden="true" />

    <header className="studio-header glass">
      <div className="brand"><span className="brand-icon">◈</span><span>MELODYCAM</span><span className="brand-sub">GESTURE INSTRUMENT</span></div>
      <div className="header-status"><span className={`signal ${cameraOn ? "live" : ""}`} /><span>{cameraOn ? `${handsDetected}/2 mãos detectadas` : "Câmera desligada"}</span></div>
      <div className="header-actions">
        <button type="button" onClick={() => setGuideOpen((value) => !value)} aria-expanded={guideOpen}>Como tocar</button>
        {cameraOn && <button type="button" onClick={() => { selectionRef.current.reset(); melodySelectionRef.current.reset(); setStatus("Gestos recalibrados"); }}>Recalibrar</button>}
        {cameraOn && <button type="button" onClick={() => setSwapHands((value) => !value)}>{swapHands ? "Mãos invertidas" : "Trocar mãos"}</button>}
        <button type="button" className="camera-button" onClick={cameraOn ? stopCamera : startCamera} disabled={loading}>{loading ? "Preparando..." : cameraOn ? "Desligar câmera" : "Ativar câmera"}</button>
      </div>
    </header>

    <main className="performance">
      <aside className="gesture-panel glass" aria-label="Mapa de gestos">
        <div className="panel-heading"><span className="eyebrow">01 / GESTOS</span><h2>Escolha a harmonia</h2><p>Levante os dedos de uma mão ou clique em um acorde.</p></div>
        <div className="chord-list">{CHORDS.map((chord, index) => <button key={chord.symbol} type="button" className={`chord-button ${selected === index ? "selected" : ""}`} onClick={() => { selectedRef.current = index; setSelected(index); }} aria-pressed={selected === index}>
          <span className="finger-count">{chord.fingers}</span><span className="chord-symbol">{chord.symbol}</span><span className="chord-name">{chord.name}</span><span className="chord-led" style={{ background: chord.color }} />
        </button>)}</div>
        <div className="gesture-tip"><span className="gesture-symbol">⌁</span><div><strong>Outra mão</strong><span>Junte polegar e indicador para tocar. Solte para deixar o som desaparecer.</span></div></div>
      </aside>

      <section className="center-stage" aria-label="Instrumento">
        <div className="stage-label">{activeInput === "camera" ? "GESTO ATIVO" : cameraOn ? "CÂMERA AO VIVO" : "MODO DE EXPLORAÇÃO"}<span className="stage-pulse" /></div>
        <div className={`core ${playing ? "sounding" : ""}`} style={{ "--chord-color": currentChord.color } as React.CSSProperties}>
          <div className="core-rings" aria-hidden="true"><span /><span /><span /></div>
          <span className="core-caption">{melodyMode ? "NOTA ATUAL" : "ACORDE ATUAL"}</span>
          <strong>{melodyMode ? noteName : currentChord.symbol}</strong>
          <span className="core-name">{currentChord.name}</span>
        </div>
        <div className="stage-hint" role="status">{status}</div>
        {!cameraOn && <div className="camera-invite glass"><strong>Comece pela câmera</strong><span>Mostre duas mãos para controlar o som no ar.</span><button type="button" onClick={startCamera} disabled={loading}>{loading ? "Preparando..." : "Ativar câmera"}</button><small>Ou use os acordes e o botão de tocar sem câmera.</small></div>}
      </section>

      <aside className="sound-panel glass" aria-label="Controles do som">
        <div className="panel-heading"><span className="eyebrow">02 / SOUND ENGINE</span><h2>Construa o ambiente</h2><p>Escolha uma textura e ajuste o espaço do som.</p></div>
        <div className="mode-switch" role="group" aria-label="Modo de execução"><button type="button" className={!melodyMode ? "active" : ""} onClick={() => { stopSound(); setMelodyMode(false); melodyModeRef.current = false; }}>Acordes</button><button type="button" className={melodyMode ? "active" : ""} onClick={() => { stopSound(); setMelodyMode(true); melodyModeRef.current = true; }}>Melodia</button></div>
        <div className="field-label">PRESETS</div>
        <div className="preset-grid">{PRESETS.map((preset, index) => <button key={preset.id} type="button" className={`preset-card ${presetIndex === index ? "active" : ""}`} onClick={() => choosePreset(index)} aria-pressed={presetIndex === index}><span className="preset-orbit" /><strong>{preset.name}</strong><small>{preset.mood}</small></button>)}</div>
        <div className="effects"><div className="field-label">EFEITOS</div><label><span>Eco <b>{Math.round(echo * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={echo} onChange={(event) => { const value = Number(event.target.value); setEcho(value); synthRef.current.setEffects(value, space); }} /></label><label><span>Espaço <b>{Math.round(space * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={space} onChange={(event) => { const value = Number(event.target.value); setSpace(value); synthRef.current.setEffects(echo, value); }} /></label></div>
        {melodyMode && <div className="melody-guide"><strong>Melodia por altura</strong><span>Mova a mão que toca para cima ou para baixo. A altura escolhe uma nota do acorde.</span><div className="note-steps">{[0, 1, 2, 3].map((step) => <button key={step} type="button" className={melodyStep === step ? "active" : ""} onClick={() => { melodyStepRef.current = step; setMelodyStep(step); }} aria-label={`Nota ${step + 1}`}>{step + 1}</button>)}</div></div>}
      </aside>
    </main>

    <div className="bottom-zone">
      <section className="scope glass" aria-label="Osciloscópio"><div className="scope-title"><span className="signal live" /> OSCILOSCÓPIO <span>{playing ? "ÁUDIO AO VIVO" : "AGUARDANDO SOM"}</span></div><canvas ref={scopeRef} aria-label="Forma de onda do som" /></section>
      <div className="performance-dock glass"><button className={`play-button ${playing ? "active" : ""}`} type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); void startSound("manual"); }} onPointerUp={stopSound} onPointerCancel={stopSound} onLostPointerCapture={stopSound}><span>{playing ? "◉" : "▶"}</span><strong>{playing ? "Tocando" : "Segure para tocar"}</strong></button><span className="key-hint">ESPAÇO</span><span className="dock-divider" /><button className={recording ? "record-active" : ""} type="button" onClick={toggleRecording}><span className="record-dot" />{recording ? "Parar" : "Gravar"}</button><button type="button" onClick={() => void playRecording()} disabled={!events.length || recording}>Ouvir</button><button type="button" onClick={() => setEvents((current) => current.slice(0, -1))} disabled={!events.length || recording}>Desfazer</button><button type="button" onClick={saveProject} disabled={!events.length}>Salvar</button><button type="button" onClick={() => fileRef.current?.click()}>Abrir</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => { void openProject(event.target.files?.[0]); event.target.value = ""; }} /></div>
      <div className="sequence" aria-label="Sequência gravada">{events.length ? events.map((event, index) => <span key={`${index}-${event.startBeat}`}>{String(index + 1).padStart(2, "0")} <strong>{event.symbol}</strong></span>) : <span>{recording ? "Gravando: faça o gesto para adicionar acordes" : "Sua sequência aparece aqui depois de gravar"}</span>}</div>
    </div>

    {guideOpen && <div className="guide-backdrop" onClick={() => setGuideOpen(false)}><div className="guide glass" role="dialog" aria-modal="true" aria-label="Como tocar" onClick={(event) => event.stopPropagation()}><div className="guide-head"><span className="eyebrow">GUIA RÁPIDO</span><button type="button" onClick={() => setGuideOpen(false)} aria-label="Fechar guia">×</button></div><h2>Suas mãos são o instrumento.</h2><div className="guide-steps"><div><span className="guide-number">01</span><strong>Ative a câmera</strong><p>Fique de frente para ela com as duas mãos visíveis.</p></div><div><span className="guide-number">02</span><strong>Escolha um acorde</strong><p>Mostre de 1 a 5 dedos com uma mão. Os acordes acendem à esquerda.</p></div><div><span className="guide-number">03</span><strong>Faça soar</strong><p>Na outra mão, junte polegar e indicador. Segure e solte para moldar o som.</p></div><div><span className="guide-number">04</span><strong>Crie sua atmosfera</strong><p>Teste Void, Haze, Drift e Glow. Ajuste eco e espaço. Em Melodia, mova a mão para escolher a nota.</p></div></div><div className="guide-footer"><span>Sem câmera: clique nos acordes e segure o botão de tocar ou a barra de espaço.</span><button type="button" onClick={() => setGuideOpen(false)}>Entendi</button></div></div></div>}
    {message && <div className="toast glass" role="alert"><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Fechar mensagem">×</button></div>}
  </div>;
}

createRoot(document.getElementById("root")!).render(<App />);


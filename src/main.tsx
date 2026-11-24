import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PRESETS, Synth, validateProject, type Project, type RecordedEvent } from "./music";
import { CHORDS, MAJOR_SCALE, OCTAVES, noteColor, noteLabel, solfege } from "./notes";
import { SONGS, songRange } from "./songs";
import { PinchDetector, VoteFilter, ZoneSelector, pinchRatio, readFingers, type Point } from "./gestures";
import { ROLE_COLORS, createHandLandmarker, drawOverlay, frameToScreen, type DrawHand } from "./hands";
import { Keyboard } from "./Keyboard";
import { LogoMark, Wordmark } from "./Logo";
import "./tokens.css";
import "./style.css";

const BPM = 100;
const ZONE_MIN = 0.22;
const ZONE_MAX = 0.94;
const KEY_ROW = ["a", "s", "d", "f", "g", "h", "j", "k"];

type Mode = "chords" | "notes" | "song";
type Target = { notes: number[]; label: string; type: "chord" | "note"; zone?: number };

type FrameHand = { points: NormalizedLandmark[]; world: Point[]; sx: number; pinchAt: { x: number; y: number } };

function App() {
  const [mode, setMode] = useState<Mode>("chords");
  const [chord, setChord] = useState(0);
  const [octave, setOctave] = useState(1);
  const [zone, setZone] = useState(0);
  const [songIndex, setSongIndex] = useState(1);
  const [songPos, setSongPos] = useState(0);
  const [lit, setLit] = useState<number[]>([]);
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
  const [sensitivity, setSensitivity] = useState(0.55);
  const [fps, setFps] = useState(0);
  const [engine, setEngine] = useState("");
  const [fingers, setFingers] = useState(0);
  const [pinch, setPinch] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scopeRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const frameHandleRef = useRef(0);
  const synthRef = useRef(new Synth());
  const fingerVoteRef = useRef(new VoteFilter(6, 4));
  const pinchDetectorRef = useRef(new PinchDetector());
  const zoneSelectorRef = useRef(new ZoneSelector(8, ZONE_MIN, ZONE_MAX));
  const modeRef = useRef<Mode>("chords");
  const chordRef = useRef(0);
  const octaveRef = useRef(1);
  const zoneRef = useRef(0);
  const songIndexRef = useRef(1);
  const songPosRef = useRef(0);
  const swapRef = useRef(false);
  const playingRef = useRef(false);
  const soundRequestRef = useRef(0);
  const soundingZoneRef = useRef(-1);
  const pinchRef = useRef(false);
  const cameraRef = useRef(false);
  const recordRef = useRef(false);
  const recordingStartRef = useRef(0);
  const noteStartRef = useRef(0);
  const activeEventRef = useRef<{ symbol: string; notes: number[]; type: "chord" | "note" } | null>(null);
  const timersRef = useRef<number[]>([]);
  const scopeFrameRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const lastStampRef = useRef(0);
  const fpsCountRef = useRef({ frames: 0, since: 0 });
  const missingRef = useRef(0);

  useEffect(() => { recordRef.current = recording; }, [recording]);
  useEffect(() => { swapRef.current = swapHands; }, [swapHands]);
  useEffect(() => { pinchDetectorRef.current.setSensitivity(sensitivity); }, [sensitivity]);

  const song = SONGS[songIndex];
  const octaveBase = OCTAVES[octave].base;
  const zoneMidis = useMemo(() => MAJOR_SCALE.map((step) => octaveBase + step), [octaveBase]);

  const selectMode = (next: Mode) => {
    stopSound();
    stopDemo();
    modeRef.current = next;
    setMode(next);
    pinchRef.current = false;
    setStatus(next === "chords" ? "Mão esquerda escolhe, direita toca" : next === "notes" ? "Deslize a mão e junte os dedos" : "Junte os dedos para tocar a próxima nota");
  };
  const pickChord = (index: number) => { chordRef.current = index; setChord(index); };
  const pickOctave = (index: number) => { octaveRef.current = index; setOctave(index); };
  const pickSong = (index: number) => { stopSound(); stopDemo(); songIndexRef.current = index; songPosRef.current = 0; setSongIndex(index); setSongPos(0); };
  const restartSong = () => { stopDemo(); songPosRef.current = 0; setSongPos(0); };

  /* Osciloscópio */
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
          const samples = synthRef.current.getWaveform();
          const gradient = context.createLinearGradient(0, 0, width, 0);
          gradient.addColorStop(0, "#8b7cff"); gradient.addColorStop(0.5, "#5fe3e0"); gradient.addColorStop(1, "#ffd166");
          context.beginPath();
          context.lineWidth = 2;
          context.strokeStyle = gradient;
          context.globalAlpha = playingRef.current ? 1 : 0.45;
          for (let x = 0; x < width; x++) {
            const sample = samples ? (samples[Math.floor(x / width * samples.length)] - 128) / 128 : Math.sin(x * 0.05 + performance.now() * 0.001) * 0.05;
            const y = height / 2 + sample * height * 0.45;
            if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
          }
          context.stroke();
          context.globalAlpha = 1;
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
    soundingZoneRef.current = -1;
    setPlaying(false);
    setActiveInput(null);
    setLit([]);
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
    if (!cameraRef.current) setStatus("Pronto para tocar");
  }, []);

  const resolveTarget = useCallback((): Target => {
    if (modeRef.current === "chords") {
      const picked = CHORDS[chordRef.current];
      return { notes: picked.notes, label: picked.symbol, type: "chord" };
    }
    if (modeRef.current === "notes") {
      const midi = OCTAVES[octaveRef.current].base + MAJOR_SCALE[zoneRef.current];
      return { notes: [midi], label: noteLabel(midi), type: "note", zone: zoneRef.current };
    }
    const current = SONGS[songIndexRef.current];
    const midi = current.notes[songPosRef.current % current.notes.length].midi;
    return { notes: [midi], label: noteLabel(midi), type: "note" };
  }, []);

  const startSound = useCallback((input: "camera" | "manual", override?: Target) => {
    if (playingRef.current) return;
    const target = override ?? resolveTarget();
    const synth = synthRef.current;
    const request = ++soundRequestRef.current;
    const go = () => {
      synth.play(target.notes);
      playingRef.current = true;
      noteStartRef.current = performance.now();
      soundingZoneRef.current = target.zone ?? -1;
      activeEventRef.current = { type: target.type, symbol: target.label, notes: target.notes };
      if (modeRef.current === "song" && !override) {
        const length = SONGS[songIndexRef.current].notes.length;
        songPosRef.current = (songPosRef.current + 1) % length;
        setSongPos(songPosRef.current);
      }
      setLit(target.notes);
      setPlaying(true);
      setActiveInput(input);
      setStatus(`${target.label} tocando`);
      setMessage("");
    };
    if (synth.isReady) { go(); return; }
    synth.ready().then(() => {
      if (request !== soundRequestRef.current || (input === "camera" && !cameraRef.current)) return;
      go();
    }).catch(() => setMessage("Não foi possível iniciar o áudio. Verifique as permissões do navegador."));
  }, [resolveTarget]);

  /** Clique em tecla do teclado em tela, ou tecla do computador. */
  const playKey = useCallback((midi: number) => {
    if (playingRef.current) return;
    const upcoming = SONGS[songIndexRef.current].notes[songPosRef.current % SONGS[songIndexRef.current].notes.length].midi;
    const advances = modeRef.current === "song" && midi === upcoming;
    startSound("manual", advances ? undefined : { notes: [midi], label: noteLabel(midi), type: "note" });
  }, [startSound]);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker || video.readyState < 2 || video.currentTime === lastVideoTimeRef.current) return;
    lastVideoTimeRef.current = video.currentTime;
    let stamp = performance.now();
    if (stamp <= lastStampRef.current) stamp = lastStampRef.current + 1;
    lastStampRef.current = stamp;

    const result = landmarker.detectForVideo(video, stamp);
    const counter = fpsCountRef.current;
    counter.frames++;
    if (stamp - counter.since >= 1000) { setFps(Math.round(counter.frames * 1000 / (stamp - counter.since))); counter.frames = 0; counter.since = stamp; }

    const source = { w: video.videoWidth || 1280, h: video.videoHeight || 720 };
    const view = { w: canvas.clientWidth || window.innerWidth, h: canvas.clientHeight || window.innerHeight };
    const hands = result.landmarks.map((points, index) => {
      const wrist = frameToScreen(points[0], source, view);
      const thumbTip = points[4];
      const indexTip = points[8];
      const pinchAt = frameToScreen({ x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 }, source, view);
      const world = (result.worldLandmarks[index] ?? points) as Point[];
      return { points, world, sx: wrist.x, pinchAt } as FrameHand;
    });
    setHandsDetected((previous) => previous === hands.length ? previous : hands.length);

    const currentMode = modeRef.current;
    const sorted = [...hands].sort((a, b) => a.sx - b.sx);
    const swap = swapRef.current;
    let selector: FrameHand | undefined;
    let player: FrameHand | undefined;
    if (hands.length >= 2) {
      selector = swap ? sorted[1] : sorted[0];
      player = swap ? sorted[0] : sorted[1];
    } else if (hands.length === 1) {
      if (currentMode === "chords") {
        const onLeft = sorted[0].sx < 0.5;
        if (onLeft !== swap) selector = sorted[0]; else player = sorted[0];
      } else player = sorted[0];
    }

    let selectorBadge = "";
    if (selector) {
      const count = readFingers(selector.world).count;
      const stable = fingerVoteRef.current.update(count);
      selectorBadge = String(stable);
      setFingers((previous) => previous === stable ? previous : stable);
      if (currentMode === "chords" && stable >= 1 && stable <= CHORDS.length && stable - 1 !== chordRef.current) pickChord(stable - 1);
      if (currentMode === "notes" && stable >= 1 && stable <= OCTAVES.length && stable - 1 !== octaveRef.current) pickOctave(stable - 1);
    }

    let pinching = false;
    if (player) {
      missingRef.current = 0;
      const ratio = pinchRatio(player.world);
      pinching = pinchDetectorRef.current.update(ratio);
      const meter = Math.round(Math.max(0, Math.min(1, 1 - ratio / 0.9)) * 20) * 5;
      setPinch((previous) => previous === meter ? previous : meter);
      if (currentMode === "notes") {
        const next = zoneSelectorRef.current.update(player.pinchAt.x);
        if (next !== zoneRef.current) { zoneRef.current = next; setZone(next); }
      }
    } else {
      pinchDetectorRef.current.reset();
      missingRef.current++;
    }

    if (pinching && !pinchRef.current) startSound("camera");
    else if (pinching && playingRef.current && currentMode === "notes" && soundingZoneRef.current !== zoneRef.current) { stopSound(); startSound("camera"); }
    else if (!pinching && pinchRef.current) stopSound();
    pinchRef.current = pinching;
    if (!player && playingRef.current && missingRef.current > 4) stopSound();

    const zoneColor = noteColor(OCTAVES[octaveRef.current].base + MAJOR_SCALE[zoneRef.current]);
    const draw: DrawHand[] = hands.map((hand) => {
      const role = hand === selector ? "select" : hand === player ? "play" : "idle";
      return {
        points: hand.points, role,
        badge: role === "select" ? selectorBadge : undefined,
        pinchActive: role === "play" && pinching, pinchAt: hand.pinchAt,
        color: role === "play" && currentMode === "notes" ? zoneColor : ROLE_COLORS[role]
      };
    });
    drawOverlay(canvas, video, draw, currentMode === "notes" ? {
      count: 8, min: ZONE_MIN, max: ZONE_MAX, active: zoneRef.current,
      midis: MAJOR_SCALE.map((step) => OCTAVES[octaveRef.current].base + step),
      labels: MAJOR_SCALE.map((step) => solfege(OCTAVES[octaveRef.current].base + step))
    } : null);

    if (hands.length === 0) setStatus("Não vejo mãos: mostre-as à câmera, com boa luz");
    else if (!player) setStatus("Mostre a mão que toca (à direita da tela)");
    else if (currentMode === "chords" && !selector) setStatus("Mostre a mão que escolhe o acorde (à esquerda)");
    else setStatus(pinching ? "Tocando" : currentMode === "song" ? "Junte polegar e indicador" : "Pronto: junte polegar e indicador");
  }, [startSound, stopSound]);

  const scheduleFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraRef.current) return;
    const tick = () => {
      if (!cameraRef.current) return;
      try { processFrame(); } catch (error) {
        console.error(error);
        setStatus("Rastreamento interrompido");
      }
      scheduleFrame();
    };
    if ("requestVideoFrameCallback" in video) frameHandleRef.current = (video as HTMLVideoElement).requestVideoFrameCallback(tick);
    else frameHandleRef.current = requestAnimationFrame(tick);
  }, [processFrame]);

  const stopCamera = useCallback(() => {
    cameraRef.current = false;
    const video = videoRef.current;
    if (video && "cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(frameHandleRef.current);
    cancelAnimationFrame(frameHandleRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (video) { video.srcObject = null; video.removeAttribute("src"); }
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    fingerVoteRef.current.reset();
    pinchDetectorRef.current.reset();
    zoneSelectorRef.current.reset();
    pinchRef.current = false;
    lastVideoTimeRef.current = -1;
    stopSound();
    setCameraOn(false);
    setHandsDetected(0);
    setFps(0);
    setFingers(0);
    setPinch(0);
    setStatus("Câmera desligada");
  }, [stopSound]);

  const startCamera = async () => {
    if (loading || cameraRef.current) return;
    void synthRef.current.ready().catch(() => { /* O vídeo continua disponível se o áudio falhar. */ });
    setLoading(true);
    setMessage("");
    setStatus("Pedindo acesso à câmera…");
    try {
      const video = videoRef.current;
      if (!video) throw new Error("Prévia da câmera indisponível.");
      const demo = import.meta.env.DEV ? new URLSearchParams(location.search).get("demo") : null;
      if (demo) {
        video.src = demo; video.loop = true; video.muted = true;
      } else {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("A câmera exige HTTPS ou localhost.");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 60 } }, audio: false });
        streamRef.current = stream;
        video.srcObject = stream;
      }
      await video.play();
      setStatus("Carregando o reconhecimento de mãos…");
      const { landmarker, delegate } = await createHandLandmarker();
      landmarkerRef.current = landmarker;
      setEngine(delegate);
      cameraRef.current = true;
      fpsCountRef.current = { frames: 0, since: performance.now() };
      setCameraOn(true);
      setStatus("Mostre as mãos para a câmera");
      scheduleFrame();
    } catch (error) {
      stopCamera();
      const detail = error instanceof Error ? error.message : "Erro desconhecido";
      setMessage(`Não foi possível ativar a câmera. ${detail} Você ainda pode tocar pelo teclado em tela.`);
    } finally { setLoading(false); }
  };

  const stopDemo = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    synthRef.current.stop();
    setDemoPlaying(false);
    setLit((current) => playingRef.current ? current : []);
  }, []);

  const playSequence = useCallback(async (items: { pitches: number[]; at: number; length: number }[], label: string) => {
    stopSound();
    stopDemo();
    await synthRef.current.ready();
    setDemoPlaying(true);
    setStatus(label);
    for (const item of items) {
      timersRef.current.push(window.setTimeout(() => { synthRef.current.play(item.pitches); setLit(item.pitches); }, item.at));
      timersRef.current.push(window.setTimeout(() => { synthRef.current.stop(); setLit([]); }, item.at + item.length));
    }
    const end = Math.max(...items.map((item) => item.at + item.length));
    timersRef.current.push(window.setTimeout(() => { setDemoPlaying(false); setStatus("Reprodução concluída"); }, end + 400));
  }, [stopDemo, stopSound]);

  const listenSong = () => {
    const ms = 60000 / song.tempo;
    let cursor = 0;
    const items = song.notes.map((note) => {
      const item = { pitches: [note.midi], at: cursor * ms, length: Math.max(80, note.beats * ms * 0.88) };
      cursor += note.beats;
      return item;
    });
    void playSequence(items, `Ouvindo: ${song.title}`);
  };

  const playRecording = () => {
    if (!events.length) return;
    void playSequence(events.map((event) => ({
      pitches: event.pitchesMidi, at: event.startBeat * 60000 / BPM, length: event.durationBeats * 60000 / BPM
    })), "Reproduzindo sequência");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement) return;
      if (event.code === "Space") { event.preventDefault(); startSound("manual"); return; }
      const lower = event.key.toLowerCase();
      const row = KEY_ROW.indexOf(lower);
      if (row >= 0 && !event.metaKey && !event.ctrlKey) { playKey(OCTAVES[octaveRef.current].base + MAJOR_SCALE[row]); return; }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < CHORDS.length && modeRef.current === "chords") pickChord(index);
    };
    const onKeyUp = (event: KeyboardEvent) => { if (event.code === "Space" || KEY_ROW.includes(event.key.toLowerCase())) stopSound(); };
    const onVisibility = () => { if (document.hidden) stopSound(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [startSound, stopSound, playKey]);

  useEffect(() => () => {
    cameraRef.current = false;
    cancelAnimationFrame(frameHandleRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
    timersRef.current.forEach(clearTimeout);
    cancelAnimationFrame(scopeFrameRef.current);
    void synthRef.current.dispose();
  }, []);

  const toggleRecording = () => {
    if (recording) { stopSound(); setRecording(false); setStatus("Gravação concluída"); }
    else { setEvents([]); recordingStartRef.current = performance.now(); setRecording(true); setStatus("Gravando sua sequência"); }
  };

  const saveProject = () => {
    const project: Project = {
      schemaVersion: 1, title: "Minha criação", mode: events.some((event) => event.type === "note") ? "performance" : "chords", tempoBpm: BPM,
      scale: { tonic: "C", type: "major" }, events
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

  /* Valores de exibição */
  const range = songRange(song);
  const upcoming = song.notes[songPos % song.notes.length];
  const keyboard = mode === "song"
    ? { low: range.low, high: range.high, showSharps: range.hasSharps }
    : { low: octaveBase, high: octaveBase + 12, showSharps: false };
  const next = mode === "song" ? upcoming.midi : undefined;
  const focusMidi = playing && lit.length === 1 ? lit[0] : mode === "notes" ? zoneMidis[zone] : upcoming.midi;
  const nowColor = mode === "chords" ? CHORDS[chord].color : noteColor(focusMidi);
  const nowCaption = mode === "chords" ? "ACORDE" : mode === "notes" ? "NOTA" : "PRÓXIMA NOTA";
  const nowText = mode === "chords" ? CHORDS[chord].symbol : solfege(focusMidi);
  const nowName = mode === "chords" ? CHORDS[chord].name : mode === "notes" ? `${OCTAVES[octave].name} · ${noteLabel(focusMidi)}` : song.title;
  const ribbon = mode === "song" ? Array.from({ length: 8 }, (_, i) => ({ index: songPos + i, note: song.notes[(songPos + i) % song.notes.length], wrap: songPos + i >= song.notes.length })) : [];

  return <div className="studio">
    <video ref={videoRef} className={`camera-video ${cameraOn ? "is-visible" : ""}`} playsInline muted autoPlay aria-label="Prévia da câmera" />
    <div className="camera-vignette" aria-hidden="true" />
    <canvas ref={canvasRef} className="hand-overlay" aria-hidden="true" />
    <div className="atmosphere" aria-hidden="true"><div className="aura aura-one" /><div className="aura aura-two" /></div>

    <header className="studio-header glass">
      <Wordmark />
      <div className="header-status">
        <span className={`signal ${cameraOn && handsDetected > 0 ? "live" : ""}`} />
        <span>{cameraOn ? `${handsDetected} ${handsDetected === 1 ? "mão" : "mãos"}` : "Câmera desligada"}</span>
        {cameraOn && <span className="chip">{fps} fps · {engine}</span>}
      </div>
      <div className="header-actions">
        <button type="button" className="btn ghost" onClick={() => setGuideOpen((value) => !value)} aria-expanded={guideOpen}>Como tocar</button>
        {cameraOn && <button type="button" className="btn ghost" onClick={() => setSwapHands((value) => !value)}>{swapHands ? "Mãos invertidas" : "Trocar mãos"}</button>}
        <button type="button" className="btn primary" onClick={cameraOn ? stopCamera : startCamera} disabled={loading}>{loading ? "Preparando…" : cameraOn ? "Desligar câmera" : "Ativar câmera"}</button>
      </div>
    </header>

    <main className="performance">
      <aside className="panel glass" aria-label="Modo e gestos">
        <div className="segmented" role="group" aria-label="Modo de execução">
          {([["chords", "Acordes"], ["notes", "Notas"], ["song", "Músicas"]] as const).map(([id, label]) =>
            <button key={id} type="button" className={mode === id ? "active" : ""} onClick={() => selectMode(id)} aria-pressed={mode === id}>{label}</button>)}
        </div>

        {mode === "chords" && <>
          <div className="panel-heading"><span className="eyebrow">MÃO ESQUERDA</span><h2>Mostre de 1 a 5 dedos</h2></div>
          <div className="chord-list">{CHORDS.map((item, index) => <button key={item.symbol} type="button" className={`chord-button ${chord === index ? "selected" : ""}`} style={{ "--note": item.color } as React.CSSProperties} onClick={() => pickChord(index)} aria-pressed={chord === index}>
            <span className="finger-count">{item.fingers}</span><span className="chord-symbol">{item.symbol}</span><span className="chord-name">{item.name}</span><span className="degree">{item.degree}</span>
          </button>)}</div>
        </>}

        {mode === "notes" && <>
          <div className="panel-heading"><span className="eyebrow">MÃO DIREITA</span><h2>Deslize e junte os dedos</h2><p>A tela se divide em 8 faixas: Dó Ré Mi Fá Sol Lá Si Dó. Mão esquerda com 1, 2 ou 3 dedos muda a oitava.</p></div>
          <div className="segmented" role="group" aria-label="Oitava">{OCTAVES.map((item, index) =>
            <button key={item.name} type="button" className={octave === index ? "active" : ""} onClick={() => pickOctave(index)}>{index + 1} · {item.name}</button>)}</div>
          <div className="note-chips">{zoneMidis.map((midi, index) => <span key={midi} className={zone === index ? "active" : ""} style={{ "--note": noteColor(midi) } as React.CSSProperties}>{solfege(midi)}</span>)}</div>
        </>}

        {mode === "song" && <>
          <div className="panel-heading"><span className="eyebrow">BIBLIOTECA</span><h2>Toque no seu ritmo</h2><p>Cada pinça toca a próxima nota. Segure para alongar, solte para a pausa.</p></div>
          <div className="song-list">{SONGS.map((item, index) => <button key={item.id} type="button" className={`song-button ${songIndex === index ? "selected" : ""}`} onClick={() => pickSong(index)} aria-pressed={songIndex === index}>
            <strong>{item.title}</strong><small>{item.subtitle} · {item.notes.length} notas</small></button>)}</div>
          <div className="song-actions"><button type="button" className="btn ghost" onClick={demoPlaying ? stopDemo : listenSong}>{demoPlaying ? "Parar" : "▶ Ouvir"}</button><button type="button" className="btn ghost" onClick={restartSong}>↺ Reiniciar</button></div>
        </>}
      </aside>

      <section className="stage" aria-label="Instrumento">
        {!cameraOn && <div className="hero">
          <LogoMark size={72} />
          <h1>Música com as <span>suas mãos</span></h1>
          <p>Sem instrumento, sem teoria. Mostre as mãos à câmera, escolha um acorde com os dedos e toque juntando polegar e indicador.</p>
          <button type="button" className="btn primary large" onClick={startCamera} disabled={loading}>{loading ? "Preparando…" : "Ativar câmera"}</button>
          <small>Ou toque agora com o teclado em tela, as teclas A–K ou a barra de espaço.</small>
        </div>}
        <div className={`now ${cameraOn ? "compact" : ""} ${playing ? "sounding" : ""}`} style={{ "--note": nowColor } as React.CSSProperties}>
          <span className="now-caption">{nowCaption}</span>
          <strong>{nowText}</strong>
          <span className="now-name">{nowName}</span>
        </div>
        {mode === "song" && <div className="ribbon" aria-label="Próximas notas">{ribbon.map(({ index, note, wrap }) =>
          <span key={index} className={index === songPos ? "current" : ""} style={{ "--note": noteColor(note.midi) } as React.CSSProperties}>{wrap ? "↺ " : ""}{solfege(note.midi)}</span>)}
          <small>{songPos + 1}/{song.notes.length}</small></div>}
        <div className="stage-hint" role="status" aria-live="polite">{status}</div>
      </section>

      <aside className="panel glass" aria-label="Som e leituras">
        {cameraOn && <div className="readout">
          <div className="field-label">LEITURA AO VIVO</div>
          <div className="readout-row"><span>Dedos (escolha)</span><b>{handsDetected ? fingers : "–"}</b></div>
          <div className="readout-row"><span>Pinça</span><div className="meter"><i style={{ width: `${pinch}%` }} /></div></div>
          <label className="slider"><span>Sensibilidade da pinça <b>{Math.round(sensitivity * 100)}%</b></span>
            <input type="range" min="0" max="1" step="0.01" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} /></label>
        </div>}
        <div className="field-label">SOM</div>
        <div className="preset-grid">{PRESETS.map((preset, index) => <button key={preset.id} type="button" className={`preset-card ${presetIndex === index ? "active" : ""}`} onClick={() => choosePreset(index)} aria-pressed={presetIndex === index}><strong>{preset.name}</strong><small>{preset.mood}</small></button>)}</div>
        <div className="effects"><label className="slider"><span>Eco <b>{Math.round(echo * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={echo} onChange={(event) => { const value = Number(event.target.value); setEcho(value); synthRef.current.setEffects(value, space); }} /></label><label className="slider"><span>Espaço <b>{Math.round(space * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={space} onChange={(event) => { const value = Number(event.target.value); setSpace(value); synthRef.current.setEffects(echo, value); }} /></label></div>
      </aside>
    </main>

    <div className="bottom-zone">
      <Keyboard low={keyboard.low} high={keyboard.high} showSharps={keyboard.showSharps} lit={lit} next={next}
        onDown={(midi) => playKey(midi)} onUp={stopSound} />
      <div className="performance-dock glass">
        <button className={`play-button ${playing ? "active" : ""}`} type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); startSound("manual"); }} onPointerUp={stopSound} onPointerCancel={stopSound} onLostPointerCapture={stopSound}><span>{playing && activeInput === "manual" ? "◉" : "▶"}</span><strong>{mode === "chords" ? "Segure para tocar" : mode === "notes" ? "Tocar nota" : "Próxima nota"}</strong></button>
        <span className="key-hint">ESPAÇO</span>
        <span className="dock-divider" />
        <button className={`btn ghost ${recording ? "record-active" : ""}`} type="button" onClick={toggleRecording}><span className="record-dot" />{recording ? "Parar" : "Gravar"}</button>
        <button type="button" className="btn ghost" onClick={playRecording} disabled={!events.length || recording}>Ouvir</button>
        <button type="button" className="btn ghost" onClick={() => setEvents((current) => current.slice(0, -1))} disabled={!events.length || recording}>Desfazer</button>
        <button type="button" className="btn ghost" onClick={saveProject} disabled={!events.length}>Salvar</button>
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>Abrir</button>
        <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => { void openProject(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="sequence" aria-label="Sequência gravada">{events.length ? events.map((event, index) => <span key={`${index}-${event.startBeat}`}><strong>{event.symbol}</strong></span>) : <span>{recording ? "Gravando…" : "Grave para ver a sequência aqui"}</span>}</div>
        <canvas ref={scopeRef} className="scope" aria-label="Forma de onda do som" />
      </div>
    </div>

    {guideOpen && <div className="guide-backdrop" onClick={() => setGuideOpen(false)}><div className="guide glass" role="dialog" aria-modal="true" aria-label="Como tocar" onClick={(event) => event.stopPropagation()}>
      <div className="guide-head"><span className="eyebrow">GUIA RÁPIDO</span><button type="button" onClick={() => setGuideOpen(false)} aria-label="Fechar guia">×</button></div>
      <h2>Suas mãos são o instrumento.</h2>
      <div className="guide-steps">
        <div><span className="guide-number">01</span><strong>Ative a câmera</strong><p>Fique de frente, com boa luz e as duas mãos à vista. As mãos ganham linhas coloridas quando são detectadas.</p></div>
        <div><span className="guide-number">02</span><strong>Mão esquerda escolhe</strong><p>De 1 a 5 dedos: troca o acorde (modo Acordes) ou a oitava (modo Notas, 1 a 3 dedos).</p></div>
        <div><span className="guide-number">03</span><strong>Mão direita toca</strong><p>Junte polegar e indicador para soar; solte para parar. Em Notas, deslize pelas 8 faixas: Dó Ré Mi Fá Sol Lá Si Dó.</p></div>
        <div><span className="guide-number">04</span><strong>Músicas</strong><p>Escolha uma melodia e dê uma pinça por nota. O teclado mostra a próxima, e “Ouvir” toca a melodia inteira.</p></div>
      </div>
      <div className="guide-footer"><span>Sem câmera: use o teclado em tela, as teclas A S D F G H J K ou a barra de espaço.</span><button type="button" className="btn primary" onClick={() => setGuideOpen(false)}>Entendi</button></div>
    </div></div>}
    {message && <div className="toast glass" role="alert"><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Fechar mensagem">×</button></div>}
  </div>;
}

createRoot(document.getElementById("root")!).render(<App />);

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PRESETS, Synth, validateProject, type Project, type RecordedEvent } from "./music";
import { PROGRESSIONS, MAJOR_SCALE, OCTAVES, chordName, noteColor, noteLabel, solfege } from "./notes";
import { SONGS, songRange, staffPitches } from "./songs";
import { Ema, PinchDetector, VoteFilter, ZoneSelector, pinchRatio, readFingers, type Point } from "./gestures";
import { ROLE_COLORS, createHandLandmarker, drawOverlay, frameToScreen, type DrawHand, type ZoneOverlay } from "./hands";
import { Keyboard } from "./Keyboard";
import { LogoMark, Wordmark } from "./Logo";
import { Landing } from "./Landing";
import { LangProvider, LangSwitch, t, tr, useLang, type Key } from "./i18n";
import "./tokens.css";
import "./style.css";

const BPM = 100;
const KEY_ROW = ["a", "s", "d", "f", "g", "h", "j", "k"];
const PINCH_STORAGE = "melodycam-pinch";

/** Faixas laterais (notas em "Lados"): no desktop evitam os painéis; no celular usam a largura toda. */
const zoneRange = () => window.innerWidth > 900 ? { min: 0.19, max: 0.81 } : { min: 0.06, max: 0.94 };
/** Faixas verticais (partitura), como fração da altura da tela. */
const yBand = () => window.innerWidth > 900 ? { top: 0.12, bottom: 0.6 } : { top: 0.14, bottom: 0.48 };

type Mode = "chords" | "notes" | "song";
type ChordMethod = "height" | "fingers";
type NotesAxis = "x" | "y";
type SongStyle = "sequence" | "staff";
type Target = { notes: number[]; label: string; type: "chord" | "note"; zone?: number; advance?: boolean };
type Status = { key: Key; vars?: Record<string, string | number> };
type Calib = "open" | "close" | "done" | "fail" | null;
type FrameHand = { points: NormalizedLandmark[]; world: Point[]; sx: number; pinchAt: { x: number; y: number }; anchor: { x: number; y: number } };

/** Tenta resoluções do melhor para o mais simples; "Failed to allocate videosource" costuma ser câmera ocupada, então repete uma vez. */
async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 } }, audio: false },
    { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
    { video: true, audio: false }
  ];
  let lastError: unknown;
  for (let round = 0; round < 2; round++) {
    for (const constraints of attempts) {
      try { return await navigator.mediaDevices.getUserMedia(constraints); } catch (error) {
        lastError = error;
        if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "NotFoundError")) throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  throw lastError;
}

function cameraErrorText(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotReadableError" || (error instanceof Error && /videosource|allocate/i.test(error.message))) return t("err.busy");
  if (name === "NotAllowedError") return t("err.denied");
  if (name === "NotFoundError") return t("err.notFound");
  return error instanceof Error ? error.message : t("err.unknown");
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: readonly (readonly [T, string])[]; onChange: (next: T) => void; label: string }) {
  return <div className="segmented" role="group" aria-label={label}>
    {options.map(([id, text]) => <button key={id} type="button" className={value === id ? "active" : ""} onClick={() => onChange(id)} aria-pressed={value === id}>{text}</button>)}
  </div>;
}

function App() {
  const { lang } = useLang();
  const [mode, setMode] = useState<Mode>("chords");
  const [chord, setChord] = useState(0);
  const [progIndex, setProgIndex] = useState(0);
  const [chordMethod, setChordMethod] = useState<ChordMethod>("height");
  const [notesAxis, setNotesAxis] = useState<NotesAxis>("x");
  const [songStyle, setSongStyle] = useState<SongStyle>("sequence");
  const [octave, setOctave] = useState(1);
  const [zone, setZone] = useState(0);
  const [songIndex, setSongIndex] = useState(1);
  const [songPos, setSongPos] = useState(0);
  const [lit, setLit] = useState<number[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swapHands, setSwapHands] = useState(false);
  const [status, setStatus] = useState<Status>({ key: "status.ready" });
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
  const [sensitivity, setSensitivity] = useState(0.6);
  const [fps, setFps] = useState(0);
  const [engine, setEngine] = useState("");
  const [fingers, setFingers] = useState(0);
  const [pinch, setPinch] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [panelsHidden, setPanelsHidden] = useState(false);
  const [glide, setGlide] = useState(0.5);
  const [calib, setCalib] = useState<Calib>(null);

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
  const zoneSelectorRef = useRef(new ZoneSelector(8, 0, 1, 0.3));
  const chordZoneRef = useRef(new ZoneSelector(PROGRESSIONS[0].chords.length, 0, 1, 0.3));
  const songZoneRef = useRef(new ZoneSelector(staffPitches(SONGS[1]).length, 0, 1, 0.3));
  const pinchEmaRef = useRef(new Ema(0.55));
  const anchorXRef = useRef(new Ema(0.45));
  const anchorYRef = useRef(new Ema(0.45));
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const probeRef = useRef<HTMLCanvasElement | null>(null);
  const boostRef = useRef(1);
  const frameCountRef = useRef(0);
  const lastPinchRef = useRef(0);
  const lastStatusRef = useRef("");
  const calibRef = useRef<{ step: "open" | "close" | null; samples: number[]; until: number; open: number }>({ step: null, samples: [], until: 0, open: 0 });
  const modeRef = useRef<Mode>("chords");
  const chordMethodRef = useRef<ChordMethod>("height");
  const notesAxisRef = useRef<NotesAxis>("x");
  const songStyleRef = useRef<SongStyle>("sequence");
  const chordRef = useRef(0);
  const progRef = useRef(0);
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

  /** Atualiza a mensagem de estado só quando muda (é chamada a cada quadro da câmera). */
  const say = useCallback((key: Key, vars?: Record<string, string | number>) => {
    const signature = key + JSON.stringify(vars ?? {});
    if (signature === lastStatusRef.current) return;
    lastStatusRef.current = signature;
    setStatus({ key, vars });
  }, []);

  useEffect(() => { recordRef.current = recording; }, [recording]);
  useEffect(() => { swapRef.current = swapHands; }, [swapHands]);
  useEffect(() => { pinchDetectorRef.current.setSensitivity(sensitivity); }, [sensitivity]);
  useEffect(() => { synthRef.current.setGlide(0.08 + glide * 0.8); }, [glide]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PINCH_STORAGE) ?? "null") as { open: number; closed: number } | null;
      if (saved && Number.isFinite(saved.open) && Number.isFinite(saved.closed)) { pinchDetectorRef.current.setCustom(saved.open, saved.closed); setCalib("done"); }
    } catch { /* sem calibração salva */ }
  }, []);

  const chords = PROGRESSIONS[progIndex].chords;
  const song = SONGS[songIndex];
  const octaveBase = OCTAVES[octave].base;
  const zoneMidis = useMemo(() => MAJOR_SCALE.map((step) => octaveBase + step), [octaveBase]);

  const selectMode = (next: Mode) => {
    stopSound();
    stopDemo();
    modeRef.current = next;
    setMode(next);
    pinchRef.current = false;
    synthRef.current.setBrightness(0.4333);
    const padPreset = presetIndex <= 3;
    if (next === "chords" && !padPreset) choosePreset(0);
    if (next !== "chords" && padPreset) choosePreset(PRESETS.findIndex((item) => item.id === "piano"));
    say(next === "chords" ? (chordMethodRef.current === "height" ? "status.modeChordsHeight" : "status.modeChordsFingers") : next === "notes" ? "status.modeNotes" : "status.modeSong");
  };
  const pickChord = (index: number) => {
    chordRef.current = index;
    setChord(index);
    // Troca ao vivo: as vozes deslizam para o novo acorde, sem reataque.
    if (playingRef.current && modeRef.current === "chords") {
      if (!switchTarget(resolveTarget())) {
        const input = cameraRef.current ? "camera" : "manual";
        stopSound();
        startSound(input);
      }
    }
  };
  const pickProgression = (index: number) => {
    stopSound();
    progRef.current = index;
    chordRef.current = 0;
    chordZoneRef.current = new ZoneSelector(PROGRESSIONS[index].chords.length, 0, 1, 0.3);
    setProgIndex(index);
    setChord(0);
  };
  const pickChordMethod = (next: ChordMethod) => { stopSound(); chordMethodRef.current = next; setChordMethod(next); chordZoneRef.current.reset(); say(next === "height" ? "status.modeChordsHeight" : "status.modeChordsFingers"); };
  const pickNotesAxis = (next: NotesAxis) => { stopSound(); notesAxisRef.current = next; setNotesAxis(next); zoneSelectorRef.current.reset(); };
  const pickSongStyle = (next: SongStyle) => { stopSound(); songStyleRef.current = next; setSongStyle(next); songZoneRef.current.reset(); };
  const pickOctave = (index: number) => { octaveRef.current = index; setOctave(index); };
  const pickSong = (index: number) => {
    stopSound(); stopDemo();
    songIndexRef.current = index; songPosRef.current = 0;
    songZoneRef.current = new ZoneSelector(staffPitches(SONGS[index]).length, 0, 1, 0.3);
    setSongIndex(index); setSongPos(0);
  };
  const restartSong = () => { stopDemo(); songPosRef.current = 0; setSongPos(0); };
  const startCalibration = () => {
    stopSound();
    calibRef.current = { step: "open", samples: [], until: performance.now() + 2200, open: 0 };
    setCalib("open");
  };

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

  /** Fecha o evento em gravação (usado ao soltar e também a cada troca suave de acorde/nota). */
  const commitActiveEvent = useCallback(() => {
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
  }, []);

  const stopSound = useCallback(() => {
    soundRequestRef.current++;
    if (!playingRef.current) return;
    synthRef.current.stop();
    playingRef.current = false;
    soundingZoneRef.current = -1;
    setPlaying(false);
    setActiveInput(null);
    setLit([]);
    commitActiveEvent();
    activeEventRef.current = null;
    if (!cameraRef.current) say("status.readyPlay");
  }, [commitActiveEvent, say]);

  const advanceSong = useCallback(() => {
    const length = SONGS[songIndexRef.current].notes.length;
    songPosRef.current = (songPosRef.current + 1) % length;
    setSongPos(songPosRef.current);
  }, []);

  const resolveTarget = useCallback((): Target => {
    if (modeRef.current === "chords") {
      const picked = PROGRESSIONS[progRef.current].chords[chordRef.current];
      return { notes: picked.notes, label: picked.symbol, type: "chord" };
    }
    if (modeRef.current === "notes") {
      const midi = OCTAVES[octaveRef.current].base + MAJOR_SCALE[zoneRef.current];
      return { notes: [midi], label: noteLabel(midi), type: "note", zone: zoneRef.current };
    }
    const current = SONGS[songIndexRef.current];
    const expected = current.notes[songPosRef.current % current.notes.length].midi;
    if (songStyleRef.current === "staff") {
      const pitches = staffPitches(current);
      const index = Math.min(songZoneRef.current.index, pitches.length - 1);
      const midi = pitches[index];
      return { notes: [midi], label: noteLabel(midi), type: "note", zone: index, advance: midi === expected };
    }
    return { notes: [expected], label: noteLabel(expected), type: "note", advance: true };
  }, []);

  /** Troca acorde ou nota sem reatacar: as vozes deslizam para a nova altura. Falso se não há som ativo. */
  const switchTarget = useCallback((target: Target): boolean => {
    if (!playingRef.current || !synthRef.current.glideTo(target.notes)) return false;
    commitActiveEvent();
    noteStartRef.current = performance.now();
    activeEventRef.current = { type: target.type, symbol: target.label, notes: target.notes };
    soundingZoneRef.current = target.zone ?? -1;
    if (target.advance && modeRef.current === "song") advanceSong();
    setLit(target.notes);
    say("status.playingLabel", { label: target.label });
    return true;
  }, [commitActiveEvent, advanceSong, say]);

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
      if (target.advance && modeRef.current === "song") advanceSong();
      setLit(target.notes);
      setPlaying(true);
      setActiveInput(input);
      say("status.playingLabel", { label: target.label });
      setMessage("");
    };
    if (synth.isReady) { go(); return; }
    synth.ready().then(() => {
      if (request !== soundRequestRef.current || (input === "camera" && !cameraRef.current)) return;
      go();
    }).catch(() => setMessage(t("err.audio")));
  }, [resolveTarget, advanceSong, say]);

  /** Clique em tecla do teclado em tela, ou tecla do computador. */
  const playKey = useCallback((midi: number) => {
    if (playingRef.current) return;
    const current = SONGS[songIndexRef.current];
    const upcoming = current.notes[songPosRef.current % current.notes.length].midi;
    startSound("manual", { notes: [midi], label: noteLabel(midi), type: "note", advance: modeRef.current === "song" && midi === upcoming });
  }, [startSound]);

  /** Desenha o quadro numa tela menor com brilho adaptativo: em ambiente escuro a detecção enxerga mais, e a prévia também fica clara. */
  const prepareFrame = (video: HTMLVideoElement): HTMLVideoElement | HTMLCanvasElement => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return video;
    const work = workRef.current ?? (workRef.current = document.createElement("canvas"));
    const w = Math.min(640, vw);
    const h = Math.round(w * vh / vw);
    if (work.width !== w || work.height !== h) { work.width = w; work.height = h; }
    const context = work.getContext("2d");
    if (!context) return video;
    if (frameCountRef.current++ % 20 === 0) {
      const probe = probeRef.current ?? (probeRef.current = document.createElement("canvas"));
      probe.width = 32; probe.height = 18;
      const probeContext = probe.getContext("2d", { willReadFrequently: true });
      if (probeContext) {
        probeContext.drawImage(video, 0, 0, 32, 18);
        const data = probeContext.getImageData(0, 0, 32, 18).data;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        const luminance = total / (data.length / 4) / 255;
        const target = Math.max(1, Math.min(2.6, 0.42 / Math.max(luminance, 0.03)));
        boostRef.current += (target - boostRef.current) * 0.5;
        video.style.filter = `brightness(${boostRef.current.toFixed(2)}) contrast(1.08)`;
      }
    }
    context.filter = `brightness(${boostRef.current.toFixed(2)}) contrast(1.1)`;
    context.drawImage(video, 0, 0, w, h);
    return work;
  };

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker || video.readyState < 2 || video.currentTime === lastVideoTimeRef.current) return;
    lastVideoTimeRef.current = video.currentTime;
    let stamp = performance.now();
    if (stamp <= lastStampRef.current) stamp = lastStampRef.current + 1;
    lastStampRef.current = stamp;

    const result = landmarker.detectForVideo(prepareFrame(video), stamp);
    const counter = fpsCountRef.current;
    counter.frames++;
    if (stamp - counter.since >= 1000) { setFps(Math.round(counter.frames * 1000 / (stamp - counter.since))); counter.frames = 0; counter.since = stamp; }

    const source = { w: video.videoWidth || 1280, h: video.videoHeight || 720 };
    const view = { w: canvas.clientWidth || window.innerWidth, h: canvas.clientHeight || window.innerHeight };
    const hands = result.landmarks.map((points, index) => {
      const wrist = frameToScreen(points[0], source, view);
      const pinchAt = frameToScreen({ x: (points[4].x + points[8].x) / 2, y: (points[4].y + points[8].y) / 2 }, source, view);
      const world = (result.worldLandmarks[index] ?? points) as Point[];
      // Centro da palma: não se move quando a pinça fecha, ao contrário do ponto entre polegar e indicador.
      const palm = [0, 5, 9, 13, 17].reduce((sum, i) => ({ x: sum.x + points[i].x / 5, y: sum.y + points[i].y / 5 }), { x: 0, y: 0 });
      return { points, world, sx: wrist.x, pinchAt, anchor: frameToScreen(palm, source, view) } as FrameHand;
    });
    setHandsDetected((previous) => previous === hands.length ? previous : hands.length);

    const currentMode = modeRef.current;
    const prog = PROGRESSIONS[progRef.current];
    const chordHeight = currentMode === "chords" && (prog.select === "height" || chordMethodRef.current === "height");
    const notesVertical = currentMode === "notes" && notesAxisRef.current === "y";
    const staffSong = currentMode === "song" && songStyleRef.current === "staff";
    const useSelector = (currentMode === "chords" && !chordHeight) || currentMode === "notes";
    const slide = currentMode !== "chords" || chordHeight;
    const range = zoneRange();
    const band = yBand();
    const vMin = 1 - band.bottom;
    const vMax = 1 - band.top;

    // Papéis das mãos. Com uma só mão, ela toca (exceto no modo Acordes por dedos, onde o lado da tela decide).
    const sorted = [...hands].sort((a, b) => a.sx - b.sx);
    const swap = swapRef.current;
    let selector: FrameHand | undefined;
    let player: FrameHand | undefined;
    if (hands.length >= 2) {
      player = swap ? sorted[0] : sorted[1];
      if (useSelector) selector = swap ? sorted[1] : sorted[0];
    } else if (hands.length === 1) {
      if (!slide) {
        const onLeft = sorted[0].sx < 0.5;
        if (onLeft !== swap) selector = sorted[0]; else player = sorted[0];
      } else player = sorted[0];
    }

    let selectorBadge = "";
    if (selector) {
      const stable = fingerVoteRef.current.update(readFingers(selector.world).count);
      selectorBadge = String(stable);
      setFingers((previous) => previous === stable ? previous : stable);
      if (currentMode === "chords" && !chordHeight && stable >= 1 && stable <= prog.chords.length && stable - 1 !== chordRef.current) pickChord(stable - 1);
      if (currentMode === "notes" && stable >= 1 && stable <= OCTAVES.length && stable - 1 !== octaveRef.current) pickOctave(stable - 1);
    }

    let pinching = false;
    if (player) {
      missingRef.current = 0;
      const raw = pinchRatio(player.world);
      const ratio = pinchEmaRef.current.update(raw);
      const cal = calibRef.current;
      if (cal.step) {
        // Calibração: mede a mão aberta e depois fechada, e ajusta os limiares à pessoa.
        cal.samples.push(raw);
        if (stamp >= cal.until) {
          const ordered = [...cal.samples].sort((a, b) => a - b);
          const median = ordered[Math.floor(ordered.length / 2)];
          if (ordered.length < 8) { cal.step = null; setCalib("fail"); }
          else if (cal.step === "open") { cal.open = median; cal.step = "close"; cal.samples = []; cal.until = stamp + 2200; setCalib("close"); }
          else {
            cal.step = null;
            if (cal.open - median > 0.15) {
              pinchDetectorRef.current.setCustom(cal.open, median);
              try { localStorage.setItem(PINCH_STORAGE, JSON.stringify({ open: cal.open, closed: median })); } catch { /* ignorado */ }
              setCalib("done");
            } else setCalib("fail");
          }
        }
      } else pinching = pinchDetectorRef.current.update(ratio);
      const meter = Math.round(Math.max(0, Math.min(1, 1 - ratio / 0.9)) * 20) * 5;
      setPinch((previous) => previous === meter ? previous : meter);

      const x = anchorXRef.current.update(player.anchor.x);
      const v = 1 - anchorYRef.current.update(player.anchor.y);
      if (currentMode === "chords") synthRef.current.setBrightness(chordHeight ? x : v);
      if (chordHeight) {
        const index = chordZoneRef.current.update(v, vMin, vMax);
        if (index !== chordRef.current) pickChord(index);
      }
      if (currentMode === "notes") {
        const next = notesVertical ? zoneSelectorRef.current.update(v, vMin, vMax) : zoneSelectorRef.current.update(x, range.min, range.max);
        if (next !== zoneRef.current) { zoneRef.current = next; setZone(next); }
      }
      if (staffSong) songZoneRef.current.update(v, vMin, vMax);
    } else {
      pinchDetectorRef.current.reset();
      pinchEmaRef.current.reset();
      anchorXRef.current.reset();
      anchorYRef.current.reset();
      missingRef.current++;
    }

    // Segura a soltura por 130 ms: um tremor da pinça não pode reatacar a nota nem avançar a música duas vezes.
    if (pinching) lastPinchRef.current = stamp;
    const held = pinching || (pinchRef.current && stamp - lastPinchRef.current < 130);
    const activeZone = currentMode === "notes" ? zoneRef.current : staffSong ? songZoneRef.current.index : -1;
    if (held && !pinchRef.current) startSound("camera");
    else if (held && playingRef.current && activeZone >= 0 && soundingZoneRef.current !== activeZone) {
      if (!switchTarget(resolveTarget())) { stopSound(); startSound("camera"); }
    } else if (!held && pinchRef.current) stopSound();
    pinchRef.current = held;
    if (!player && playingRef.current && missingRef.current > 4) stopSound();

    // Desenho: faixas e mãos
    const base = OCTAVES[octaveRef.current].base;
    const songNow = SONGS[songIndexRef.current];
    const pitches = staffPitches(songNow);
    const expected = songNow.notes[songPosRef.current % songNow.notes.length].midi;
    const vertical = { axis: "y" as const, min: band.top, max: band.bottom, crossMin: range.min, crossMax: range.max };
    let overlay: ZoneOverlay | null = null;
    let playColor: string | undefined;
    if (currentMode === "notes") {
      const colors = MAJOR_SCALE.map((step) => noteColor(base + step));
      const labels = MAJOR_SCALE.map((step) => solfege(base + step));
      overlay = notesVertical
        ? { ...vertical, count: 8, active: zoneRef.current, colors, labels }
        : { count: 8, min: range.min, max: range.max, active: zoneRef.current, colors, labels };
      playColor = colors[zoneRef.current];
    } else if (chordHeight) {
      overlay = { ...vertical, count: prog.chords.length, active: chordRef.current, colors: prog.chords.map((item) => item.color), labels: prog.chords.map((item) => item.symbol) };
      playColor = prog.chords[chordRef.current]?.color;
    } else if (staffSong) {
      overlay = { ...vertical, count: pitches.length, active: songZoneRef.current.index, expected: pitches.indexOf(expected), colors: pitches.map(noteColor), labels: pitches.map(solfege) };
      playColor = noteColor(pitches[songZoneRef.current.index] ?? expected);
    }
    const draw: DrawHand[] = hands.map((hand) => {
      const role = hand === selector ? "select" : hand === player ? "play" : "idle";
      return {
        points: hand.points, role,
        badge: role === "select" ? selectorBadge : undefined,
        pinchActive: role === "play" && held, pinchAt: hand.pinchAt, anchor: hand.anchor,
        color: role === "play" && playColor ? playColor : ROLE_COLORS[role]
      };
    });
    drawOverlay(canvas, video, draw, overlay);

    if (hands.length === 0) say("status.noHands");
    else if (!player) say("status.showPlayer");
    else if (held) say("status.playing");
    else if (chordHeight) say("status.moveHint");
    else if (currentMode === "notes") say(notesVertical ? "status.moveHint" : "status.sideHint");
    else if (staffSong) say("status.staffHint");
    else if (currentMode === "chords" && !selector) say("status.showSelector");
    else say(currentMode === "song" ? "status.pinchNext" : "status.pinchReady");
  }, [startSound, stopSound, switchTarget, resolveTarget, say]);

  const scheduleFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraRef.current) return;
    const tick = () => {
      if (!cameraRef.current) return;
      try { processFrame(); } catch (error) {
        console.error(error);
        say("status.trackingLost");
      }
      scheduleFrame();
    };
    if ("requestVideoFrameCallback" in video) frameHandleRef.current = (video as HTMLVideoElement).requestVideoFrameCallback(tick);
    else frameHandleRef.current = requestAnimationFrame(tick);
  }, [processFrame, say]);

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
    pinchEmaRef.current.reset();
    boostRef.current = 1;
    if (video) video.style.filter = "";
    pinchDetectorRef.current.reset();
    zoneSelectorRef.current.reset();
    chordZoneRef.current.reset();
    songZoneRef.current.reset();
    calibRef.current.step = null;
    pinchRef.current = false;
    lastVideoTimeRef.current = -1;
    stopSound();
    setCameraOn(false);
    setHandsDetected(0);
    setFps(0);
    setFingers(0);
    setPinch(0);
    say("status.cameraOff");
  }, [stopSound, say]);

  const startCamera = async () => {
    if (loading || cameraRef.current) return;
    void synthRef.current.ready().catch(() => { /* O vídeo continua disponível se o áudio falhar. */ });
    setLoading(true);
    setMessage("");
    say("status.asking");
    try {
      const video = videoRef.current;
      if (!video) throw new Error(t("err.preview"));
      const demo = import.meta.env.DEV ? new URLSearchParams(location.search).get("demo") : null;
      if (demo) {
        video.src = demo; video.loop = true; video.muted = true;
      } else {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error(t("err.secure"));
        const stream = await openCamera();
        streamRef.current = stream;
        video.srcObject = stream;
      }
      await video.play();
      say("status.loadingModel");
      const { landmarker, delegate } = await createHandLandmarker();
      landmarkerRef.current = landmarker;
      setEngine(delegate);
      cameraRef.current = true;
      fpsCountRef.current = { frames: 0, since: performance.now() };
      setCameraOn(true);
      say("status.showHands");
      scheduleFrame();
    } catch (error) {
      stopCamera();
      setMessage(t("err.camera", { detail: cameraErrorText(error) }));
    } finally { setLoading(false); }
  };

  const stopDemo = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    synthRef.current.stop();
    setDemoPlaying(false);
    setLit((current) => playingRef.current ? current : []);
  }, []);

  const playSequence = useCallback(async (items: { pitches: number[]; at: number; length: number }[], key: Key, vars?: Record<string, string | number>) => {
    stopSound();
    stopDemo();
    await synthRef.current.ready();
    setDemoPlaying(true);
    say(key, vars);
    for (const item of items) {
      timersRef.current.push(window.setTimeout(() => { synthRef.current.play(item.pitches); setLit(item.pitches); }, item.at));
      timersRef.current.push(window.setTimeout(() => { synthRef.current.stop(); setLit([]); }, item.at + item.length));
    }
    const end = Math.max(...items.map((item) => item.at + item.length));
    timersRef.current.push(window.setTimeout(() => { setDemoPlaying(false); say("status.playbackDone"); }, end + 400));
  }, [stopDemo, stopSound, say]);

  const listenSong = () => {
    const ms = 60000 / song.tempo;
    let cursor = 0;
    const items = song.notes.map((note) => {
      const item = { pitches: [note.midi], at: cursor * ms, length: Math.max(80, note.beats * ms * 0.88) };
      cursor += note.beats;
      return item;
    });
    void playSequence(items, "status.listening", { title: tr(song.title) });
  };

  const playRecording = () => {
    if (!events.length) return;
    void playSequence(events.map((event) => ({
      pitches: event.pitchesMidi, at: event.startBeat * 60000 / BPM, length: event.durationBeats * 60000 / BPM
    })), "status.playbackSeq");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === "Space") { event.preventDefault(); startSound("manual"); return; }
      const lower = event.key.toLowerCase();
      const row = KEY_ROW.indexOf(lower);
      if (row >= 0 && !event.metaKey && !event.ctrlKey) { playKey(OCTAVES[octaveRef.current].base + MAJOR_SCALE[row]); return; }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < PROGRESSIONS[progRef.current].chords.length && modeRef.current === "chords") pickChord(index);
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
    if (recording) { stopSound(); setRecording(false); say("status.recorded"); }
    else { setEvents([]); recordingStartRef.current = performance.now(); setRecording(true); say("status.recording"); }
  };

  const saveProject = () => {
    const project: Project = {
      schemaVersion: 1, title: t("project.title"), mode: events.some((event) => event.type === "note") ? "performance" : "chords", tempoBpm: BPM,
      scale: { tonic: "C", type: "major" }, events
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "melodycam-project.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("status.saved");
  };

  const openProject = async (file?: File) => {
    if (!file) return;
    try {
      const project = validateProject(JSON.parse(await file.text()));
      stopSound();
      setRecording(false);
      setEvents(project.events);
      setMessage("");
      say("status.opened", { n: project.events.length });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("err.projectOpen"));
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
  const nowColor = mode === "chords" ? chords[chord].color : noteColor(focusMidi);
  const nowCaption = mode === "chords" ? t("stage.chord") : mode === "notes" ? t("stage.note") : t("stage.nextNote");
  const nowText = mode === "chords" ? chords[chord].symbol : solfege(focusMidi);
  const nowName = mode === "chords" ? chordName(chords[chord]) : mode === "notes" ? t("notes.octave", { oct: tr(OCTAVES[octave].name).toLowerCase(), note: noteLabel(focusMidi) }) : tr(song.title);
  const ribbon = mode === "song" ? Array.from({ length: 8 }, (_, i) => ({ index: songPos + i, note: song.notes[(songPos + i) % song.notes.length], wrap: songPos + i >= song.notes.length })) : [];
  const heightChords = PROGRESSIONS[progIndex].select === "height" || chordMethod === "height";
  const notesList = zoneMidis.map((midi) => solfege(midi)).join(" ");
  const calibText = calib === "open" ? t("read.calOpen") : calib === "close" ? t("read.calClose") : calib === "done" ? t("read.calibrated") : calib === "fail" ? t("read.calFail") : "";

  return <div className={`studio ${cameraOn ? "cam-on" : ""} ${panelsHidden ? "hide-panels" : ""}`} data-lang={lang}>
    <video ref={videoRef} className={`camera-video ${cameraOn ? "is-visible" : ""}`} playsInline muted autoPlay aria-label="Camera" />
    <div className="camera-vignette" aria-hidden="true" />
    <canvas ref={canvasRef} className="hand-overlay" aria-hidden="true" />
    <div className="atmosphere" aria-hidden="true"><div className="aura aura-one" /><div className="aura aura-two" /></div>

    <header className="studio-header glass">
      <Wordmark href="#/sobre" />
      <div className="header-status">
        <span className={`signal ${cameraOn && handsDetected > 0 ? "live" : ""}`} />
        <span>{cameraOn ? t(handsDetected === 1 ? "head.handOne" : "head.handMany", { n: handsDetected }) : t("status.cameraOff")}</span>
        {cameraOn && <span className="chip">{fps} fps</span>}
        {cameraOn && <span className="chip">{engine}</span>}
      </div>
      <div className="header-actions">
        <LangSwitch />
        <button type="button" className="btn ghost" onClick={() => setGuideOpen((value) => !value)} aria-expanded={guideOpen}>{t("head.guide")}</button>
        {cameraOn && <button type="button" className="btn ghost" onClick={() => setSwapHands((value) => !value)}>{swapHands ? t("head.swapped") : t("head.swap")}</button>}
        {cameraOn && <button type="button" className="btn ghost desktop-only" onClick={() => setPanelsHidden((value) => !value)}>{panelsHidden ? t("head.showPanels") : t("head.hidePanels")}</button>}
        <button type="button" className="btn primary" onClick={cameraOn ? stopCamera : startCamera} disabled={loading}>{loading ? t("head.preparing") : cameraOn ? t("head.stop") : t("head.start")}</button>
      </div>
    </header>

    <main className="performance">
      <aside className="panel glass" aria-label={t("mode.aria")}>
        <Seg label={t("mode.aria")} value={mode} onChange={selectMode} options={[["chords", t("mode.chords")], ["notes", t("mode.notes")], ["song", t("mode.song")]]} />

        {mode === "chords" && <>
          <label className="select-field"><span className="eyebrow">{t("chords.progression")}</span>
            <select value={progIndex} onChange={(event) => pickProgression(Number(event.target.value))}>
              {PROGRESSIONS.map((item, index) => <option key={item.id} value={index}>{tr(item.title)}: {tr(item.subtitle)}</option>)}
            </select></label>
          {PROGRESSIONS[progIndex].select === "fingers" && <Seg label={t("chords.methodAria")} value={chordMethod} onChange={pickChordMethod} options={[["height", t("chords.height")], ["fingers", t("chords.fingers")]]} />}
          {heightChords
            ? <div className="panel-heading"><span className="eyebrow">{t("chords.heightEyebrow")}</span><h2>{t("chords.heightTitle")}</h2><p>{t("chords.heightHelp")}</p></div>
            : <div className="panel-heading"><span className="eyebrow">{t("chords.fingersEyebrow")}</span><h2>{t("chords.fingersTitle", { n: chords.length })}</h2><p>{t("chords.fingersHelp")}</p></div>}
          <div className={`chord-list ${chords.length > 5 ? "wide" : ""}`}>{chords.map((item, index) => <button key={`${item.symbol}-${index}`} type="button" className={`chord-button ${chord === index ? "selected" : ""}`} style={{ "--note": item.color } as React.CSSProperties} onClick={() => pickChord(index)} aria-pressed={chord === index}>
            <span className="finger-count">{index + 1}</span><span className="chord-symbol">{item.symbol}</span><span className="chord-name">{chordName(item)}</span>
          </button>)}</div>
        </>}

        {mode === "notes" && <>
          <div className="panel-heading"><span className="eyebrow">{t("notes.eyebrow")}</span><h2>{t(notesAxis === "x" ? "notes.titleX" : "notes.titleY")}</h2><p>{t(notesAxis === "x" ? "notes.helpX" : "notes.helpY", { notes: notesList })}</p></div>
          <Seg label={t("notes.axisAria")} value={notesAxis} onChange={pickNotesAxis} options={[["x", t("notes.sideways")], ["y", t("notes.updown")]]} />
          <Seg label={t("notes.octaveAria")} value={String(octave)} onChange={(value) => pickOctave(Number(value))} options={OCTAVES.map((item, index) => [String(index), tr(item.name)] as const)} />
          <div className="note-chips">{zoneMidis.map((midi, index) => <span key={midi} className={zone === index ? "active" : ""} style={{ "--note": noteColor(midi) } as React.CSSProperties}>{solfege(midi)}</span>)}</div>
        </>}

        {mode === "song" && <>
          <div className="panel-heading"><span className="eyebrow">{t("song.eyebrow")}</span><h2>{t("song.title")}</h2><p>{t(songStyle === "sequence" ? "song.helpSequence" : "song.helpStaff")}</p></div>
          <Seg label={t("song.styleAria")} value={songStyle} onChange={pickSongStyle} options={[["sequence", t("song.sequence")], ["staff", t("song.staff")]]} />
          <div className="song-list">{SONGS.map((item, index) => <button key={item.id} type="button" className={`song-button ${songIndex === index ? "selected" : ""}`} onClick={() => pickSong(index)} aria-pressed={songIndex === index}>
            <strong>{tr(item.title)}</strong><small>{t("song.meta", { subtitle: tr(item.subtitle), n: item.notes.length })}</small></button>)}</div>
          <div className="song-actions"><button type="button" className="btn ghost" onClick={demoPlaying ? stopDemo : listenSong}>{demoPlaying ? t("song.stop") : t("song.listen")}</button><button type="button" className="btn ghost" onClick={restartSong}>{t("song.restart")}</button></div>
        </>}
      </aside>

      <section className="stage" aria-label={t("stage.aria")}>
        {!cameraOn && <div className="hero">
          <LogoMark size={72} />
          <h1>{t("stage.h1a")}<span>{t("stage.h1b")}</span></h1>
          <p>{t("stage.p")}</p>
          <button type="button" className="btn primary large" onClick={startCamera} disabled={loading}>{loading ? t("head.preparing") : t("head.start")}</button>
          <small>{t("stage.small")}</small>
        </div>}
        <div className={`now ${cameraOn ? "compact" : ""} ${playing ? "sounding" : ""}`} style={{ "--note": nowColor } as React.CSSProperties}>
          <span className="now-caption">{nowCaption}</span>
          <strong>{nowText}</strong>
          <span className="now-name">{nowName}</span>
        </div>
        {mode === "song" && <div className="ribbon" aria-label={t("song.ribbon")}>{ribbon.map(({ index, note, wrap }) =>
          <span key={index} className={index === songPos ? "current" : ""} style={{ "--note": noteColor(note.midi) } as React.CSSProperties}>{wrap ? "↺ " : ""}{solfege(note.midi)}</span>)}
          <small>{songPos + 1}/{song.notes.length}</small></div>}
        <div className="stage-hint" role="status" aria-live="polite">{t(status.key, status.vars)}</div>
      </section>

      <aside className="panel glass" aria-label={t("sound.title")}>
        {cameraOn && <div className="readout">
          <div className="field-label">{t("read.title")}</div>
          <div className="readout-row"><span>{t("read.fingers")}</span><b>{handsDetected ? fingers : "–"}</b></div>
          <div className="readout-row"><span>{t("read.pinch")}</span><div className="meter"><i style={{ width: `${pinch}%` }} /></div></div>
          <label className="slider"><span>{t("read.sensitivity")} <b>{Math.round(sensitivity * 100)}%</b></span>
            <input type="range" min="0" max="1" step="0.01" value={sensitivity} onChange={(event) => { setSensitivity(Number(event.target.value)); setCalib(null); try { localStorage.removeItem(PINCH_STORAGE); } catch { /* ignorado */ } }} /></label>
          <button type="button" className="btn ghost" onClick={startCalibration} disabled={calib === "open" || calib === "close"}>{t("read.calibrate")}</button>
          {calibText && <p className={`tip ${calib === "done" ? "ok" : ""}`}>{calibText}</p>}
        </div>}
        {cameraOn && fps > 0 && fps < 20 && <p className="tip">{t("read.tip")}</p>}
        <div className="field-label">{t("sound.title")}</div>
        <div className="preset-grid">{PRESETS.map((preset, index) => <button key={preset.id} type="button" className={`preset-card ${presetIndex === index ? "active" : ""}`} onClick={() => choosePreset(index)} aria-pressed={presetIndex === index}><strong>{tr(preset.name)}</strong><small>{tr(preset.mood)}</small></button>)}</div>
        <div className="effects">
          <label className="slider"><span>{t("sound.echo")} <b>{Math.round(echo * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={echo} onChange={(event) => { const value = Number(event.target.value); setEcho(value); synthRef.current.setEffects(value, space); }} /></label>
          <label className="slider"><span>{t("sound.space")} <b>{Math.round(space * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={space} onChange={(event) => { const value = Number(event.target.value); setSpace(value); synthRef.current.setEffects(echo, value); }} /></label>
          <label className="slider"><span>{t("sound.glide")} <b>{Math.round(glide * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={glide} onChange={(event) => setGlide(Number(event.target.value))} /></label>
        </div>
      </aside>
    </main>

    <div className="bottom-zone">
      <Keyboard low={keyboard.low} high={keyboard.high} showSharps={keyboard.showSharps} lit={lit} next={next}
        onDown={(midi) => playKey(midi)} onUp={stopSound} />
      <div className="performance-dock glass">
        <button className={`play-button ${playing ? "active" : ""}`} type="button" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); startSound("manual"); }} onPointerUp={stopSound} onPointerCancel={stopSound} onLostPointerCapture={stopSound}><span>{playing && activeInput === "manual" ? "◉" : "▶"}</span><strong>{mode === "chords" ? t("dock.holdChord") : mode === "notes" ? t("dock.playNote") : t("dock.nextNote")}</strong></button>
        <span className="key-hint">{t("dock.space")}</span>
        <span className="dock-divider" />
        <button className={`btn ghost ${recording ? "record-active" : ""}`} type="button" onClick={toggleRecording}><span className="record-dot" />{recording ? t("dock.stopRec") : t("dock.record")}</button>
        <button type="button" className="btn ghost" onClick={playRecording} disabled={!events.length || recording}>{t("dock.listen")}</button>
        <button type="button" className="btn ghost" onClick={() => setEvents((current) => current.slice(0, -1))} disabled={!events.length || recording}>{t("dock.undo")}</button>
        <button type="button" className="btn ghost" onClick={saveProject} disabled={!events.length}>{t("dock.save")}</button>
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>{t("dock.open")}</button>
        <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => { void openProject(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="sequence">{events.length ? events.map((event, index) => <span key={`${index}-${event.startBeat}`}><strong>{event.symbol}</strong></span>) : <span>{recording ? t("dock.recording") : t("dock.empty")}</span>}</div>
        <canvas ref={scopeRef} className="scope" aria-label={t("dock.scope")} />
      </div>
    </div>

    {guideOpen && <div className="guide-backdrop" onClick={() => setGuideOpen(false)}><div className="guide glass" role="dialog" aria-modal="true" aria-label={t("head.guide")} onClick={(event) => event.stopPropagation()}>
      <div className="guide-head"><span className="eyebrow">{t("guide.eyebrow")}</span><button type="button" onClick={() => setGuideOpen(false)} aria-label={t("guide.close")}>×</button></div>
      <h2>{t("guide.title")}</h2>
      <div className="guide-steps">
        <div><span className="guide-number">01</span><strong>{t("guide.s1t")}</strong><p>{t("guide.s1p")}</p></div>
        <div><span className="guide-number">02</span><strong>{t("guide.s2t")}</strong><p>{t("guide.s2p")}</p></div>
        <div><span className="guide-number">03</span><strong>{t("guide.s3t")}</strong><p>{t("guide.s3p")}</p></div>
        <div><span className="guide-number">04</span><strong>{t("guide.s4t")}</strong><p>{t("guide.s4p")}</p></div>
      </div>
      <div className="guide-footer"><span>{t("guide.foot")}</span><button type="button" className="btn primary" onClick={() => setGuideOpen(false)}>{t("guide.ok")}</button></div>
    </div></div>}
    {message && <div className="toast glass" role="alert"><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label={t("toast.close")}>×</button></div>}
  </div>;
}

function Root() {
  const [about, setAbout] = useState(() => location.hash.startsWith("#/sobre"));
  useEffect(() => {
    const onHash = () => { setAbout(location.hash.startsWith("#/sobre")); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return about ? <Landing /> : <App />;
}

createRoot(document.getElementById("root")!).render(<LangProvider><Root /></LangProvider>);

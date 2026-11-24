import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

// BASE_URL termina em "/": "/" em desenvolvimento e "/<repositório>/" no GitHub Pages.
const BASE = import.meta.env.BASE_URL;
const LOCAL_MODEL = `${BASE}models/hand_landmarker.task`;
const REMOTE_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = `${BASE}mediapipe`;

export async function createHandLandmarker(): Promise<{ landmarker: HandLandmarker; delegate: "GPU" | "CPU" }> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const attempts: { model: string; delegate: "GPU" | "CPU" }[] = [
    { model: LOCAL_MODEL, delegate: "GPU" },
    { model: LOCAL_MODEL, delegate: "CPU" },
    { model: REMOTE_MODEL, delegate: "CPU" }
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: attempt.model, delegate: attempt.delegate },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4
      });
      return { landmarker, delegate: attempt.delegate };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Não foi possível carregar o modelo de mãos.");
}

/** Converte um ponto do quadro de vídeo (0..1) para a tela (0..1), com espelhamento e `object-fit: cover`. */
export function frameToScreen(point: { x: number; y: number }, video: { w: number; h: number }, view: { w: number; h: number }) {
  const scale = Math.max(view.w / video.w, view.h / video.h);
  const shownW = video.w * scale;
  const shownH = video.h * scale;
  const offX = (view.w - shownW) / 2;
  const offY = (view.h - shownH) / 2;
  return { x: (view.w - (offX + point.x * shownW)) / view.w, y: (offY + point.y * shownH) / view.h };
}

export type DrawHand = {
  points: NormalizedLandmark[];
  role: "select" | "play" | "idle";
  /** Texto grande perto do pulso (ex.: número de dedos). */
  badge?: string;
  pinchActive: boolean;
  /** Ponto (tela 0..1) entre polegar e indicador. */
  pinchAt: { x: number; y: number };
  color: string;
};

export type ZoneOverlay = {
  count: number;
  min: number;
  max: number;
  active: number;
  colors: string[];
  labels: string[];
  /** "x": faixas lado a lado. "y": faixas empilhadas (min/max na altura; a faixa 0 fica embaixo). */
  axis?: "x" | "y";
  /** Para axis "y": extensão horizontal das faixas (0..1). */
  crossMin?: number;
  crossMax?: number;
  /** Faixa que a música espera agora (contorno tracejado). */
  expected?: number;
};

export const ROLE_COLORS = { select: "#ffd166", play: "#5fe3e0", idle: "#ffffff" } as const;

export function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hands: DrawHand[],
  zones: ZoneOverlay | null
): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W || !H) return;
  if (canvas.width !== Math.floor(W * ratio) || canvas.height !== Math.floor(H * ratio)) {
    canvas.width = Math.floor(W * ratio);
    canvas.height = Math.floor(H * ratio);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const source = { w: video.videoWidth || 1280, h: video.videoHeight || 720 };
  const view = { w: W, h: H };
  const toPx = (p: { x: number; y: number }) => {
    const s = frameToScreen(p, source, view);
    return { x: s.x * W, y: s.y * H };
  };

  if (zones) {
    const axis = zones.axis ?? "x";
    const mark = (x: number, y: number, w: number, hgt: number, index: number) => {
      if (index !== zones.expected) return;
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffffdd";
      ctx.strokeRect(x + 3, y + 3, w - 6, hgt - 6);
      ctx.restore();
    };
    if (axis === "x") {
      const compact = W <= 900;
      const top = H * (compact ? 0.2 : 0.4);
      const bottom = H * (compact ? 0.56 : 0.8);
      const bandW = ((zones.max - zones.min) * W) / zones.count;
      for (let i = 0; i < zones.count; i++) {
        const x = zones.min * W + i * bandW;
        const color = zones.colors[i];
        const active = i === zones.active;
        const gradient = ctx.createLinearGradient(0, top, 0, bottom);
        gradient.addColorStop(0, color + (active ? "55" : "1a"));
        gradient.addColorStop(1, color + "00");
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, top, bandW - 4, bottom - top);
        ctx.fillStyle = color + (active ? "ff" : "99");
        ctx.fillRect(x + 2, top, bandW - 4, active ? 4 : 2);
        ctx.font = `${active ? 700 : 600} ${Math.min(18, bandW * 0.3)}px Manrope, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(zones.labels[i], x + bandW / 2, top + 24);
        mark(x, top, bandW, bottom - top, i);
      }
    } else {
      const left = (zones.crossMin ?? 0.19) * W;
      const right = (zones.crossMax ?? 0.81) * W;
      const top = zones.min * H;
      const bottom = zones.max * H;
      const bandH = (bottom - top) / zones.count;
      for (let i = 0; i < zones.count; i++) {
        const y = bottom - (i + 1) * bandH;
        const color = zones.colors[i];
        const active = i === zones.active;
        const gradient = ctx.createLinearGradient(left, 0, right, 0);
        gradient.addColorStop(0, color + (active ? "66" : "22"));
        gradient.addColorStop(1, color + "00");
        ctx.fillStyle = gradient;
        ctx.fillRect(left, y + 2, right - left, bandH - 4);
        ctx.fillStyle = color + (active ? "ff" : "99");
        ctx.fillRect(left, y + 2, active ? 6 : 3, bandH - 4);
        ctx.font = `${active ? 800 : 600} ${Math.max(11, Math.min(20, bandH * 0.5))}px Manrope, system-ui, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = active ? "#ffffff" : color;
        ctx.fillText(zones.labels[i], left + 16, y + bandH / 2);
        ctx.textBaseline = "alphabetic";
        mark(left, y, right - left, bandH, i);
      }
    }
  }

  const connections = HandLandmarker.HAND_CONNECTIONS;
  for (const hand of hands) {
    const px = hand.points.map(toPx);
    ctx.lineCap = "round";
    ctx.strokeStyle = hand.color;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const { start, end } of connections) { ctx.moveTo(px[start].x, px[start].y); ctx.lineTo(px[end].x, px[end].y); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    px.forEach((p, index) => {
      const tip = [4, 8, 12, 16, 20].includes(index);
      ctx.beginPath();
      ctx.arc(p.x, p.y, tip ? 6 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = tip ? hand.color : "#0b0a14";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = hand.color;
      ctx.stroke();
    });

    if (hand.badge) {
      const wrist = px[0];
      ctx.font = "800 30px Unbounded, Manrope, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#0b0a14cc";
      ctx.beginPath();
      ctx.arc(wrist.x, wrist.y + 34, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hand.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = hand.color;
      ctx.fillText(hand.badge, wrist.x, wrist.y + 45);
    }

    if (hand.role === "play") {
      const at = { x: hand.pinchAt.x * W, y: hand.pinchAt.y * H };
      ctx.beginPath();
      ctx.arc(at.x, at.y, hand.pinchActive ? 22 : 15, 0, Math.PI * 2);
      ctx.strokeStyle = hand.pinchActive ? "#ffffff" : hand.color;
      ctx.lineWidth = hand.pinchActive ? 4 : 2;
      ctx.stroke();
      if (hand.pinchActive) { ctx.fillStyle = hand.color + "66"; ctx.fill(); }
    }
  }
}

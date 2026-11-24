/**
 * Leitura de gestos. Usa os pontos "world" do MediaPipe (3D, em metros, centrados na mão):
 * não dependem da distância até a câmera, da proporção do vídeo nem da rotação da mão.
 */

export type Point = { x: number; y: number; z: number };

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Ângulo (graus) no ponto b formado por a-b-c. 180 = reto. */
function angle(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const norm = Math.hypot(v1.x, v1.y, v1.z) * Math.hypot(v2.x, v2.y, v2.z);
  if (norm === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / norm))) * 180) / Math.PI;
}

/** Cada dedo: [base (MCP), junta do meio (PIP), ponta (TIP)]. */
const FINGERS = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]] as const;

export type FingerReading = { count: number; extended: boolean[] };

export function readFingers(points: Point[]): FingerReading {
  if (points.length < 21) return { count: 0, extended: [false, false, false, false, false] };
  const palm = Math.max(dist(points[0], points[9]), 1e-4);
  const extended = FINGERS.map(([mcp, pip, tip]) => {
    const straight = angle(points[mcp], points[pip], points[tip]) > 130;
    const reaching = dist(points[tip], points[0]) > dist(points[pip], points[0]) * 1.15;
    return straight && reaching;
  });
  // Polegar: reto e afastado da palma (ponta longe da base do mindinho).
  const thumbStraight = angle(points[2], points[3], points[4]) > 135;
  const thumbOut = dist(points[4], points[17]) / palm > 0.95 && dist(points[4], points[5]) / palm > 0.5;
  // Com os quatro dedos abertos a dúvida é só "4 ou 5": aceita o polegar mais encostado na palma.
  const openHand = extended.every(Boolean) && dist(points[4], points[13]) / palm > 0.62;
  const thumb = (thumbStraight && thumbOut) || openHand;
  const all = [thumb, ...extended];
  return { count: all.filter(Boolean).length, extended: all };
}

/** 0 = dedos separados, 1 = pinça totalmente aberta. Menor = mais fechada. */
export function pinchRatio(points: Point[]): number {
  if (points.length < 21) return 1;
  const palm = Math.max(dist(points[0], points[9]), 1e-4);
  return dist(points[4], points[8]) / palm;
}

/** Histerese: fecha abaixo de `engage`, só abre acima de `release`. */
export class PinchDetector {
  private active = false;
  private streak = 0;
  constructor(private engage = 0.36, private release = 0.55) {}

  setSensitivity(value: number): void {
    // value 0..1: mais alto = pinça mais fácil de detectar.
    this.engage = 0.22 + value * 0.23;
    this.release = this.engage + 0.19;
  }

  update(ratio: number): boolean {
    const wants = this.active ? ratio < this.release : ratio < this.engage;
    if (wants === this.active) { this.streak = 0; return this.active; }
    // Confirma por 2 quadros para ignorar tremor, sem atrasar de forma perceptível.
    this.streak++;
    if (this.streak >= 2) { this.active = wants; this.streak = 0; }
    return this.active;
  }

  /** Limiares calibrados pela pessoa: "aberta" e "fechada" medidas na própria mão. */
  setCustom(open: number, closed: number): void {
    const span = Math.max(0.12, open - closed);
    this.engage = closed + span * 0.4;
    this.release = closed + span * 0.65;
  }

  reset(): void { this.active = false; this.streak = 0; }
}

/** Voto majoritário nos últimos N quadros: o valor só muda quando a maioria concorda. */
export class VoteFilter {
  private window: number[] = [];
  private current = 0;
  constructor(private size = 6, private need = 4) {}

  update(value: number): number {
    this.window.push(value);
    if (this.window.length > this.size) this.window.shift();
    const counts = new Map<number, number>();
    for (const item of this.window) counts.set(item, (counts.get(item) ?? 0) + 1);
    for (const [item, count] of counts) if (count >= this.need) this.current = item;
    return this.current;
  }

  reset(): void { this.window = []; this.current = 0; }
}

/** Média móvel exponencial: tira o tremor sem atrasar de forma perceptível. */
export class Ema {
  private value: number | null = null;
  constructor(private alpha = 0.5) {}
  update(sample: number): number {
    this.value = this.value === null ? sample : this.value + this.alpha * (sample - this.value);
    return this.value;
  }
  reset(): void { this.value = null; }
}

/** Divide uma faixa horizontal em zonas com margem, para não "tremer" na fronteira. */
export class ZoneSelector {
  private current = -1;
  constructor(private count: number, private min: number, private max: number, private margin = 0.22) {}

  update(x: number, min = this.min, max = this.max): number {
    const raw = Math.max(0, Math.min(this.count - 1e-6, ((x - min) / (max - min)) * this.count));
    if (this.current < 0) { this.current = Math.floor(raw); return this.current; }
    if (raw < this.current - this.margin || raw > this.current + 1 + this.margin) this.current = Math.floor(raw);
    return this.current;
  }

  get zones(): { count: number; min: number; max: number } { return { count: this.count, min: this.min, max: this.max }; }
  get index(): number { return Math.max(0, this.current); }
  reset(): void { this.current = -1; }
}

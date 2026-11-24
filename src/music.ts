import { midiFrequency } from "./notes";
import { t, type L } from "./i18n";

export type RecordedEvent = {
  type: "chord" | "note";
  symbol: string;
  pitchesMidi: number[];
  startBeat: number;
  durationBeats: number;
  velocity: number;
};

export type Project = {
  schemaVersion: 1;
  title: string;
  mode: "chords" | "performance";
  tempoBpm: number;
  scale: { tonic: "C" | "E"; type: "major" };
  events: RecordedEvent[];
};

export type SoundPreset = {
  id: string;
  name: L;
  mood: L;
  wave: OscillatorType;
  attack: number;
  /** Tempo (s) para cair até o nível de sustentação. */
  decay: number;
  /** 0..1: nível mantido enquanto o gesto segura a nota. */
  sustain: number;
  release: number;
  cutoff: number;
  echo: number;
  space: number;
  /** Vozes desafinadas por nota (supersaw). Padrão 2. */
  unison?: number;
  /** Abertura em cents entre as vozes. */
  spread?: number;
  /** 0..1: brilho de uma oitava acima, para o som "dreamscape". */
  shimmer?: number;
};

export const PRESETS: SoundPreset[] = [
  { id: "abyss", name: { pt: "Abismo", en: "Abyss" }, mood: { pt: "pad dark ambient", en: "dark ambient pad" }, wave: "sawtooth", attack: 0.9, decay: 1.2, sustain: 0.85, release: 3.4, cutoff: 650, echo: 0.38, space: 0.88 },
  { id: "synthwave", name: "Synthwave", mood: { pt: "neon e retrô", en: "neon and retro" }, wave: "sawtooth", unison: 5, spread: 16, attack: 0.05, decay: 1.4, sustain: 0.72, release: 1.5, cutoff: 2600, echo: 0.42, space: 0.55 },
  { id: "dream", name: "Dreamscape", mood: { pt: "sonho e brilho", en: "dream and shimmer" }, wave: "triangle", unison: 3, spread: 9, shimmer: 0.38, attack: 0.5, decay: 1.6, sustain: 0.7, release: 2.8, cutoff: 3400, echo: 0.4, space: 0.86 },
  { id: "mist", name: { pt: "Névoa", en: "Mist" }, mood: { pt: "pad aberto e frio", en: "open, cold pad" }, wave: "triangle", attack: 0.7, decay: 1, sustain: 0.85, release: 3, cutoff: 1300, echo: 0.42, space: 0.8 },
  { id: "piano", name: "Piano", mood: { pt: "claro e direto", en: "clear and direct" }, wave: "triangle", attack: 0.006, decay: 1.6, sustain: 0.28, release: 0.45, cutoff: 5200, echo: 0.1, space: 0.22 },
  { id: "bell", name: { pt: "Sino", en: "Bell" }, mood: { pt: "cristalino", en: "crystalline" }, wave: "sine", attack: 0.004, decay: 2.4, sustain: 0.05, release: 1.2, cutoff: 7000, echo: 0.3, space: 0.45 },
  { id: "glow", name: "Glow", mood: { pt: "brilho etéreo", en: "ethereal glow" }, wave: "triangle", attack: 0.05, decay: 0.8, sustain: 0.8, release: 1.1, cutoff: 3600, echo: 0.34, space: 0.5 },
  { id: "haze", name: "Haze", mood: { pt: "névoa e textura", en: "haze and texture" }, wave: "sawtooth", attack: 0.12, decay: 0.8, sustain: 0.7, release: 1.4, cutoff: 1500, echo: 0.26, space: 0.6 },
  { id: "drift", name: "Drift", mood: { pt: "pulsos no espaço", en: "pulses in space" }, wave: "sine", attack: 0.03, decay: 0.6, sustain: 0.65, release: 1.0, cutoff: 2400, echo: 0.45, space: 0.45 },
  { id: "void", name: "Void", mood: { pt: "escuro e profundo", en: "dark and deep" }, wave: "sine", attack: 0.18, decay: 0.5, sustain: 0.9, release: 2.2, cutoff: 1100, echo: 0.36, space: 0.72 }
];

type VoiceOsc = { osc: OscillatorNode; semitones: number };
type Voice = { groups: VoiceOsc[][]; gains: GainNode[]; notes: number[] };

export class Synth {
  private context: AudioContext | null = null;
  private voice: Voice | null = null;
  private analyser: AnalyserNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private echoWet: GainNode | null = null;
  private spaceWet: GainNode | null = null;
  private glide = 0.45;
  private preset: SoundPreset = PRESETS[0];
  private echo = PRESETS[0].echo;
  private space = PRESETS[0].space;

  get isReady(): boolean { return this.context?.state === "running"; }

  async ready(): Promise<void> {
    if (!this.context) {
      const context = new AudioContext({ latencyHint: "interactive" });
      this.context = context;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = this.preset.cutoff;
      this.filter = filter;
      const master = context.createGain();
      master.gain.value = 0.9;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.ratio.value = 6;
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      this.analyser = analyser;
      filter.connect(master);
      master.connect(limiter).connect(analyser).connect(context.destination);

      const delay = context.createDelay(2);
      delay.delayTime.value = 0.42;
      const feedback = context.createGain();
      feedback.gain.value = 0.3;
      const damp = context.createBiquadFilter();
      damp.type = "lowpass";
      damp.frequency.value = 1500;
      const echoWet = context.createGain();
      echoWet.gain.value = this.echo * 0.7;
      this.echoWet = echoWet;
      filter.connect(delay);
      delay.connect(feedback).connect(damp).connect(delay);
      delay.connect(echoWet).connect(master);

      const convolver = context.createConvolver();
      const length = Math.floor(context.sampleRate * 4.2);
      const impulse = context.createBuffer(2, length, context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.5;
      }
      convolver.buffer = impulse;
      const spaceWet = context.createGain();
      spaceWet.gain.value = this.space * 1.5;
      this.spaceWet = spaceWet;
      filter.connect(convolver).connect(spaceWet).connect(master);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  setPreset(preset: SoundPreset): void {
    this.preset = preset;
    this.setEffects(preset.echo, preset.space);
    if (this.context) this.filter?.frequency.setTargetAtTime(preset.cutoff, this.context.currentTime, 0.05);
  }

  /** 0..1: abre ou fecha o filtro (brilho do pad) enquanto a mão sobe ou desce. */
  setBrightness(value: number): void {
    if (!this.context || !this.filter) return;
    const factor = 0.35 + 1.5 * Math.max(0, Math.min(1, value));
    this.filter.frequency.setTargetAtTime(this.preset.cutoff * factor, this.context.currentTime, 0.06);
  }

  setEffects(echo: number, space: number): void {
    this.echo = echo;
    this.space = space;
    if (!this.context) return;
    this.echoWet?.gain.setTargetAtTime(echo * 0.7, this.context.currentTime, 0.05);
    this.spaceWet?.gain.setTargetAtTime(space * 1.5, this.context.currentTime, 0.05);
  }

  getWaveform(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  play(notes: number[], velocity = 1): void {
    const context = this.context;
    if (!context) return;
    this.stop();
    const now = context.currentTime;
    const { attack, decay, sustain, wave, shimmer = 0 } = this.preset;
    const unison = this.preset.unison ?? 2;
    const spread = this.preset.spread ?? 6;
    const peak = (0.13 * velocity * Math.sqrt(2 / unison)) / Math.sqrt(notes.length);
    const groups: VoiceOsc[][] = [];
    const gains: GainNode[] = [];
    for (const note of notes) {
      const group: VoiceOsc[] = [];
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peak, now + attack);
      gain.gain.setTargetAtTime(peak * sustain, now + attack, decay / 3);
      gain.connect(this.filter!);
      for (let voice = 0; voice < unison; voice++) {
        const oscillator = context.createOscillator();
        oscillator.type = wave;
        oscillator.frequency.value = midiFrequency(note);
        oscillator.detune.value = unison === 2 ? (voice ? spread : 0) : (voice / (unison - 1) - 0.5) * 2 * spread;
        oscillator.connect(gain);
        oscillator.start(now);
        group.push({ osc: oscillator, semitones: 0 });
      }
      if (shimmer > 0) {
        const bell = context.createOscillator();
        const bellGain = context.createGain();
        bell.type = "sine";
        bell.frequency.value = midiFrequency(note + 12);
        bellGain.gain.value = shimmer;
        bell.connect(bellGain).connect(gain);
        bell.start(now);
        group.push({ osc: bell, semitones: 12 });
      }
      groups.push(group);
      gains.push(gain);
    }
    this.voice = { groups, gains, notes: [...notes] };
  }

  setGlide(seconds: number): void { this.glide = Math.max(0.03, seconds); }

  /** Troca de acorde ou nota sem reataque: cada voz desliza para a nova altura (como um crossfade). */
  glideTo(notes: number[]): boolean {
    const context = this.context;
    const voice = this.voice;
    if (!context || !voice || notes.length !== voice.notes.length) return false;
    const now = context.currentTime;
    voice.groups.forEach((group, index) => {
      for (const { osc, semitones } of group) {
        const param = osc.frequency;
        const from = param.value;
        if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(now);
        else param.cancelScheduledValues(now);
        param.setValueAtTime(from, now);
        param.exponentialRampToValueAtTime(midiFrequency(notes[index] + semitones), now + this.glide);
      }
    });
    voice.notes = [...notes];
    return true;
  }

  stop(): void {
    if (!this.context || !this.voice) return;
    const now = this.context.currentTime;
    const release = this.preset.release;
    for (const gain of this.voice.gains) {
      const param = gain.gain;
      if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(now);
      else param.cancelScheduledValues(now);
      param.setTargetAtTime(0, now, release / 5);
    }
    for (const group of this.voice.groups) for (const { osc } of group) osc.stop(now + release * 1.5);
    this.voice = null;
  }

  async dispose(): Promise<void> {
    this.stop();
    if (this.context) await this.context.close();
    this.context = null;
  }
}

export function validateProject(value: unknown): Project {
  if (!value || typeof value !== "object") throw new Error(t("err.projectInvalid"));
  const candidate = value as Partial<Project>;
  if (candidate.schemaVersion !== 1 || !["chords", "performance"].includes(candidate.mode ?? "") || !Array.isArray(candidate.events)) {
    throw new Error(t("err.projectFormat"));
  }
  if (candidate.events.length > 10000) throw new Error(t("err.projectBig"));
  for (const event of candidate.events) {
    if (!["chord", "note"].includes(event.type) || !Array.isArray(event.pitchesMidi) || event.pitchesMidi.length > 8 ||
      (event.type === "note" && event.pitchesMidi.length !== 1) ||
      !event.pitchesMidi.every((note) => Number.isInteger(note) && note >= 0 && note <= 127) ||
      !Number.isFinite(event.startBeat) || event.startBeat < 0 ||
      !Number.isFinite(event.durationBeats) || event.durationBeats <= 0 || event.durationBeats > 128) {
      throw new Error(t("err.projectEvents"));
    }
  }
  return candidate as Project;
}

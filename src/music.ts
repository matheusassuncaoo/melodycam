export type Chord = { symbol: string; name: string; notes: number[]; fingers: number; color: string };

export const CHORDS: Chord[] = [
  { symbol: "E", name: "Mi maior", notes: [52, 56, 59, 64], fingers: 1, color: "#e9b65d" },
  { symbol: "A", name: "Lá maior", notes: [57, 61, 64], fingers: 2, color: "#dd9c83" },
  { symbol: "B", name: "Si maior", notes: [59, 63, 66], fingers: 3, color: "#a8b8e9" },
  { symbol: "C#m", name: "Dó♯ menor", notes: [61, 64, 68], fingers: 4, color: "#a9c9b2" },
  { symbol: "Am", name: "Lá menor", notes: [57, 60, 64], fingers: 5, color: "#c6a5d8" }
];

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
  scale: { tonic: "E"; type: "major" };
  events: RecordedEvent[];
};

export function midiFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

export type SoundPreset = {
  id: string;
  name: string;
  mood: string;
  wave: OscillatorType;
  attack: number;
  release: number;
  cutoff: number;
  echo: number;
  space: number;
};

export const PRESETS: SoundPreset[] = [
  { id: "void", name: "Void", mood: "escuro e profundo", wave: "sine", attack: 1.2, release: 2.8, cutoff: 1100, echo: 0.36, space: 0.72 },
  { id: "haze", name: "Haze", mood: "névoa e textura", wave: "triangle", attack: 0.6, release: 2.1, cutoff: 2200, echo: 0.26, space: 0.6 },
  { id: "drift", name: "Drift", mood: "pulsos no espaço", wave: "sine", attack: 0.12, release: 1.35, cutoff: 1700, echo: 0.6, space: 0.45 },
  { id: "glow", name: "Glow", mood: "brilho etéreo", wave: "triangle", attack: 0.35, release: 1.7, cutoff: 3600, echo: 0.38, space: 0.55 }
];

type Voice = { oscillators: OscillatorNode[]; gains: GainNode[] };

export class Synth {
  private context: AudioContext | null = null;
  private voice: Voice | null = null;
  private analyser: AnalyserNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private echoWet: GainNode | null = null;
  private spaceWet: GainNode | null = null;
  private preset: SoundPreset = PRESETS[0];
  private echo = PRESETS[0].echo;
  private space = PRESETS[0].space;

  async ready(): Promise<void> {
    if (!this.context) {
      const context = new AudioContext();
      this.context = context;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = this.preset.cutoff;
      this.filter = filter;
      const master = context.createGain();
      master.gain.value = 0.8;
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      this.analyser = analyser;
      filter.connect(master);
      master.connect(analyser).connect(context.destination);

      const delay = context.createDelay(2);
      delay.delayTime.value = 0.42;
      const feedback = context.createGain();
      feedback.gain.value = 0.36;
      const echoWet = context.createGain();
      echoWet.gain.value = this.echo * 0.42;
      this.echoWet = echoWet;
      filter.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(echoWet).connect(master);

      const convolver = context.createConvolver();
      const seconds = 2.8;
      const length = Math.floor(context.sampleRate * seconds);
      const impulse = context.createBuffer(2, length, context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.5;
      }
      convolver.buffer = impulse;
      const spaceWet = context.createGain();
      spaceWet.gain.value = this.space * 0.5;
      this.spaceWet = spaceWet;
      filter.connect(convolver).connect(spaceWet).connect(master);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  setPreset(preset: SoundPreset): void {
    this.preset = preset;
    this.setEffects(preset.echo, preset.space);
    this.filter?.frequency.setTargetAtTime(preset.cutoff, this.context!.currentTime, 0.1);
  }

  setEffects(echo: number, space: number): void {
    this.echo = echo;
    this.space = space;
    if (!this.context) return;
    this.echoWet?.gain.setTargetAtTime(echo * 0.42, this.context.currentTime, 0.05);
    this.spaceWet?.gain.setTargetAtTime(space * 0.5, this.context.currentTime, 0.05);
  }

  getWaveform(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  play(notes: number[]): void {
    const context = this.context;
    if (!context) return;
    this.stop();
    const now = context.currentTime;
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    for (const note of notes) {
      const oscillator = context.createOscillator();
      oscillator.type = this.preset.wave;
      oscillator.frequency.value = midiFrequency(note);
      const detune = context.createOscillator();
      detune.type = this.preset.wave;
      detune.frequency.value = midiFrequency(note);
      detune.detune.value = 7;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.025 / Math.sqrt(notes.length), now + 0.035);
      gain.gain.linearRampToValueAtTime(0.085 / Math.sqrt(notes.length), now + this.preset.attack);
      oscillator.connect(gain).connect(this.filter!);
      detune.connect(gain);
      oscillator.start(now);
      detune.start(now);
      oscillators.push(oscillator, detune);
      gains.push(gain);
    }
    this.voice = { oscillators, gains };
  }

  stop(): void {
    if (!this.context || !this.voice) return;
    const now = this.context.currentTime;
    for (const gain of this.voice.gains) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, this.preset.release / 5);
    }
    for (const oscillator of this.voice.oscillators) oscillator.stop(now + this.preset.release * 1.5);
    this.voice = null;
  }

  async dispose(): Promise<void> {
    this.stop();
    if (this.context) await this.context.close();
    this.context = null;
  }
}

export function validateProject(value: unknown): Project {
  if (!value || typeof value !== "object") throw new Error("Arquivo de projeto inválido.");
  const candidate = value as Partial<Project>;
  if (candidate.schemaVersion !== 1 || !["chords", "performance"].includes(candidate.mode ?? "") || !Array.isArray(candidate.events)) {
    throw new Error("Formato de projeto não reconhecido.");
  }
  if (candidate.events.length > 10000) throw new Error("O projeto tem eventos demais.");
  for (const event of candidate.events) {
    if (!["chord", "note"].includes(event.type) || !Array.isArray(event.pitchesMidi) || event.pitchesMidi.length > 8 ||
      (event.type === "note" && event.pitchesMidi.length !== 1) ||
      !event.pitchesMidi.every((note) => Number.isInteger(note) && note >= 0 && note <= 127) ||
      !Number.isFinite(event.startBeat) || event.startBeat < 0 ||
      !Number.isFinite(event.durationBeats) || event.durationBeats <= 0 || event.durationBeats > 128) {
      throw new Error("O projeto contém eventos inválidos.");
    }
  }
  return candidate as Project;
}

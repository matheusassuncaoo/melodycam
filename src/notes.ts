import { getLang, type L, type Lang } from "./i18n";

/** Notas, escala de Dó maior e acordes. Cada nota tem uma cor do espectro (veja docs/design-system.md). */

export const SOLFEGE = ["Dó", "Dó♯", "Ré", "Ré♯", "Mi", "Fá", "Fá♯", "Sol", "Sol♯", "Lá", "Lá♯", "Si"] as const;
export const LETTERS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;

/** Uma cor por nota natural: o espectro inteiro percorre a oitava. */
const NATURAL_COLORS: Record<number, string> = {
  0: "#ff6b8a", // Dó
  2: "#ff9a5c", // Ré
  4: "#ffd166", // Mi
  5: "#8ef0a0", // Fá
  7: "#5fe3e0", // Sol
  9: "#7aa2ff", // Lá
  11: "#b68cff" // Si
};

function mix(a: string, b: string): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${hex((r1 + r2) / 2)}${hex((g1 + g2) / 2)}${hex((b1 + b2) / 2)}`;
}

export function noteColor(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const natural = NATURAL_COLORS[pitchClass];
  if (natural) return natural;
  return mix(NATURAL_COLORS[pitchClass - 1], NATURAL_COLORS[pitchClass + 1]);
}

export function solfege(midi: number): string {
  return (getLang() === "en" ? LETTERS : SOLFEGE)[((midi % 12) + 12) % 12];
}

export function noteLabel(midi: number): string {
  return `${solfege(midi)}${Math.floor(midi / 12) - 1}`;
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

export function midiFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** Dó Ré Mi Fá Sol Lá Si Dó: semitons a partir da tônica. */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12] as const;

export const OCTAVES = [
  { name: { pt: "Grave", en: "Low" }, base: 48 },
  { name: { pt: "Média", en: "Mid" }, base: 60 },
  { name: { pt: "Aguda", en: "High" }, base: 72 }
] as const;

type Quality = "" | "m" | "dim" | "maj7" | "m7";
export type Chord = { symbol: string; root: string; accidental: string; quality: Quality; notes: number[]; fingers: number; color: string };

const ROOTS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ROOT_NAMES: Record<string, string> = { C: "Dó", D: "Ré", E: "Mi", F: "Fá", G: "Sol", A: "Lá", B: "Si" };
const QUALITY_PT: Record<Quality, string> = { "": "maior", m: "menor", dim: "diminuto", maj7: "maior com sétima", m7: "menor com sétima" };
const QUALITY_EN: Record<Quality, string> = { "": "major", m: "minor", dim: "diminished", maj7: "major 7th", m7: "minor 7th" };

/** Monta um acorde em pad largo e grave (raiz, oitava, terça e quinta abertas), pensado para ambient. */
export function makeChord(symbol: string, fingers: number): Chord {
  const match = /^([A-G])([#b]?)(maj7|m7|m|dim)?$/.exec(symbol);
  if (!match) throw new Error(`Invalid chord: ${symbol}`);
  const [, root, accidental, found] = match;
  const quality = (found ?? "") as Quality;
  const pitchClass = (ROOTS[root] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0) + 12) % 12;
  const low = 36 + pitchClass;
  const third = quality === "m" || quality === "m7" || quality === "dim" ? 3 : 4;
  const fifth = quality === "dim" ? 6 : 7;
  const seventh = quality === "maj7" ? 11 : quality === "m7" ? 10 : 0;
  return {
    symbol, root, accidental, quality, fingers,
    notes: seventh
      ? [low, low + 12, low + 12 + third, low + 12 + fifth, low + 12 + seventh]
      : [low, low + 12, low + 12 + third, low + 12 + fifth, low + 24 + third],
    color: noteColor(pitchClass)
  };
}

export function chordName(chord: Chord, lang: Lang = getLang()): string {
  const accidental = chord.accidental === "#" ? "♯" : chord.accidental === "b" ? "♭" : "";
  return lang === "pt"
    ? `${ROOT_NAMES[chord.root]}${accidental} ${QUALITY_PT[chord.quality]}`
    : `${chord.root}${accidental} ${QUALITY_EN[chord.quality]}`;
}

/** "fingers": a mão esquerda escolhe pelo número de dedos (até 5). "height": só pela altura da pinça (qualquer quantidade). */
export type Progression = { id: string; title: L; subtitle: L; chords: Chord[]; select: "fingers" | "height" };

const progression = (id: string, title: L, subtitle: L, symbols: string[]): Progression =>
  ({ id, title, subtitle, chords: symbols.map((symbol, index) => makeChord(symbol, index + 1)), select: symbols.length > 5 ? "height" : "fingers" });

/** Dedo 1 = primeiro acorde, dedo 2 = segundo, e assim por diante (ou faixas de baixo para cima). */
export const PROGRESSIONS: Progression[] = [
  progression("creep", "Creep", "Radiohead, G B C Cm", ["G", "B", "C", "Cm"]),
  progression("campo", { pt: "Campo de Dó", en: "C major field" }, { pt: "Dó Ré Mi Fá Sol Lá Si Dó", en: "C D E F G A B C" }, ["C", "Dm", "Em", "F", "G", "Am", "Bdim", "C"]),
  progression("dream", "Dreamscape", "Fmaj7 Em7 Dm7 Cmaj7", ["Fmaj7", "Em7", "Dm7", "Cmaj7"]),
  progression("neon", "Neon", "Am7 Fmaj7 Cmaj7 G", ["Am7", "Fmaj7", "Cmaj7", "G"]),
  progression("careless", "Careless Whisper", { pt: "inspirada, Dm Gm Bb A", en: "inspired, Dm Gm Bb A" }, ["Dm", "Gm", "Bb", "A"]),
  progression("foreigner", "I Want to Know What Love Is", { pt: "inspirada, Em D G C Am", en: "inspired, Em D G C Am" }, ["Em", "D", "G", "C", "Am"]),
  progression("sombra", { pt: "Sombra", en: "Shadow" }, "Am F C G", ["Am", "F", "C", "G"]),
  progression("nevoa", { pt: "Névoa", en: "Mist" }, "Em C G D", ["Em", "C", "G", "D"]),
  progression("abismo", { pt: "Abismo", en: "Abyss" }, "Dm B♭ F C", ["Dm", "Bb", "F", "C"]),
  progression("eco", { pt: "Eco", en: "Echo" }, "Cm A♭ E♭ B♭", ["Cm", "Ab", "Eb", "Bb"]),
  progression("pop", { pt: "Luz", en: "Light" }, "C G Am F Dm", ["C", "G", "Am", "F", "Dm"])
];

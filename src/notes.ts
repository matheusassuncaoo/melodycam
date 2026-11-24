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
  return SOLFEGE[((midi % 12) + 12) % 12];
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
  { name: "Grave", base: 48 },
  { name: "Média", base: 60 },
  { name: "Aguda", base: 72 }
] as const;

export type Chord = { symbol: string; name: string; notes: number[]; fingers: number; degree: string; color: string };

/** Progressão I–V–vi–IV (a mais usada na música pop) em dedos 1 a 4, mais o ii no dedo 5. */
export const CHORDS: Chord[] = [
  { symbol: "C", name: "Dó maior", degree: "I", notes: [48, 55, 60, 64], fingers: 1, color: noteColor(0) },
  { symbol: "G", name: "Sol maior", degree: "V", notes: [43, 55, 59, 62], fingers: 2, color: noteColor(7) },
  { symbol: "Am", name: "Lá menor", degree: "vi", notes: [45, 57, 60, 64], fingers: 3, color: noteColor(9) },
  { symbol: "F", name: "Fá maior", degree: "IV", notes: [41, 53, 57, 60], fingers: 4, color: noteColor(5) },
  { symbol: "Dm", name: "Ré menor", degree: "ii", notes: [50, 53, 57, 62], fingers: 5, color: noteColor(2) }
];

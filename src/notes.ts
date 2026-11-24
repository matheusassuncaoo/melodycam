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

const ROOTS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ROOT_NAMES: Record<string, string> = { C: "Dó", D: "Ré", E: "Mi", F: "Fá", G: "Sol", A: "Lá", B: "Si" };

/** Monta um acorde em pad largo e grave (raiz, oitava, terça e quinta abertas), pensado para ambient. */
export function makeChord(symbol: string, fingers: number): Chord {
  const match = /^([A-G])([#b]?)(m?)$/.exec(symbol);
  if (!match) throw new Error(`Acorde inválido: ${symbol}`);
  const [, letter, accidental, minor] = match;
  const pitchClass = (ROOTS[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0) + 12) % 12;
  const root = 36 + pitchClass;
  const third = minor ? 3 : 4;
  return {
    symbol,
    name: `${ROOT_NAMES[letter]}${accidental === "#" ? "♯" : accidental === "b" ? "♭" : ""} ${minor ? "menor" : "maior"}`,
    notes: [root, root + 12, root + 12 + third, root + 19, root + 24 + third],
    fingers,
    degree: "",
    color: noteColor(pitchClass)
  };
}

export type Progression = { id: string; title: string; subtitle: string; chords: Chord[] };

const progression = (id: string, title: string, subtitle: string, symbols: string[]): Progression =>
  ({ id, title, subtitle, chords: symbols.map((symbol, index) => makeChord(symbol, index + 1)) });

/** Dedo 1 = primeiro acorde, dedo 2 = segundo, e assim por diante. */
export const PROGRESSIONS: Progression[] = [
  progression("creep", "Creep", "Radiohead · G B C Cm", ["G", "B", "C", "Cm"]),
  progression("sombra", "Sombra", "Am F C G", ["Am", "F", "C", "G"]),
  progression("nevoa", "Névoa", "Em C G D", ["Em", "C", "G", "D"]),
  progression("abismo", "Abismo", "Dm B♭ F C", ["Dm", "Bb", "F", "C"]),
  progression("eco", "Eco", "Cm A♭ E♭ B♭", ["Cm", "Ab", "Eb", "Bb"]),
  progression("pop", "Luz", "C G Am F Dm", ["C", "G", "Am", "F", "Dm"])
];

import type { L } from "./i18n";

/**
 * Biblioteca de melodias (domínio público, tradicionais ou originais do projeto).
 * Notação: "C4" = Dó central, "#" sobe meio tom, ":2" = duração em tempos (padrão 1).
 * Para adicionar uma melodia, basta incluir um item em SONGS.
 */

export type SongNote = { midi: number; beats: number };
export type Song = { id: string; title: L; subtitle: L; tempo: number; notes: SongNote[] };

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function parseSong(source: string): SongNote[] {
  return source.trim().split(/\s+/).map((token) => {
    const match = /^([A-G])(#?)(\d)(?::(\d*\.?\d+))?$/.exec(token);
    if (!match) throw new Error(`Invalid melody note: ${token}`);
    const [, letter, sharp, octave, beats] = match;
    return { midi: (Number(octave) + 1) * 12 + SEMITONES[letter] + (sharp ? 1 : 0), beats: beats ? Number(beats) : 1 };
  });
}

const define = (id: string, title: L, subtitle: L, tempo: number, source: string): Song =>
  ({ id, title, subtitle, tempo, notes: parseSong(source) });

export const SONGS: Song[] = [
  define("escala", { pt: "Escala de Dó", en: "C major scale" }, { pt: "Dó Ré Mi Fá Sol Lá Si Dó", en: "C D E F G A B C" }, 84,
    "C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4:2"),
  define("estrelinha", { pt: "Brilha, Brilha, Estrelinha", en: "Twinkle, Twinkle, Little Star" }, { pt: "Cantiga tradicional", en: "Traditional nursery song" }, 100,
    "C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 " +
    "C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2"),
  define("ode", { pt: "Ode à Alegria", en: "Ode to Joy" }, "Beethoven", 108,
    "E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2 " +
    "E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2"),
  define("parabens", { pt: "Parabéns pra Você", en: "Happy Birthday" }, { pt: "Tradicional", en: "Traditional" }, 100,
    "G4:.75 G4:.25 A4 G4 C5 B4:2 G4:.75 G4:.25 A4 G4 D5 C5:2 " +
    "G4:.75 G4:.25 G5 E5 C5 B4 A4:2 F5:.75 F5:.25 E5 C5 D5 C5:2"),
  define("jingle", "Jingle Bells", { pt: "Refrão", en: "Chorus" }, 120,
    "E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 E4 D4 D4 E4 D4:2 G4:2"),
  define("jacques", "Frère Jacques", { pt: "Cantiga francesa", en: "French nursery song" }, 100,
    "C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 " +
    "G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 C4 G3 C4:2 C4 G3 C4:2"),
  define("luar", { pt: "Ao Luar", en: "Au clair de la lune" }, "Au clair de la lune", 100,
    "C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4 C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4"),
  define("elisa", { pt: "Para Elisa", en: "Für Elise" }, { pt: "Beethoven, tema", en: "Beethoven, theme" }, 124,
    "E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 G#4:.5 B4:.5 C5:1.5 " +
    "E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 C5:.5 B4:.5 A4:2"),
  define("aurora", "Aurora", { pt: "Original, combina com C G Am F", en: "Original, pairs with C G Am F" }, 92,
    "E4:2 G4:2 A4:3 G4:1 E4:2 D4:2 C4:4 D4:2 E4:2 G4:3 E4:1 D4:2 C4:2 A3:4"),
  define("mare", { pt: "Maré", en: "Tide" }, { pt: "Original, combina com Am F C G", en: "Original, pairs with Am F C G" }, 88,
    "A4:2 C5:2 B4:2 G4:2 A4:4 E4:4 G4:2 A4:2 C5:2 D5:2 E5:4 C5:4 B4:2 A4:2 G4:2 E4:2 A4:6"),
  define("neblina", { pt: "Neblina", en: "Mist" }, { pt: "Original, combina com Dm Bb F C", en: "Original, pairs with Dm Bb F C" }, 88,
    "D4:2 F4:2 A4:2 C5:2 A4:2 F4:2 E4:4 D4:2 F4:2 G4:2 A4:2 G4:2 F4:2 D4:4 E4:2 F4:2 A4:2 C5:2 D5:6")
];

export function songRange(song: Song): { low: number; high: number; hasSharps: boolean } {
  const pitches = song.notes.map((note) => note.midi);
  const low = Math.min(...pitches);
  const high = Math.max(...pitches);
  return { low, high, hasSharps: pitches.some((pitch) => [1, 3, 6, 8, 10].includes(pitch % 12)) };
}

/** Alturas distintas da música, da mais grave à mais aguda: viram as faixas do modo partitura. */
export function staffPitches(song: Song): number[] {
  return [...new Set(song.notes.map((note) => note.midi))].sort((a, b) => a - b);
}

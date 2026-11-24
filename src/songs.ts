/**
 * Biblioteca de melodias (todas de domínio público ou tradicionais).
 * Notação: "C4" = Dó central, "#" sobe meio tom, ":2" = duração em tempos (padrão 1).
 * Para adicionar uma melodia, basta incluir um item em SONGS.
 */

export type SongNote = { midi: number; beats: number };
export type Song = { id: string; title: string; subtitle: string; tempo: number; notes: SongNote[] };

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function parseSong(source: string): SongNote[] {
  return source.trim().split(/\s+/).map((token) => {
    const match = /^([A-G])(#?)(\d)(?::(\d*\.?\d+))?$/.exec(token);
    if (!match) throw new Error(`Nota inválida na melodia: ${token}`);
    const [, letter, sharp, octave, beats] = match;
    return { midi: (Number(octave) + 1) * 12 + SEMITONES[letter] + (sharp ? 1 : 0), beats: beats ? Number(beats) : 1 };
  });
}

const define = (id: string, title: string, subtitle: string, tempo: number, source: string): Song =>
  ({ id, title, subtitle, tempo, notes: parseSong(source) });

export const SONGS: Song[] = [
  define("escala", "Escala de Dó", "Dó Ré Mi Fá Sol Lá Si Dó", 84,
    "C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4:2"),
  define("estrelinha", "Brilha, Brilha, Estrelinha", "Cantiga tradicional", 100,
    "C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 " +
    "C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2"),
  define("ode", "Ode à Alegria", "Beethoven", 108,
    "E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2 " +
    "E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2"),
  define("parabens", "Parabéns pra Você", "Tradicional", 100,
    "G4:.75 G4:.25 A4 G4 C5 B4:2 G4:.75 G4:.25 A4 G4 D5 C5:2 " +
    "G4:.75 G4:.25 G5 E5 C5 B4 A4:2 F5:.75 F5:.25 E5 C5 D5 C5:2"),
  define("jingle", "Jingle Bells", "Refrão", 120,
    "E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 E4 D4 D4 E4 D4:2 G4:2"),
  define("jacques", "Frère Jacques", "Cantiga francesa", 100,
    "C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 " +
    "G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 C4 G3 C4:2 C4 G3 C4:2"),
  define("luar", "Ao Luar", "Au clair de la lune", 100,
    "C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4 C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4"),
  define("elisa", "Para Elisa", "Beethoven · tema", 124,
    "E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 G#4:.5 B4:.5 C5:1.5 " +
    "E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 C5:.5 B4:.5 A4:2")
];

export function songRange(song: Song): { low: number; high: number; hasSharps: boolean } {
  const pitches = song.notes.map((note) => note.midi);
  const low = Math.min(...pitches);
  const high = Math.max(...pitches);
  return { low, high, hasSharps: pitches.some((pitch) => [1, 3, 6, 8, 10].includes(pitch % 12)) };
}

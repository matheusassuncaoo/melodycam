import { isBlackKey, noteColor, noteLabel, solfege } from "./notes";

type Props = {
  low: number;
  high: number;
  showSharps: boolean;
  lit: number[];
  next?: number;
  onDown: (midi: number) => void;
  onUp: () => void;
};

/** Teclado de notas coloridas: cada tecla tem a cor da sua nota no espectro. */
export function Keyboard({ low, high, showSharps, lit, next, onDown, onUp }: Props) {
  let start = low;
  while (isBlackKey(start)) start--;
  let end = high;
  while (isBlackKey(end)) end++;
  const whites: number[] = [];
  const blacks: { midi: number; after: number }[] = [];
  for (let midi = start; midi <= end; midi++) {
    if (isBlackKey(midi)) { if (showSharps) blacks.push({ midi, after: whites.length }); } else whites.push(midi);
  }
  const unit = 100 / whites.length;
  const keyProps = (midi: number) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); onDown(midi); },
    onPointerUp: onUp,
    onPointerCancel: onUp,
    onLostPointerCapture: onUp
  });
  return <div className="keyboard" role="group" aria-label="Teclado de notas">
    {whites.map((midi) => {
      const isLit = lit.includes(midi);
      return <button key={midi} type="button" className={`key ${isLit ? "lit" : ""} ${next === midi ? "next" : ""}`}
        style={{ "--note": noteColor(midi), flexBasis: `${unit}%` } as React.CSSProperties}
        aria-label={noteLabel(midi)} {...keyProps(midi)}>
        <span className="key-name">{solfege(midi)}</span>
      </button>;
    })}
    {blacks.map(({ midi, after }) => <button key={midi} type="button" className={`key black ${lit.includes(midi) ? "lit" : ""} ${next === midi ? "next" : ""}`}
      style={{ "--note": noteColor(midi), left: `${after * unit - unit * 0.3}%`, width: `${unit * 0.6}%` } as React.CSSProperties}
      aria-label={noteLabel(midi)} {...keyProps(midi)} />)}
  </div>;
}

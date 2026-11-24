import { noteColor } from "./notes";

/** Marca: lente de câmera + cinco "dedos" que são também barras de som e as notas Dó–Sol. */
const BARS = [
  { x: 15, top: 30, midi: 60 },
  { x: 22.4, top: 20, midi: 62 },
  { x: 29.8, top: 14, midi: 64 },
  { x: 37.2, top: 20, midi: 65 },
  { x: 44.6, top: 29, midi: 67 }
];

export function LogoMark({ size = 32, title = "Melodycam" }: { size?: number; title?: string }) {
  return <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
    <defs>
      <linearGradient id="mc-ring" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#8b7cff" />
        <stop offset="1" stopColor="#d2a6ff" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="none" stroke="url(#mc-ring)" strokeWidth="3" />
    {BARS.map((bar) => <rect key={bar.x} x={bar.x} y={bar.top} width="4.4" height={47 - bar.top} rx="2.2" fill={noteColor(bar.midi)} />)}
  </svg>;
}

export function Wordmark({ href }: { href?: string }) {
  const content = <><LogoMark size={30} /><span className="wordmark-text">melody<b>cam</b></span></>;
  return href ? <a className="wordmark" href={href} aria-label="Sobre o Melodycam">{content}</a> : <span className="wordmark">{content}</span>;
}

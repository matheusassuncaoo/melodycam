import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { PRESETS, Synth } from "./music";
import { PROGRESSIONS, chordName } from "./notes";
import { t } from "./i18n";

/**
 * Demonstração animada: uma mão (21 pontos, como o rastreamento real) faz a pinça e sobe pelas faixas
 * G, B, C e Cm. Com "Ouvir ao vivo" o mesmo sintetizador do instrumento toca o som.
 */

const CHORDS = PROGRESSIONS[0].chords;
const CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const TIPS = [4, 8, 12, 16, 20];

/** Mão aberta e mão em pinça, em coordenadas locais (200 × 260). */
const OPEN: [number, number][] = [[100, 240], [72, 214], [52, 186], [40, 160], [32, 138], [78, 150], [74, 112], [72, 86], [71, 62], [100, 145], [100, 100], [100, 72], [100, 48], [122, 150], [127, 110], [129, 84], [130, 62], [142, 162], [151, 130], [155, 110], [158, 92]];
const PINCH: [number, number][] = [[100, 240], [72, 214], [56, 190], [54, 158], [62, 122], [78, 150], [78, 120], [70, 104], [62, 122], [100, 145], [100, 104], [100, 80], [100, 60], [122, 150], [126, 112], [128, 90], [129, 72], [142, 162], [150, 134], [154, 116], [157, 100]];

const W = 640;
const H = 410;
const BAND_TOP = 24;
const BAND_H = 78;
const SCALE = 0.82;
const HAND_X = 360;
const bandCenter = (index: number) => BAND_TOP + (CHORDS.length - 1 - index) * BAND_H + BAND_H / 2;

export function HandDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const diamondRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const bandRefs = useRef<(SVGRectElement | null)[]>([]);
  const labelRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLElement>(null);
  const eqRefs = useRef<(HTMLElement | null)[]>([]);
  const synthRef = useRef<Synth | null>(null);
  const soundRef = useRef(false);
  const [sound, setSound] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const state = { y: bandCenter(0), pinch: 0, chord: 0, active: 0 };
      let playing = false;

      const draw = (time: number) => {
        const color = CHORDS[state.chord].color;
        const points = OPEN.map(([ox, oy], i) => {
          const [px, py] = PINCH[i];
          const lx = ox + (px - ox) * state.pinch;
          const ly = oy + (py - oy) * state.pinch;
          return { x: HAND_X + (lx - 100) * SCALE, y: state.y + (ly - 145) * SCALE };
        });
        CONNECTIONS.forEach(([a, b], i) => {
          const line = lineRefs.current[i];
          if (!line) return;
          line.setAttribute("x1", String(points[a].x)); line.setAttribute("y1", String(points[a].y));
          line.setAttribute("x2", String(points[b].x)); line.setAttribute("y2", String(points[b].y));
          line.setAttribute("stroke", color);
        });
        points.forEach((point, i) => {
          const dot = dotRefs.current[i];
          if (!dot) return;
          dot.setAttribute("cx", String(point.x)); dot.setAttribute("cy", String(point.y));
          dot.setAttribute("fill", TIPS.includes(i) ? color : "#0b0a14");
          dot.setAttribute("stroke", color);
        });
        const palm = points[9];
        diamondRef.current?.setAttribute("d", `M${palm.x} ${palm.y - 9} L${palm.x + 9} ${palm.y} L${palm.x} ${palm.y + 9} L${palm.x - 9} ${palm.y} Z`);
        diamondRef.current?.setAttribute("fill", color);
        const mid = { x: (points[4].x + points[8].x) / 2, y: (points[4].y + points[8].y) / 2 };
        const ring = ringRef.current;
        if (ring) {
          ring.setAttribute("cx", String(mid.x)); ring.setAttribute("cy", String(mid.y));
          ring.setAttribute("r", String(10 + state.pinch * 8));
          ring.setAttribute("stroke", state.pinch > 0.7 ? "#ffffff" : color);
          ring.setAttribute("fill", state.pinch > 0.7 ? `${color}66` : "none");
        }
        bandRefs.current.forEach((band, i) => band?.setAttribute("opacity", i === state.active ? (playing ? "1" : "0.75") : "0.4"));
        eqRefs.current.forEach((bar, i) => {
          if (!bar) return;
          const level = playing ? 0.25 + 0.75 * Math.abs(Math.sin(time * 3.1 + i * 0.7) * Math.cos(time * 1.7 + i * 0.31)) : 0.12;
          bar.style.transform = `scaleY(${level.toFixed(3)})`;
          bar.style.background = color;
        });
      };
      gsap.ticker.add(draw);

      const show = (index: number) => {
        state.chord = index;
        if (labelRef.current) { labelRef.current.textContent = CHORDS[index].symbol; labelRef.current.style.color = CHORDS[index].color; }
        if (nameRef.current) nameRef.current.textContent = chordName(CHORDS[index]);
      };
      const hear = (index: number, first: boolean) => {
        const synth = synthRef.current;
        if (!soundRef.current || !synth) return;
        if (first || !synth.glideTo(CHORDS[index].notes)) synth.play(CHORDS[index].notes);
      };
      const goTo = (index: number) => {
        const timeline = gsap.timeline();
        timeline.to(state, { y: bandCenter(index), duration: 0.75, ease: "power2.inOut" })
          .call(() => { state.active = index; show(index); hear(index, false); });
        return timeline;
      };

      const loop = gsap.timeline({ repeat: -1, repeatDelay: 0.5, scrollTrigger: { trigger: rootRef.current, start: "top 85%", toggleActions: "play pause resume pause" } });
      loop.set(state, { y: bandCenter(0), pinch: 0, active: 0 })
        .call(() => show(0))
        .to(state, { pinch: 1, duration: 0.45, ease: "power2.out" }, "+=0.6")
        .call(() => { playing = true; hear(0, true); })
        .to({}, { duration: 0.9 })
        .add(goTo(1)).to({}, { duration: 0.8 })
        .add(goTo(2)).to({}, { duration: 0.8 })
        .add(goTo(3)).to({}, { duration: 1 })
        .to(state, { pinch: 0, duration: 0.5, ease: "power2.in" })
        .call(() => { playing = false; synthRef.current?.stop(); });

      return () => { gsap.ticker.remove(draw); };
    }, rootRef);
    return () => { ctx.revert(); };
  }, []);

  useEffect(() => () => { void synthRef.current?.dispose(); synthRef.current = null; }, []);

  const toggleSound = async () => {
    if (sound) {
      soundRef.current = false;
      setSound(false);
      synthRef.current?.stop();
      return;
    }
    if (!synthRef.current) synthRef.current = new Synth();
    await synthRef.current.ready();
    synthRef.current.setPreset(PRESETS[0]);
    soundRef.current = true;
    setSound(true);
  };

  return <div className="hand-demo glass" ref={rootRef}>
    <svg viewBox={`0 0 ${W} ${H}`} className="hand-svg" role="img" aria-label={t("land.demoAria")}>
      {CHORDS.map((chord, index) => {
        const y = BAND_TOP + (CHORDS.length - 1 - index) * BAND_H;
        return <g key={chord.symbol}>
          <rect ref={(node) => { bandRefs.current[index] = node; }} x={24} y={y + 3} width={W - 48} height={BAND_H - 6} rx={12} fill={chord.color} opacity={0.4} />
          <rect x={24} y={y + 3} width={6} height={BAND_H - 6} rx={3} fill={chord.color} />
          <text x={48} y={y + BAND_H / 2 + 8} fontSize={24} fontWeight={800} fill="#ffffff" fontFamily="'Unbounded Variable', system-ui, sans-serif">{chord.symbol}</text>
        </g>;
      })}
      {CONNECTIONS.map((_, i) => <line key={i} ref={(node) => { lineRefs.current[i] = node; }} strokeWidth={3} strokeLinecap="round" />)}
      {OPEN.map((_, i) => <circle key={i} ref={(node) => { dotRefs.current[i] = node; }} r={TIPS.includes(i) ? 5.5 : 3.2} strokeWidth={2} />)}
      <circle ref={ringRef} strokeWidth={3} fill="none" />
      <path ref={diamondRef} stroke="#0b0a14" strokeWidth={2} />
    </svg>
    <div className="hand-side">
      <span className="hand-caption">{t("stage.chord")}</span>
      <strong ref={labelRef} className="hand-chord">G</strong>
      <span ref={nameRef} className="hand-chord-name">{chordName(CHORDS[0])}</span>
      <div className="eq hand-eq" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} ref={(node) => { eqRefs.current[i] = node; }} />)}</div>
      <button type="button" className={`btn ${sound ? "ghost" : "primary"}`} onClick={() => void toggleSound()} aria-pressed={sound}>{sound ? t("land.mute") : t("land.hear")}</button>
      <small>{t("land.demoCaption")}</small>
    </div>
  </div>;
}

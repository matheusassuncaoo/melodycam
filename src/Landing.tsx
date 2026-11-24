import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HandDemo } from "./HandDemo";
import { LogoMark, Wordmark } from "./Logo";
import { LangSwitch, t, useLang } from "./i18n";
import { PRESETS } from "./music";
import { PROGRESSIONS, noteColor, solfege } from "./notes";
import { SONGS } from "./songs";

gsap.registerPlugin(ScrollTrigger);

const GITHUB_PROFILE = "https://github.com/matheusassuncaoo";
const GITHUB_REPO = "https://github.com/matheusassuncaoo/melodycam";

const SPECTRUM = [60, 62, 64, 65, 67, 69, 71];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Landing() {
  const { lang } = useLang();
  const rootRef = useRef<HTMLDivElement>(null);

  const headline = t("land.h1").split("|");
  const perks = [t("land.perk1"), t("land.perk2"), t("land.perk3"), t("land.perk4")];
  const features = [
    { title: t("land.f1t"), text: t("land.f1p"), color: noteColor(67) },
    { title: t("land.f2t"), text: t("land.f2p"), color: noteColor(64) },
    { title: t("land.f3t"), text: t("land.f3p"), color: noteColor(60) }
  ];
  const steps = [
    { n: "01", title: t("land.st1t"), text: t("land.st1p") },
    { n: "02", title: t("land.st2t"), text: t("land.st2p") },
    { n: "03", title: t("land.st3t"), text: t("land.st3p") }
  ];
  const stats = [
    { value: PROGRESSIONS.length, label: t("land.stat1") },
    { value: PRESETS.length, label: t("land.stat2") },
    { value: SONGS.length, label: t("land.stat3") },
    { value: 0, label: t("land.stat4") }
  ];
  const pipeline = [
    { title: t("land.p1t"), detail: t("land.p1p") },
    { title: t("land.p2t"), detail: t("land.p2p") },
    { title: t("land.p3t"), detail: t("land.p3p") },
    { title: t("land.p4t"), detail: t("land.p4p") },
    { title: t("land.p5t"), detail: t("land.p5p") }
  ];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Entrada do hero
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .from(".landing-hero .logo-mark", { scale: 0.5, opacity: 0, rotate: -12, duration: 0.9, ease: "back.out(1.7)" })
          .from(".landing-hero .logo-mark .bar", { scaleY: 0, duration: 0.8, stagger: 0.08, ease: "elastic.out(1, 0.55)" }, "<0.1")
          .from(".landing-hero .eyebrow", { opacity: 0, y: 12, letterSpacing: "0.5em", duration: 0.7 }, "-=0.5")
          .from(".landing-hero .w", { yPercent: 115, duration: 0.95, stagger: 0.08, ease: "power4.out" }, "-=0.45")
          .from(".landing-hero .lead", { opacity: 0, y: 20, duration: 0.7 }, "-=0.55")
          .from(".landing-cta > *", { opacity: 0, y: 20, scale: 0.94, duration: 0.6, stagger: 0.1 }, "-=0.45")
          .from(".perks span", { opacity: 0, y: 12, duration: 0.5, stagger: 0.07 }, "-=0.4")
          .from(".spectrum span", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.6, stagger: 0.06, ease: "back.out(1.6)" }, "-=0.5");

        // Movimento contínuo de fundo e logo
        gsap.to(".aura-one", { x: 90, y: 50, duration: 11, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(".aura-two", { x: -70, y: -40, duration: 14, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(".landing-hero .logo-mark .bar", {
          scaleY: () => gsap.utils.random(0.65, 1.12), duration: 0.9, yoyo: true, repeat: -1, stagger: 0.13, ease: "sine.inOut", delay: 2.2
        });
        gsap.to(".spectrum", { backgroundPosition: "200% 0", duration: 8, repeat: -1, ease: "none" });

        gsap.from(".hand-demo", { opacity: 0, y: 60, scale: 0.96, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".hand-demo", start: "top 88%" } });

        // Revelação ao rolar
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
          gsap.from(element, { opacity: 0, y: 40, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 86%" } });
        });
        gsap.from(".feature", { opacity: 0, y: 60, rotateX: -10, transformPerspective: 800, duration: 0.9, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: ".feature-grid", start: "top 82%" } });
        gsap.from(".step", { opacity: 0, x: -30, duration: 0.8, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: ".step-row", start: "top 85%" } });

        // Números que contam
        gsap.utils.toArray<HTMLElement>(".stat-row b").forEach((element) => {
          const target = Number(element.dataset.count ?? 0);
          const counter = { value: 0 };
          gsap.to(counter, {
            value: target, duration: 1.6, ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 90%" },
            onUpdate: () => { element.textContent = String(Math.round(counter.value)); }
          });
        });

        // Pipeline acende em sequência conforme a rolagem
        gsap.from(".pipeline li", {
          opacity: 0.15, y: 30, scale: 0.97, stagger: 0.25, ease: "none",
          scrollTrigger: { trigger: ".pipeline", start: "top 80%", end: "bottom 65%", scrub: true }
        });
        gsap.fromTo(".pipe-progress i", { scaleX: 0 }, {
          scaleX: 1, ease: "none", transformOrigin: "0 50%",
          scrollTrigger: { trigger: ".pipeline", start: "top 80%", end: "bottom 65%", scrub: true }
        });

        // Chamada final
        gsap.from(".final-cta > *", { opacity: 0, y: 40, duration: 0.8, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".final-cta", start: "top 80%" } });
        gsap.to(".final-cta .btn.primary", { boxShadow: "0 0 50px rgba(139,124,255,.7)", duration: 1.3, yoyo: true, repeat: -1, ease: "sine.inOut" });

        // Barra de navegação ganha corpo ao rolar
        gsap.to(".landing-nav", { backgroundColor: "rgba(13,11,24,.88)", scrollTrigger: { start: 40, end: 160, scrub: true } });
      });

      return () => mm.revert();
    }, rootRef);
    return () => ctx.revert();
    // A animação é montada de novo quando o idioma muda, porque o texto dos elementos muda.
  }, [lang]);

  return <div className="landing" ref={rootRef} key={lang}>
    <div className="atmosphere" aria-hidden="true"><div className="aura aura-one" /><div className="aura aura-two" /></div>

    <header className="landing-nav glass">
      <Wordmark href="#/sobre" />
      <nav>
        <button type="button" onClick={() => scrollTo("ideia")}>{t("land.ideia")}</button>
        <button type="button" onClick={() => scrollTo("engine")}>{t("land.engine")}</button>
        <LangSwitch />
        <a className="btn primary" href="#/">{t("land.open")}</a>
      </nav>
    </header>

    <section className="landing-hero">
      <LogoMark size={92} />
      <span className="eyebrow">MELODYCAM</span>
      <h1 aria-label={t("land.h1aria")}>
        {headline.map((word, index) => <span className="wl" key={`${word}-${index}`} aria-hidden="true"><span className={`w ${index >= headline.length - 2 ? "grad" : ""}`}>{word}</span></span>)}
      </h1>
      <p className="lead">{t("land.lead")}</p>
      <div className="landing-cta">
        <a className="btn primary large" href="#/">{t("land.play")}</a>
        <button type="button" className="btn ghost large" onClick={() => scrollTo("ideia")}>{t("land.how")}</button>
      </div>
      <div className="perks">{perks.map((perk) => <span key={perk}>{perk}</span>)}</div>
      <div className="spectrum" aria-label={t("land.spectrumAria")}>
        {SPECTRUM.map((midi) => <span key={midi} style={{ background: noteColor(midi) }}>{solfege(midi)}</span>)}
      </div>
    </section>

    <section className="demo-section" aria-label={t("land.demoTitle")}>
      <HandDemo />
    </section>

    <section id="ideia" className="landing-section">
      <div className="section-head reveal"><span className="eyebrow">{t("land.s1eyebrow")}</span><h2>{t("land.s1title")}</h2><p>{t("land.s1p")}</p></div>
      <div className="feature-grid">{features.map((item) => <article key={item.title} className="feature glass" style={{ "--note": item.color } as React.CSSProperties}>
        <span className="feature-dot" /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      <div className="step-row">{steps.map((step) => <div key={step.n} className="step"><span>{step.n}</span><strong>{step.title}</strong><p>{step.text}</p></div>)}</div>
      <div className="stat-row">{stats.map((stat) => <div key={stat.label}><b data-count={stat.value}>0</b><span>{stat.label}</span></div>)}</div>
    </section>

    <section id="engine" className="landing-section">
      <div className="section-head reveal"><span className="eyebrow">{t("land.s2eyebrow")}</span><h2>{t("land.s2title")}</h2><p>{t("land.s2p")}</p></div>
      <div className="pipe-progress" aria-hidden="true"><i /></div>
      <ol className="pipeline">{pipeline.map((item, index) => <li key={item.title} className="glass">
        <span className="pipe-n">{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.detail}</p></li>)}</ol>
      <div className="stack-row reveal">
        {["React 19", "TypeScript", "Vite", "GSAP", "MediaPipe Tasks Vision", "Web Audio API", "Canvas 2D"].map((name) => <span key={name} className="chip">{name}</span>)}
      </div>
    </section>

    <section className="final-cta">
      <h2>{t("land.ctaTitle")}</h2>
      <p>{t("land.ctaP")}</p>
      <a className="btn primary large" href="#/">{t("land.open")}</a>
    </section>

    <footer className="landing-footer">
      <div className="credit">
        <LogoMark size={40} />
        <div>
          <strong>{t("land.by")}</strong>
          <span>{t("land.openSource")} {t("land.license")}</span>
        </div>
      </div>
      <div className="footer-links">
        <a className="btn ghost" href={GITHUB_PROFILE} target="_blank" rel="noreferrer">{t("land.github")}</a>
        <a className="btn ghost" href={GITHUB_REPO} target="_blank" rel="noreferrer">{t("land.repo")}</a>
        <a className="btn ghost" href={`${GITHUB_REPO}/blob/main/PRIVACY.md`} target="_blank" rel="noreferrer">{t("land.privacyLink")}</a>
        <a className="btn primary" href="#/">{t("land.open")}</a>
      </div>
    </footer>
  </div>;
}

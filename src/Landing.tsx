import { LogoMark, Wordmark } from "./Logo";
import { PRESETS } from "./music";
import { PROGRESSIONS, noteColor, solfege } from "./notes";
import { SONGS } from "./songs";

const GITHUB_PROFILE = "https://github.com/matheusassuncaoo";
const GITHUB_REPO = "https://github.com/matheusassuncaoo/melodycam";

const SPECTRUM = [60, 62, 64, 65, 67, 69, 71];

const FEATURES = [
  { title: "Ambient com as mãos", color: noteColor(67), text: "Escolha uma progressão, como Creep, e os dedos da mão esquerda trocam o acorde enquanto a direita segura o pad. Timbres dark ambient, synthwave e dreamscape." },
  { title: "Dó Ré Mi Fá Sol Lá Si Dó", color: noteColor(64), text: "A tela vira uma escala de oito faixas coloridas. Deslize a mão, junte polegar e indicador e a nota soa, sem precisar saber teoria." },
  { title: "Músicas para tocar", color: noteColor(60), text: "Uma biblioteca de melodias conhecidas. Cada pinça toca a próxima nota, e o teclado mostra qual vem em seguida." }
];

const STEPS = [
  { n: "01", title: "Ative a câmera", text: "Fique de frente, com luz e as mãos à vista. Nada é enviado a servidor." },
  { n: "02", title: "A esquerda escolhe", text: "De 1 a 5 dedos para trocar o acorde ou a oitava." },
  { n: "03", title: "A direita toca", text: "Junte polegar e indicador. Segure para sustentar, solte para soltar o som." }
];

const PIPELINE = [
  { title: "Câmera", detail: "getUserMedia em até 960×540. Em ambiente escuro o quadro ganha brilho adaptativo antes da detecção." },
  { title: "Detecção", detail: "MediaPipe Hand Landmarker em WebAssembly, com GPU e CPU de reserva. Devolve 21 pontos 3D por mão." },
  { title: "Gestos", detail: "Dedos pelo ângulo das articulações, pinça pela razão polegar e indicador sobre a palma. Votação, histerese e média móvel removem o tremor." },
  { title: "Som", detail: "Web Audio API: osciladores com vozes desafinadas, filtro, eco com realimentação, reverb por convolução e envelopes." },
  { title: "Interface", detail: "React, TypeScript e Vite. Um canvas desenha as mãos alinhadas ao vídeo e as faixas coloridas por cima." }
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Landing() {
  return <div className="landing">
    <div className="atmosphere" aria-hidden="true"><div className="aura aura-one" /><div className="aura aura-two" /></div>

    <header className="landing-nav glass">
      <Wordmark href="#/sobre" />
      <nav>
        <button type="button" onClick={() => scrollTo("ideia")}>A ideia</button>
        <button type="button" onClick={() => scrollTo("engine")}>Engine</button>
        <a className="btn primary" href="#/">Abrir o instrumento</a>
      </nav>
    </header>

    <section className="landing-hero">
      <LogoMark size={92} />
      <span className="eyebrow">MELODYCAM</span>
      <h1>Música ambient com as <span>suas mãos</span></h1>
      <p>Um instrumento que roda no navegador. Mostre as mãos à câmera, troque acordes com os dedos e faça sons de dark ambient, synthwave e dreamscape no ar, sem instalar nada.</p>
      <div className="landing-cta">
        <a className="btn primary large" href="#/">Tocar agora</a>
        <button type="button" className="btn ghost large" onClick={() => scrollTo("engine")}>Ver a engine</button>
      </div>
      <div className="spectrum" aria-label="As sete notas e suas cores">
        {SPECTRUM.map((midi) => <span key={midi} style={{ background: noteColor(midi) }}>{solfege(midi)}</span>)}
      </div>
    </section>

    <section id="ideia" className="landing-section">
      <div className="section-head"><span className="eyebrow">01 A IDEIA</span><h2>Luz é som. Cada nota tem a sua cor.</h2>
        <p>O Melodycam parte de um vídeo em que alguém toca acordes no ar com as mãos. A ideia aqui é fazer isso simples para qualquer pessoa: as sete notas viram sete cores, e a mesma cor aparece no teclado, nas faixas sobre a câmera e nas suas mãos.</p></div>
      <div className="feature-grid">{FEATURES.map((item) => <article key={item.title} className="feature glass" style={{ "--note": item.color } as React.CSSProperties}>
        <span className="feature-dot" /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      <div className="step-row">{STEPS.map((step) => <div key={step.n} className="step"><span>{step.n}</span><strong>{step.title}</strong><p>{step.text}</p></div>)}</div>
      <div className="stat-row">
        <div><b>{PROGRESSIONS.length}</b><span>progressões de acordes</span></div>
        <div><b>{PRESETS.length}</b><span>timbres</span></div>
        <div><b>{SONGS.length}</b><span>melodias na biblioteca</span></div>
        <div><b>0</b><span>vídeos enviados a servidores</span></div>
      </div>
    </section>

    <section id="engine" className="landing-section">
      <div className="section-head"><span className="eyebrow">02 ENGINE</span><h2>Do quadro da câmera ao som, em tempo real.</h2>
        <p>Tudo acontece no seu navegador. O vídeo nunca sai do dispositivo: a câmera alimenta o modelo de mãos, os gestos viram notas e o som é sintetizado na hora.</p></div>
      <ol className="pipeline">{PIPELINE.map((item, index) => <li key={item.title} className="glass">
        <span className="pipe-n">{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.detail}</p></li>)}</ol>
      <div className="stack-row">
        {["React 19", "TypeScript", "Vite", "MediaPipe Tasks Vision", "Web Audio API", "Canvas 2D"].map((name) => <span key={name} className="chip">{name}</span>)}
      </div>
    </section>

    <footer className="landing-footer">
      <div className="credit">
        <LogoMark size={40} />
        <div>
          <strong>Desenvolvido por Matheus Assunção da Cunha</strong>
          <span>Projeto de código aberto.</span>
        </div>
      </div>
      <div className="footer-links">
        <a className="btn ghost" href={GITHUB_PROFILE} target="_blank" rel="noreferrer">GitHub do Matheus</a>
        <a className="btn ghost" href={GITHUB_REPO} target="_blank" rel="noreferrer">Repositório</a>
        <a className="btn primary" href="#/">Abrir o instrumento</a>
      </div>
    </footer>
  </div>;
}

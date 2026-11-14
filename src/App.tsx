@import url("https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap");

@font-face {
  font-family: "Boldspixels";
  src: url("/boldspixels.ttf") format("truetype");
  font-display: swap;
}

:root {
  color-scheme: dark;
  --text: #ecebe4;
  --primary: #21897e;
  --line: rgba(236, 235, 228, 0.22);
  --soft: rgba(236, 235, 228, 0.65);
  --panel: rgba(4, 8, 14, 0.5);
  --space: #03060b;
  --warn: #e0a458;
  --bad: #e2655a;
  --nav-h: 52px;
  --display: "Boldspixels", "Courier New", monospace;
  --body: "Satoshi", system-ui, -apple-system, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }
html, body, #root {
  margin: 0; height: 100%; background: var(--space); color: var(--text);
  font-family: var(--body); font-size: 15px;
}
button { font: inherit; color: inherit; cursor: pointer; }

.app { position: relative; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.bg { position: fixed; inset: 0; z-index: 0; }

/* navigation */
.nav {
  position: relative; z-index: 2; flex: none; height: var(--nav-h);
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 0 16px; border-bottom: 1px solid var(--line);
  background: rgba(3, 6, 11, 0.55); backdrop-filter: blur(8px);
}
.brand { font-family: var(--display); font-size: 18px; letter-spacing: 0.08em; white-space: nowrap; }
.stages { display: flex; gap: 6px; overflow-x: auto; }
.stage {
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
  background: transparent; border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; font-family: var(--display); font-size: 13px;
}
.stage i { font-style: normal; opacity: 0.6; }
.stage.on { background: var(--primary); border-color: var(--primary); }
.stage:disabled { opacity: 0.35; cursor: not-allowed; }

/* layout */
.ui { position: relative; z-index: 1; flex: 1; min-height: 0; pointer-events: none; }
.ui > * { pointer-events: auto; }
.center {
  display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
  gap: 14px; padding: 16px; overflow-y: auto; text-align: center;
}
.center > :first-child { margin-top: auto; }
.center > :last-child { margin-bottom: auto; }

/* type */
h1, h2, h3 { font-family: var(--display); font-weight: 400; margin: 8px 0; }
h1 { font-size: clamp(34px, 8vw, 84px); letter-spacing: 0.1em; line-height: 1.05; text-align: center; }
h2 { font-size: 24px; }
h3 { font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.85; margin-top: 16px; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.25em; font-size: 11px; color: var(--primary); }
.sub { color: var(--soft); margin: 0 0 8px; }
.meta, .credit { font-size: 12px; color: var(--soft); }

/* surfaces */
.panel {
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 16px; backdrop-filter: blur(8px); text-align: left;
}
.wide { width: min(780px, 100%); max-height: calc(100vh - var(--nav-h) - 32px); overflow-y: auto; }

/* buttons */
.primary { background: var(--primary); border: 1px solid var(--primary); border-radius: 8px; padding: 12px 22px; font-weight: 700; }
.primary:hover:not(:disabled) { filter: brightness(1.12); }
.primary:disabled { opacity: 0.4; cursor: not-allowed; }
.ghost { background: transparent; border: 1px solid var(--line); border-radius: 8px; padding: 10px 16px; }
.ghost:hover { border-color: var(--text); }
.btns { display: flex; justify-content: space-between; gap: 10px; margin-top: 14px; }

/* mission cards */
.mgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; width: min(900px, 100%); }
.mcard { text-align: left; color: var(--text); transition: border-color 0.15s, transform 0.15s; }
.mcard:hover { border-color: var(--primary); transform: translateY(-3px); }
.mimg { height: 150px; border-radius: 8px; background: rgba(236, 235, 228, 0.06) center / cover; margin-bottom: 10px; }
.mcard h3 { font-size: 18px; text-transform: none; letter-spacing: 0.04em; opacity: 1; margin-top: 4px; }

/* workshop */
.workshop {
  display: grid; gap: 12px; padding: 12px;
  grid-template-columns: minmax(290px, 360px) minmax(0, 1fr) minmax(250px, 300px);
  grid-template-rows: minmax(0, 1fr);
}
.parts, .side { overflow-y: auto; min-height: 0; }
.view { position: relative; min-height: 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); }
.side .hud { grid-template-columns: 1fr; }
.card {
  display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left;
  background: rgba(236, 235, 228, 0.04); border: 1px solid var(--line);
  border-radius: 10px; padding: 10px; margin-bottom: 8px;
}
.card span, .card small, .row small { display: block; font-size: 12px; color: var(--soft); }
.card:hover { border-color: rgba(236, 235, 228, 0.5); }
.card.sel { border-color: var(--primary); background: rgba(33, 137, 126, 0.2); }
.row {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  background: rgba(236, 235, 228, 0.04); border: 1px solid var(--line);
  border-radius: 10px; padding: 8px 10px; margin-bottom: 8px;
}
.step { display: flex; align-items: center; gap: 10px; }
.step button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: transparent; }
.step button:hover:not(:disabled) { border-color: var(--primary); }
.step button:disabled { opacity: 0.35; cursor: not-allowed; }

/* meters and readout */
.hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.meter-top { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin-bottom: 4px; }
.bar { height: 6px; background: rgba(236, 235, 228, 0.14); border-radius: 99px; overflow: hidden; }
.bar i { display: block; height: 100%; transition: width 0.2s; }
.bg-good { background: var(--primary); }
.bg-bad { background: var(--bad); }
.good { color: var(--primary); }
.bad { color: var(--bad); }
.readout { margin-top: 12px; display: grid; }
.rrow {
  display: flex; justify-content: space-between; gap: 10px; padding: 6px 0;
  border-bottom: 1px solid rgba(236, 235, 228, 0.1); font-size: 13px;
}
.rrow span { color: var(--soft); }
.feas { margin-top: 10px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; font-size: 13px; }
.feas.ok { border-color: var(--primary); }
.feas.warn { border-color: var(--warn); }
.feas.block { border-color: var(--bad); }

/* planner */
.vgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
.checks { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; font-size: 14px; }
.checks b { font-family: var(--display); font-size: 12px; margin-right: 6px; }
.checks .ok b { color: var(--primary); }
.checks .warn { color: var(--warn); }
.checks .block { color: var(--bad); }

/* flight */
.flight { display: flex; align-items: flex-end; justify-content: flex-start; padding: 16px; }
.logbox { width: min(440px, 100%); }
.log { list-style: none; padding: 0; margin: 12px 0; display: grid; gap: 6px; max-height: 38vh; overflow-y: auto; font-size: 14px; }
.log .warn { color: var(--warn); }
.log .fail { color: var(--bad); font-weight: 700; }

/* report */
.banner { font-family: var(--display); font-size: 28px; letter-spacing: 0.08em; margin: 0 0 10px; }
.banner.success { color: var(--primary); }
.banner.partial { color: var(--warn); }
.banner.failure { color: var(--bad); }
.scoregrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
.scoregrid div { background: rgba(236, 235, 228, 0.05); border: 1px solid var(--line); border-radius: 10px; padding: 10px; }
.scoregrid small { display: block; color: var(--soft); font-size: 11px; text-transform: uppercase; }
.scoregrid b { font-size: 20px; }
.fact { border-left: 3px solid var(--primary); background: rgba(236, 235, 228, 0.05); padding: 10px 12px; border-radius: 6px; }

/* NASA and 3D labels */
.nasa { position: fixed; right: 16px; bottom: 16px; z-index: 3; max-width: 340px; font-size: 13px; }
.nasa img { width: 100%; border-radius: 8px; margin-top: 6px; }
.apod { color: var(--soft); font-size: 12px; margin: 6px 0 0; }
.tag3d {
  font-family: var(--body); font-size: 11px; color: var(--text);
  background: rgba(3, 6, 11, 0.6); padding: 1px 6px; border-radius: 4px; white-space: nowrap;
}

@media (max-width: 1000px) {
  .workshop { grid-template-columns: 1fr; grid-template-rows: none; overflow-y: auto; align-content: start; }
  .view { order: -1; height: 42vh; min-height: 280px; }
  .parts, .side { overflow: visible; }
  .nasa, .brand { display: none; }
}

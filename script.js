const STORAGE_KEY = "pomoleen:v1";

/* ── Color CSS variable map ── */
const PALETTE_VAR_MAP = {
  pomodoro: ["--accent",     "--accent-deep",     "--accent-soft",     "--accent-glow"],
  short:    ["--break",      "--break-deep",      "--break-soft",      "--break-glow"],
  long:     ["--long-break", "--long-break-deep", "--long-break-soft", "--long-break-glow"],
};
const DEFAULT_COLORS = { pomodoro: "#e11d48", short: "#0ea5e9", long: "#10b981" };

/* ── Color derivation utilities ── */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0, s=0, l=(max+min)/2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    if (max===r) h=((g-b)/d+(g<b?6:0))/6;
    else if (max===g) h=((b-r)/d+2)/6;
    else h=((r-g)/d+4)/6;
  }
  return [h*360, s*100, l*100];
}
function hslToHex(h,s,l) {
  h/=360; s/=100; l/=100;
  const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  let r,g,b;
  if (s===0){r=g=b=l;}else{const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);}
  return "#"+[r,g,b].map(x=>Math.round(x*255).toString(16).padStart(2,"0")).join("");
}
function hexToRgbArr(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function deriveColorVars(hex, isDark) {
  const [h,s,l] = hexToHsl(hex);
  let main, deep, soft, glow;
  if (isDark) {
    const mL = Math.min(Math.max(l+18, 52), 78);
    main = hslToHex(h, Math.min(s+5,100), mL);
    deep = hslToHex(h, Math.min(s+15,100), Math.max(mL-18,32));
    soft = hslToHex(h, Math.max(s-10,18), Math.max(l-22,6));
    const [r,g,b] = hexToRgbArr(main);
    glow = `rgba(${r},${g},${b},0.42)`;
  } else {
    main = hex;
    deep = hslToHex(h, Math.min(s+8,100), Math.max(l-18,18));
    soft = hslToHex(h, Math.max(s-25,10), Math.min(l+38,95));
    const [r,g,b] = hexToRgbArr(hex);
    glow = `rgba(${r},${g},${b},0.28)`;
  }
  return { main, deep, soft, glow };
}

const state = {
  mode: "pomodoro",
  durations: { pomodoro: 25, short: 5, long: 15 },
  remaining: 25 * 60,
  total: 25 * 60,
  running: false,
  intervalId: null,
  completed: 0,
  theme: "light",
  colors: { pomodoro: null, short: null, long: null },
};

const els = {
  time: document.getElementById("time"),
  label: document.getElementById("label"),
  ringFg: document.getElementById("ringFg"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  skipBtn: document.getElementById("skipBtn"),
  modeBtns: document.querySelectorAll(".mode-btn"),
  themeToggle: document.getElementById("themeToggle"),
  pomoInput: document.getElementById("pomoInput"),
  shortInput: document.getElementById("shortInput"),
  longInput: document.getElementById("longInput"),
  brandDot: document.getElementById("brandDot"),
  modesPill: document.getElementById("modesPill"),
  themeLabel: document.getElementById("themeLabel"),
  paletteBtn: document.getElementById("paletteBtn"),
  prefsOverlay: document.getElementById("prefsOverlay"),
  prefsClose: document.getElementById("prefsClose"),
};

const RADIUS = 150;
const CIRC = 2 * Math.PI * RADIUS;
els.ringFg.style.strokeDasharray = CIRC;
els.ringFg.style.strokeDashoffset = 0;

const modeLabel = { pomodoro: "Focus", short: "Short Break", long: "Long Break" };
const colorVar  = { pomodoro: "--accent", short: "--break", long: "--long-break" };

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.durations) state.durations = { ...state.durations, ...saved.durations };
      if (saved.completed) state.completed = saved.completed % 4;
      if (saved.theme) state.theme = saved.theme;
      if (saved.colors) state.colors = { ...state.colors, ...saved.colors };
    }
  } catch (e) { /* ignore */ }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      durations: state.durations,
      completed: state.completed,
      theme: state.theme,
      colors: state.colors,
    }));
  } catch (e) { /* ignore */ }
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  els.themeToggle.setAttribute("data-theme", state.theme);
  els.themeLabel.textContent = state.theme === "dark" ? "Dark" : "Light";
}

function applyColors() {
  const isDark = state.theme === "dark";
  Object.entries(PALETTE_VAR_MAP).forEach(([mode, vars]) => {
    const hex = state.colors[mode];
    if (!hex) {
      vars.forEach(name => document.documentElement.style.removeProperty(name));
      return;
    }
    const v = deriveColorVars(hex, isDark);
    const vals = [v.main, v.deep, v.soft, v.glow];
    vars.forEach((name, i) => document.documentElement.style.setProperty(name, vals[i]));
  });
}

/* ── Preferences Modal ── */
function syncColorPickers() {
  ["pomodoro", "short", "long"].forEach(mode => {
    const key = mode.charAt(0).toUpperCase() + mode.slice(1);
    const input = document.getElementById("colorPicker" + key);
    const preview = document.getElementById("colorPreview" + key);
    const hex = state.colors[mode] || DEFAULT_COLORS[mode];
    if (input) input.value = hex;
    if (preview) preview.style.background = hex;
  });
}


let prefsOriginalColors = null; // snapshot for cancel/revert

function openPrefs() {
  prefsOriginalColors = { ...state.colors }; // save snapshot
  syncColorPickers();
  els.prefsOverlay.classList.add("open");
  els.prefsOverlay.setAttribute("aria-hidden", "false");
  els.paletteBtn.classList.add("active");
}

function saveAndClosePrefs() {
  prefsOriginalColors = null; // mark as committed
  saveSettings();
  els.prefsOverlay.classList.remove("open");
  els.prefsOverlay.setAttribute("aria-hidden", "true");
  els.paletteBtn.classList.remove("active");
}

function closePrefs() {
  if (prefsOriginalColors !== null) {
    // Revert colors to what they were before opening
    state.colors = { ...prefsOriginalColors };
    prefsOriginalColors = null;
    applyColors();
    render();
  }
  els.prefsOverlay.classList.remove("open");
  els.prefsOverlay.setAttribute("aria-hidden", "true");
  els.paletteBtn.classList.remove("active");
}


function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

let firstRender = true;
function positionPill(animate = true) {
  const activeBtn = document.querySelector(".mode-btn.active");
  if (!activeBtn || !els.modesPill) return;
  const x = activeBtn.offsetLeft - 6;
  const w = activeBtn.offsetWidth + 4;
  if (!animate) {
    els.modesPill.style.transition = "none";
    els.modesPill.style.transform = `translateX(${x}px)`;
    els.modesPill.style.width = `${w}px`;
    requestAnimationFrame(() => {
      els.modesPill.style.transition = "";
    });
  } else {
    els.modesPill.style.transform = `translateX(${x}px)`;
    els.modesPill.style.width = `${w}px`;
  }
  els.modesPill.setAttribute("data-mode", state.mode);
}

function render() {
  els.time.textContent = formatTime(state.remaining);
  els.label.textContent = modeLabel[state.mode];
  els.startBtn.textContent = state.running ? "Pause" : "Start";
  els.startBtn.setAttribute("data-mode", state.mode);

  const fraction = state.total === 0 ? 0 : state.remaining / state.total;
  const offset = CIRC * (1 - fraction);
  els.ringFg.style.strokeDashoffset = offset;
  const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar[state.mode]).trim();
  els.ringFg.style.stroke = color;

  els.modeBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  });

  positionPill(!firstRender);
  firstRender = false;

  els.brandDot.setAttribute("data-mode", state.mode);

  els.pomoInput.value = state.durations.pomodoro;
  els.shortInput.value = state.durations.short;
  els.longInput.value = state.durations.long;

  document.title = `${formatTime(state.remaining)} · ${modeLabel[state.mode]}`;
}

function setMode(mode, resetTotal = true) {
  state.mode = mode;
  if (resetTotal) {
    state.total = state.durations[mode] * 60;
    state.remaining = state.total;
  }
  stop();
  render();
}

function start() {
  if (state.running) return;
  state.running = true;
  state.intervalId = setInterval(tick, 1000);
  playStart();
  render();
}

function stop() {
  state.running = false;
  if (state.intervalId) clearInterval(state.intervalId);
  state.intervalId = null;
  render();
}

function tick() {
  if (state.remaining > 0) {
    state.remaining -= 1;
    render();
    return;
  }
  handleComplete();
}

function handleComplete() {
  stop();
  beep();
  if (state.mode === "pomodoro") {
    state.completed = (state.completed + 1) % 4;
    const next = state.completed === 0 ? "long" : "short";
    setMode(next);
    start();
  } else {
    setMode("pomodoro");
  }
  saveSettings();
}

function beep() {
  playEnd();
}

let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, startOffset, duration, volume = 0.2) {
  const ctx = getAudio();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.value = 0.0001;
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime + startOffset;
  o.start(t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  o.stop(t + duration);
}

function playStart() {
  playTone(523.25, 0, 0.18, 0.18);
  playTone(783.99, 0.09, 0.22, 0.18);
}

function playClick() {
  const ctx = getAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  [1800, 2400].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.stop(t + 0.07);
  });
}

function playEnd() {
  const ctx = getAudio();
  if (!ctx) return;
  const isPomo = state.mode === "pomodoro";
  const notes = isPomo
    ? [880, 1108.73, 1318.51]
    : [659.25, 830.61, 987.77];
  const start = ctx.currentTime;
  notes.forEach((freq, i) => {
    const t = start + i * 0.18;
    [1, 2.01, 3.02].forEach((mult, h) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = h === 0 ? "sine" : "triangle";
      o.frequency.value = freq * mult;
      const vol = h === 0 ? 0.22 : 0.06 / h;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.stop(t + 1.15);
    });
  });
}

function reset() {
  stop();
  state.remaining = state.durations[state.mode] * 60;
  state.total = state.remaining;
  render();
}

function skip() {
  stop();
  if (state.mode === "pomodoro") {
    setMode(state.completed === 3 ? "long" : "short", false);
    state.total = state.durations[state.mode] * 60;
    state.remaining = state.total;
    render();
  } else {
    setMode("pomodoro", true);
  }
}

function bindDurationInput(input, key) {
  input.addEventListener("change", () => {
    const v = Math.max(1, Math.min(180, parseInt(input.value, 10) || 1));
    state.durations[key] = v;
    input.value = v;
    if (state.mode === key && !state.running) {
      state.total = v * 60;
      state.remaining = state.total;
    }
    saveSettings();
    render();
  });
}

els.startBtn.addEventListener("click", () => {
  if (state.running) stop(); else start();
});
els.resetBtn.addEventListener("click", () => { playClick(); reset(); });
els.skipBtn.addEventListener("click", () => { playClick(); skip(); });
els.modeBtns.forEach(btn => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});
els.themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  applyColors();
  saveSettings();
  render();
  if (els.prefsOverlay.classList.contains("open")) syncColorPickers();
});
els.paletteBtn.addEventListener("click", openPrefs);
els.prefsClose.addEventListener("click", closePrefs);
els.prefsOverlay.addEventListener("click", (e) => {
  if (e.target === els.prefsOverlay) closePrefs();
});
bindDurationInput(els.pomoInput, "pomodoro", 120);
bindDurationInput(els.shortInput, "short", 10);
bindDurationInput(els.longInput, "long", 30);

/* ── Color picker events (live preview, no auto-save) ── */
["pomodoro", "short", "long"].forEach(mode => {
  const key = mode.charAt(0).toUpperCase() + mode.slice(1);
  const input = document.getElementById("colorPicker" + key);
  const preview = document.getElementById("colorPreview" + key);
  if (!input) return;
  input.addEventListener("input", () => {
    state.colors[mode] = input.value;
    if (preview) preview.style.background = input.value;
    applyColors();
    render();
  });
});
document.getElementById("prefsSaveBtn").addEventListener("click", saveAndClosePrefs);
document.getElementById("prefsCancelBtn").addEventListener("click", closePrefs);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closePrefs(); return; }
  if (e.target.tagName === "INPUT") return;
  if (e.code === "Space") { e.preventDefault(); els.startBtn.click(); }
  else if (e.key === "r" || e.key === "R") reset();
  else if (e.key === "s" || e.key === "S") skip();
  else if (e.key === "1") setMode("pomodoro");
  else if (e.key === "2") setMode("short");
  else if (e.key === "3") setMode("long");
});

loadSettings();
applyTheme();
applyColors();
setMode("pomodoro");

let resizeRaf = 0;
window.addEventListener("resize", () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    positionPill(false);
    resizeRaf = 0;
  });
});

let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let isRunning = false;
let lapCount = 0;
let lastLapTime = 0;
let laps = [];

const display = document.getElementById("display");
const startPauseBtn = document.getElementById("startPause");
const lapBtn = document.getElementById("lap");
const resetBtn = document.getElementById("reset");
const lapsContainer = document.getElementById("laps");
const themeToggle = document.getElementById("themeToggle");
const exportBtn = document.getElementById("export");
const container = document.querySelector(".container");
const body = document.body;

let audioContext = null;

function formatTime(ms) {
  const totalMs = ms;
  const msPart = Math.floor((totalMs % 1000) / 10);
  const s = Math.floor((totalMs / 1000) % 60);
  const m = Math.floor((totalMs / (1000 * 60)) % 60);
  const h = Math.floor(totalMs / (1000 * 60 * 60));

  const pad = (n) => n.toString().padStart(2, "0");
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(msPart)}`
    : `${pad(m)}:${pad(s)}.${pad(msPart)}`;
}

function updateDisplay() {
  const now = isRunning ? Date.now() - startTime + elapsedTime : elapsedTime;
  display.textContent = formatTime(now);
  container.classList.toggle("running", isRunning);
}

function playBeep(freq = 800, dur = 100) {
  if (!audioContext)
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + dur / 1000,
  );
  osc.start();
  osc.stop(audioContext.currentTime + dur / 1000);
}

function startTimer() {
  if (isRunning) return;
  startTime = Date.now();
  timerInterval = setInterval(updateDisplay, 10);
  isRunning = true;
  startPauseBtn.textContent = "Pause";
  startPauseBtn.style.background = "linear-gradient(45deg, #f59e0b, #d97706)";
  lapBtn.disabled = false;
  resetBtn.disabled = false;
  playBeep(820, 140);
}

function pauseTimer() {
  if (!isRunning) return;
  clearInterval(timerInterval);
  elapsedTime += Date.now() - startTime;
  isRunning = false;
  startPauseBtn.textContent = "Resume";
  startPauseBtn.style.background = "linear-gradient(45deg, #10b981, #059669)";
  playBeep(620, 110);
}

function resetTimer() {
  clearInterval(timerInterval);
  elapsedTime = startTime = 0;
  isRunning = false;
  lapCount = lastLapTime = 0;
  laps = [];
  display.textContent = "00:00:00.00";
  startPauseBtn.textContent = "Start";
  startPauseBtn.style.background = "linear-gradient(45deg, #10b981, #059669)";
  lapBtn.disabled = resetBtn.disabled = true;
  lapsContainer.innerHTML = "";
  exportBtn.style.display = "none";
  localStorage.removeItem("stopwatchLaps");
  playBeep(420, 180);
}

function recordLap() {
  if (!isRunning) return;
  lapCount++;
  const now = Date.now() - startTime + elapsedTime;
  const lapDuration = now - lastLapTime;
  lastLapTime = now;

  const lap = {
    number: lapCount,
    duration: lapDuration,
    total: now,
    timestamp: new Date().toISOString(),
  };
  laps.unshift(lap);
  saveLaps();

  const el = document.createElement("div");
  el.className = "lap";
  el.innerHTML = `
    <span class="lap-number">Lap ${lap.number}</span>
    <span class="lap-time">${formatTime(lapDuration)}</span>
    <span class="total-time">Total: ${formatTime(now)}</span>
  `;
  lapsContainer.prepend(el);
  playBeep(1050, 90);
  exportBtn.style.display = "inline-block";
}

function saveLaps() {
  localStorage.setItem("stopwatchLaps", JSON.stringify(laps));
}

function loadLaps() {
  const saved = localStorage.getItem("stopwatchLaps");
  if (!saved) return;
  laps = JSON.parse(saved);
  lapCount = laps.length;
  lastLapTime = laps[0]?.total || 0;
  laps.forEach((lap) => {
    const el = document.createElement("div");
    el.className = "lap";
    el.innerHTML = `
      <span class="lap-number">Lap ${lap.number}</span>
      <span class="lap-time">${formatTime(lap.duration)}</span>
      <span class="total-time">Total: ${formatTime(lap.total)}</span>
    `;
    lapsContainer.appendChild(el);
  });
  if (laps.length > 0) exportBtn.style.display = "inline-block";
}

function exportLaps() {
  if (!laps.length) return;
  let csv = "Lap,Duration_ms,Total_ms,Timestamp\n";
  laps.forEach(
    (l) => (csv += `${l.number},${l.duration},${l.total},"${l.timestamp}"\n`),
  );
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stopwatch-laps-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  playBeep(1250, 160);
}

function toggleTheme() {
  body.classList.toggle("light-theme");
  const isLight = body.classList.contains("light-theme");
  themeToggle.textContent = isLight ? "☀️ Light" : "🌙 Dark";
  themeToggle.style.background = isLight
    ? "linear-gradient(45deg, #f59e0b, #d97706)"
    : "linear-gradient(45deg, #8b5cf6, #7c3aed)";
  localStorage.setItem("stopwatchTheme", isLight ? "light" : "dark");
}

// Event Listeners
startPauseBtn.addEventListener("click", () =>
  isRunning ? pauseTimer() : startTimer(),
);
lapBtn.addEventListener("click", recordLap);
resetBtn.addEventListener("click", resetTimer);
themeToggle.addEventListener("click", toggleTheme);
exportBtn.addEventListener("click", exportLaps);

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    startPauseBtn.click();
  }
  if (e.code === "KeyL" && !lapBtn.disabled) recordLap();
  if (e.code === "KeyR" && !resetBtn.disabled) resetTimer();
  if (e.code === "KeyT") toggleTheme();
  if (e.code === "KeyE" && exportBtn.style.display !== "none") exportLaps();
});

// Init
const savedTheme = localStorage.getItem("stopwatchTheme");
if (savedTheme === "light") {
  body.classList.add("light-theme");
  themeToggle.textContent = "☀️ Light";
  themeToggle.style.background = "linear-gradient(45deg, #f59e0b, #d97706)";
}
loadLaps();
updateDisplay();

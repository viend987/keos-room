import { Office3DEngine } from './engine/Office3DEngine';

const container = document.getElementById('canvas-container') as HTMLElement;
const logStream = document.getElementById('log-stream') as HTMLElement;
const fpsMeter = document.getElementById('fps-meter') as HTMLElement;
const telemetryDrawer = document.getElementById('telemetry-drawer') as HTMLElement;
const btnToggleDialogue = document.getElementById('btn-toggle-dialogue');
const btnDrawerCollapse = document.getElementById('btn-drawer-collapse');

const engine = new Office3DEngine(container);
engine.start();

function appendTelemetryLog(badge: string, roleName: string, message: string): void {
  if (!logStream) return;
  const row = document.createElement('div');
  row.className = 'log-entry';
  const now = new Date().toTimeString().slice(0, 8);
  row.innerHTML = `
    <span class="log-time">${now}</span>
    <span class="log-tag">${badge}</span>
    <strong>${roleName}:</strong>
    <span>${message}</span>
  `;
  logStream.prepend(row);
  while (logStream.children.length > 50) {
    logStream.removeChild(logStream.lastChild!);
  }
}

// Update FPS meter
setInterval(() => {
  if (fpsMeter) {
    fpsMeter.textContent = `${engine.fps} FPS`;
  }
}, 500);

// Reset Camera Button
document.getElementById('btn-reset-cam')?.addEventListener('click', () => {
  engine.resetCamera();
  engine.soundEffects.playButtonClick();
});

// Hide / Show Dialogue Drawer Toggle
let dialogueHidden = false;
function toggleDialogueDrawer(): void {
  dialogueHidden = !dialogueHidden;
  if (telemetryDrawer) {
    telemetryDrawer.classList.toggle('collapsed', dialogueHidden);
  }
  if (btnToggleDialogue) {
    btnToggleDialogue.textContent = dialogueHidden ? 'Show Dialogue' : 'Hide Dialogue';
  }
  engine.soundEffects.playButtonClick();
}

btnToggleDialogue?.addEventListener('click', toggleDialogueDrawer);
btnDrawerCollapse?.addEventListener('click', toggleDialogueDrawer);

// Sound Toggle
let audioMuted = false;
const audioBtn = document.getElementById('btn-audio');
audioBtn?.addEventListener('click', () => {
  audioMuted = engine.soundEffects.toggleMute();
  if (audioBtn) {
    audioBtn.textContent = audioMuted ? 'Sound Off' : 'Sound On';
    audioBtn.classList.toggle('muted', audioMuted);
  }
});

// Connect to Local Telemetry Bridge
function connectTelemetryBridge(): void {
  const wsIndicator = document.getElementById('ws-indicator');
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || '127.0.0.1:4040';
    const ws = new WebSocket(`${protocol}//${host}`);

    ws.onopen = () => {
      if (wsIndicator) wsIndicator.textContent = 'Telemetry Connected';
      appendTelemetryLog('SYSTEM', 'Studio Kernel', '3D Collaborative Office connected to live telemetry stream.');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'EVENT' && data.event) {
          const ev = data.event;
          engine.handleTelemetryEvent(ev.category || 'io', ev.target || ev.detail, ev.category === 'ERR_ALERT');
          appendTelemetryLog(ev.badge || ev.category, ev.role || 'Studio', ev.detail || 'Telemetry event');
        } else if (data.tool || data.category) {
          engine.handleTelemetryEvent(data.tool || data.category, data.target || data.message, false);
          appendTelemetryLog(data.category || 'TASK', 'Studio', data.message || 'Action executed');
        }
      } catch {
        // Fallback for non-JSON signals
      }
    };

    ws.onclose = () => {
      if (wsIndicator) wsIndicator.textContent = 'Autonomous Mode';
    };

    ws.onerror = () => {
      if (wsIndicator) wsIndicator.textContent = 'Autonomous Mode';
    };
  } catch {
    if (wsIndicator) wsIndicator.textContent = 'Autonomous Mode';
  }
}

connectTelemetryBridge();

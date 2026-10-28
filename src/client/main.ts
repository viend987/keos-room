import { HolographicStudioEngine } from './engine/HolographicStudioEngine';

const canvas = document.getElementById('office-canvas') as HTMLCanvasElement;
const logStream = document.getElementById('log-stream') as HTMLElement;
const fpsMeter = document.getElementById('fps-meter') as HTMLElement;

const engine = new HolographicStudioEngine(canvas);
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

// Update FPS meter regularly
setInterval(() => {
  if (fpsMeter) {
    fpsMeter.textContent = `${engine.fps} FPS`;
  }
}, 500);

// Drama & Simulation Control Triggers
document.getElementById('btn-trigger-debate')?.addEventListener('click', () => {
  engine.triggerDebateThread();
  appendTelemetryLog('DEBATE', 'Studio Director', 'Triggered team debate thread (PM vs Dev vs QA).');
  engine.soundEffects.playButtonClick();
});

document.getElementById('btn-trigger-sprint')?.addEventListener('click', () => {
  appendTelemetryLog('SPRINT', 'Blaze (PM)', 'Sprint rush started! All divisions coding in flow state.');
  engine.characters.forEach(char => {
    char.currentAction = 'WORKING';
    char.isRaging = false;
  });
  engine.soundEffects.playHologramSweep();
});

document.getElementById('btn-trigger-coffee')?.addEventListener('click', () => {
  appendTelemetryLog('BREAK', 'Synthesizer Bar', 'Coffee break called. Crew heading to cafe lounge.');
  const coffeeGoers = ['zero', 'kael', 'rex', 'aura', 'echo'];
  coffeeGoers.forEach((id, i) => {
    setTimeout(() => {
      const char = engine.characters.get(id);
      if (char) {
        char.targetX = engine.width - 150 + (Math.random() * 40 - 20);
        char.targetY = engine.height - 80 + (Math.random() * 25 - 12);
        char.currentAction = 'CHILLING';
        engine.soundEffects.playCoffeeSip();
      }
    }, i * 350);
  });
});

document.getElementById('btn-trigger-alert')?.addEventListener('click', () => {
  appendTelemetryLog('ALERT', 'Blaze (PM)', 'Build failure detected! Critical error in staging pipeline!');
  engine.handleTelemetryEvent('test_failure', 'staging-pipeline.ts', true);
});

// Sound Mute Toggle
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
      appendTelemetryLog('SYSTEM', 'Studio Kernel', 'Cyber Studio connected to live telemetry stream.');
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

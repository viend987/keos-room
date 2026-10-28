import { OfficeEngine, AgentEntity } from './engine/OfficeEngine';
import { SoundEffects } from './services/SoundEffects';

const canvas = document.getElementById('office-canvas') as HTMLCanvasElement;
const logStream = document.getElementById('log-stream') as HTMLElement;
const sfx = new SoundEffects();
let audioEnabled = true;

function appendTelemetryLog(tag: string, agentName: string, message: string): void {
  const row = document.createElement('div');
  row.className = 'log-entry';
  const now = new Date().toTimeString().slice(0, 8);
  row.innerHTML = `
    <span class="log-time">[${now}]</span>
    <span class="log-tag">[${tag}]</span>
    <strong>${agentName}:</strong>
    <span>${message}</span>
  `;
  logStream.prepend(row);
  while (logStream.children.length > 40) {
    logStream.removeChild(logStream.lastChild!);
  }
}

function updateDossier(agent: AgentEntity | null): void {
  const panel = document.getElementById('dossier-panel')!;
  if (!agent) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  document.getElementById('dos-name')!.textContent = agent.name;
  document.getElementById('dos-role')!.textContent = `${agent.role} // [${agent.harness}]`;
  document.getElementById('dos-state')!.textContent = agent.state;
  document.getElementById('dos-task')!.textContent = agent.currentTask;
  document.getElementById('dos-caf-val')!.textContent = `${agent.caffeine}%`;
  (document.getElementById('dos-caf-bar') as HTMLElement).style.width = `${agent.caffeine}%`;
  document.getElementById('dos-pan-val')!.textContent = `${agent.panicLevel}%`;
  (document.getElementById('dos-pan-bar') as HTMLElement).style.width = `${agent.panicLevel}%`;
  document.getElementById('dos-loc')!.textContent = agent.linesWritten.toLocaleString();
}

const engine = new OfficeEngine(canvas, (agent) => {
  if (audioEnabled) sfx.playClick();
  updateDossier(agent);
});

engine.init().then(() => {
  const defaultAgent = engine.agents.get('agy-lead') || null;
  engine.selectedAgentId = defaultAgent?.id || null;
  updateDossier(defaultAgent);
  appendTelemetryLog('SYS_BOOT', 'KEOS_CORE', 'Visual Overhaul v2.4 initialized. 65+ furniture sprites mounted.');
});

document.querySelectorAll('[data-wing]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('[data-wing]').forEach((b) => b.classList.remove('active'));
    const target = e.currentTarget as HTMLElement;
    target.classList.add('active');
    const wing = target.getAttribute('data-wing') as any;
    engine.centerCameraOnWing(wing);
    if (audioEnabled) sfx.playClick();
  });
});

document.querySelectorAll('[data-demo]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const mode = (e.currentTarget as HTMLElement).getAttribute('data-demo') as any;
    engine.triggerScenario(mode);
    appendTelemetryLog(`DEMO_${mode}`, 'SIM_DECK', `Triggered office-wide scenario: ${mode}`);
    if (audioEnabled) sfx.playClick();
  });
});

document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
  engine.adjustZoom(0.4);
  if (audioEnabled) sfx.playClick();
});

document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
  engine.adjustZoom(-0.4);
  if (audioEnabled) sfx.playClick();
});

document.getElementById('btn-audio')?.addEventListener('click', (e) => {
  audioEnabled = !audioEnabled;
  (e.currentTarget as HTMLElement).textContent = audioEnabled ? '[SFX: ON]' : '[SFX: OFF]';
});

document.getElementById('dos-close')?.addEventListener('click', () => {
  engine.selectedAgentId = null;
  updateDossier(null);
  if (audioEnabled) sfx.playClick();
});

document.getElementById('btn-send-coffee')?.addEventListener('click', () => {
  if (!engine.selectedAgentId) return;
  const agent = engine.agents.get(engine.selectedAgentId);
  if (agent) {
    agent.caffeine = 100;
    agent.panicLevel = Math.max(0, agent.panicLevel - 30);
    engine.setAgentBubble(agent, 'Mantap! Espresso panas mendarat di meja kerja!', 'BOOST');
    updateDossier(agent);
    appendTelemetryLog('COFFEE_BOOST', agent.name, 'Caffeine restored to 100%.');
    if (audioEnabled) SoundEffects.playCoffeeBrew();
  }
});

document.getElementById('btn-ping-agent')?.addEventListener('click', () => {
  if (!engine.selectedAgentId) return;
  const agent = engine.agents.get(engine.selectedAgentId);
  if (agent) {
    agent.linesWritten += 42;
    engine.setAgentBubble(agent, 'Siap bos! Modul ini langsung gua kebut sekarang.', 'PING_ACK');
    updateDossier(agent);
    appendTelemetryLog('TASK_PING', agent.name, 'Agent acknowledged manual ping.');
    if (audioEnabled) SoundEffects.playElevatorChime();
  }
});

// Koneksi otomatis ke Bridge Daemon (Port 4040)
function connectTelemetryBridge(): void {
  const wsBadge = document.getElementById('ws-indicator')!;
  try {
    const ws = new WebSocket('ws://127.0.0.1:4040');
    ws.onopen = () => {
      wsBadge.textContent = '[BRIDGE: LIVE 4040]';
      appendTelemetryLog('WS_OPEN', 'BRIDGE_HUB', 'Connected to local telemetry daemon on port 4040.');
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'EVENT' && data.event) {
          const ev = data.event;
          const updatedAgent = engine.ingestTelemetryEvent({
            harness: ev.session?.harness,
            account: ev.session?.accountId,
            category: ev.category,
            message: ev.detail
          });
          appendTelemetryLog(ev.badge || ev.category, updatedAgent.name, ev.detail || 'Telemetry signal');
          if (engine.selectedAgentId === updatedAgent.id) {
            updateDossier(updatedAgent);
          }
        } else if (data.type === 'SESSION_JOINED' || data.type === 'SESSION_UPDATED') {
          appendTelemetryLog('SESSION', data.session.harness, `AI session connected: ${data.session.projectName} (${data.session.modelName})`);
        } else {
          const updatedAgent = engine.ingestTelemetryEvent(data);
          appendTelemetryLog(data.category || 'EVENT', updatedAgent.name, data.message || 'Telemetry signal');
          if (engine.selectedAgentId === updatedAgent.id) {
            updateDossier(updatedAgent);
          }
        }
      } catch {
        // Ignore malformed packets
      }
    };
    ws.onclose = () => {
      wsBadge.textContent = '[BRIDGE: SIM MODE]';
    };
    ws.onerror = () => {
      wsBadge.textContent = '[BRIDGE: SIM MODE]';
    };
  } catch {
    wsBadge.textContent = '[BRIDGE: SIM MODE]';
  }
}

connectTelemetryBridge();

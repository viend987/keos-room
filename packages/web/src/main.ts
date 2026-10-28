import { OfficeEngine, OfficeAgent } from './engine/OfficeEngine';
import { WebSocketClient } from './services/WebSocketClient';
import { SoundEffects } from './services/SoundEffects';
import { DialogueEngine } from './services/DialogueEngine';
import { KeosEvent, KeosSession } from './types';

// 1. Initialize Canvas & Engine
const canvas = document.getElementById('office-canvas') as HTMLCanvasElement;
const container = document.getElementById('game-container') as HTMLDivElement;

function resizeCanvas() {
  if (!canvas || !container) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const engine = new OfficeEngine(canvas);
engine.start();

// 2. Initialize WebSocket Client
const wsClient = new WebSocketClient(4040);

const connStatus = document.getElementById('connection-status');
const sessionCount = document.getElementById('session-count');
const terminalFeed = document.getElementById('terminal-feed');
const btnAudio = document.getElementById('btn-audio-toggle');

if (btnAudio) {
  btnAudio.addEventListener('click', () => {
    const isMuted = SoundEffects.toggleMute();
    btnAudio.textContent = isMuted ? '[AUDIO: MUTED]' : '[AUDIO: ON]';
  });
}

// 3. Setup WebSocket Event Handlers
wsClient.onStatus((online) => {
  if (connStatus) {
    if (online) {
      connStatus.innerHTML = '<div class="dot-indicator"></div><span>[WS: CONNECTED]</span>';
      connStatus.className = 'harness-capsule online';
    } else {
      connStatus.innerHTML = '<div class="dot-indicator"></div><span>[WS: RECONNECTING]</span>';
      connStatus.className = 'harness-capsule';
    }
  }
});

wsClient.onSessions((sessions: KeosSession[]) => {
  if (sessionCount) {
    sessionCount.innerHTML = `<span>[AGENTS: ${Math.max(6, sessions.length)} ONLINE]</span>`;
  }
});

wsClient.onEvent((event: KeosEvent) => {
  // 1. Dispatch to Engine
  engine.handleTelemetryEvent(event);

  // 2. Append to Activity Stream Feed
  if (terminalFeed) {
    const timeStr = new Date(event.timestamp).toLocaleTimeString();
    const dialogue = DialogueEngine.getSpeechText(event);
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `
      <span class="ts">[${timeStr}]</span>
      <span class="wing">[${event.session.wingId || 'WING_ALPHA'}]</span>
      <span class="badge">${dialogue.badge}</span>
      <span class="detail">${escapeHtml(dialogue.quote)} <span style="color:#6e7681; font-size:9px;">(${escapeHtml(event.detail)})</span></span>
    `;
    terminalFeed.prepend(line);

    // Limit log lines to 40
    while (terminalFeed.children.length > 40) {
      terminalFeed.removeChild(terminalFeed.lastChild!);
    }
  }
});

// Connect WebSocket
wsClient.connect();

// 4. Bind Camera View Controls
const viewButtons = [
  { id: 'btn-view-all', view: 'ALL' },
  { id: 'btn-view-alpha', view: 'ALPHA' },
  { id: 'btn-view-warroom', view: 'WAR_ROOM' },
  { id: 'btn-view-beta', view: 'BETA' },
  { id: 'btn-view-pantry', view: 'PANTRY' }
];

viewButtons.forEach(({ id, view }) => {
  const btn = document.getElementById(id);
  btn?.addEventListener('click', () => {
    viewButtons.forEach((b) => document.getElementById(b.id)?.classList.remove('active'));
    btn.classList.add('active');
    engine.setCameraView(view as any);
  });
});

// Zoom Controls
document.getElementById('btn-zoom-in')?.addEventListener('click', () => engine.zoomIn());
document.getElementById('btn-zoom-out')?.addEventListener('click', () => engine.zoomOut());
document.getElementById('btn-zoom-reset')?.addEventListener('click', () => engine.resetZoom());

// 5. Bind Demo Scenario Triggers
// 5. Bind Demo Scenario Triggers with Instant Local Simulation Fallback
function playLocalScenario(scenario: 'SPRINT' | 'CONCURRENT' | 'CHAOS' | 'COFFEE') {
  const sessionAgy: KeosSession = {
    sessionId: 'sess_agy_01',
    harness: 'ANTIGRAVITY',
    accountId: 'admin@work',
    projectName: 'ems',
    projectPath: 'D:/github/ems',
    modelName: 'gemini-3.8-flash',
    wingId: 'WING_ALPHA',
    lastActiveTimestamp: Date.now()
  };

  const sessionClaude: KeosSession = {
    sessionId: 'sess_claude_02',
    harness: 'CLAUDE_CODE',
    accountId: 'dev@personal',
    projectName: 'harmony-arch',
    projectPath: 'D:/github/harmony-arch',
    modelName: 'claude-3-7-sonnet',
    wingId: 'WING_BETA',
    lastActiveTimestamp: Date.now()
  };

  if (scenario === 'CONCURRENT') {
    // Step 1: Alpha Dev codes
    setTimeout(() => {
      handleEvent({
        id: 'ev_01',
        timestamp: Date.now(),
        session: sessionAgy,
        category: 'CODE',
        status: 'RUNNING',
        role: 'DEV',
        badge: '[CODE_WRITE]',
        detail: 'Writing src/auth/jwt_verifier.ts',
        targetLocation: 'DEV_DESK',
        animation: 'TYPE'
      });
    }, 200);

    // Step 2: Beta Dev codes
    setTimeout(() => {
      handleEvent({
        id: 'ev_02',
        timestamp: Date.now(),
        session: sessionClaude,
        category: 'CODE',
        status: 'RUNNING',
        role: 'DEV',
        badge: '[CODE_WRITE]',
        detail: 'Writing src/engine/mesh.rs',
        targetLocation: 'DEV_DESK',
        animation: 'TYPE'
      });
    }, 800);

    // Step 3: Alpha QA runs tests
    setTimeout(() => {
      handleEvent({
        id: 'ev_03',
        timestamp: Date.now(),
        session: sessionAgy,
        category: 'TEST',
        status: 'SUCCESS',
        role: 'QA',
        badge: '[TEST_QA]',
        detail: 'Test suite: npm test (24/24 passed)',
        targetLocation: 'QA_LAB',
        animation: 'ANALYZE'
      });
    }, 2000);

    // Step 4: Beta QA runs cargo test
    setTimeout(() => {
      handleEvent({
        id: 'ev_04',
        timestamp: Date.now(),
        session: sessionClaude,
        category: 'TEST',
        status: 'SUCCESS',
        role: 'QA',
        badge: '[TEST_QA]',
        detail: 'Cargo test: 18 passed, 0 failed',
        targetLocation: 'QA_LAB',
        animation: 'ANALYZE'
      });
    }, 3200);
  } else if (scenario === 'SPRINT') {
    // Step 1: Planner in War Room
    setTimeout(() => {
      handleEvent({
        id: 'ev_s1',
        timestamp: Date.now(),
        session: sessionAgy,
        category: 'PLAN',
        status: 'RUNNING',
        role: 'PLANNER',
        badge: '[PLANNING]',
        detail: 'Architecting database schema in War Room',
        targetLocation: 'WAR_ROOM',
        animation: 'ANALYZE'
      });
    }, 200);

    // Step 2: Dev coding
    setTimeout(() => {
      handleEvent({
        id: 'ev_s2',
        timestamp: Date.now(),
        session: sessionAgy,
        category: 'CODE',
        status: 'RUNNING',
        role: 'DEV',
        badge: '[CODING]',
        detail: 'Implementing service endpoints',
        targetLocation: 'DEV_DESK',
        animation: 'TYPE'
      });
    }, 1200);

    // Step 3: QA test pass
    setTimeout(() => {
      handleEvent({
        id: 'ev_s3',
        timestamp: Date.now(),
        session: sessionAgy,
        category: 'TEST',
        status: 'SUCCESS',
        role: 'QA',
        badge: '[TEST_QA]',
        detail: 'All integration tests green!',
        targetLocation: 'QA_LAB',
        animation: 'ANALYZE'
      });
    }, 2800);
  } else if (scenario === 'CHAOS') {
    // Step 1: Dev writes bad code
    setTimeout(() => {
      handleEvent({
        id: 'ev_c1',
        timestamp: Date.now(),
        session: sessionAgy,
        category: 'CODE',
        status: 'RUNNING',
        role: 'DEV',
        badge: '[CODING]',
        detail: 'Experimental commit to main branch',
        targetLocation: 'DEV_DESK',
        animation: 'TYPE'
      });
    }, 200);

    // Step 2: Fatal error
    setTimeout(() => {
      handleEvent({
        id: 'ev_c2',
        timestamp: Date.now(),
        session: sessionAgy,
        category: 'TEST',
        status: 'ERROR',
        role: 'MANAGER',
        badge: '[PANIC_ALERT]',
        detail: 'FATAL: Unhandled exception in prod pipeline!',
        targetLocation: 'DEV_DESK',
        animation: 'RAGE'
      });
    }, 1400);

    // Step 3: Hotfix & green
    setTimeout(() => {
      handleEvent({
        id: 'ev_c3',
        timestamp: Date.now(),
        session: sessionAgy,
        category: 'TEST',
        status: 'SUCCESS',
        role: 'DEV',
        badge: '[HOTFIX_PASS]',
        detail: 'Hotfix deployed. Pipeline restored to green!',
        targetLocation: 'DEV_DESK',
        animation: 'TYPE'
      });
    }, 3200);
  }
}

function handleEvent(event: KeosEvent) {
  engine.handleTelemetryEvent(event);

  if (terminalFeed) {
    const timeStr = new Date(event.timestamp).toLocaleTimeString();
    const dialogue = DialogueEngine.getSpeechText(event);
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `
      <span class="ts">[${timeStr}]</span>
      <span class="wing">[${event.session.wingId || 'WING_ALPHA'}]</span>
      <span class="badge">${dialogue.badge}</span>
      <span class="detail">${escapeHtml(dialogue.quote)} <span style="color:#6e7681; font-size:9px;">(${escapeHtml(event.detail)})</span></span>
    `;
    terminalFeed.prepend(line);

    while (terminalFeed.children.length > 40) {
      terminalFeed.removeChild(terminalFeed.lastChild!);
    }
  }
}

document.getElementById('btn-demo-sprint')?.addEventListener('click', () => {
  wsClient.playScenario('SPRINT');
  playLocalScenario('SPRINT');
});

document.getElementById('btn-demo-concurrent')?.addEventListener('click', () => {
  wsClient.playScenario('CONCURRENT');
  playLocalScenario('CONCURRENT');
});

document.getElementById('btn-demo-chaos')?.addEventListener('click', () => {
  wsClient.playScenario('CHAOS');
  playLocalScenario('CHAOS');
});

document.getElementById('btn-demo-coffee')?.addEventListener('click', () => {
  engine.agents.forEach((agent) => {
    engine.moveAgentTo(agent, 5 + Math.floor(Math.random() * 5), 15);
    agent.state = 'COFFEE';
    engine.triggerBubble(agent, '[COFFEE_BREAK]', 'Seduh espresso double shot dulu biar melek!', 'Pantry Cafe');
  });
  SoundEffects.playCoffeeBrew();
});

// 6. Agent Dossier Flyout
const dossierPanel = document.getElementById('agent-dossier');
const dossierName = document.getElementById('dossier-name');
const dossierTitle = document.getElementById('dossier-title');
const dossierStatus = document.getElementById('dossier-status');
const dossierHarness = document.getElementById('dossier-harness');
const statLines = document.getElementById('stat-lines');
const statCaffeine = document.getElementById('stat-caffeine');
const statTasks = document.getElementById('stat-tasks');
const statPanic = document.getElementById('stat-panic');
const portraitCanvas = document.getElementById('portrait-canvas') as HTMLCanvasElement;

engine.onAgentSelected = (agent: OfficeAgent | null) => {
  if (!dossierPanel) return;

  if (!agent) {
    dossierPanel.classList.add('hidden');
    return;
  }

  dossierPanel.classList.remove('hidden');
  if (dossierName) dossierName.textContent = agent.name;
  if (dossierTitle) dossierTitle.textContent = agent.title;
  if (dossierStatus) dossierStatus.textContent = `[STATE: ${agent.state}]`;
  if (dossierHarness) dossierHarness.textContent = agent.harness;

  if (statLines) statLines.textContent = String(agent.stats.linesWritten);
  if (statCaffeine) statCaffeine.textContent = `${agent.stats.caffeineLevel}%`;
  if (statTasks) statTasks.textContent = String(agent.stats.tasksDone);
  if (statPanic) statPanic.textContent = `${agent.stats.panicLevel}%`;

  // Draw 2x zoomed portrait on portrait canvas
  if (portraitCanvas) {
    const pCtx = portraitCanvas.getContext('2d');
    if (pCtx) {
      pCtx.imageSmoothingEnabled = false;
      pCtx.fillStyle = '#0d131f';
      pCtx.fillRect(0, 0, portraitCanvas.width, portraitCanvas.height);

      const charImg = (engine as any).images.get(`char_${agent.palette}`);
      if (charImg) {
        // Draw 16x32 frame scaled up 2x
        pCtx.drawImage(charImg, 0, 0, 16, 32, 8, 0, 32, 64);
      }
    }
  }
};

document.getElementById('btn-close-dossier')?.addEventListener('click', () => {
  dossierPanel?.classList.add('hidden');
  engine.selectedAgent = null;
});

document.getElementById('btn-cheer-agent')?.addEventListener('click', () => {
  if (engine.selectedAgent) {
    SoundEffects.playSuccessFanfare();
    engine.triggerBubble(engine.selectedAgent, '[CHEER_RECEIVED]', 'Makasih semangatnya coy! Gasspol!', 'Energy Boosted');
    engine.selectedAgent.stats.panicLevel = Math.max(0, engine.selectedAgent.stats.panicLevel - 15);
    engine.selectedAgent.stats.caffeineLevel = Math.min(100, engine.selectedAgent.stats.caffeineLevel + 10);
  }
});

document.getElementById('btn-coffee-agent')?.addEventListener('click', () => {
  if (engine.selectedAgent) {
    SoundEffects.playCoffeeBrew();
    engine.moveAgentTo(engine.selectedAgent, 4, 15);
    engine.selectedAgent.state = 'COFFEE';
    engine.triggerBubble(engine.selectedAgent, '[ESPRESSO_FETCH]', 'Otw pantry ambil espresso double shot!', 'Coffee Bar');
  }
});

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

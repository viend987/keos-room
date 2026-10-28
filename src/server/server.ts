import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { AgentDiscoveryDaemon } from './discovery/AgentDiscoveryDaemon.js';
import { UniversalNormalizer } from './parser/UniversalNormalizer.js';
import { MultiAgentMock } from './mock/MultiAgentMock.js';
import { KeosEvent, KeosHarness, KeosSession, KeosTelemetryPayload, KeosWing } from '../types.js';

export async function createKeosServer(port = 4040) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const discoveryDaemon = new AgentDiscoveryDaemon();
  const clients = new Set<WebSocket>();

  // Normalization helper
  function normalizeHarnessName(raw?: string): KeosHarness {
    if (!raw) return 'GENERIC';
    const s = raw.toUpperCase().trim();
    if (s.includes('AGY') || s.includes('ANTIGRAVITY') || s.includes('GEMINI')) return 'ANTIGRAVITY';
    if (s.includes('CLAUDE')) return 'CLAUDE_CODE';
    if (s.includes('OPENCODE') || s.includes('CODEX') || s.includes('OPENAI')) return 'OPEN_CODEX';
    if (s.includes('KIRO')) return 'KIRO';
    if (s.includes('KILO')) return 'KILO';
    if (s.includes('AIDER')) return 'AIDER';
    if (s.includes('CURSOR')) return 'CURSOR';
    if (s.includes('ROO') || s.includes('CLINE')) return 'ROO_CLINE';
    return 'GENERIC';
  }

  function broadcast(data: unknown) {
    const raw = JSON.stringify(data);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }

  function broadcastEvent(event: KeosEvent) {
    broadcast({
      type: 'EVENT',
      event
    });
  }

  function playScenario(scenarioName: string) {
    const steps = MultiAgentMock.getScenario(scenarioName);
    console.log(`[KEOS BRIDGE] Playing Scenario: ${scenarioName} (${steps.length} steps)`);

    for (const step of steps) {
      setTimeout(() => {
        const event = UniversalNormalizer.normalize(step.session, step.payload);
        broadcastEvent(event);
      }, step.delayMs);
    }
  }

  // 1. API ROUTES
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      status: 'ONLINE',
      port,
      activeSessions: discoveryDaemon.getActiveSessions(),
      connectedClients: clients.size,
      zeroEmojiCompliant: true,
      supportedHarnesses: [
        'ANTIGRAVITY (IDE, CLI, VSCode, Desktop)',
        'CLAUDE_CODE (CLI, VSCode, Desktop)',
        'OPEN_CODEX (OpenCode, OpenAI Codex)',
        'KIRO (Editor, CLI)',
        'KILO (Kilo Code, CLI)',
        'AIDER (Chat History)',
        'CURSOR (IDE)',
        'ROO_CLINE (VSCode Extensions)',
        'GENERIC (REST Ingest & Stdio MCP)'
      ]
    });
  });

  app.post('/api/ingest', (req: Request, res: Response) => {
    const body = req.body as KeosTelemetryPayload & {
      command?: string;
      path?: string;
      file?: string;
      name?: string;
    };

    const tool = body.tool || body.action || body.command || body.name;
    if (!tool) {
      res.status(400).json({ error: 'Missing tool, action, or command in payload' });
      return;
    }

    const harness = normalizeHarnessName(body.harness);
    const target = body.target || body.path || body.file || '';
    const sessionId = body.account ? `sess_${body.account}` : `sess_${harness.toLowerCase()}_${Date.now()}`;

    let wingId: KeosWing = 'WING_ALPHA';
    if (harness === 'CLAUDE_CODE' || harness === 'KIRO' || harness === 'KILO') {
      wingId = 'WING_BETA';
    }

    const session: KeosSession = {
      sessionId,
      harness,
      accountId: body.account || 'operator',
      projectName: body.project || 'active-workspace',
      projectPath: body.projectPath || process.cwd(),
      modelName: body.model || `${harness}_AGENT`,
      wingId,
      lastActiveTimestamp: Date.now()
    };

    discoveryDaemon.registerManualSession(session);

    const payload: KeosTelemetryPayload = {
      harness,
      account: session.accountId,
      project: session.projectName,
      projectPath: session.projectPath,
      model: session.modelName,
      tool,
      target,
      status: body.status || 'SUCCESS',
      category: body.category,
      message: body.message,
      details: body.details
    };

    const event = UniversalNormalizer.normalize(session, payload);
    broadcastEvent(event);

    res.json({ success: true, eventId: event.id, harness, wingId });
  });

  app.post('/api/mock/:scenario', (req: Request, res: Response) => {
    const scenario = String(req.params.scenario).toUpperCase();
    playScenario(scenario);
    res.json({ success: true, scenario });
  });

  // 2. WEBSOCKET SETUP
  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log(`[KEOS BRIDGE] Client connected. Total: ${clients.size}`);

    ws.send(
      JSON.stringify({
        type: 'SESSIONS_UPDATE',
        sessions: discoveryDaemon.getActiveSessions()
      })
    );

    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'PLAY_SCENARIO') {
          playScenario(parsed.scenario || 'SPRINT');
        } else if (parsed.type === 'INGEST') {
          const harness = normalizeHarnessName(parsed.payload?.harness);
          const session: KeosSession = {
            sessionId: `ws_${Date.now()}`,
            harness,
            accountId: parsed.payload?.account || 'operator',
            projectName: parsed.payload?.project || 'active-project',
            projectPath: process.cwd(),
            modelName: `${harness}_AGENT`,
            wingId: harness === 'CLAUDE_CODE' ? 'WING_BETA' : 'WING_ALPHA',
            lastActiveTimestamp: Date.now()
          };
          const event = UniversalNormalizer.normalize(session, parsed.payload);
          broadcastEvent(event);
        }
      } catch {
        // Ignore invalid messages
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[KEOS BRIDGE] Client disconnected. Total: ${clients.size}`);
    });
  });

  // 3. DISCOVERY EVENTS SETUP
  discoveryDaemon.on('session:discovered', (session: KeosSession) => {
    broadcast({
      type: 'SESSION_JOINED',
      session
    });
  });

  discoveryDaemon.on('session:updated', (session: KeosSession) => {
    broadcast({
      type: 'SESSION_UPDATED',
      session
    });
  });

  discoveryDaemon.on(
    'telemetry',
    ({ session, payload }: { session: KeosSession; payload: KeosTelemetryPayload }) => {
      const event = UniversalNormalizer.normalize(session, payload);
      broadcastEvent(event);
    }
  );

  discoveryDaemon.start();

  // 4. FRONTEND SERVING (Vite Middleware in Dev / Static in Prod)
  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(process.cwd(), 'dist');

  if (isProd && fs.existsSync(distDir)) {
    console.log('[KEOS SERVER] Serving production build from dist/');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    console.log('[KEOS SERVER] Mounting Vite development server middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: process.cwd()
    });
    app.use(vite.middlewares);
  }

  // 5. START LISTENING
  server.listen(port, () => {
    console.log('\n============================================================');
    console.log('   KEOS ROOM // AGENT TELEMETRY VIRTUAL OFFICE v2.4');
    console.log('============================================================');
    console.log(`>> Unified Server:   http://localhost:${port}`);
    console.log(`>> WebSocket Stream: ws://localhost:${port}`);
    console.log(`>> Telemetry Ingest: http://localhost:${port}/api/ingest`);
    console.log('>> Auto-Discovery:   ANTIGRAVITY, CLAUDE, CODEX, KIRO, KILO');
    console.log('============================================================\n');
  });

  return { server, wss, discoveryDaemon };
}

// Auto-run if executed directly
if (process.argv[1]?.includes('server')) {
  const port = parseInt(process.env.PORT || '4040', 10);
  createKeosServer(port).catch((err) => {
    console.error('[KEOS SERVER] Failed to start:', err);
    process.exit(1);
  });
}

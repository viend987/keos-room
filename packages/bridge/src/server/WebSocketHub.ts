import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { AgentDiscoveryDaemon } from '../discovery/AgentDiscoveryDaemon.js';
import { UniversalNormalizer } from '../parser/UniversalNormalizer.js';
import { MultiAgentMock } from '../mock/MultiAgentMock.js';
import { KeosEvent, KeosHarness, KeosSession, KeosTelemetryPayload, KeosWing } from '../types.js';

export class WebSocketHub {
  private app = express();
  private server: http.Server;
  private wss: WebSocketServer;
  private discoveryDaemon: AgentDiscoveryDaemon;
  private clients = new Set<WebSocket>();

  constructor(private port = 4040) {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));

    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.discoveryDaemon = new AgentDiscoveryDaemon();

    this.setupRoutes();
    this.setupWebSocket();
    this.setupDiscovery();
  }

  public start() {
    this.discoveryDaemon.start();
    this.server.listen(this.port, () => {
      console.log(`[KEOS BRIDGE] Server listening on http://localhost:${this.port}`);
      console.log(`[KEOS BRIDGE] WebSocket ready at ws://localhost:${this.port}`);
      console.log(`[KEOS BRIDGE] Universal Ingest API: POST http://localhost:${this.port}/api/ingest`);
    });
  }

  public stop() {
    this.discoveryDaemon.stop();
    this.wss.close();
    this.server.close();
  }

  private normalizeHarnessName(raw?: string): KeosHarness {
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

  private setupRoutes() {
    // Health check & Active Matrix
    this.app.get('/api/status', (_req: Request, res: Response) => {
      res.json({
        status: 'ONLINE',
        activeSessions: this.discoveryDaemon.getActiveSessions(),
        connectedClients: this.clients.size,
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
          'GENERIC (REST Ingest & MCP Server)'
        ]
      });
    });

    // Ingest universal webhook endpoint
    this.app.post('/api/ingest', (req: Request, res: Response) => {
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

      const harness = this.normalizeHarnessName(body.harness);
      const target = body.target || body.path || body.file || '';
      const sessionId = body.account ? `sess_${body.account}` : `sess_${harness.toLowerCase()}_${Date.now()}`;

      // Pick wing based on harness
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

      this.discoveryDaemon.registerManualSession(session);

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
      this.broadcastEvent(event);

      res.json({ success: true, eventId: event.id, harness, wingId });
    });

    // Trigger mock scenario via HTTP
    this.app.post('/api/mock/:scenario', (req: Request, res: Response) => {
      const scenario = String(req.params.scenario).toUpperCase();
      this.playScenario(scenario);
      res.json({ success: true, scenario });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[KEOS BRIDGE] Client connected. Total: ${this.clients.size}`);

      // Send current active sessions immediately
      ws.send(
        JSON.stringify({
          type: 'SESSIONS_UPDATE',
          sessions: this.discoveryDaemon.getActiveSessions()
        })
      );

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'PLAY_SCENARIO') {
            this.playScenario(parsed.scenario || 'SPRINT');
          } else if (parsed.type === 'INGEST') {
            const harness = this.normalizeHarnessName(parsed.payload?.harness);
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
            this.broadcastEvent(event);
          }
        } catch {
          // Ignore invalid messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[KEOS BRIDGE] Client disconnected. Total: ${this.clients.size}`);
      });
    });
  }

  private setupDiscovery() {
    this.discoveryDaemon.on('session:discovered', (session: KeosSession) => {
      this.broadcast({
        type: 'SESSION_JOINED',
        session
      });
    });

    this.discoveryDaemon.on('session:updated', (session: KeosSession) => {
      this.broadcast({
        type: 'SESSION_UPDATED',
        session
      });
    });

    this.discoveryDaemon.on(
      'telemetry',
      ({ session, payload }: { session: KeosSession; payload: KeosTelemetryPayload }) => {
        const event = UniversalNormalizer.normalize(session, payload);
        this.broadcastEvent(event);
      }
    );
  }

  public broadcastEvent(event: KeosEvent) {
    this.broadcast({
      type: 'EVENT',
      event
    });
  }

  private broadcast(data: unknown) {
    const raw = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }

  public playScenario(scenarioName: string) {
    const steps = MultiAgentMock.getScenario(scenarioName);
    console.log(`[KEOS BRIDGE] Playing Scenario: ${scenarioName} (${steps.length} steps)`);

    for (const step of steps) {
      setTimeout(() => {
        const event = UniversalNormalizer.normalize(step.session, step.payload);
        this.broadcastEvent(event);
      }, step.delayMs);
    }
  }
}

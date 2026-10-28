import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { AgentDiscoveryDaemon } from '../discovery/AgentDiscoveryDaemon.js';
import { UniversalNormalizer } from '../parser/UniversalNormalizer.js';
import { MultiAgentMock } from '../mock/MultiAgentMock.js';
import { KeosEvent, KeosSession, KeosTelemetryPayload } from '../types.js';

export class WebSocketHub {
  private app = express();
  private server: http.Server;
  private wss: WebSocketServer;
  private discoveryDaemon: AgentDiscoveryDaemon;
  private clients = new Set<WebSocket>();

  constructor(private port = 4040) {
    this.app.use(cors());
    this.app.use(express.json());

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
    });
  }

  public stop() {
    this.discoveryDaemon.stop();
    this.wss.close();
    this.server.close();
  }

  private setupRoutes() {
    // Health check
    this.app.get('/api/status', (_req: Request, res: Response) => {
      res.json({
        status: 'ONLINE',
        activeSessions: this.discoveryDaemon.getActiveSessions(),
        connectedClients: this.clients.size,
        zeroEmojiCompliant: true
      });
    });

    // Ingest webhook endpoint
    this.app.post('/api/ingest', (req: Request, res: Response) => {
      const body = req.body as KeosTelemetryPayload;
      if (!body.tool && !body.action) {
        res.status(400).json({ error: 'Missing tool or action in payload' });
        return;
      }

      const harness = (body.harness || 'GENERIC').toUpperCase() as any;
      const session: KeosSession = {
        sessionId: `sess_manual_${Date.now()}`,
        harness,
        accountId: body.account || 'operator',
        projectName: body.project || 'custom-project',
        projectPath: body.projectPath || process.cwd(),
        modelName: body.model || 'custom-llm',
        wingId: 'WING_ALPHA',
        lastActiveTimestamp: Date.now()
      };

      this.discoveryDaemon.registerManualSession(session);
      const event = UniversalNormalizer.normalize(session, body);
      this.broadcastEvent(event);

      res.json({ success: true, eventId: event.id });
    });

    // Trigger mock scenario via HTTP
    this.app.post('/api/mock/:scenario', (req: Request, res: Response) => {
      const scenario = req.params.scenario.toUpperCase();
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

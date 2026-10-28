import readline from 'node:readline';
import http from 'node:http';

/**
 * Universal Stdio MCP Server for Keos Room.
 * Enables any AI tool supporting Model Context Protocol (Claude Desktop, Claude Code,
 * Antigravity, Cursor, Windsurf, Roo Code, Cline, etc.) to stream actions into Keos Room.
 */
export class KeosMcpServer {
  private rl: readline.Interface;

  constructor(private bridgePort = 4040) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  public start() {
    this.rl.on('line', (line: string) => {
      this.handleRpcMessage(line);
    });
  }

  private handleRpcMessage(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const msg = JSON.parse(trimmed);

      // Handle standard MCP JSON-RPC
      if (msg.method === 'initialize') {
        this.respond(msg.id, {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'keos-room-mcp',
            version: '2.4.0'
          },
          capabilities: {
            tools: {}
          }
        });
        return;
      }

      if (msg.method === 'tools/list') {
        this.respond(msg.id, {
          tools: [
            {
              name: 'keos_telemetry_ping',
              description: 'Broadcasts active coding, planning, or testing state to the Keos Room Virtual Office.',
              inputSchema: {
                type: 'object',
                properties: {
                  harness: { type: 'string', description: 'Agent harness (AGY, CLAUDE, CODEX, KIRO, KILO, CURSOR, etc.)' },
                  action: { type: 'string', description: 'Action type (PLAN, CODE, TEST, ERROR, COFFEE)' },
                  tool: { type: 'string', description: 'Tool or function name used' },
                  target: { type: 'string', description: 'File path, command, or query being operated on' },
                  message: { type: 'string', description: 'Natural language commentary shown in the pixel speech bubble' }
                },
                required: ['tool']
              }
            }
          ]
        });
        return;
      }

      if (msg.method === 'tools/call') {
        const { name, arguments: args } = msg.params || {};
        if (name === 'keos_telemetry_ping') {
          this.postToBridge(args || {});
          this.respond(msg.id, {
            content: [
              {
                type: 'text',
                text: 'OK: Telemetry dispatched to Keos Room Virtual Office.'
              }
            ]
          });
          return;
        }
      }

      // Default empty response for notifications
      if (msg.id !== undefined) {
        this.respond(msg.id, {});
      }
    } catch {
      // Ignore malformed JSON-RPC
    }
  }

  private respond(id: unknown, result: unknown) {
    const response = JSON.stringify({
      jsonrpc: '2.0',
      id,
      result
    });
    process.stdout.write(response + '\n');
  }

  private postToBridge(payload: Record<string, unknown>) {
    const postData = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: this.bridgePort,
        path: '/api/ingest',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      () => {}
    );

    req.on('error', () => {
      // Bridge might be offline, ignore silently
    });

    req.write(postData);
    req.end();
  }
}

// Direct executable check
if (process.argv.includes('--mcp') || process.argv[1]?.includes('mcp')) {
  const server = new KeosMcpServer();
  server.start();
}

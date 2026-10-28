import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { KeosHarness, KeosSession, KeosTelemetryPayload, KeosWing } from '../../types.js';

export class AgentDiscoveryDaemon extends EventEmitter {
  private activeSessions = new Map<string, KeosSession>();
  private scannedFiles = new Map<string, number>(); // filePath -> lastOffset
  private timer: NodeJS.Timeout | null = null;
  private isScanning = false;

  private userHome = os.homedir();
  private appData = process.env.APPDATA || path.join(this.userHome, 'AppData', 'Roaming');

  constructor() {
    super();
  }

  public start(intervalMs = 1200) {
    this.scan();
    this.timer = setInterval(() => this.scan(), intervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getActiveSessions(): KeosSession[] {
    return Array.from(this.activeSessions.values());
  }

  public registerManualSession(session: KeosSession) {
    this.activeSessions.set(session.sessionId, session);
    this.emit('session:updated', session);
  }

  private scan() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      this.scanAntigravity();
      this.scanClaude();
      this.scanOpenCodeAndCodex();
      this.scanKiroAndKilo();
      this.scanAider();
      this.scanVSCodeAiExtensions();
    } catch {
      // Ignore directory access errors
    } finally {
      this.isScanning = false;
    }
  }

  // 1. ANTIGRAVITY (AGY CLI, IDE, Desktop, VS Code Extension)
  private scanAntigravity() {
    const candidateDirs = [
      path.join(this.userHome, '.gemini', 'antigravity-cli', 'brain'),
      path.join(this.userHome, '.gemini', 'antigravity-ide', 'brain'),
      path.join(this.userHome, '.antigravity', 'brain'),
      path.join(this.appData, 'Antigravity', 'brain')
    ];

    for (const brainDir of candidateDirs) {
      if (!fs.existsSync(brainDir)) continue;
      try {
        const entries = fs.readdirSync(brainDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const convId = entry.name;
          const transcriptPath = path.join(
            brainDir,
            convId,
            '.system_generated',
            'logs',
            'transcript.jsonl'
          );

          if (fs.existsSync(transcriptPath)) {
            this.processLogFile(transcriptPath, 'ANTIGRAVITY', `agy_${convId.slice(0, 8)}`);
          }
        }
      } catch {
        // Ignore folder read error
      }
    }
  }

  // 2. CLAUDE CODE, CLAUDE DESKTOP, CLAUDE CLI
  private scanClaude() {
    const claudeProjects = path.join(this.userHome, '.claude', 'projects');
    if (fs.existsSync(claudeProjects)) {
      try {
        const projectDirs = fs.readdirSync(claudeProjects, { withFileTypes: true });
        for (const proj of projectDirs) {
          if (!proj.isDirectory()) continue;
          const sessionsDir = path.join(claudeProjects, proj.name, 'sessions');
          if (!fs.existsSync(sessionsDir)) continue;

          const sessionFiles = fs.readdirSync(sessionsDir);
          for (const sFile of sessionFiles) {
            if (!sFile.endsWith('.jsonl')) continue;
            const sPath = path.join(sessionsDir, sFile);
            const sId = `claude_${path.basename(sFile, '.jsonl').slice(0, 8)}`;
            this.processLogFile(sPath, 'CLAUDE_CODE', sId);
          }
        }
      } catch {
        // Ignore read error
      }
    }
  }

  // 3. OPENCODE & CODEX
  private scanOpenCodeAndCodex() {
    const candidateDirs: Array<{ dir: string; harness: KeosHarness; prefix: string }> = [
      { dir: path.join(this.userHome, '.opencode', 'sessions'), harness: 'OPEN_CODEX', prefix: 'opencode_' },
      { dir: path.join(this.userHome, '.codex', 'sessions'), harness: 'OPEN_CODEX', prefix: 'codex_' },
      { dir: path.join(this.userHome, '.openai', 'sessions'), harness: 'OPEN_CODEX', prefix: 'codex_' }
    ];

    for (const { dir, harness, prefix } of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (f.endsWith('.jsonl') || f.endsWith('.json')) {
            const p = path.join(dir, f);
            this.processLogFile(p, harness, `${prefix}${path.basename(f).slice(0, 8)}`);
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  // 4. KIRO & KILO
  private scanKiroAndKilo() {
    const candidateDirs: Array<{ dir: string; harness: KeosHarness; prefix: string }> = [
      { dir: path.join(this.userHome, '.kiro', 'sessions'), harness: 'KIRO', prefix: 'kiro_' },
      { dir: path.join(this.userHome, '.kilo', 'sessions'), harness: 'KILO', prefix: 'kilo_' },
      { dir: path.join(this.userHome, '.kilo-code', 'sessions'), harness: 'KILO', prefix: 'kilo_' },
      { dir: path.join(process.cwd(), '.kiro'), harness: 'KIRO', prefix: 'kiro_local_' },
      { dir: path.join(process.cwd(), '.kilo'), harness: 'KILO', prefix: 'kilo_local_' }
    ];

    for (const { dir, harness, prefix } of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (f.endsWith('.jsonl') || f.endsWith('.json') || f.endsWith('.log')) {
            const p = path.join(dir, f);
            this.processLogFile(p, harness, `${prefix}${path.basename(f).slice(0, 8)}`);
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  // 5. AIDER CHAT HISTORY
  private scanAider() {
    const candidates = [
      path.join(process.cwd(), '.aider.chat.history.md'),
      path.join(this.userHome, '.aider.chat.history.md')
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.processLogFile(p, 'AIDER', 'aider_session');
      }
    }
  }

  // 6. VS CODE EXTENSIONS (Cline, Roo Code, Cursor)
  private scanVSCodeAiExtensions() {
    const vscodeGlobalStorage = path.join(this.appData, 'Code', 'User', 'globalStorage');
    if (!fs.existsSync(vscodeGlobalStorage)) return;

    const extensionDirs: Array<{ subDir: string; harness: KeosHarness; prefix: string }> = [
      { subDir: 'saoudrizwan.claude-dev/tasks', harness: 'ROO_CLINE', prefix: 'cline_' },
      { subDir: 'rooveterinaryinc.roo-cline/tasks', harness: 'ROO_CLINE', prefix: 'roo_' }
    ];

    for (const { subDir, harness, prefix } of extensionDirs) {
      const fullDir = path.join(vscodeGlobalStorage, subDir);
      if (!fs.existsSync(fullDir)) continue;
      try {
        const taskEntries = fs.readdirSync(fullDir, { withFileTypes: true });
        for (const entry of taskEntries) {
          if (entry.isDirectory()) {
            const uiMessagesPath = path.join(fullDir, entry.name, 'ui_messages.json');
            if (fs.existsSync(uiMessagesPath)) {
              this.processLogFile(uiMessagesPath, harness, `${prefix}${entry.name.slice(0, 8)}`);
            }
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  private processLogFile(filePath: string, harness: KeosHarness, sessionId: string) {
    try {
      const stat = fs.statSync(filePath);
      const now = Date.now();
      // If inactive for > 30 minutes, skip tailing
      if (now - stat.mtimeMs > 30 * 60 * 1000) return;

      let session = this.activeSessions.get(sessionId);
      if (!session) {
        const currentCount = this.activeSessions.size;
        const wingId: KeosWing = currentCount % 2 === 0 ? 'WING_ALPHA' : 'WING_BETA';

        session = {
          sessionId,
          harness,
          accountId: 'local-operator',
          projectName: path.basename(process.cwd()),
          projectPath: process.cwd(),
          modelName: this.getModelNameForHarness(harness),
          wingId,
          lastActiveTimestamp: stat.mtimeMs
        };
        this.activeSessions.set(sessionId, session);
        this.emit('session:discovered', session);
      } else {
        session.lastActiveTimestamp = stat.mtimeMs;
      }

      const lastOffset = this.scannedFiles.get(filePath) || 0;
      if (stat.size <= lastOffset) return;

      const fd = fs.openSync(filePath, 'r');
      const readLength = stat.size - lastOffset;
      const buffer = Buffer.alloc(readLength);
      fs.readSync(fd, buffer, 0, readLength, lastOffset);
      fs.closeSync(fd);

      this.scannedFiles.set(filePath, stat.size);

      const chunk = buffer.toString('utf-8');
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        this.parseLogLine(session, line);
      }
    } catch {
      // File reading error ignored
    }
  }

  private getModelNameForHarness(harness: KeosHarness): string {
    switch (harness) {
      case 'ANTIGRAVITY': return 'Gemini 3.8 Pro / Flash';
      case 'CLAUDE_CODE': return 'Claude 3.7 Sonnet / Opus';
      case 'OPEN_CODEX': return 'GPT-4o / Codex';
      case 'KIRO': return 'Kiro Reasoner';
      case 'KILO': return 'Kilo Code Master';
      case 'AIDER': return 'Aider LLM';
      case 'CURSOR': return 'Cursor Claude';
      case 'ROO_CLINE': return 'Roo Code Agent';
      default: return 'Generic AI Agent';
    }
  }

  private parseLogLine(session: KeosSession, line: string) {
    try {
      // 1. Antigravity JSONL / Universal JSON format
      const data = JSON.parse(line);

      // Check for project name
      if (typeof data.content === 'string' && data.content.includes('Active Workspaces:')) {
        const match = data.content.match(/Active Workspaces:\s*\n-\s*([^\r\n]+)/);
        if (match) {
          const workspace = match[1].trim();
          session.projectPath = workspace;
          session.projectName = path.basename(workspace);
          this.emit('session:updated', session);
        }
      }

      // Check for user account
      if (data.user_id || data.account || data.author) {
        session.accountId = data.user_id || data.account || data.author;
        this.emit('session:updated', session);
      }

      // Tool calls format 1: Antigravity / Gemini { tool_calls: [...] }
      if (Array.isArray(data.tool_calls) && data.tool_calls.length > 0) {
        for (const tc of data.tool_calls) {
          const payload: KeosTelemetryPayload = {
            harness: session.harness,
            project: session.projectName,
            account: session.accountId,
            tool: tc.name || tc.tool_name || tc.action,
            target: tc.args?.Path || tc.args?.CommandLine || tc.args?.query || tc.args?.target || '',
            status: data.status || 'SUCCESS',
            details: tc.args
          };
          this.emit('telemetry', { session, payload });
        }
        return;
      }

      // Tool calls format 2: Claude Code { type: 'assistant', message: { content: [...] } }
      if (data.type === 'assistant' && Array.isArray(data.message?.content)) {
        for (const block of data.message.content) {
          if (block.type === 'tool_use') {
            const payload: KeosTelemetryPayload = {
              harness: session.harness,
              project: session.projectName,
              account: session.accountId,
              tool: block.name,
              target: block.input?.command || block.input?.path || block.input?.pattern || '',
              status: 'SUCCESS',
              details: block.input
            };
            this.emit('telemetry', { session, payload });
          }
        }
        return;
      }

      // Tool calls format 3: OpenAI / Codex / OpenCode { choices: [...] }
      if (Array.isArray(data.choices)) {
        for (const choice of data.choices) {
          const tcList = choice.message?.tool_calls;
          if (Array.isArray(tcList)) {
            for (const tc of tcList) {
              const fn = tc.function || tc;
              let args = {};
              try { args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments; } catch {}
              const payload: KeosTelemetryPayload = {
                harness: session.harness,
                project: session.projectName,
                account: session.accountId,
                tool: fn.name,
                target: (args as any)?.path || (args as any)?.command || '',
                status: 'SUCCESS',
                details: args
              };
              this.emit('telemetry', { session, payload });
            }
          }
        }
        return;
      }

      // Tool calls format 4: Flat Generic payload { tool, target, action }
      if (data.tool || data.action) {
        const payload: KeosTelemetryPayload = {
          harness: session.harness,
          project: session.projectName,
          account: session.accountId,
          tool: data.tool || data.action,
          target: data.target || data.path || data.command || '',
          status: data.status || 'SUCCESS',
          details: data.details || data
        };
        this.emit('telemetry', { session, payload });
        return;
      }
    } catch {
      // In case line is markdown or plain text (e.g. Aider log)
      if (line.startsWith('> ') || line.includes('Applied edit to') || line.includes('Commit ')) {
        const payload: KeosTelemetryPayload = {
          harness: session.harness,
          project: session.projectName,
          account: session.accountId,
          tool: line.includes('Applied edit') ? 'write_file' : 'run_command',
          target: line.replace(/^>\s*/, '').slice(0, 80),
          status: 'SUCCESS'
        };
        this.emit('telemetry', { session, payload });
      }
    }
  }
}

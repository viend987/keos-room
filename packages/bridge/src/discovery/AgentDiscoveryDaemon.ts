import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { KeosHarness, KeosSession, KeosTelemetryPayload, KeosWing } from '../types.js';

export class AgentDiscoveryDaemon extends EventEmitter {
  private activeSessions = new Map<string, KeosSession>();
  private scannedFiles = new Map<string, number>(); // filePath -> lastOffset
  private timer: NodeJS.Timeout | null = null;
  private isScanning = false;

  private userHome = os.homedir();

  constructor() {
    super();
  }

  public start(intervalMs = 1500) {
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
      this.scanAntigravitySessions();
      this.scanClaudeSessions();
    } catch {
      // Ignore scan access errors
    } finally {
      this.isScanning = false;
    }
  }

  private scanAntigravitySessions() {
    const agyBrainDir = path.join(this.userHome, '.gemini', 'antigravity-cli', 'brain');
    if (!fs.existsSync(agyBrainDir)) return;

    const entries = fs.readdirSync(agyBrainDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const convId = entry.name;
      const transcriptPath = path.join(
        agyBrainDir,
        convId,
        '.system_generated',
        'logs',
        'transcript.jsonl'
      );

      if (fs.existsSync(transcriptPath)) {
        this.processLogFile(transcriptPath, 'ANTIGRAVITY', convId);
      }
    }
  }

  private scanClaudeSessions() {
    const claudeDir = path.join(this.userHome, '.claude', 'projects');
    if (!fs.existsSync(claudeDir)) return;

    const projectDirs = fs.readdirSync(claudeDir, { withFileTypes: true });
    for (const proj of projectDirs) {
      if (!proj.isDirectory()) continue;
      const sessionsDir = path.join(claudeDir, proj.name, 'sessions');
      if (!fs.existsSync(sessionsDir)) continue;

      const sessionFiles = fs.readdirSync(sessionsDir);
      for (const sFile of sessionFiles) {
        if (!sFile.endsWith('.jsonl')) continue;
        const sPath = path.join(sessionsDir, sFile);
        const sId = path.basename(sFile, '.jsonl');
        this.processLogFile(sPath, 'CLAUDE_CODE', sId);
      }
    }
  }

  private processLogFile(filePath: string, harness: KeosHarness, sessionId: string) {
    try {
      const stat = fs.statSync(filePath);
      const now = Date.now();
      // If inactive for > 15 minutes, skip tailing
      if (now - stat.mtimeMs > 15 * 60 * 1000) return;

      let session = this.activeSessions.get(sessionId);
      if (!session) {
        // Assign wing
        const currentCount = this.activeSessions.size;
        const wingId: KeosWing = currentCount % 2 === 0 ? 'WING_ALPHA' : 'WING_BETA';

        session = {
          sessionId,
          harness,
          accountId: 'local-user',
          projectName: 'project',
          projectPath: process.cwd(),
          modelName: harness === 'ANTIGRAVITY' ? 'gemini-coder' : 'claude-sonnet',
          wingId,
          lastActiveTimestamp: stat.mtimeMs
        };
        this.activeSessions.set(sessionId, session);
        this.emit('session:discovered', session);
      } else {
        session.lastActiveTimestamp = stat.mtimeMs;
      }

      // Tail new lines from last known offset
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

  private parseLogLine(session: KeosSession, line: string) {
    try {
      const data = JSON.parse(line);

      // Check for project name / active workspace in user prompt or system prompt
      if (typeof data.content === 'string' && data.content.includes('Active Workspaces:')) {
        const match = data.content.match(/Active Workspaces:\s*\n-\s*([^\r\n]+)/);
        if (match) {
          const workspace = match[1].trim();
          session.projectPath = workspace;
          session.projectName = path.basename(workspace);
          this.emit('session:updated', session);
        }
      }

      // Parse tool calls
      if (Array.isArray(data.tool_calls) && data.tool_calls.length > 0) {
        for (const tc of data.tool_calls) {
          const payload: KeosTelemetryPayload = {
            harness: session.harness,
            project: session.projectName,
            account: session.accountId,
            tool: tc.name || tc.tool_name || tc.action,
            target: tc.args?.Path || tc.args?.CommandLine || tc.args?.query || '',
            status: data.status || 'SUCCESS',
            details: tc.args
          };
          this.emit('telemetry', { session, payload });
        }
      }
    } catch {
      // In case line is partial or plain text
    }
  }
}

import {
  KeosCategory,
  KeosEvent,
  KeosLocation,
  KeosRole,
  KeosSession,
  KeosStatus,
  KeosTelemetryPayload
} from '../types.js';

export class UniversalNormalizer {
  private static eventCounter = 0;

  public static normalize(session: KeosSession, payload: KeosTelemetryPayload): KeosEvent {
    this.eventCounter += 1;
    const eventId = `EVT_${Date.now()}_${this.eventCounter}`;
    const timestamp = Date.now();

    const tool = (payload.tool || payload.action || '').trim().toLowerCase();
    const target = (payload.target || '').trim();
    const rawStatus = (payload.status || 'SUCCESS').toUpperCase();

    // Default values
    let category: KeosCategory = 'CODE';
    let role: KeosRole = 'DEV';
    let status: KeosStatus = rawStatus === 'ERROR' || rawStatus === 'FAIL' ? 'ERROR' : 'RUNNING';
    let badge = '[IO_ACTIVE]';
    let detail = payload.target || payload.action || 'Executing task';
    let targetLocation: KeosLocation = 'DEV_DESK';
    let animation: KeosEvent['animation'] = 'TYPE';

    // 1. Error handling / Panic condition
    if (status === 'ERROR') {
      return {
        id: eventId,
        timestamp,
        session,
        category: 'SHELL',
        status: 'ERROR',
        role: 'MANAGER',
        badge: '[ERR_ALERT]',
        detail: `Process Error: ${target || payload.output || 'Command failed'}`,
        targetLocation: 'OFFICE_PM',
        animation: 'RAGE'
      };
    }

    // 2. Skill Invocation Detection
    if (
      tool.includes('skill') ||
      target.includes('/skills/') ||
      target.includes('\\skills\\') ||
      target.endsWith('skill.md')
    ) {
      const match = target.match(/skills[/\\]([^/\\]+)/i);
      const skillName = match ? match[1].toUpperCase() : 'SPECIALIST';
      return {
        id: eventId,
        timestamp,
        session,
        category: 'SKILL',
        status: 'RUNNING',
        role: 'PLANNER',
        badge: `[SKILL:${skillName}]`,
        detail: `Executing Skill: ${skillName}`,
        targetLocation: 'WAR_ROOM',
        animation: 'ANALYZE'
      };
    }

    // 3. Subagents / Delegation
    if (
      tool === 'invoke_subagent' ||
      tool === 'define_subagent' ||
      tool === 'send_message' ||
      tool === 'manage_subagents' ||
      tool === 'delegate_task' ||
      tool === 'spawn_agent'
    ) {
      return {
        id: eventId,
        timestamp,
        session,
        category: 'SUBAGENT',
        status: 'START',
        role: 'SUBAGENT_WORKER',
        badge: '[SUB_SPAWN]',
        detail: `Contractor Dispatched: ${target || 'Worker Subagent'}`,
        targetLocation: 'WAR_ROOM',
        animation: 'SALUTE'
      };
    }

    // 4. MCP Tools
    if (tool === 'call_mcp_tool' || tool.startsWith('mcp_') || tool.startsWith('mcp:')) {
      let mcpServer = 'EXTERNAL';
      if (payload.details && typeof payload.details.ServerName === 'string') {
        mcpServer = payload.details.ServerName.toUpperCase();
      } else if (tool.startsWith('mcp_') || tool.startsWith('mcp:')) {
        const parts = tool.split(/[_:]/);
        if (parts.length > 1) mcpServer = parts[1].toUpperCase();
      }

      let mcpRole: KeosRole = 'DEV';
      if (mcpServer === 'REA' || mcpServer.includes('SEC')) mcpRole = 'SECURITY';

      return {
        id: eventId,
        timestamp,
        session,
        category: 'MCP',
        status: 'RUNNING',
        role: mcpRole,
        badge: `[MCP:${mcpServer}]`,
        detail: `Rack Expansion: ${mcpServer} -> ${target || 'Tool execution'}`,
        targetLocation: 'SERVER_RACK',
        animation: 'ANALYZE'
      };
    }

    // 5. File System Operations (AGY: read_file/write_file, Claude: Read/Write/Edit, Codex/Kiro/Kilo/Aider)
    if (
      tool === 'read_file' ||
      tool === 'read' ||
      tool === 'view' ||
      tool === 'cat' ||
      tool === 'glob' ||
      tool === 'grep'
    ) {
      const isDoc = target.endsWith('.md') || target.endsWith('.txt') || target.endsWith('.json');
      return {
        id: eventId,
        timestamp,
        session,
        category: isDoc ? 'PLAN' : 'CODE',
        status: 'RUNNING',
        role: isDoc ? 'PLANNER' : 'DEV',
        badge: '[IO_READ]',
        detail: `Inspecting ${target || 'file'}`,
        targetLocation: isDoc ? 'WAR_ROOM' : 'DEV_DESK',
        animation: 'ANALYZE'
      };
    }

    if (
      tool === 'write_file' ||
      tool === 'edit_file' ||
      tool === 'write' ||
      tool === 'edit' ||
      tool === 'patch' ||
      tool === 'str_replace_editor'
    ) {
      return {
        id: eventId,
        timestamp,
        session,
        category: 'CODE',
        status: 'RUNNING',
        role: 'DEV',
        badge: '[IO_WRITE]',
        detail: `Writing code: ${target || 'file patch'}`,
        targetLocation: 'DEV_DESK',
        animation: 'TYPE'
      };
    }

    // 6. Shell & Command Executions (AGY: run_command, Claude: Bash, OpenCode/Codex: shell/exec, Kiro/Kilo: terminal)
    if (
      tool === 'run_command' ||
      tool === 'shell' ||
      tool === 'bash' ||
      tool === 'terminal' ||
      tool === 'exec' ||
      tool === 'command'
    ) {
      const lowerTarget = target.toLowerCase();
      if (
        lowerTarget.includes('test') ||
        lowerTarget.includes('pytest') ||
        lowerTarget.includes('jest') ||
        lowerTarget.includes('vitest') ||
        lowerTarget.includes('cargo test') ||
        lowerTarget.includes('go test')
      ) {
        return {
          id: eventId,
          timestamp,
          session,
          category: 'TEST',
          status: 'RUNNING',
          role: 'QA',
          badge: '[EXEC_TEST]',
          detail: `Running QA Test Suite: ${target.slice(0, 40)}`,
          targetLocation: 'QA_LAB',
          animation: 'PULL_LEVER'
        };
      }

      return {
        id: eventId,
        timestamp,
        session,
        category: 'SHELL',
        status: 'RUNNING',
        role: 'DEV',
        badge: '[EXEC_RUN]',
        detail: `Executing command: ${target.slice(0, 40)}`,
        targetLocation: 'SERVER_RACK',
        animation: 'TYPE'
      };
    }

    // 7. Web & Research
    if (tool === 'search_web' || tool === 'browser' || tool === 'web_search' || tool === 'fetch') {
      return {
        id: eventId,
        timestamp,
        session,
        category: 'PLAN',
        status: 'RUNNING',
        role: 'PLANNER',
        badge: '[WEB_RECON]',
        detail: `Web Intel: ${target.slice(0, 40)}`,
        targetLocation: 'WAR_ROOM',
        animation: 'ANALYZE'
      };
    }

    // 8. Idle Condition
    if (tool === 'idle' || tool === 'standby' || tool === 'done') {
      return {
        id: eventId,
        timestamp,
        session,
        category: 'IDLE',
        status: 'STANDBY',
        role: 'DEV',
        badge: '[IDLE_STANDBY]',
        detail: 'Standby / Coffee Break in Pantry',
        targetLocation: 'PANTRY',
        animation: 'COFFEE'
      };
    }

    // 9. Fallback for any future / custom plugin tools
    return {
      id: eventId,
      timestamp,
      session,
      category: 'PLUGIN',
      status: 'RUNNING',
      role: 'DEV',
      badge: `[PLUGIN:${(tool || 'CUSTOM').toUpperCase()}]`,
      detail: `Operating Modular Tool: ${tool} (${target})`,
      targetLocation: 'DEV_DESK',
      animation: 'TYPE'
    };
  }
}

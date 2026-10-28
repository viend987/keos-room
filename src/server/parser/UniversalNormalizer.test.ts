import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UniversalNormalizer } from './UniversalNormalizer.js';
import { KeosSession } from '../../types.js';

describe('UniversalNormalizer Test Suite', () => {
  const dummySession: KeosSession = {
    sessionId: 'session_01',
    harness: 'ANTIGRAVITY',
    accountId: 'admin@work',
    projectName: 'ems',
    projectPath: 'D:/github/ems',
    modelName: 'gemini-3.8-flash',
    wingId: 'WING_ALPHA',
    lastActiveTimestamp: Date.now()
  };

  it('correctly maps file writes to DEV role with [IO_WRITE] badge', () => {
    const event = UniversalNormalizer.normalize(dummySession, {
      tool: 'write_file',
      target: 'src/services/auth.ts'
    });
    assert.strictEqual(event.category, 'CODE');
    assert.strictEqual(event.role, 'DEV');
    assert.strictEqual(event.badge, '[IO_WRITE]');
    assert.strictEqual(event.animation, 'TYPE');
    assert.strictEqual(event.targetLocation, 'DEV_DESK');
  });

  it('correctly maps skills to PLANNER with [SKILL:<NAME>] badge', () => {
    const event = UniversalNormalizer.normalize(dummySession, {
      tool: 'read_file',
      target: 'C:/Users/Admin/.gemini/skills/brainstorming/SKILL.md'
    });
    assert.strictEqual(event.category, 'SKILL');
    assert.strictEqual(event.role, 'PLANNER');
    assert.strictEqual(event.badge, '[SKILL:BRAINSTORMING]');
    assert.strictEqual(event.targetLocation, 'WAR_ROOM');
  });

  it('correctly maps test commands to QA with [EXEC_TEST] badge and lever pull', () => {
    const event = UniversalNormalizer.normalize(dummySession, {
      tool: 'run_command',
      target: 'npm test -- --coverage'
    });
    assert.strictEqual(event.category, 'TEST');
    assert.strictEqual(event.role, 'QA');
    assert.strictEqual(event.badge, '[EXEC_TEST]');
    assert.strictEqual(event.animation, 'PULL_LEVER');
    assert.strictEqual(event.targetLocation, 'QA_LAB');
  });

  it('correctly maps errors to MANAGER with [ERR_ALERT] and RAGE animation', () => {
    const event = UniversalNormalizer.normalize(dummySession, {
      tool: 'run_command',
      status: 'ERROR',
      target: 'Compile failed with 4 errors'
    });
    assert.strictEqual(event.status, 'ERROR');
    assert.strictEqual(event.role, 'MANAGER');
    assert.strictEqual(event.badge, '[ERR_ALERT]');
    assert.strictEqual(event.animation, 'RAGE');
    assert.strictEqual(event.targetLocation, 'OFFICE_PM');
  });

  it('correctly handles subagents with [SUB_SPAWN]', () => {
    const event = UniversalNormalizer.normalize(dummySession, {
      tool: 'invoke_subagent',
      target: 'cavecrew-builder'
    });
    assert.strictEqual(event.category, 'SUBAGENT');
    assert.strictEqual(event.role, 'SUBAGENT_WORKER');
    assert.strictEqual(event.badge, '[SUB_SPAWN]');
    assert.strictEqual(event.animation, 'SALUTE');
  });

  it('correctly normalizes Claude Code tool calls (Bash & Edit)', () => {
    const claudeSession = { ...dummySession, harness: 'CLAUDE_CODE' as const };
    const bashEvt = UniversalNormalizer.normalize(claudeSession, {
      tool: 'Bash',
      target: 'git status'
    });
    assert.strictEqual(bashEvt.category, 'SHELL');
    assert.strictEqual(bashEvt.badge, '[EXEC_RUN]');

    const editEvt = UniversalNormalizer.normalize(claudeSession, {
      tool: 'Edit',
      target: 'packages/web/src/main.ts'
    });
    assert.strictEqual(editEvt.category, 'CODE');
    assert.strictEqual(editEvt.badge, '[IO_WRITE]');
  });

  it('correctly normalizes Kiro / Kilo / Codex tool calls (terminal & str_replace_editor)', () => {
    const kiroSession = { ...dummySession, harness: 'KIRO' as const };
    const kiroEvt = UniversalNormalizer.normalize(kiroSession, {
      tool: 'str_replace_editor',
      target: 'lib/core.py'
    });
    assert.strictEqual(kiroEvt.category, 'CODE');
    assert.strictEqual(kiroEvt.badge, '[IO_WRITE]');

    const kiloSession = { ...dummySession, harness: 'KILO' as const };
    const kiloEvt = UniversalNormalizer.normalize(kiloSession, {
      tool: 'terminal',
      target: 'pytest tests/'
    });
    assert.strictEqual(kiloEvt.category, 'TEST');
    assert.strictEqual(kiloEvt.badge, '[EXEC_TEST]');
    assert.strictEqual(kiloEvt.role, 'QA');
  });

  it('correctly uses fallback for unknown plugins without crashing', () => {
    const event = UniversalNormalizer.normalize(dummySession, {
      tool: 'quantum_optimizer_v9',
      target: 'matrix_calc'
    });
    assert.strictEqual(event.category, 'PLUGIN');
    assert.strictEqual(event.badge, '[PLUGIN:QUANTUM_OPTIMIZER_V9]');
  });
});

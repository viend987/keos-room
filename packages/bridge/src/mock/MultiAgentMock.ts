import { KeosSession, KeosTelemetryPayload } from '../types.js';

export interface MockStep {
  delayMs: number;
  session: KeosSession;
  payload: KeosTelemetryPayload;
}

export class MultiAgentMock {
  public static getScenario(scenarioName: string): MockStep[] {
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

    if (scenarioName === 'CONCURRENT') {
      return [
        {
          delayMs: 500,
          session: sessionAgy,
          payload: { tool: 'read_file', target: 'docs/superpowers/plans/auth.md' }
        },
        {
          delayMs: 1200,
          session: sessionClaude,
          payload: { tool: 'read_file', target: 'src/engine/physics.ts' }
        },
        {
          delayMs: 1800,
          session: sessionAgy,
          payload: { tool: 'write_file', target: 'src/services/jwt_signer.ts' }
        },
        {
          delayMs: 2400,
          session: sessionClaude,
          payload: { tool: 'edit_file', target: 'src/engine/collision_mesh.ts' }
        },
        {
          delayMs: 3200,
          session: sessionAgy,
          payload: { tool: 'run_command', target: 'npm test -- --grep Auth' }
        },
        {
          delayMs: 4000,
          session: sessionClaude,
          payload: { tool: 'run_command', target: 'cargo test --test collision' }
        },
        {
          delayMs: 5000,
          session: sessionAgy,
          payload: { tool: 'idle', target: 'Pantry coffee standby' }
        },
        {
          delayMs: 5500,
          session: sessionClaude,
          payload: { tool: 'idle', target: 'Pantry coffee standby' }
        }
      ];
    }

    if (scenarioName === 'CHAOS') {
      return [
        {
          delayMs: 500,
          session: sessionAgy,
          payload: { tool: 'write_file', target: 'src/database/migration_v2.sql' }
        },
        {
          delayMs: 1500,
          session: sessionAgy,
          payload: {
            tool: 'run_command',
            target: 'npm run migrate:up',
            status: 'ERROR',
            output: 'FATAL: Table lock timeout. Transaction aborted.'
          }
        },
        {
          delayMs: 3500,
          session: sessionAgy,
          payload: { tool: 'edit_file', target: 'src/database/migration_v2.sql' }
        },
        {
          delayMs: 4500,
          session: sessionAgy,
          payload: { tool: 'run_command', target: 'npm run migrate:up' }
        }
      ];
    }

    // Default: FULL SPRINT
    return [
      {
        delayMs: 500,
        session: sessionAgy,
        payload: {
          tool: 'read_file',
          target: 'C:/Users/Admin/.gemini/skills/brainstorming/SKILL.md'
        }
      },
      {
        delayMs: 1400,
        session: sessionAgy,
        payload: { tool: 'invoke_subagent', target: 'research-specialist' }
      },
      {
        delayMs: 2200,
        session: sessionAgy,
        payload: { tool: 'write_file', target: 'src/core/controller.ts' }
      },
      {
        delayMs: 3000,
        session: sessionAgy,
        payload: { tool: 'call_mcp_tool', details: { ServerName: 'cloudflare' }, target: 'kv_put' }
      },
      {
        delayMs: 3800,
        session: sessionAgy,
        payload: { tool: 'run_command', target: 'npm test' }
      },
      {
        delayMs: 4800,
        session: sessionAgy,
        payload: { tool: 'idle', target: 'Mission Accomplished' }
      }
    ];
  }
}

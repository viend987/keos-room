export type KeosHarness = 
  | 'ANTIGRAVITY' 
  | 'CLAUDE_CODE' 
  | 'OPEN_CODEX' 
  | 'AIDER' 
  | 'GENERIC';

export type KeosCategory = 
  | 'TASK' 
  | 'PLAN' 
  | 'SKILL' 
  | 'CODE' 
  | 'SHELL' 
  | 'TEST' 
  | 'SUBAGENT' 
  | 'MCP' 
  | 'PLUGIN' 
  | 'IDLE';

export type KeosRole = 
  | 'MANAGER' 
  | 'PLANNER' 
  | 'DEV' 
  | 'QA' 
  | 'SECURITY' 
  | 'SUBAGENT_WORKER';

export type KeosStatus = 'START' | 'RUNNING' | 'SUCCESS' | 'ERROR' | 'STANDBY';

export type KeosWing = 'WING_ALPHA' | 'WING_BETA' | 'SHARED_PANTRY';

export type KeosLocation = 
  | 'OFFICE_PM' 
  | 'WAR_ROOM' 
  | 'DEV_DESK' 
  | 'QA_LAB' 
  | 'SERVER_RACK' 
  | 'PANTRY';

export type KeosAnimation = 
  | 'IDLE' 
  | 'WALK' 
  | 'TYPE' 
  | 'ANALYZE' 
  | 'PULL_LEVER' 
  | 'RAGE' 
  | 'SALUTE' 
  | 'COFFEE';

export interface KeosSession {
  sessionId: string;
  harness: KeosHarness;
  accountId: string;
  projectName: string;
  projectPath: string;
  modelName: string;
  wingId: KeosWing;
  lastActiveTimestamp: number;
}

export interface KeosEvent {
  id: string;
  timestamp: number;
  session: KeosSession;
  category: KeosCategory;
  status: KeosStatus;
  role: KeosRole;
  badge: string;
  detail: string;
  targetLocation: KeosLocation;
  animation: KeosAnimation;
}

export interface RoomDef {
  id: string;
  name: string;
  accent: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorTile: string;
  wallTile: string;
  doorways: { x: number; y: number }[];
}

export interface CarpetDef {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FurnitureDef {
  type: string;
  x: number;
  y: number;
  workstationId?: string;
  hasSteam?: boolean;
}

export interface OfficeLayout {
  version: number;
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  rooms: RoomDef[];
  carpets: CarpetDef[];
  furniture: FurnitureDef[];
}

export type AgentState = 'IDLE' | 'WALKING' | 'CODING' | 'PLANNING' | 'TESTING' | 'PANIC' | 'COFFEE';

export interface AgentEntity {
  id: string;
  name: string;
  role: string;
  harness: string;
  spriteKey: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
  state: AgentState;
  statusIndicator: 'NONE' | 'IDEA' | 'QUERY' | 'WARN' | 'SLEEP' | 'SYNC';
  caffeine: number;
  panicLevel: number;
  linesWritten: number;
  currentTask: string;
  bubbleText: string;
  bubbleDisplayed: string;
  bubbleTimer: number;
  bubbleTag: string;
  animFrame: number;
  animTimer: number;
}

interface PetEntity {
  id: string;
  name: string;
  spriteKey: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  waitTimer: number;
  animFrame: number;
}

interface SteamParticle {
  x: number;
  y: number;
  alpha: number;
  vy: number;
  size: number;
}

const FURNITURE_ASSET_MAP: Record<string, { path: string; w: number; h: number; yOffset?: number }> = {
  BIN: { path: '/assets/furniture/BIN/BIN.png', w: 16, h: 16 },
  BOOKSHELF: { path: '/assets/furniture/BOOKSHELF/BOOKSHELF.png', w: 32, h: 32 },
  DOUBLE_BOOKSHELF: { path: '/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png', w: 32, h: 32 },
  CACTUS: { path: '/assets/furniture/CACTUS/CACTUS.png', w: 16, h: 32 },
  CLOCK: { path: '/assets/furniture/CLOCK/CLOCK.png', w: 16, h: 32 },
  COFFEE: { path: '/assets/furniture/COFFEE/COFFEE.png', w: 16, h: 16, yOffset: -6 },
  COFFEE_TABLE: { path: '/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png', w: 32, h: 32 },
  CUSHIONED_BENCH: { path: '/assets/furniture/CUSHIONED_BENCH/CUSHIONED_BENCH.png', w: 32, h: 16 },
  CUSHIONED_CHAIR_BACK: { path: '/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png', w: 16, h: 32 },
  CUSHIONED_CHAIR_FRONT: { path: '/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', w: 16, h: 32 },
  CUSHIONED_CHAIR_SIDE: { path: '/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_SIDE.png', w: 16, h: 32 },
  DESK_FRONT: { path: '/assets/furniture/DESK/DESK_FRONT.png', w: 48, h: 32 },
  DESK_SIDE: { path: '/assets/furniture/DESK/DESK_SIDE.png', w: 32, h: 48 },
  HANGING_PLANT: { path: '/assets/furniture/HANGING_PLANT/HANGING_PLANT.png', w: 16, h: 32 },
  LARGE_PAINTING: { path: '/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png', w: 32, h: 32 },
  SMALL_PAINTING: { path: '/assets/furniture/SMALL_PAINTING/SMALL_PAINTING.png', w: 16, h: 32 },
  SMALL_PAINTING_2: { path: '/assets/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png', w: 16, h: 32 },
  LARGE_PLANT: { path: '/assets/furniture/LARGE_PLANT/LARGE_PLANT.png', w: 16, h: 32 },
  PLANT: { path: '/assets/furniture/PLANT/PLANT.png', w: 16, h: 32 },
  PLANT_2: { path: '/assets/furniture/PLANT_2/PLANT_2.png', w: 16, h: 32 },
  POT: { path: '/assets/furniture/POT/POT.png', w: 16, h: 16 },
  SMALL_TABLE_FRONT: { path: '/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png', w: 32, h: 32 },
  SOFA_FRONT: { path: '/assets/furniture/SOFA/SOFA_FRONT.png', w: 32, h: 32 },
  SOFA_BACK: { path: '/assets/furniture/SOFA/SOFA_BACK.png', w: 32, h: 32 },
  SOFA_SIDE: { path: '/assets/furniture/SOFA/SOFA_SIDE.png', w: 32, h: 32 },
  TABLE_FRONT: { path: '/assets/furniture/TABLE_FRONT/TABLE_FRONT.png', w: 32, h: 32 },
  WHITEBOARD: { path: '/assets/furniture/WHITEBOARD/WHITEBOARD.png', w: 32, h: 32 },
  WOODEN_BENCH: { path: '/assets/furniture/WOODEN_BENCH/WOODEN_BENCH.png', w: 32, h: 16 },
  WOODEN_CHAIR_BACK: { path: '/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png', w: 16, h: 32 },
  WOODEN_CHAIR_FRONT: { path: '/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png', w: 16, h: 32 },
  WOODEN_CHAIR_SIDE: { path: '/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png', w: 16, h: 32 }
};

export class OfficeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layout: OfficeLayout | null = null;
  private images: Map<string, HTMLImageElement> = new Map();
  public cameraX = 0;
  public cameraY = 0;
  public zoom = 2.6;
  private targetCameraX = 0;
  private targetCameraY = 0;
  private targetZoom = 2.6;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  public agents: Map<string, AgentEntity> = new Map();
  public selectedAgentId: string | null = null;
  private onSelectAgent?: (agent: AgentEntity | null) => void;
  private pets: PetEntity[] = [];
  private steamParticles: SteamParticle[] = [];
  private globalTick = 0;
  private lastFrameTime = performance.now();

  constructor(canvas: HTMLCanvasElement, onSelectAgent?: (agent: AgentEntity | null) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    this.ctx = context;
    this.onSelectAgent = onSelectAgent;
    this.initInputHandlers();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  public async init(): Promise<void> {
    await this.loadLayout();
    await this.preloadAllAssets();
    this.spawnInitialRoster();
    this.centerCameraOnWing('ALL');
    requestAnimationFrame((t) => this.loop(t));
  }

  private async loadLayout(): Promise<void> {
    const res = await fetch('/assets/default-layout-1.json');
    this.layout = await res.json();
  }

  private loadImage(key: string, url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
  }

  private async preloadAllAssets(): Promise<void> {
    const tasks: Promise<void>[] = [];
    for (let i = 0; i <= 8; i++) {
      tasks.push(this.loadImage(`floor_${i}`, `/assets/floors/floor_${i}.png`));
    }
    for (let i = 0; i <= 2; i++) {
      tasks.push(this.loadImage(`carpet_${i}`, `/assets/carpets/carpet_${i}.png`));
    }
    tasks.push(this.loadImage('wall_0', '/assets/walls/wall_0.png'));
    for (let i = 0; i <= 5; i++) {
      tasks.push(this.loadImage(`char_${i}`, `/assets/characters/char_${i}.png`));
    }
    tasks.push(this.loadImage('PC_OFF', '/assets/furniture/PC/PC_FRONT_OFF.png'));
    tasks.push(this.loadImage('PC_ON_1', '/assets/furniture/PC/PC_FRONT_ON_1.png'));
    tasks.push(this.loadImage('PC_ON_2', '/assets/furniture/PC/PC_FRONT_ON_2.png'));
    tasks.push(this.loadImage('PC_ON_3', '/assets/furniture/PC/PC_FRONT_ON_3.png'));
    for (const [key, meta] of Object.entries(FURNITURE_ASSET_MAP)) {
      tasks.push(this.loadImage(key, meta.path));
    }
    tasks.push(this.loadImage('pet_claudio', '/assets/pets/claudio/pet.png'));
    tasks.push(this.loadImage('pet_gitcat', '/assets/pets/gitcat/pet.png'));
    await Promise.all(tasks);
  }

  private spawnInitialRoster(): void {
    const T = 16;
    const initialAgents: Omit<
      AgentEntity,
      'targetX' | 'targetY' | 'animFrame' | 'animTimer' | 'bubbleDisplayed'
    >[] = [
      {
        id: 'agy-lead',
        name: 'VEX [ARCHITECT]',
        role: 'Lead Planner & System Architect',
        harness: 'AGY',
        spriteKey: 'char_0',
        x: 4 * T,
        y: 5 * T,
        homeX: 4 * T,
        homeY: 5 * T,
        direction: 'UP',
        state: 'CODING',
        statusIndicator: 'IDEA',
        caffeine: 92,
        panicLevel: 5,
        linesWritten: 1420,
        currentTask: 'Designing telemetry state machine',
        bubbleText: 'Skema arsitektur Wing Alpha sudah sinkron coy.',
        bubbleTimer: 260,
        bubbleTag: 'PLANNING'
      },
      {
        id: 'agy-dev',
        name: 'KIRA [CORE DEV]',
        role: 'Fullstack TypeScript Engineer',
        harness: 'AGY',
        spriteKey: 'char_1',
        x: 8 * T,
        y: 5 * T,
        homeX: 8 * T,
        homeY: 5 * T,
        direction: 'UP',
        state: 'CODING',
        statusIndicator: 'SYNC',
        caffeine: 84,
        panicLevel: 12,
        linesWritten: 3890,
        currentTask: 'Refactoring Y-Sort Canvas Renderer',
        bubbleText: 'Render loop 60 FPS stabil! Zero drop frame.',
        bubbleTimer: 320,
        bubbleTag: 'IO_WRITE'
      },
      {
        id: 'agy-sec',
        name: 'AXEL [SEC-OPS]',
        role: 'Security & Sandbox Auditor',
        harness: 'AGY',
        spriteKey: 'char_2',
        x: 4 * T,
        y: 9 * T,
        homeX: 4 * T,
        homeY: 9 * T,
        direction: 'UP',
        state: 'CODING',
        statusIndicator: 'NONE',
        caffeine: 75,
        panicLevel: 8,
        linesWritten: 910,
        currentTask: 'Auditing zero-emoji DOM guardrails',
        bubbleText: 'Filter sanitasi aktif. Tidak ada emoji yang bocor.',
        bubbleTimer: 180,
        bubbleTag: 'SEC_AUDIT'
      },
      {
        id: 'claude-arch',
        name: 'ORION [CLAUDE]',
        role: 'Autonomous Subagent Coordinator',
        harness: 'CLAUDE',
        spriteKey: 'char_3',
        x: 23 * T,
        y: 5 * T,
        homeX: 23 * T,
        homeY: 5 * T,
        direction: 'UP',
        state: 'CODING',
        statusIndicator: 'IDEA',
        caffeine: 96,
        panicLevel: 4,
        linesWritten: 2740,
        currentTask: 'Orchestrating parallel research workers',
        bubbleText: 'Subagent selesai memetakan seluruh manifest sprite.',
        bubbleTimer: 290,
        bubbleTag: 'SUBAGENT'
      },
      {
        id: 'claude-eng',
        name: 'NOVA [CLAUDE]',
        role: 'UI/UX Pixel Systems Specialist',
        harness: 'CLAUDE',
        spriteKey: 'char_4',
        x: 27 * T,
        y: 5 * T,
        homeX: 27 * T,
        homeY: 5 * T,
        direction: 'UP',
        state: 'CODING',
        statusIndicator: 'NONE',
        caffeine: 68,
        panicLevel: 10,
        linesWritten: 1950,
        currentTask: 'Polishing 9-slice retro speech bubbles',
        bubbleText: 'Grid 16x16 sekarang presisi sampai ke bayangan.',
        bubbleTimer: 210,
        bubbleTag: 'UI_CRAFT'
      },
      {
        id: 'qa-director',
        name: 'BOSS REX [QA/PM]',
        role: 'Engineering Manager & QA Enforcer',
        harness: 'CODEX',
        spriteKey: 'char_5',
        x: 27 * T,
        y: 17 * T,
        homeX: 27 * T,
        homeY: 17 * T,
        direction: 'UP',
        state: 'TESTING',
        statusIndicator: 'QUERY',
        caffeine: 100,
        panicLevel: 18,
        linesWritten: 640,
        currentTask: 'Running Playwright visual assertion suite',
        bubbleText: 'Pastikan semua unit test hijau sebelum push!',
        bubbleTimer: 340,
        bubbleTag: 'QA_SUITE'
      }
    ];

    for (const a of initialAgents) {
      this.agents.set(a.id, {
        ...a,
        targetX: a.x,
        targetY: a.y,
        bubbleDisplayed: '',
        animFrame: 0,
        animTimer: 0
      });
    }

    this.pets = [
      {
        id: 'gitcat',
        name: 'GITCAT',
        spriteKey: 'pet_gitcat',
        x: 20 * T,
        y: 16 * T,
        targetX: 20 * T,
        targetY: 16 * T,
        waitTimer: 120,
        animFrame: 0
      },
      {
        id: 'claudio',
        name: 'CLAUDIO',
        spriteKey: 'pet_claudio',
        x: 8 * T,
        y: 15 * T,
        targetX: 11 * T,
        targetY: 16 * T,
        waitTimer: 60,
        animFrame: 0
      }
    ];
  }

  public centerCameraOnWing(wing: 'ALL' | 'ALPHA' | 'WAR_ROOM' | 'BETA' | 'PANTRY'): void {
    const T = 16;
    if (wing === 'ALL') {
      this.targetZoom = Math.min(
        Math.max(1.8, (this.canvas.width / (32 * T)) * 0.92),
        3.0
      );
      this.targetCameraX = 16 * T;
      this.targetCameraY = 11 * T;
    } else if (wing === 'ALPHA') {
      this.targetZoom = 3.2;
      this.targetCameraX = 6.5 * T;
      this.targetCameraY = 6.5 * T;
    } else if (wing === 'WAR_ROOM') {
      this.targetZoom = 3.4;
      this.targetCameraX = 16 * T;
      this.targetCameraY = 6 * T;
    } else if (wing === 'BETA') {
      this.targetZoom = 3.2;
      this.targetCameraX = 25.5 * T;
      this.targetCameraY = 6.5 * T;
    } else if (wing === 'PANTRY') {
      this.targetZoom = 3.0;
      this.targetCameraX = 15 * T;
      this.targetCameraY = 16.5 * T;
    }
  }

  public adjustZoom(delta: number): void {
    this.targetZoom = Math.max(1.4, Math.min(4.5, this.targetZoom + delta));
  }

  public triggerScenario(mode: 'SPRINT' | 'WAR_ROOM' | 'PANIC' | 'COFFEE'): void {
    const T = 16;
    if (mode === 'SPRINT') {
      this.agents.forEach((agent) => {
        agent.targetX = agent.homeX;
        agent.targetY = agent.homeY;
        agent.state = 'WALKING';
        agent.statusIndicator = 'SYNC';
        agent.panicLevel = 10;
        this.setAgentBubble(agent, 'Gas sprint! Kejar target deployment hari ini!', 'EXEC_RUN');
      });
      this.centerCameraOnWing('ALL');
    } else if (mode === 'WAR_ROOM') {
      const seats = [
        { x: 14 * T, y: 4 * T },
        { x: 17 * T, y: 4 * T },
        { x: 14 * T, y: 7 * T },
        { x: 17 * T, y: 7 * T },
        { x: 13 * T, y: 5.5 * T },
        { x: 18 * T, y: 5.5 * T }
      ];
      let idx = 0;
      this.agents.forEach((agent) => {
        const seat = seats[idx % seats.length];
        agent.targetX = seat.x;
        agent.targetY = seat.y;
        agent.state = 'PLANNING';
        agent.statusIndicator = 'IDEA';
        this.setAgentBubble(agent, `Sinkronisasi arsitektur modul #${idx + 1} di War Room.`, 'PLANNING');
        idx++;
      });
      this.centerCameraOnWing('WAR_ROOM');
    } else if (mode === 'PANIC') {
      this.agents.forEach((agent) => {
        agent.panicLevel = 95;
        agent.state = 'PANIC';
        agent.statusIndicator = 'WARN';
        if (agent.id === 'qa-director') {
          agent.targetX = 16 * T;
          agent.targetY = 9 * T;
          this.setAgentBubble(agent, 'WOY SIAPA YANG PUSH TANPA RUN TEST?! BUILD MERAH!', 'ERR_ALERT');
        } else {
          agent.targetX = agent.homeX;
          agent.targetY = agent.homeY;
          this.setAgentBubble(agent, 'Waduh rollback cepat! Cek log di bridge sekarang!', 'HOTFIX');
        }
      });
      this.centerCameraOnWing('ALL');
    } else if (mode === 'COFFEE') {
      const spots = [
        { x: 3 * T, y: 15 * T },
        { x: 5 * T, y: 16 * T },
        { x: 8 * T, y: 16 * T },
        { x: 19 * T, y: 16 * T },
        { x: 21 * T, y: 16 * T },
        { x: 11 * T, y: 17 * T }
      ];
      let idx = 0;
      this.agents.forEach((agent) => {
        const spot = spots[idx % spots.length];
        agent.targetX = spot.x;
        agent.targetY = spot.y;
        agent.state = 'COFFEE';
        agent.statusIndicator = 'SLEEP';
        agent.caffeine = 100;
        agent.panicLevel = 0;
        this.setAgentBubble(agent, 'Seduh double shot espresso dulu biar mata melek...', 'BREAK');
        idx++;
      });
      this.centerCameraOnWing('PANTRY');
    }
  }

  public setAgentBubble(agent: AgentEntity, text: string, tag = 'INFO'): void {
    agent.bubbleText = text;
    agent.bubbleDisplayed = '';
    agent.bubbleTimer = 320;
    agent.bubbleTag = tag;
  }

  public ingestTelemetryEvent(payload: {
    agentId?: string;
    harness?: string;
    category?: string;
    message?: string;
    account?: string;
  }): AgentEntity {
    const rawHarness = (payload.harness || 'AGY').toUpperCase();
    let targetId = payload.agentId;

    if (!targetId) {
      if (rawHarness.includes('CLAUDE')) targetId = 'claude-arch';
      else if (rawHarness.includes('CODEX') || rawHarness.includes('OPENCODE')) targetId = 'qa-director';
      else if (rawHarness.includes('KIRO') || rawHarness.includes('KILO')) targetId = 'claude-eng';
      else if (rawHarness.includes('AIDER') || rawHarness.includes('CURSOR') || rawHarness.includes('ROO')) targetId = 'agy-sec';
      else targetId = 'agy-dev';
    }

    const agent = this.agents.get(targetId) || Array.from(this.agents.values())[0];
    if (payload.harness) {
      agent.harness = payload.harness.toUpperCase();
    }
    if (payload.account && !agent.name.includes(payload.account.slice(0, 6))) {
      agent.name = `${payload.account.slice(0, 8).toUpperCase()} [${agent.harness.slice(0, 4)}]`;
    }

    const cat = (payload.category || 'IO_WRITE').toUpperCase();

    if (cat.includes('PLAN')) {
      agent.targetX = 15 * 16;
      agent.targetY = 4.5 * 16;
      agent.state = 'PLANNING';
      agent.statusIndicator = 'IDEA';
    } else if (cat.includes('ERR') || cat.includes('FAIL')) {
      agent.state = 'PANIC';
      agent.statusIndicator = 'WARN';
      agent.panicLevel = Math.min(100, agent.panicLevel + 35);
    } else {
      agent.targetX = agent.homeX;
      agent.targetY = agent.homeY;
      agent.state = 'CODING';
      agent.statusIndicator = 'SYNC';
      agent.linesWritten += Math.floor(Math.random() * 25) + 5;
    }

    if (payload.message) {
      this.setAgentBubble(agent, payload.message, cat);
    }
    return agent;
  }

  private handleResize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  private initInputHandlers(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      const worldPos = this.screenToWorld(e.offsetX, e.offsetY);
      let clicked: AgentEntity | null = null;
      this.agents.forEach((agent) => {
        const dx = Math.abs(worldPos.x - (agent.x + 8));
        const dy = Math.abs(worldPos.y - (agent.y + 16));
        if (dx < 14 && dy < 20) {
          clicked = agent;
        }
      });

      if (clicked) {
        this.selectedAgentId = (clicked as AgentEntity).id;
        this.onSelectAgent?.(clicked);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = (e.clientX - this.dragStartX) / this.zoom;
      const dy = (e.clientY - this.dragStartY) / this.zoom;
      this.targetCameraX -= dx;
      this.targetCameraY -= dy;
      this.cameraX = this.targetCameraX;
      this.cameraY = this.targetCameraY;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.25 : -0.25;
        this.adjustZoom(delta);
      },
      { passive: false }
    );
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    return {
      x: (sx - cx) / this.zoom + this.cameraX,
      y: (sy - cy) / this.zoom + this.cameraY
    };
  }

  private loop(now: number): void {
    const dt = Math.min(64, now - this.lastFrameTime);
    this.lastFrameTime = now;
    this.globalTick++;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update(_dt: number): void {
    this.cameraX += (this.targetCameraX - this.cameraX) * 0.14;
    this.cameraY += (this.targetCameraY - this.cameraY) * 0.14;
    this.zoom += (this.targetZoom - this.zoom) * 0.14;

    this.agents.forEach((agent) => {
      const dx = agent.targetX - agent.x;
      const dy = agent.targetY - agent.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1.5) {
        const speed = agent.state === 'PANIC' ? 2.1 : 1.35;
        agent.x += (dx / dist) * speed;
        agent.y += (dy / dist) * speed;

        if (Math.abs(dx) > Math.abs(dy)) {
          agent.direction = dx > 0 ? 'RIGHT' : 'LEFT';
        } else {
          agent.direction = dy > 0 ? 'DOWN' : 'UP';
        }

        if (this.globalTick % 8 === 0) {
          agent.animFrame = (agent.animFrame + 1) % 4;
        }
      } else {
        agent.x = agent.targetX;
        agent.y = agent.targetY;
        if (agent.state === 'WALKING') {
          agent.state = 'CODING';
          agent.direction = 'UP';
        }
        if (this.globalTick % 14 === 0) {
          agent.animFrame = (agent.animFrame + 1) % 2;
        }
      }

      if (agent.bubbleTimer > 0) {
        agent.bubbleTimer--;
        if (agent.bubbleDisplayed.length < agent.bubbleText.length && this.globalTick % 2 === 0) {
          agent.bubbleDisplayed = agent.bubbleText.slice(0, agent.bubbleDisplayed.length + 1);
        }
      }
    });

    for (const pet of this.pets) {
      const dx = pet.targetX - pet.x;
      const dy = pet.targetY - pet.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        pet.x += (dx / dist) * 0.55;
        pet.y += (dy / dist) * 0.55;
        if (this.globalTick % 12 === 0) pet.animFrame = (pet.animFrame + 1) % 4;
      } else {
        pet.waitTimer--;
        if (pet.waitTimer <= 0) {
          pet.targetX = (4 + Math.floor(Math.random() * 22)) * 16;
          pet.targetY = (14 + Math.floor(Math.random() * 5)) * 16;
          pet.waitTimer = 140 + Math.floor(Math.random() * 180);
        }
      }
    }

    if (this.layout && this.globalTick % 15 === 0) {
      for (const f of this.layout.furniture) {
        if (f.hasSteam) {
          this.steamParticles.push({
            x: f.x * 16 + 8 + (Math.random() * 4 - 2),
            y: f.y * 16 - 2,
            alpha: 0.75,
            vy: -0.35,
            size: 2
          });
        }
      }
    }

    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i];
      p.y += p.vy;
      p.alpha -= 0.015;
      if (p.alpha <= 0) this.steamParticles.splice(i, 1);
    }
  }

  private render(): void {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2));
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-Math.floor(this.cameraX), -Math.floor(this.cameraY));
    ctx.imageSmoothingEnabled = false;

    if (this.layout) {
      this.renderFloorsAndWalls(this.layout);
      this.renderCarpets(this.layout);
      this.renderRoomHeaders(this.layout);
      this.renderYSortedEntities(this.layout);
      this.renderParticles();
      this.renderSpeechBubbles();
    }

    ctx.restore();
  }

  private renderFloorsAndWalls(layout: OfficeLayout): void {
    const T = layout.tileSize;
    const wallImg = this.images.get('wall_0');

    for (const room of layout.rooms) {
      const floorImg = this.images.get(room.floorTile);

      for (let gx = room.x; gx < room.x + room.width; gx++) {
        for (let gy = room.y; gy < room.y + room.height; gy++) {
          const isBoundary =
            gx === room.x ||
            gx === room.x + room.width - 1 ||
            gy === room.y ||
            gy === room.y + room.height - 1;

          const isDoor = room.doorways.some((d) => d.x === gx && d.y === gy);

          if (floorImg) {
            this.ctx.drawImage(floorImg, gx * T, gy * T, T, T);
          } else {
            this.ctx.fillStyle = '#1e293b';
            this.ctx.fillRect(gx * T, gy * T, T, T);
          }

          if (isBoundary && !isDoor) {
            if (wallImg) {
              this.ctx.drawImage(wallImg, gx * T, gy * T, T, T);
            } else {
              this.ctx.fillStyle = '#334155';
              this.ctx.fillRect(gx * T, gy * T, T, T);
            }
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
            this.ctx.fillRect(gx * T, (gy + 1) * T, T, 3);
          } else if (isDoor) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            this.ctx.fillRect(gx * T, gy * T, T, T);
          }
        }
      }

      this.ctx.strokeStyle = room.accent;
      this.ctx.lineWidth = 0.75;
      this.ctx.strokeRect(room.x * T + 1, room.y * T + 1, room.width * T - 2, room.height * T - 2);
    }
  }

  private renderCarpets(layout: OfficeLayout): void {
    const T = layout.tileSize;
    for (const c of layout.carpets) {
      const img = this.images.get(c.type);
      if (img) {
        this.ctx.drawImage(img, c.x * T, c.y * T, c.w * T, c.h * T);
      }
    }
  }

  private renderRoomHeaders(layout: OfficeLayout): void {
    const T = layout.tileSize;
    this.ctx.font = 'bold 5px "JetBrains Mono", monospace';

    for (const room of layout.rooms) {
      const tx = (room.x + 1) * T + 4;
      const ty = (room.y + 1) * T + 7;
      this.ctx.fillStyle = 'rgba(9, 13, 22, 0.78)';
      this.ctx.fillRect(tx - 2, ty - 5, room.name.length * 3.2 + 6, 7);
      this.ctx.fillStyle = room.accent;
      this.ctx.fillText(room.name, tx, ty);
    }
  }

  private renderYSortedEntities(layout: OfficeLayout): void {
    const T = layout.tileSize;
    const drawQueue: { sortY: number; draw: () => void }[] = [];

    for (const item of layout.furniture) {
      if (item.type === 'PC_ON') {
        const frameIdx = ((Math.floor(this.globalTick / 18) + item.x) % 3) + 1;
        const pcImg = this.images.get(`PC_ON_${frameIdx}`);
        const px = item.x * T;
        const py = item.y * T;

        drawQueue.push({
          sortY: py + 28,
          draw: () => {
            if (pcImg) this.ctx.drawImage(pcImg, px, py, 16, 32);
            this.ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
            this.ctx.beginPath();
            this.ctx.arc(px + 8, py + 18, 12, 0, Math.PI * 2);
            this.ctx.fill();
          }
        });
        continue;
      }

      const meta = FURNITURE_ASSET_MAP[item.type];
      if (!meta) continue;

      const img = this.images.get(item.type);
      const px = item.x * T;
      const py = item.y * T + (meta.yOffset || 0);

      drawQueue.push({
        sortY: py + meta.h,
        draw: () => {
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
          this.ctx.beginPath();
          this.ctx.ellipse(px + meta.w / 2, py + meta.h - 2, meta.w * 0.42, 3, 0, 0, Math.PI * 2);
          this.ctx.fill();

          if (img) {
            this.ctx.drawImage(img, px, py, meta.w, meta.h);
          }
        }
      });
    }

    for (const pet of this.pets) {
      drawQueue.push({
        sortY: pet.y + 16,
        draw: () => this.drawPet(pet)
      });
    }

    this.agents.forEach((agent) => {
      drawQueue.push({
        sortY: agent.y + 30,
        draw: () => this.drawAgent(agent)
      });
    });

    drawQueue.sort((a, b) => a.sortY - b.sortY);

    for (const entry of drawQueue) {
      entry.draw();
    }
  }

  private drawPet(pet: PetEntity): void {
    const img = this.images.get(pet.spriteKey);
    const { ctx } = this;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(pet.x + 8, pet.y + 14, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (img) {
      const sx = (pet.animFrame % 4) * 16;
      ctx.drawImage(img, sx, 0, 16, 16, Math.round(pet.x), Math.round(pet.y), 16, 16);
    }

    ctx.font = 'bold 4px "JetBrains Mono", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`[${pet.name}]`, Math.round(pet.x) - 2, Math.round(pet.y) - 2);
  }

  private drawAgent(agent: AgentEntity): void {
    const { ctx } = this;
    const ax = Math.round(agent.x);
    const ay = Math.round(agent.y);
    const isSelected = this.selectedAgentId === agent.id;

    ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.55)' : 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(ax + 8, ay + 29, isSelected ? 9 : 7, isSelected ? 4 : 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = this.images.get(agent.spriteKey);
    const bobOffset =
      agent.state === 'CODING'
        ? this.globalTick % 10 < 5
          ? -1
          : 0
        : Math.sin(this.globalTick * 0.1) > 0.5
        ? -1
        : 0;

    if (img) {
      let row = 0;
      if (agent.direction === 'UP') row = 1;
      else if (agent.direction === 'LEFT' || agent.direction === 'RIGHT') row = 2;

      const col = agent.animFrame % 4;

      if (agent.direction === 'LEFT') {
        ctx.save();
        ctx.translate(ax + 16, ay + bobOffset);
        ctx.scale(-1, 1);
        ctx.drawImage(img, col * 16, row * 32, 16, 32, 0, 0, 16, 32);
        ctx.restore();
      } else {
        ctx.drawImage(img, col * 16, row * 32, 16, 32, ax, ay + bobOffset, 16, 32);
      }
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(ax + 2, ay + 4, 12, 24);
    }

    let harnessColor = '#38bdf8';
    const h = (agent.harness || '').toUpperCase();
    if (h.includes('AGY') || h.includes('ANTIGRAVITY')) harnessColor = '#38bdf8';
    else if (h.includes('CLAUDE')) harnessColor = '#fb923c';
    else if (h.includes('CODEX') || h.includes('OPENCODE')) harnessColor = '#34d399';
    else if (h.includes('KIRO')) harnessColor = '#a855f7';
    else if (h.includes('KILO')) harnessColor = '#ec4899';
    else if (h.includes('AIDER')) harnessColor = '#eab308';
    else if (h.includes('CURSOR')) harnessColor = '#6366f1';
    else if (h.includes('ROO') || h.includes('CLINE')) harnessColor = '#14b8a6';
    else harnessColor = '#94a3b8';

    ctx.font = 'bold 4.2px "JetBrains Mono", monospace';
    const labelWidth = agent.name.length * 2.7 + 6;
    const lx = ax + 8 - labelWidth / 2;
    const ly = ay + 33;

    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.fillRect(lx, ly, labelWidth, 6);
    ctx.strokeStyle = harnessColor;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(lx, ly, labelWidth, 6);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(agent.name, lx + 3, ly + 4.5);

    this.drawPixelStatusBadge(agent, ax + 8, ay - 4);
  }

  private drawPixelStatusBadge(agent: AgentEntity, cx: number, cy: number): void {
    if (agent.statusIndicator === 'NONE') return;
    const { ctx } = this;
    const floatY = cy + Math.sin(this.globalTick * 0.12) * 1.5;

    let symbol = '[...]';
    let bg = '#1e293b';
    let border = '#38bdf8';

    if (agent.statusIndicator === 'IDEA') {
      symbol = '[!]';
      bg = '#422006';
      border = '#facc15';
    } else if (agent.statusIndicator === 'QUERY') {
      symbol = '[?]';
      bg = '#1e1b4b';
      border = '#a855f7';
    } else if (agent.statusIndicator === 'WARN') {
      symbol = '[!!]';
      bg = '#450a0a';
      border = '#ef4444';
    } else if (agent.statusIndicator === 'SLEEP') {
      symbol = '[ZZZ]';
      bg = '#0f172a';
      border = '#94a3b8';
    } else if (agent.statusIndicator === 'SYNC') {
      symbol = '[<>]';
      bg = '#082f49';
      border = '#38bdf8';
    }

    ctx.font = 'bold 4.5px "JetBrains Mono", monospace';
    const w = symbol.length * 3 + 4;
    const bx = cx - w / 2;
    const by = floatY - 6;

    ctx.fillStyle = bg;
    ctx.fillRect(bx, by, w, 6.5);
    ctx.strokeStyle = border;
    ctx.lineWidth = 0.6;
    ctx.strokeRect(bx, by, w, 6.5);
    ctx.fillStyle = border;
    ctx.fillText(symbol, bx + 2, by + 4.8);
  }

  private renderParticles(): void {
    const { ctx } = this;
    for (const p of this.steamParticles) {
      ctx.fillStyle = `rgba(226, 232, 240, ${p.alpha})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }

  private renderSpeechBubbles(): void {
    const { ctx } = this;
    this.agents.forEach((agent) => {
      if (agent.bubbleTimer <= 0 || !agent.bubbleDisplayed) return;

      const text = agent.bubbleDisplayed;
      ctx.font = '5px "JetBrains Mono", monospace';

      const maxChars = 28;
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length > maxChars) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = (currentLine + ' ' + word).trim();
        }
      }
      if (currentLine) lines.push(currentLine);

      const bw = Math.max(68, Math.min(110, Math.max(...lines.map((l) => l.length)) * 3.2 + 12));
      const bh = lines.length * 6.5 + 12;

      let bx = Math.round(agent.x + 8 - bw / 2);
      let by = Math.round(agent.y - bh - 10);

      bx = Math.max(8, Math.min(32 * 16 - bw - 8, bx));
      by = Math.max(6, by);

      // Bubble shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(bx + 2, by + 2, bw, bh);

      // Bubble background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx, by, bw, bh);

      const borderColor = agent.state === 'PANIC' ? '#ef4444' : '#38bdf8';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bx, by, bw, bh);

      // Header Tag badge
      ctx.fillStyle = borderColor;
      ctx.fillRect(bx, by, bw, 6);
      ctx.font = 'bold 4px "JetBrains Mono", monospace';
      ctx.fillStyle = '#090d16';
      ctx.fillText(`[${agent.bubbleTag}]`, bx + 3, by + 4.5);

      // Body text
      ctx.font = '4.6px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f1f5f9';
      lines.forEach((line, idx) => {
        ctx.fillText(line, bx + 4, by + 11.5 + idx * 6.2);
      });

      // Tail pointer
      const tailX = Math.max(bx + 6, Math.min(bx + bw - 6, Math.round(agent.x + 8)));
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(tailX - 3, by + bh);
      ctx.lineTo(tailX + 3, by + bh);
      ctx.lineTo(tailX, by + bh + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.stroke();
    });
  }
}

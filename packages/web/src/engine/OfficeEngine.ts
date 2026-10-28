// Keos Room - High-Performance Retro Canvas 2D Engine
// Complete Pixel-Art Virtual Office with Multi-Agent Telemetry, Pathfinding & Zero-Emoji Compliance

import { KeosAnimation, KeosEvent, KeosRole, KeosSession, KeosWing } from '../types';
import { DialogueEngine } from '../services/DialogueEngine';
import { SoundEffects } from '../services/SoundEffects';

export interface OfficeAgent {
  id: string;
  name: string;
  title: string;
  role: KeosRole;
  wing: KeosWing;
  harness: string;
  palette: number; // 0 to 5 for char_0 to char_5
  col: number;
  row: number;
  x: number;
  y: number;
  targetCol: number;
  targetRow: number;
  homeCol: number;
  homeRow: number;
  state: KeosAnimation;
  direction: 'down' | 'up' | 'left' | 'right';
  path: Array<{ col: number; row: number }>;
  frame: number;
  frameTimer: number;
  stateTimer: number;
  typingCounter: number;
  bubble: {
    badge: string;
    quote: string;
    subtext: string;
    alpha: number;
    timer: number;
  } | null;
  stats: {
    linesWritten: number;
    caffeineLevel: number;
    panicLevel: number;
    tasksDone: number;
  };
}

export interface OfficePet {
  id: string;
  name: string;
  type: 'cat' | 'dog';
  col: number;
  row: number;
  x: number;
  y: number;
  targetCol: number;
  targetRow: number;
  state: 'idle' | 'walk' | 'sleep';
  direction: 'down' | 'up' | 'left' | 'right';
  path: Array<{ col: number; row: number }>;
  frame: number;
  frameTimer: number;
  idleTimer: number;
  bubble: {
    badge: string;
    quote: string;
    alpha: number;
    timer: number;
  } | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class OfficeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isRunning = false;
  private rafId = 0;
  private lastTime = 0;

  // World Grid Configuration
  public readonly COLS = 32;
  public readonly ROWS = 22;
  public readonly TILE_SIZE = 16;
  public readonly WORLD_W: number;
  public readonly WORLD_H: number;

  // Camera & Viewport
  public zoom = 1.95;
  public panX = 0;
  public panY = 24;
  private targetPanX = 0;
  private targetPanY = 24;
  private targetZoom = 1.95;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Selected Entity
  public selectedAgent: OfficeAgent | null = null;
  public onAgentSelected?: (agent: OfficeAgent | null) => void;

  // Assets Cache
  private images: Map<string, HTMLImageElement> = new Map();
  private assetsLoaded = false;

  // Grid Maps
  private floorMap: number[][] = [];
  private wallMap: boolean[][] = [];
  private blockedMap: boolean[][] = [];

  // Entities
  public agents: Map<string, OfficeAgent> = new Map();
  public pets: OfficePet[] = [];
  private particles: Particle[] = [];

  // Lighting & LEDs
  private ledTimer = 0;
  private ledStates = [true, false, true, false, true, true];
  private pcScreenFrame = 0;
  private pcScreenTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.WORLD_W = this.COLS * this.TILE_SIZE;
    this.WORLD_H = this.ROWS * this.TILE_SIZE;

    this.initLayoutGrid();
    this.setupEventListeners();
    this.preloadAllAssets();
  }

  // ── Asset Preloader ──────────────────────────────────────────────────────────

  private preloadAllAssets() {
    const assetList: Array<[string, string]> = [
      // Floors
      ['floor_tile', '/assets/floors/floor_1.png'],
      ['floor_wood', '/assets/floors/floor_3.png'],
      ['floor_carpet', '/assets/floors/floor_5.png'],
      ['floor_cafe', '/assets/floors/floor_8.png'],
      ['wall_tile', '/assets/walls/wall_0.png'],
      ['carpet_rug', '/assets/carpets/carpet_1.png'],

      // Furniture
      ['desk_front', '/assets/furniture/DESK/DESK_FRONT.png'],
      ['desk_side', '/assets/furniture/DESK/DESK_SIDE.png'],
      ['pc_off', '/assets/furniture/PC/PC_FRONT_OFF.png'],
      ['pc_on_1', '/assets/furniture/PC/PC_FRONT_ON_1.png'],
      ['pc_on_2', '/assets/furniture/PC/PC_FRONT_ON_2.png'],
      ['pc_on_3', '/assets/furniture/PC/PC_FRONT_ON_3.png'],
      ['chair_cushion', '/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png'],
      ['chair_wood', '/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png'],
      ['chair_wood_side', '/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png'],
      ['chair_wood_back', '/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png'],
      ['table_front', '/assets/furniture/TABLE_FRONT/TABLE_FRONT.png'],
      ['coffee_table', '/assets/furniture/COFFEE_TABLE/COFFEE_TABLE.png'],
      ['sofa_front', '/assets/furniture/SOFA/SOFA_FRONT.png'],
      ['sofa_side', '/assets/furniture/SOFA/SOFA_SIDE.png'],
      ['sofa_back', '/assets/furniture/SOFA/SOFA_BACK.png'],
      ['coffee_machine', '/assets/furniture/COFFEE/COFFEE.png'],
      ['whiteboard', '/assets/furniture/WHITEBOARD/WHITEBOARD.png'],
      ['bookshelf', '/assets/furniture/BOOKSHELF/BOOKSHELF.png'],
      ['double_bookshelf', '/assets/furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png'],
      ['plant', '/assets/furniture/PLANT/PLANT.png'],
      ['plant_2', '/assets/furniture/PLANT_2/PLANT_2.png'],
      ['large_plant', '/assets/furniture/LARGE_PLANT/LARGE_PLANT.png'],
      ['hanging_plant', '/assets/furniture/HANGING_PLANT/HANGING_PLANT.png'],
      ['cactus', '/assets/furniture/CACTUS/CACTUS.png'],
      ['pot', '/assets/furniture/POT/POT.png'],
      ['clock', '/assets/furniture/CLOCK/CLOCK.png'],
      ['bin', '/assets/furniture/BIN/BIN.png'],
      ['painting_large', '/assets/furniture/LARGE_PAINTING/LARGE_PAINTING.png'],
      ['painting_small', '/assets/furniture/SMALL_PAINTING/SMALL_PAINTING.png'],
      ['painting_small_2', '/assets/furniture/SMALL_PAINTING_2/SMALL_PAINTING_2.png'],

      // Characters
      ['char_0', '/assets/characters/char_0.png'],
      ['char_1', '/assets/characters/char_1.png'],
      ['char_2', '/assets/characters/char_2.png'],
      ['char_3', '/assets/characters/char_3.png'],
      ['char_4', '/assets/characters/char_4.png'],
      ['char_5', '/assets/characters/char_5.png'],

      // Pets
      ['pet_gitcat', '/assets/pets/gitcat/pet.png'],
      ['pet_claudio', '/assets/pets/claudio/pet.png']
    ];

    let loaded = 0;
    const total = assetList.length;

    assetList.forEach(([key, url]) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        this.images.set(key, img);
        loaded++;
        if (loaded >= total) {
          this.assetsLoaded = true;
          this.initStaffAndPets();
          this.centerCamera();
        }
      };
      img.onerror = () => {
        console.warn(`[OfficeEngine] Failed to load asset: ${url}`);
        loaded++;
        if (loaded >= total) {
          this.assetsLoaded = true;
          this.initStaffAndPets();
          this.centerCamera();
        }
      };
    });
  }

  // ── Office Architecture & Tile Maps ──────────────────────────────────────────

  private initLayoutGrid() {
    this.floorMap = [];
    this.wallMap = [];
    this.blockedMap = [];

    // Floor Type IDs:
    // 0: Perimeter / border
    // 1: Wing Alpha Wood Parquet (floor_wood)
    // 2: War Room Stone Grid (floor_tile)
    // 3: Wing Beta Executive Carpet (floor_carpet)
    // 4: Central Hallway Marble Checker (floor_cafe)
    // 5: Cafe & Kitchenette Wood (floor_wood)
    // 6: Lounge Plush Carpet (floor_carpet)

    for (let r = 0; r < this.ROWS; r++) {
      const floorRow: number[] = [];
      const wallRow: boolean[] = [];
      const blockedRow: boolean[] = [];

      for (let c = 0; c < this.COLS; c++) {
        // Walls: Top 2 rows & outer border
        const isWall = r <= 1 || c === 0 || c === this.COLS - 1 || r === this.ROWS - 1;
        wallRow.push(isWall);

        let floorType = 0;
        if (!isWall) {
          if (r >= 2 && r <= 10) {
            if (c >= 1 && c <= 12) floorType = 1; // Wing Alpha
            else if (c >= 13 && c <= 18) floorType = 2; // War Room
            else floorType = 3; // Wing Beta
          } else if (r >= 11 && r <= 12) {
            floorType = 4; // Main Promenade
          } else if (r >= 13 && r <= 20) {
            if (c >= 1 && c <= 14) floorType = 5; // Pantry / Cafe
            else floorType = 6; // Chill Lounge
          }
        }
        floorRow.push(floorType);

        // Blocked tiles (walls are always blocked)
        blockedRow.push(isWall);
      }
      this.floorMap.push(floorRow);
      this.wallMap.push(wallRow);
      this.blockedMap.push(blockedRow);
    }

    // Mark furniture footprints as blocked for pathfinding
    const blockedTiles: Array<[number, number]> = [
      // Wing Alpha desks & props
      [2, 4], [3, 4], [6, 4], [7, 4],
      [2, 8], [3, 8], [6, 8], [7, 8],
      [1, 3], [1, 8], [10, 3], [10, 7],

      // War Room table & props
      [15, 2], [16, 2], [14, 5], [15, 5], [16, 5],

      // Wing Beta desks & props
      [21, 4], [22, 4], [25, 4], [26, 4],
      [21, 8], [22, 8], [25, 8], [26, 8],
      [19, 3], [28, 3], [28, 7],

      // Pantry Counter & Coffee Machine
      [3, 14], [4, 14], [3, 15], [4, 15], [1, 15],

      // Lounge Sofas & Coffee Table
      [20, 15], [21, 15], [22, 15],
      [19, 16], [20, 17], [21, 17], [24, 16], [26, 15]
    ];

    blockedTiles.forEach(([c, r]) => {
      if (r < this.ROWS && c < this.COLS) {
        this.blockedMap[r][c] = true;
      }
    });
  }

  // ── Initialize Staff & Pets ──────────────────────────────────────────────────

  private initStaffAndPets() {
    // 1. Antigravity Wing Alpha Staff
    this.addAgent({
      id: 'alpha_architect',
      name: 'Kaelen',
      title: 'Principal Systems Architect',
      role: 'PLANNER',
      wing: 'WING_ALPHA',
      harness: 'ANTIGRAVITY // GEMINI 3.8 FLASH',
      palette: 0,
      col: 2,
      row: 5,
      homeCol: 2,
      homeRow: 5,
      direction: 'up',
      state: 'TYPE'
    });

    this.addAgent({
      id: 'alpha_dev',
      name: 'Nico',
      title: 'Senior Full-Stack Engineer',
      role: 'DEV',
      wing: 'WING_ALPHA',
      harness: 'ANTIGRAVITY // GEMINI 3.8 FLASH',
      palette: 1,
      col: 6,
      row: 5,
      homeCol: 6,
      homeRow: 5,
      direction: 'up',
      state: 'TYPE'
    });

    this.addAgent({
      id: 'alpha_qa',
      name: 'Sora',
      title: 'QA & Security Guardian',
      role: 'QA',
      wing: 'WING_ALPHA',
      harness: 'ANTIGRAVITY // GEMINI 3.8 FLASH',
      palette: 2,
      col: 2,
      row: 9,
      homeCol: 2,
      homeRow: 9,
      direction: 'up',
      state: 'TYPE'
    });

    this.addAgent({
      id: 'alpha_pm',
      name: 'Arka',
      title: 'Technical Project Director',
      role: 'MANAGER',
      wing: 'WING_ALPHA',
      harness: 'ANTIGRAVITY // GEMINI 3.8 FLASH',
      palette: 3,
      col: 6,
      row: 9,
      homeCol: 6,
      homeRow: 9,
      direction: 'up',
      state: 'IDLE'
    });

    // 2. Claude Wing Beta Staff
    this.addAgent({
      id: 'beta_architect',
      name: 'Claude Model',
      title: 'Autonomous Reasoning Lead',
      role: 'PLANNER',
      wing: 'WING_BETA',
      harness: 'CLAUDE CODE // 3.7 SONNET',
      palette: 4,
      col: 21,
      row: 5,
      homeCol: 21,
      homeRow: 5,
      direction: 'up',
      state: 'TYPE'
    });

    this.addAgent({
      id: 'beta_subagent',
      name: 'Ember',
      title: 'Contractor Subagent',
      role: 'SUBAGENT_WORKER',
      wing: 'WING_BETA',
      harness: 'CLAUDE CODE // 3.7 SONNET',
      palette: 5,
      col: 25,
      row: 5,
      homeCol: 25,
      homeRow: 5,
      direction: 'up',
      state: 'TYPE'
    });

    // 3. Office Pets
    this.pets = [
      {
        id: 'gitcat',
        name: 'Gitcat',
        type: 'cat',
        col: 21,
        row: 16,
        x: 21 * this.TILE_SIZE + 8,
        y: 16 * this.TILE_SIZE + 8,
        targetCol: 21,
        targetRow: 16,
        state: 'sleep',
        direction: 'down',
        path: [],
        frame: 0,
        frameTimer: 0,
        idleTimer: 6.0,
        bubble: null
      },
      {
        id: 'claudio',
        name: 'Claudio',
        type: 'dog',
        col: 15,
        row: 11,
        x: 15 * this.TILE_SIZE + 8,
        y: 11 * this.TILE_SIZE + 8,
        targetCol: 15,
        targetRow: 11,
        state: 'idle',
        direction: 'right',
        path: [],
        frame: 0,
        frameTimer: 0,
        idleTimer: 3.5,
        bubble: null
      }
    ];
  }

  private addAgent(config: Partial<OfficeAgent> & { id: string; name: string; title: string; role: KeosRole; wing: KeosWing; harness: string; palette: number; col: number; row: number; homeCol: number; homeRow: number }) {
    const x = config.col * this.TILE_SIZE + 8;
    const y = config.row * this.TILE_SIZE + 8;

    const agent: OfficeAgent = {
      id: config.id,
      name: config.name,
      title: config.title,
      role: config.role,
      wing: config.wing,
      harness: config.harness,
      palette: config.palette,
      col: config.col,
      row: config.row,
      x,
      y,
      targetCol: config.col,
      targetRow: config.row,
      homeCol: config.homeCol,
      homeRow: config.homeRow,
      state: config.state || 'IDLE',
      direction: config.direction || 'down',
      path: [],
      frame: 0,
      frameTimer: 0,
      stateTimer: 0,
      typingCounter: 0,
      bubble: null,
      stats: {
        linesWritten: 350 + Math.floor(Math.random() * 400),
        caffeineLevel: 80 + Math.floor(Math.random() * 20),
        panicLevel: 5,
        tasksDone: 4 + Math.floor(Math.random() * 6)
      }
    };

    this.agents.set(agent.id, agent);
  }

  // ── Public Telemetry Event Dispatcher ────────────────────────────────────────

  public handleTelemetryEvent(event: KeosEvent) {
    const wing = event.session.wingId || 'WING_ALPHA';
    const role = event.role;

    // Find or spawn agent matching role and wing
    let agent: OfficeAgent | undefined;
    for (const a of this.agents.values()) {
      if (a.wing === wing && a.role === role) {
        agent = a;
        break;
      }
    }

    if (!agent) {
      // Find fallback agent in the wing
      for (const a of this.agents.values()) {
        if (a.wing === wing) {
          agent = a;
          break;
        }
      }
    }

    if (!agent) return;

    // Map location to coordinate
    const target = this.getLocationCoordinates(wing, event.targetLocation, role);
    this.moveAgentTo(agent, target.col, target.row);

    agent.state = event.animation;
    agent.stateTimer = 5.0;

    // Dialogue bubble
    const dialogue = DialogueEngine.getSpeechText(event);
    this.triggerBubble(agent, dialogue.badge, dialogue.quote, dialogue.subtext);

    // Audio SFX
    if (event.animation === 'TYPE') {
      SoundEffects.playKeyboardClick();
      this.spawnSparks(agent.x, agent.y - 12, 6);
      agent.stats.linesWritten += 15;
    } else if (event.animation === 'RAGE' || event.status === 'ERROR') {
      SoundEffects.playErrorBuzzer();
      agent.stats.panicLevel = Math.min(100, agent.stats.panicLevel + 35);
    } else if (event.animation === 'COFFEE') {
      SoundEffects.playCoffeeBrew();
      this.spawnSteam(80, 240, 10);
      agent.stats.caffeineLevel = 100;
    } else if (event.category === 'SUBAGENT') {
      SoundEffects.playElevatorChime();
    } else if (event.category === 'TEST' && event.status === 'SUCCESS') {
      SoundEffects.playSuccessFanfare();
      agent.stats.panicLevel = Math.max(0, agent.stats.panicLevel - 20);
      agent.stats.tasksDone++;
    }
  }

  private getLocationCoordinates(wing: KeosWing, loc: string, role: KeosRole): { col: number; row: number } {
    if (loc === 'WAR_ROOM' || role === 'PLANNER') {
      return { col: 14 + Math.floor(Math.random() * 3), row: 5 };
    }
    if (loc === 'PANTRY') {
      return { col: 5 + Math.floor(Math.random() * 4), row: 15 };
    }
    if (loc === 'DEV_DESK' || role === 'DEV') {
      return wing === 'WING_ALPHA' ? { col: 6, row: 5 } : { col: 25, row: 5 };
    }
    if (loc === 'QA_LAB' || role === 'QA') {
      return { col: 2, row: 9 };
    }
    if (loc === 'OFFICE_PM' || role === 'MANAGER') {
      return { col: 6, row: 9 };
    }
    return wing === 'WING_ALPHA' ? { col: 2, row: 5 } : { col: 21, row: 5 };
  }

  public moveAgentTo(agent: OfficeAgent, targetCol: number, targetRow: number) {
    agent.targetCol = targetCol;
    agent.targetRow = targetRow;

    // Simple path planner
    const path: Array<{ col: number; row: number }> = [];
    let curCol = agent.col;
    let curRow = agent.row;

    // If moving between rooms, route through central promenade (Row 11)
    if (Math.abs(curRow - targetRow) > 3) {
      // Step to promenade
      const stepRow = curRow < 11 ? 1 : -1;
      while (curRow !== 11) {
        curRow += stepRow;
        path.push({ col: curCol, row: curRow });
      }
      // Step horizontally along promenade
      const stepCol = curCol < targetCol ? 1 : -1;
      while (curCol !== targetCol) {
        curCol += stepCol;
        path.push({ col: curCol, row: 11 });
      }
      // Step vertically to target row
      const finalStepRow = curRow < targetRow ? 1 : -1;
      while (curRow !== targetRow) {
        curRow += finalStepRow;
        path.push({ col: targetCol, row: curRow });
      }
    } else {
      // Direct stepping
      while (curCol !== targetCol || curRow !== targetRow) {
        if (curCol !== targetCol) {
          curCol += curCol < targetCol ? 1 : -1;
        } else if (curRow !== targetRow) {
          curRow += curRow < targetRow ? 1 : -1;
        }
        path.push({ col: curCol, row: curRow });
      }
    }

    agent.path = path;
  }

  public triggerBubble(agent: OfficeAgent, badge: string, quote: string, subtext: string) {
    agent.bubble = {
      badge,
      quote,
      subtext,
      alpha: 1.0,
      timer: 4.5
    };
  }

  // ── Particle System ──────────────────────────────────────────────────────────

  private spawnSparks(x: number, y: number, count: number) {
    const colors = ['#58a6ff', '#79c0ff', '#388bfd', '#ffffff'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 35,
        vy: -15 - Math.random() * 30,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1 + Math.random() * 1.5
      });
    }
  }

  private spawnSteam(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 8,
        vy: -12 - Math.random() * 18,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1.1,
        color: 'rgba(230, 240, 255, 0.6)',
        size: 1.5 + Math.random() * 2
      });
    }
  }

  // ── Main Game Loop ───────────────────────────────────────────────────────────

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // 1. Smooth Camera Lerp
    this.panX += (this.targetPanX - this.panX) * 0.1;
    this.panY += (this.targetPanY - this.panY) * 0.1;
    this.zoom += (this.targetZoom - this.zoom) * 0.1;

    // 2. Timers for LEDs & PC Screens
    this.ledTimer += dt;
    if (this.ledTimer > 0.25) {
      this.ledTimer = 0;
      this.ledStates = this.ledStates.map(() => Math.random() > 0.4);
    }

    this.pcScreenTimer += dt;
    if (this.pcScreenTimer > 0.18) {
      this.pcScreenTimer = 0;
      this.pcScreenFrame = (this.pcScreenFrame + 1) % 3;
    }

    // 3. Update Agents
    this.agents.forEach((agent) => {
      this.updateAgent(agent, dt);
    });

    // 4. Update Pets
    this.pets.forEach((pet) => {
      this.updatePet(pet, dt);
    });

    // 5. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateAgent(agent: OfficeAgent, dt: number) {
    // State timer countdown
    if (agent.stateTimer > 0) {
      agent.stateTimer -= dt;
      if (agent.stateTimer <= 0) {
        // Return to home desk or idle wander
        if (agent.col !== agent.homeCol || agent.row !== agent.homeRow) {
          this.moveAgentTo(agent, agent.homeCol, agent.homeRow);
        }
        agent.state = 'TYPE';
      }
    }

    // Speech bubble countdown
    if (agent.bubble) {
      agent.bubble.timer -= dt;
      if (agent.bubble.timer < 0.6) {
        agent.bubble.alpha = Math.max(0, agent.bubble.timer / 0.6);
      }
      if (agent.bubble.timer <= 0) {
        agent.bubble = null;
      }
    }

    // Walking path execution
    if (agent.path.length > 0) {
      const next = agent.path[0];
      const targetX = next.col * this.TILE_SIZE + 8;
      const targetY = next.row * this.TILE_SIZE + 8;

      const dx = targetX - agent.x;
      const dy = targetY - agent.y;
      const dist = Math.hypot(dx, dy);
      const speed = 48 * dt; // 48 px/s

      // Determine face direction
      if (Math.abs(dx) > Math.abs(dy)) {
        agent.direction = dx > 0 ? 'right' : 'left';
      } else if (Math.abs(dy) > 0.1) {
        agent.direction = dy > 0 ? 'down' : 'up';
      }

      if (dist <= speed) {
        agent.x = targetX;
        agent.y = targetY;
        agent.col = next.col;
        agent.row = next.row;
        agent.path.shift();
      } else {
        agent.x += (dx / dist) * speed;
        agent.y += (dy / dist) * speed;
      }

      // Animate walk frames
      agent.frameTimer += dt;
      if (agent.frameTimer >= 0.14) {
        agent.frameTimer = 0;
        agent.frame = (agent.frame + 1) % 4;
      }
    } else {
      // Stationary: type or idle frame
      agent.frameTimer += dt;
      if (agent.state === 'TYPE') {
        if (agent.frameTimer >= 0.2) {
          agent.frameTimer = 0;
          agent.frame = (agent.frame + 1) % 2;
        }
      } else {
        agent.frame = 0;
      }
    }
  }

  private updatePet(pet: OfficePet, dt: number) {
    pet.idleTimer -= dt;
    if (pet.idleTimer <= 0) {
      pet.idleTimer = 4.0 + Math.random() * 6.0;
      // Change pet behavior
      if (pet.state === 'sleep') {
        pet.state = 'idle';
      } else if (pet.state === 'idle') {
        // Walk along hallway
        const newCol = 10 + Math.floor(Math.random() * 12);
        pet.targetCol = newCol;
        pet.state = 'walk';
      } else {
        pet.state = 'sleep';
      }
    }

    if (pet.state === 'walk') {
      const targetX = pet.targetCol * this.TILE_SIZE + 8;
      const dx = targetX - pet.x;
      if (Math.abs(dx) > 1) {
        pet.direction = dx > 0 ? 'right' : 'left';
        pet.x += (dx > 0 ? 1 : -1) * 24 * dt;
        pet.frameTimer += dt;
        if (pet.frameTimer >= 0.15) {
          pet.frameTimer = 0;
          pet.frame = (pet.frame + 1) % 3;
        }
      } else {
        pet.state = 'idle';
      }
    }
  }

  // ── Render Pipeline ──────────────────────────────────────────────────────────

  public render() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Reset transform & clear screen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#080c14'; // Dark obsidian aesthetic
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!this.assetsLoaded) {
      // Crisp retro loading screen
      ctx.fillStyle = '#58a6ff';
      ctx.font = '14px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[INITIALIZING KEOS ROOM ARCHITECTURE & ASSETS...]', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Apply Camera Transform
    ctx.save();
    ctx.translate(canvas.width / 2 + this.panX, canvas.height / 2 + this.panY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.WORLD_W / 2, -this.WORLD_H / 2);

    // 1. Draw Floor Tiles
    this.renderFloor(ctx);

    // 2. Draw Carpets & Rugs
    this.renderCarpets(ctx);

    // 3. Draw Perimeter Walls & Windows
    this.renderWalls(ctx);

    // 4. Draw Z-Sorted Furniture, Characters & Pets
    this.renderSceneEntities(ctx);

    // 5. Draw Particles
    this.renderParticles(ctx);

    // 6. Draw Ambient Lighting & Screen Glows
    this.renderLighting(ctx);

    // 7. Draw Speech Bubbles (Clamped, High-Contrast Retro RPG Bubbles)
    this.renderSpeechBubbles(ctx);

    ctx.restore();
  }

  private renderFloor(ctx: CanvasRenderingContext2D) {
    const floorTile = this.images.get('floor_tile');
    const floorWood = this.images.get('floor_wood');
    const floorCarpet = this.images.get('floor_carpet');
    const floorCafe = this.images.get('floor_cafe');

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const type = this.floorMap[r][c];
        if (type === 0) continue;

        const x = c * this.TILE_SIZE;
        const y = r * this.TILE_SIZE;

        let img: HTMLImageElement | undefined;
        if (type === 1 || type === 5) img = floorWood;
        else if (type === 2) img = floorTile;
        else if (type === 3 || type === 6) img = floorCarpet;
        else if (type === 4) img = floorCafe;

        if (img) {
          ctx.drawImage(img, x, y, this.TILE_SIZE, this.TILE_SIZE);
        } else {
          ctx.fillStyle = '#1e2430';
          ctx.fillRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
        }
      }
    }
  }

  private renderCarpets(ctx: CanvasRenderingContext2D) {
    const rug = this.images.get('carpet_rug');
    if (!rug) return;

    // Cozy area rug under the Break Lounge
    ctx.drawImage(rug, 19 * this.TILE_SIZE, 15 * this.TILE_SIZE, 6 * this.TILE_SIZE, 4 * this.TILE_SIZE);
  }

  private renderWalls(ctx: CanvasRenderingContext2D) {
    const wallImg = this.images.get('wall_tile');

    // Draw top perimeter wall
    for (let c = 0; c < this.COLS; c++) {
      if (wallImg) {
        ctx.drawImage(wallImg, c * this.TILE_SIZE, 0, this.TILE_SIZE, this.TILE_SIZE * 2);
      } else {
        ctx.fillStyle = '#21262d';
        ctx.fillRect(c * this.TILE_SIZE, 0, this.TILE_SIZE, this.TILE_SIZE * 2);
      }
    }

    // Glass Partition Dividers between Rooms
    ctx.fillStyle = 'rgba(88, 166, 255, 0.15)';
    ctx.fillRect(13 * this.TILE_SIZE - 2, 2 * this.TILE_SIZE, 4, 9 * this.TILE_SIZE);
    ctx.fillRect(18 * this.TILE_SIZE + 14, 2 * this.TILE_SIZE, 4, 9 * this.TILE_SIZE);

    // Baseboards
    ctx.fillStyle = '#30363d';
    ctx.fillRect(0, 2 * this.TILE_SIZE - 2, this.WORLD_W, 2);
  }

  private renderSceneEntities(ctx: CanvasRenderingContext2D) {
    // Entities to Z-sort: Furniture, Agents, Pets
    interface Drawable {
      zY: number;
      draw: () => void;
    }

    const drawables: Drawable[] = [];

    // ── Static & Interactive Furniture ──

    // Paintings & Clocks on Wall (Z = 1)
    const addWallDecor = (key: string, c: number, r: number) => {
      const img = this.images.get(key);
      if (!img) return;
      drawables.push({
        zY: 2 * this.TILE_SIZE,
        draw: () => ctx.drawImage(img, c * this.TILE_SIZE, r * this.TILE_SIZE)
      });
    };

    addWallDecor('painting_small', 4, 0.5);
    addWallDecor('clock', 8, 0.5);
    addWallDecor('double_bookshelf', 14, 0.5);
    addWallDecor('painting_large', 23, 0.5);
    addWallDecor('clock', 27, 0.5);

    // Desks, PCs, Chairs, Sofas, Coffee Machine
    const addProp = (key: string, c: number, r: number, w?: number, h?: number, zOffset = 0) => {
      const img = this.images.get(key);
      if (!img) return;
      const x = c * this.TILE_SIZE;
      const y = r * this.TILE_SIZE;
      const width = w ?? img.width;
      const height = h ?? img.height;
      drawables.push({
        zY: y + height + zOffset,
        draw: () => {
          // Subtle drop shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(x + width / 2, y + height - 2, width / 2.2, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(img, x, y, width, height);
        }
      });
    };

    // Wing Alpha Workstations
    addProp('desk_front', 2, 4);
    addProp('desk_front', 6, 4);
    addProp('desk_front', 2, 8);
    addProp('desk_front', 6, 8);

    // PC Screens with animation
    const pcKeys = ['pc_on_1', 'pc_on_2', 'pc_on_3'];
    const activePcKey = pcKeys[this.pcScreenFrame];
    addProp(activePcKey, 3, 3.4, undefined, undefined, 4);
    addProp(pcKeys[(this.pcScreenFrame + 1) % 3], 7, 3.4, undefined, undefined, 4);
    addProp(pcKeys[(this.pcScreenFrame + 2) % 3], 3, 7.4, undefined, undefined, 4);
    addProp(activePcKey, 7, 7.4, undefined, undefined, 4);

    // Chairs
    addProp('chair_cushion', 2, 5, undefined, undefined, -2);
    addProp('chair_cushion', 6, 5, undefined, undefined, -2);
    addProp('chair_cushion', 2, 9, undefined, undefined, -2);
    addProp('chair_cushion', 6, 9, undefined, undefined, -2);

    // Wing Alpha Props
    addProp('bookshelf', 10, 3);
    addProp('large_plant', 10, 7);
    addProp('bin', 1, 7);

    // War Room Table & Whiteboard
    addProp('whiteboard', 15, 2);
    addProp('table_front', 15, 5);
    addProp('chair_wood_side', 14, 5);
    addProp('chair_wood_side', 17, 5);
    addProp('pot', 14, 2);

    // Wing Beta Workstations
    addProp('desk_front', 21, 4);
    addProp('desk_front', 25, 4);
    addProp('desk_front', 21, 8);
    addProp('desk_front', 25, 8);

    addProp(activePcKey, 22, 3.4, undefined, undefined, 4);
    addProp(pcKeys[(this.pcScreenFrame + 1) % 3], 26, 3.4, undefined, undefined, 4);
    addProp(pcKeys[(this.pcScreenFrame + 2) % 3], 22, 7.4, undefined, undefined, 4);
    addProp(activePcKey, 26, 7.4, undefined, undefined, 4);

    addProp('chair_wood', 21, 5, undefined, undefined, -2);
    addProp('chair_wood', 25, 5, undefined, undefined, -2);
    addProp('chair_wood', 21, 9, undefined, undefined, -2);
    addProp('chair_wood', 25, 9, undefined, undefined, -2);

    addProp('double_bookshelf', 19, 3);
    addProp('plant', 29, 3);
    addProp('bookshelf', 28, 7);

    // Pantry / Espresso Bar
    addProp('table_front', 3, 15);
    addProp('coffee_machine', 4, 14, undefined, undefined, 2);
    addProp('bin', 1, 15);
    addProp('hanging_plant', 11, 14);

    // Break Lounge
    addProp('sofa_front', 21, 15);
    addProp('sofa_side', 19, 16);
    addProp('sofa_side', 24, 16);
    addProp('coffee_table', 21, 17);
    addProp('plant_2', 26, 15);
    addProp('cactus', 17, 15);

    // ── Animated Agents ──
    this.agents.forEach((agent) => {
      const charImg = this.images.get(`char_${agent.palette}`);
      if (!charImg) return;

      const zY = agent.y + 16;
      drawables.push({
        zY,
        draw: () => {
          // Character shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(agent.x, agent.y + 12, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Selection Halo
          if (this.selectedAgent?.id === agent.id) {
            ctx.strokeStyle = '#58a6ff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(agent.x, agent.y + 12, 9, 5, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Frame calculation (16x32 frame)
          let rowIdx = 0; // down
          if (agent.direction === 'right' || agent.direction === 'left') rowIdx = 1;
          else if (agent.direction === 'up') rowIdx = 2;

          let colIdx = agent.frame;
          if (agent.state === 'TYPE' && agent.path.length === 0) {
            rowIdx = 1;
            colIdx = 4 + (agent.frame % 2); // typing frames
          }

          const sx = colIdx * 16;
          const sy = rowIdx * 32;

          ctx.save();
          if (agent.direction === 'left') {
            ctx.translate(agent.x, agent.y - 12);
            ctx.scale(-1, 1);
            ctx.drawImage(charImg, sx, sy, 16, 32, -8, 0, 16, 32);
          } else {
            ctx.drawImage(charImg, sx, sy, 16, 32, agent.x - 8, agent.y - 12, 16, 32);
          }
          ctx.restore();

          // Role Tag Pill
          const tagColor = agent.wing === 'WING_ALPHA' ? '#58a6ff' : '#f0883e';
          ctx.fillStyle = tagColor;
          ctx.font = '6px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`[${agent.role.slice(0, 4)}]`, agent.x, agent.y + 19);
        }
      });
    });

    // ── Animated Pets ──
    this.pets.forEach((pet) => {
      const petImg = this.images.get(`pet_${pet.id}`);
      if (!petImg) return;

      drawables.push({
        zY: pet.y + 10,
        draw: () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(pet.x, pet.y + 6, 5, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // 16x32 slice from 96x96
          let sx = 0;
          let sy = 0;
          if (pet.state === 'sleep' || pet.state === 'idle') {
            sx = 48; // idle frames
            sy = 0;
          } else {
            sx = (pet.frame % 3) * 16;
            sy = pet.direction === 'right' || pet.direction === 'left' ? 64 : 0;
          }

          ctx.save();
          if (pet.direction === 'left') {
            ctx.translate(pet.x, pet.y - 8);
            ctx.scale(-1, 1);
            ctx.drawImage(petImg, sx, sy, 16, 24, -8, 0, 16, 24);
          } else {
            ctx.drawImage(petImg, sx, sy, 16, 24, pet.x - 8, pet.y - 8, 16, 24);
          }
          ctx.restore();
        }
      });
    });

    // Sort by Z and render
    drawables.sort((a, b) => a.zY - b.zY);
    drawables.forEach((d) => d.draw());
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    this.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
  }

  private renderLighting(ctx: CanvasRenderingContext2D) {
    // 1. Server Rack phosphor LEDs (Wing Alpha Col 1, Row 3)
    const rackX = 1 * this.TILE_SIZE + 4;
    const rackY = 3 * this.TILE_SIZE + 8;

    this.ledStates.forEach((on, idx) => {
      ctx.fillStyle = on ? (idx % 2 === 0 ? '#3fb950' : '#58a6ff') : '#161b22';
      ctx.fillRect(rackX, rackY + idx * 4, 2, 2);
    });

    // 2. Soft Monitor Glow on Desks
    const glowGradient = ctx.createRadialGradient(4 * this.TILE_SIZE, 5 * this.TILE_SIZE, 2, 4 * this.TILE_SIZE, 5 * this.TILE_SIZE, 22);
    glowGradient.addColorStop(0, 'rgba(88, 166, 255, 0.08)');
    glowGradient.addColorStop(1, 'rgba(88, 166, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(2 * this.TILE_SIZE, 3 * this.TILE_SIZE, 8 * this.TILE_SIZE, 6 * this.TILE_SIZE);
  }

  private renderSpeechBubbles(ctx: CanvasRenderingContext2D) {
    this.agents.forEach((agent) => {
      if (!agent.bubble) return;
      const b = agent.bubble;

      const bx = agent.x;
      const by = agent.y - 28;

      ctx.save();
      ctx.globalAlpha = b.alpha;

      // Calculate width based on text
      ctx.font = 'bold 8px monospace';
      const quoteW = ctx.measureText(b.quote).width;
      const boxW = Math.max(120, Math.min(220, quoteW + 16));
      const boxH = 34;

      const left = Math.max(8, Math.min(this.WORLD_W - boxW - 8, bx - boxW / 2));
      const top = Math.max(8, by - boxH);

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(left + 2, top + 2, boxW, boxH);

      // Bubble background
      ctx.fillStyle = '#0d131f';
      ctx.fillRect(left, top, boxW, boxH);

      // Cyber/Pixel Border
      const borderColor = agent.wing === 'WING_ALPHA' ? '#58a6ff' : '#f0883e';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, boxW, boxH);

      // Bubble Tail Pointer
      ctx.fillStyle = '#0d131f';
      ctx.beginPath();
      ctx.moveTo(bx - 4, top + boxH);
      ctx.lineTo(bx + 4, top + boxH);
      ctx.lineTo(bx, top + boxH + 5);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.beginPath();
      ctx.moveTo(bx - 4, top + boxH);
      ctx.lineTo(bx, top + boxH + 5);
      ctx.lineTo(bx + 4, top + boxH);
      ctx.stroke();

      // Badge header
      ctx.fillStyle = borderColor;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(b.badge, left + 6, top + 10);

      // Quote body
      ctx.fillStyle = '#f0f6fc';
      ctx.font = '8px monospace';
      ctx.fillText(this.truncateText(ctx, b.quote, boxW - 12), left + 6, top + 21);

      // Detail subtext
      ctx.fillStyle = '#8b949e';
      ctx.font = '6px monospace';
      ctx.fillText(b.subtext, left + 6, top + 29);

      ctx.restore();
    });
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let truncated = text;
    while (truncated.length > 3 && ctx.measureText(truncated + '...').width > maxW) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  private renderRoomBanners(ctx: CanvasRenderingContext2D) {
    const drawPlaque = (text: string, x: number, y: number, color: string) => {
      ctx.font = 'bold 7px monospace';
      const w = ctx.measureText(text).width + 8;
      ctx.fillStyle = 'rgba(10, 15, 24, 0.85)';
      ctx.fillRect(x - 4, y - 8, w, 11);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - 4, y - 8, w, 11);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };

    ctx.save();
    drawPlaque('[WING ALPHA // AGY CORE]', 2 * this.TILE_SIZE, 2.6 * this.TILE_SIZE, '#58a6ff');
    drawPlaque('[WAR ROOM // SYNC]', 14 * this.TILE_SIZE, 2.6 * this.TILE_SIZE, '#3fb950');
    drawPlaque('[WING BETA // CLAUDE ARCH]', 20 * this.TILE_SIZE, 2.6 * this.TILE_SIZE, '#f0883e');
    drawPlaque('[PANTRY // ESPRESSO BAR]', 2 * this.TILE_SIZE, 13.8 * this.TILE_SIZE, '#e3b341');
    drawPlaque('[BREAK LOUNGE // REFUEL]', 19 * this.TILE_SIZE, 13.8 * this.TILE_SIZE, '#e3b341');
    ctx.restore();
  }

  // ── Camera Navigation & Event Controls ───────────────────────────────────────

  public setCameraView(view: 'ALL' | 'ALPHA' | 'BETA' | 'WAR_ROOM' | 'PANTRY') {
    if (view === 'ALPHA') {
      this.targetPanX = 140;
      this.targetPanY = 100;
      this.targetZoom = 3.2;
    } else if (view === 'BETA') {
      this.targetPanX = -180;
      this.targetPanY = 100;
      this.targetZoom = 3.2;
    } else if (view === 'WAR_ROOM') {
      this.targetPanX = 0;
      this.targetPanY = 80;
      this.targetZoom = 3.4;
    } else if (view === 'PANTRY') {
      this.targetPanX = 0;
      this.targetPanY = -120;
      this.targetZoom = 3.0;
    } else {
      this.centerCamera();
    }
  }

  public zoomIn() {
    this.targetZoom = Math.min(5.0, this.targetZoom + 0.4);
  }

  public zoomOut() {
    this.targetZoom = Math.max(1.2, this.targetZoom - 0.4);
  }

  public resetZoom() {
    this.targetZoom = 1.95;
    this.targetPanX = 0;
    this.targetPanY = 24;
  }

  public centerCamera() {
    this.targetPanX = 0;
    this.targetPanY = 24;
    this.targetZoom = 1.95;
  }

  private setupEventListeners() {
    const canvas = this.canvas;

    // Mouse Drag Pan
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.targetPanX = e.clientX - this.dragStartX;
      this.targetPanY = e.clientY - this.dragStartY;
      this.panX = this.targetPanX;
      this.panY = this.targetPanY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Mouse Wheel Zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? -0.2 : 0.2;
      this.targetZoom = Math.max(1.2, Math.min(5.0, this.targetZoom + zoomDelta));
    }, { passive: false });

    // Click Detection on Agents
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Transform mouse to world coordinates
      const worldX = (mouseX - canvas.width / 2 - this.panX) / this.zoom + this.WORLD_W / 2;
      const worldY = (mouseY - canvas.height / 2 - this.panY) / this.zoom + this.WORLD_H / 2;

      let clicked: OfficeAgent | null = null;
      for (const agent of this.agents.values()) {
        const dist = Math.hypot(agent.x - worldX, agent.y - worldY);
        if (dist <= 18) {
          clicked = agent;
          break;
        }
      }

      this.selectedAgent = clicked;
      if (this.onAgentSelected) {
        this.onAgentSelected(clicked);
      }
    });
  }
}

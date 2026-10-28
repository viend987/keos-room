import { DialogueEngine, DialogueMessage } from '../services/DialogueEngine';
import { SoundEffects } from '../services/SoundEffects';

export interface CharacterState {
  id: string;
  name: string;
  roleTitle: string;
  roleColor: string;
  skinTone: string;
  hairStyle: 'pompadour' | 'sidepart' | 'bun' | 'messy' | 'shaggy' | 'spiky' | 'bob' | 'buzz' | 'ponytail' | 'rugged';
  hairColor: string;
  clothingType: 'suit' | 'coat' | 'turtleneck' | 'hoodie' | 'sweater' | 'bomber' | 'tshirt' | 'vest' | 'cardigan' | 'utility';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  facing: 'left' | 'right';
  currentAction: 'WORKING' | 'IDLE' | 'WALKING' | 'COLLABORATING' | 'ARGUING' | 'CHILLING' | 'CELEBRATING' | 'THINKING';
  actionTimer: number;
  animFrame: number;
  speechBubble: DialogueMessage | null;
  speechTimer: number;
  activeLaserBeam: boolean;
  isRaging: boolean;
  isThinking: boolean;
}

export interface TelemetryParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export class HolographicStudioEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenGrid: HTMLCanvasElement | null = null;
  private dpr: number = 1;

  public dialogueEngine: DialogueEngine;
  public soundEffects: SoundEffects;

  public width: number = 1200;
  public height: number = 800;

  public characters: Map<string, CharacterState> = new Map();
  private particles: TelemetryParticle[] = [];
  private shockwaves: Shockwave[] = [];

  private coreRotationAngle: number = 0;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  public fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private autonomousTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context from canvas');
    this.ctx = context;

    this.dialogueEngine = new DialogueEngine();
    this.soundEffects = new SoundEffects();

    this.initCanvasSize();
    this.initCharacters();
    this.createOffscreenGrid();

    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.createOffscreenGrid();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      } else {
        this.lastTimestamp = performance.now();
        this.start();
      }
    });
  }

  private initCanvasSize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.parentElement?.clientWidth || window.innerWidth;
    this.height = this.canvas.parentElement?.clientHeight || window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  private createOffscreenGrid() {
    this.offscreenGrid = document.createElement('canvas');
    this.offscreenGrid.width = this.width * this.dpr;
    this.offscreenGrid.height = this.height * this.dpr;
    const gctx = this.offscreenGrid.getContext('2d');
    if (!gctx) return;

    gctx.scale(this.dpr, this.dpr);

    // Deep Void Background Gradient
    const bgGrad = gctx.createRadialGradient(
      this.width / 2, this.height / 2, 80,
      this.width / 2, this.height / 2, Math.max(this.width, this.height)
    );
    bgGrad.addColorStop(0, '#0d1527');
    bgGrad.addColorStop(0.5, '#070a14');
    bgGrad.addColorStop(1, '#030509');
    gctx.fillStyle = bgGrad;
    gctx.fillRect(0, 0, this.width, this.height);

    // Architectural grid lines
    gctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    gctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x < this.width; x += gridSize) {
      gctx.beginPath();
      gctx.moveTo(x, 0);
      gctx.lineTo(x, this.height);
      gctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      gctx.beginPath();
      gctx.moveTo(0, y);
      gctx.lineTo(this.width, y);
      gctx.stroke();
    }

    // Central circular meeting ring
    const cx = this.width / 2;
    const cy = this.height / 2 - 25;

    gctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    gctx.lineWidth = 2;
    gctx.beginPath();
    gctx.arc(cx, cy, 160, 0, Math.PI * 2);
    gctx.stroke();

    gctx.setLineDash([8, 14]);
    gctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    gctx.beginPath();
    gctx.arc(cx, cy, 210, 0, Math.PI * 2);
    gctx.stroke();
    gctx.setLineDash([]);

    // Room Section Headings
    gctx.font = '500 11px "JetBrains Mono", sans-serif';
    gctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    gctx.fillText('Architecture & Leadership Hub', 60, 50);
    gctx.fillText('QA Verification & Testing Bay', this.width / 2 - 95, 50);
    gctx.fillText('Core Server & Infrastructure Pod', this.width - 270, 50);
    gctx.fillText('Frontend & Design Creative Lab', 60, this.height - 35);
    gctx.fillText('Synthesizer Cafe & Lounge', this.width - 230, this.height - 35);

    // Corner brackets
    gctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    gctx.lineWidth = 2;
    const b = 25;
    const corners = [
      [b, b, b + 30, b, b, b + 30],
      [this.width - b, b, this.width - b - 30, b, this.width - b, b + 30],
      [b, this.height - b, b + 30, this.height - b, b, this.height - b - 30],
      [this.width - b, this.height - b, this.width - b - 30, this.height - b, this.width - b, this.height - b - 30]
    ];
    corners.forEach(([x1, y1, x2, y2, x3, y3]) => {
      gctx.beginPath();
      gctx.moveTo(x2, y2);
      gctx.lineTo(x1, y1);
      gctx.lineTo(x3, y3);
      gctx.stroke();
    });
  }

  // 10 Distinct Humanoid Crew Members
  private initCharacters() {
    const cx = this.width / 2;
    const cy = this.height / 2 - 25;

    const roster: Array<{
      id: string;
      name: string;
      roleTitle: string;
      roleColor: string;
      skinTone: string;
      hairStyle: CharacterState['hairStyle'];
      hairColor: string;
      clothingType: CharacterState['clothingType'];
      x: number;
      y: number;
    }> = [
      {
        id: 'blaze',
        name: 'Blaze',
        roleTitle: 'Engineering PM',
        roleColor: '#FF3366',
        skinTone: '#FCD34D',
        hairStyle: 'pompadour',
        hairColor: '#1E293B',
        clothingType: 'suit',
        x: cx,
        y: cy - 230
      },
      {
        id: 'nova',
        name: 'Nova',
        roleTitle: 'Tech Lead & Architect',
        roleColor: '#00F0FF',
        skinTone: '#FDE68A',
        hairStyle: 'sidepart',
        hairColor: '#64748B',
        clothingType: 'coat',
        x: cx - 190,
        y: cy - 140
      },
      {
        id: 'viper',
        name: 'Viper',
        roleTitle: 'QA Lead',
        roleColor: '#00FF9D',
        skinTone: '#F59E0B',
        hairStyle: 'spiky',
        hairColor: '#047857',
        clothingType: 'bomber',
        x: cx + 190,
        y: cy - 140
      },
      {
        id: 'echo',
        name: 'Echo',
        roleTitle: 'QC / User Tester',
        roleColor: '#2DD4BF',
        skinTone: '#FDE68A',
        hairStyle: 'bob',
        hairColor: '#0D9488',
        clothingType: 'tshirt',
        x: cx + 330,
        y: cy - 80
      },
      {
        id: 'rex',
        name: 'Rex',
        roleTitle: 'Frontend Engineer',
        roleColor: '#38BDF8',
        skinTone: '#FCD34D',
        hairStyle: 'messy',
        hairColor: '#78350F',
        clothingType: 'hoodie',
        x: cx - 340,
        y: cy - 40
      },
      {
        id: 'aura',
        name: 'Aura',
        roleTitle: 'UI/UX Designer',
        roleColor: '#EC4899',
        skinTone: '#FDE68A',
        hairStyle: 'bun',
        hairColor: '#BE185D',
        clothingType: 'turtleneck',
        x: cx - 340,
        y: cy + 120
      },
      {
        id: 'kael',
        name: 'Kael',
        roleTitle: 'Backend Engineer',
        roleColor: '#A855F7',
        skinTone: '#D97706',
        hairStyle: 'shaggy',
        hairColor: '#0F172A',
        clothingType: 'sweater',
        x: cx + 340,
        y: cy + 60
      },
      {
        id: 'tark',
        name: 'Tark',
        roleTitle: 'DevOps Specialist',
        roleColor: '#F97316',
        skinTone: '#F59E0B',
        hairStyle: 'rugged',
        hairColor: '#C2410C',
        clothingType: 'utility',
        x: cx + 340,
        y: cy + 190
      },
      {
        id: 'rook',
        name: 'Rook',
        roleTitle: 'Security Officer',
        roleColor: '#F59E0B',
        skinTone: '#D97706',
        hairStyle: 'buzz',
        hairColor: '#334155',
        clothingType: 'vest',
        x: cx - 170,
        y: cy + 220
      },
      {
        id: 'zero',
        name: 'Zero',
        roleTitle: 'R&D Specialist',
        roleColor: '#6366F1',
        skinTone: '#FDE68A',
        hairStyle: 'ponytail',
        hairColor: '#312E81',
        clothingType: 'cardigan',
        x: cx + 170,
        y: cy + 220
      }
    ];

    roster.forEach(c => {
      this.characters.set(c.id, {
        id: c.id,
        name: c.name,
        roleTitle: c.roleTitle,
        roleColor: c.roleColor,
        skinTone: c.skinTone,
        hairStyle: c.hairStyle,
        hairColor: c.hairColor,
        clothingType: c.clothingType,
        x: c.x,
        y: c.y,
        targetX: c.x,
        targetY: c.y,
        homeX: c.x,
        homeY: c.y,
        facing: c.x < cx ? 'right' : 'left',
        currentAction: 'WORKING',
        actionTimer: 0,
        animFrame: Math.random() * 100,
        speechBubble: null,
        speechTimer: 0,
        activeLaserBeam: false,
        isRaging: false,
        isThinking: false
      });
    });
  }

  public start() {
    if (this.animFrameId) return;
    this.lastTimestamp = performance.now();
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;

      this.update(dt);
      this.render();

      this.frameCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 0.5) {
        this.fps = Math.round(this.frameCount / this.fpsTimer);
        this.frameCount = 0;
        this.fpsTimer = 0;
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private update(dt: number) {
    this.coreRotationAngle += dt * 0.75;
    this.autonomousTimer += dt;

    if (this.autonomousTimer > 11) {
      this.autonomousTimer = 0;
      this.triggerSpontaneousActivity();
    }

    this.characters.forEach(char => {
      char.animFrame += dt * 6.5;

      if (char.speechBubble) {
        char.speechTimer -= dt * 1000;
        if (char.speechTimer <= 0) {
          char.speechBubble = null;
          char.isRaging = false;
          char.isThinking = false;
        }
      }

      const dx = char.targetX - char.x;
      const dy = char.targetY - char.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 4) {
        char.currentAction = 'WALKING';
        const speed = 110 * dt;
        char.x += (dx / dist) * Math.min(speed, dist);
        char.y += (dy / dist) * Math.min(speed, dist);
        char.facing = dx > 0 ? 'right' : 'left';
      } else {
        char.x = char.targetX;
        char.y = char.targetY;
        if (char.currentAction === 'WALKING') {
          if (char.isRaging) {
            char.currentAction = 'ARGUING';
          } else if (char.isThinking) {
            char.currentAction = 'THINKING';
          } else if (char.x === char.homeX && char.y === char.homeY) {
            char.currentAction = 'WORKING';
          } else {
            char.currentAction = 'COLLABORATING';
          }
        }
      }

      if (char.currentAction === 'WORKING' && Math.random() < 0.06) {
        this.soundEffects.playKeyClick();
      }
    });

    this.updateParticles(dt);
    this.updateShockwaves(dt);
  }

  private triggerSpontaneousActivity() {
    const roll = Math.random();

    if (roll < 0.35) {
      // Idle human conversation
      const dlg = this.dialogueEngine.getRandomIdleDialogue();
      const speaker = this.characters.get(dlg.speakerId);
      if (speaker) {
        speaker.speechBubble = dlg;
        speaker.speechTimer = dlg.durationMs;
      }
    } else if (roll < 0.6) {
      // Walk to coffee bar to chill
      const pool = ['zero', 'kael', 'rex', 'aura', 'echo', 'tark'];
      const pickId = pool[Math.floor(Math.random() * pool.length)];
      const char = this.characters.get(pickId);
      if (char && char.currentAction === 'WORKING') {
        const barX = this.width - 150 + (Math.random() * 40 - 20);
        const barY = this.height - 80 + (Math.random() * 25 - 12);
        char.targetX = barX;
        char.targetY = barY;
        char.currentAction = 'CHILLING';
        this.soundEffects.playCoffeeSip();

        setTimeout(() => {
          if (char.currentAction === 'CHILLING') {
            char.targetX = char.homeX;
            char.targetY = char.homeY;
          }
        }, 6500);
      }
    } else if (roll < 0.8) {
      // Character pauses to think deeply (hand on chin)
      const thinkPool = ['nova', 'kael', 'zero', 'rook'];
      const pickId = thinkPool[Math.floor(Math.random() * thinkPool.length)];
      const char = this.characters.get(pickId);
      if (char && char.currentAction === 'WORKING') {
        char.currentAction = 'THINKING';
        char.isThinking = true;
        setTimeout(() => {
          if (char.currentAction === 'THINKING') {
            char.currentAction = 'WORKING';
            char.isThinking = false;
          }
        }, 4500);
      }
    } else {
      // Trigger dramatic inter-jobdesk debate thread
      this.triggerDebateThread();
    }
  }

  public triggerDebateThread() {
    const thread = this.dialogueEngine.getRandomDebateThread();
    let delay = 0;

    thread.forEach((msg) => {
      setTimeout(() => {
        const speaker = this.characters.get(msg.speakerId);
        if (speaker) {
          speaker.speechBubble = msg;
          speaker.speechTimer = msg.durationMs;

          if (msg.tone === 'angry') {
            speaker.isRaging = true;
            this.soundEffects.playErrorAlert();
            this.addShockwave(speaker.x, speaker.y, '#FF3366');

            // Stomp angrily towards target
            if (msg.targetId) {
              const target = this.characters.get(msg.targetId);
              if (target) {
                speaker.targetX = target.x + (target.x > speaker.x ? -55 : 55);
                speaker.targetY = target.y;

                setTimeout(() => {
                  speaker.targetX = speaker.homeX;
                  speaker.targetY = speaker.homeY;
                  speaker.isRaging = false;
                }, 5500);
              }
            }
          } else if (msg.tone === 'celebrate') {
            this.soundEffects.playTestPass();
            this.addShockwave(speaker.x, speaker.y, '#00FF9D');
            speaker.currentAction = 'CELEBRATING';
            setTimeout(() => {
              speaker.currentAction = 'WORKING';
            }, 3000);
          }
        }
      }, delay);
      delay += msg.durationMs * 0.85;
    });
  }

  public handleTelemetryEvent(tool: string, target?: string, isError: boolean = false) {
    const dlg = this.dialogueEngine.getTaskDialogue(tool, target, isError);
    const actor = this.characters.get(dlg.speakerId);

    if (actor) {
      actor.speechBubble = dlg;
      actor.speechTimer = dlg.durationMs;
      actor.activeLaserBeam = true;

      if (isError) {
        actor.isRaging = true;
        this.soundEffects.playErrorAlert();
        this.addShockwave(actor.x, actor.y, '#FF3366');

        const devTarget = this.characters.get('rex') || this.characters.get('kael');
        if (devTarget && actor.id === 'blaze') {
          actor.targetX = devTarget.x + 55;
          actor.targetY = devTarget.y;
          setTimeout(() => {
            actor.targetX = actor.homeX;
            actor.targetY = actor.homeY;
            actor.isRaging = false;
          }, 5000);
        }
      } else {
        this.soundEffects.playHologramSweep();
        this.spawnLaserBeamParticles(this.width / 2, this.height / 2 - 25, actor.x, actor.y, actor.roleColor);
      }

      setTimeout(() => {
        actor.activeLaserBeam = false;
      }, 1500);
    }
  }

  private render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.offscreenGrid) {
      this.ctx.drawImage(this.offscreenGrid, 0, 0, this.width, this.height);
    }

    this.renderFurniture();
    this.renderCentralCommandTable();

    // Depth-sort characters
    const sortedChars = Array.from(this.characters.values()).sort((a, b) => a.y - b.y);
    sortedChars.forEach(char => {
      this.renderHumanoidCharacter(char);
    });

    sortedChars.forEach(char => {
      if (char.speechBubble) {
        this.renderSpeechBubble(char, char.speechBubble);
      }
    });

    this.renderParticles();
    this.renderShockwaves();
  }

  private renderFurniture() {
    // Workstation Chairs & Desks
    this.characters.forEach(char => {
      const hx = char.homeX;
      const hy = char.homeY;

      // Ergonomic Swivel Chair at Desk
      this.ctx.save();
      // Chair base & castors
      this.ctx.strokeStyle = '#334155';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(hx - 12, hy + 24);
      this.ctx.lineTo(hx + 12, hy + 24);
      this.ctx.moveTo(hx, hy + 16);
      this.ctx.lineTo(hx, hy + 24);
      this.ctx.stroke();

      // Chair seat & backrest
      this.ctx.fillStyle = '#1e293b';
      this.ctx.strokeStyle = '#475569';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.roundRect(hx - 14, hy + 8, 28, 10, 3);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.roundRect(hx - 12, hy - 4, 24, 12, 4);
      this.ctx.fill();
      this.ctx.stroke();

      // Sleek Curved Desk
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.ellipse(hx, hy + 22, 52, 22, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Floating Curved Holographic Monitor
      this.ctx.fillStyle = 'rgba(14, 116, 144, 0.3)';
      this.ctx.strokeStyle = char.roleColor;
      this.ctx.shadowColor = char.roleColor;
      this.ctx.shadowBlur = 8;
      this.ctx.lineWidth = 1.5;

      this.ctx.beginPath();
      this.ctx.roundRect(hx - 30, hy - 32, 60, 26, 4);
      this.ctx.fill();
      this.ctx.stroke();

      // Realtime live code lines on screen
      this.ctx.fillStyle = char.roleColor;
      this.ctx.shadowBlur = 0;
      for (let i = 0; i < 3; i++) {
        const lineW = 16 + ((char.animFrame * 1.5 + i * 9) % 28);
        this.ctx.fillRect(hx - 24, hy - 25 + i * 7, lineW, 2.5);
      }
      this.ctx.restore();
    });

    // Synthesizer Cafe Bar (Southeast)
    const bx = this.width - 150;
    const by = this.height - 75;

    this.ctx.save();
    this.ctx.fillStyle = '#0f172a';
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(bx - 65, by - 22, 130, 44, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Neon Counter Line
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(bx - 55, by - 12);
    this.ctx.lineTo(bx + 55, by - 12);
    this.ctx.stroke();

    // Espresso Synthesizer Machine
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(bx - 48, by - 36, 26, 18);
    this.ctx.fillRect(bx + 22, by - 36, 26, 18);

    // Steam particles
    if (Math.random() < 0.25) {
      this.particles.push({
        x: bx - 35 + Math.random() * 6,
        y: by - 38,
        vx: (Math.random() - 0.5) * 6,
        vy: -20 - Math.random() * 10,
        color: '#38bdf8',
        alpha: 0.75,
        size: 2.5,
        life: 1.1
      });
    }

    // Bar Title
    this.ctx.font = '600 10px "JetBrains Mono", sans-serif';
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillText('Synthesizer Bar', bx - 42, by + 12);
    this.ctx.restore();

    // Relax Lounge (Southwest)
    const lx = 140;
    const ly = this.height - 75;

    this.ctx.save();
    this.ctx.fillStyle = '#1e293b';
    this.ctx.strokeStyle = '#818cf8';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(lx - 65, ly - 22, 130, 42, 12);
    this.ctx.fill();
    this.ctx.stroke();

    // Lounge table
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.ellipse(lx, ly + 30, 32, 15, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.font = '600 10px "JetBrains Mono", sans-serif';
    this.ctx.fillStyle = '#a5b4fc';
    this.ctx.fillText('Relaxation Lounge', lx - 48, ly + 6);
    this.ctx.restore();
  }

  private renderCentralCommandTable() {
    const cx = this.width / 2;
    const cy = this.height / 2 - 25;

    // Glowing base podium
    const baseGrad = this.ctx.createRadialGradient(cx, cy, 25, cx, cy, 95);
    baseGrad.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
    baseGrad.addColorStop(0.7, 'rgba(15, 23, 42, 0.85)');
    baseGrad.addColorStop(1, 'rgba(7, 10, 20, 0.95)');

    this.ctx.fillStyle = baseGrad;
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 88, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // 3D Rotating Geometric Core
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.strokeStyle = '#00F0FF';
    this.ctx.lineWidth = 1.8;
    this.ctx.shadowColor = '#00F0FF';
    this.ctx.shadowBlur = 12;

    const size = 34;
    const a = this.coreRotationAngle;
    const sinA = Math.sin(a);
    const cosA = Math.cos(a);

    const vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1]
    ].map(([x, y, z]) => {
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;
      const ry = y * 0.82 + rz * 0.38;
      return [rx * size, ry * size];
    });

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    edges.forEach(([i, j]) => {
      this.ctx.beginPath();
      this.ctx.moveTo(vertices[i][0], vertices[i][1]);
      this.ctx.lineTo(vertices[j][0], vertices[j][1]);
      this.ctx.stroke();
    });

    this.ctx.restore();

    // Laser Telemetry Beams
    this.characters.forEach(char => {
      if (char.activeLaserBeam) {
        this.drawLaserBeam(cx, cy, char.x, char.y, char.roleColor);
      }
    });
  }

  private drawLaserBeam(x1: number, y1: number, x2: number, y2: number, color: string) {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    this.ctx.lineWidth = 3;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 - 45;

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.quadraticCurveTo(midX, midY, x2, y2);
    this.ctx.stroke();

    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  // ==========================================
  // FULL HUMANOID VECTOR CHARACTER RENDERING
  // ==========================================
  private renderHumanoidCharacter(char: CharacterState) {
    this.ctx.save();
    this.ctx.translate(char.x, char.y);

    const f = char.facing === 'left' ? -1 : 1;
    const isWalking = char.currentAction === 'WALKING';
    const bob = isWalking ? Math.sin(char.animFrame * 1.6) * 3 : Math.sin(char.animFrame * 0.5) * 1.5;
    const walkSwing = isWalking ? Math.sin(char.animFrame * 1.6) * 10 : 0;

    // Floor Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 22, 18, 7, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Rage Aura & Anger Shockwaves
    if (char.isRaging) {
      this.ctx.strokeStyle = '#FF3366';
      this.ctx.shadowColor = '#FF3366';
      this.ctx.shadowBlur = 14;
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(0, -6 + bob, 30 + Math.sin(char.animFrame * 2) * 5, 0, Math.PI * 2);
      this.ctx.stroke();

      // Pulsing Anger Vein Symbol on top of head
      this.ctx.strokeStyle = '#FF3366';
      this.ctx.lineWidth = 2;
      const ax = 6 * f;
      const ay = -44 + bob;
      this.ctx.beginPath();
      this.ctx.moveTo(ax - 5, ay - 5);
      this.ctx.lineTo(ax, ay);
      this.ctx.lineTo(ax + 5, ay - 5);
      this.ctx.moveTo(ax, ay);
      this.ctx.lineTo(ax, ay + 6);
      this.ctx.stroke();
    }

    // Thinking Thought Sparkles
    if (char.isThinking) {
      const tx = 10 * f;
      const ty = -46 + bob + Math.sin(char.animFrame) * 3;
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.shadowColor = '#F59E0B';
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      this.ctx.arc(tx + 8 * f, ty - 6, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 1. LEGS & SHOES
    this.ctx.strokeStyle = '#1e293b'; // Dark trousers
    this.ctx.lineWidth = 4.5;
    this.ctx.lineCap = 'round';

    if (char.currentAction === 'WORKING') {
      // Sitting naturally at desk
      this.ctx.beginPath();
      this.ctx.moveTo(-5, 8 + bob);
      this.ctx.lineTo(-7, 20);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(5, 8 + bob);
      this.ctx.lineTo(7, 20);
      this.ctx.stroke();
    } else {
      // Walking / Standing Stride
      this.ctx.beginPath();
      this.ctx.moveTo(-5, 8 + bob);
      this.ctx.lineTo(-6 + walkSwing * f, 22);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(5, 8 + bob);
      this.ctx.lineTo(6 - walkSwing * f, 22);
      this.ctx.stroke();
    }

    // Shoes
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-8 + walkSwing * f, 20, 7, 3.5);
    this.ctx.fillRect(3 - walkSwing * f, 20, 7, 3.5);

    // 2. TORSO & CLOTHING
    this.renderClothing(char, bob);

    // 3. HUMAN HEAD & FACE
    this.renderHumanHead(char, bob, f);

    // 4. ARTICULATED ARMS & HANDS
    this.renderArms(char, bob, f, walkSwing);

    // 5. CLEAN MODERN NAMEPLATE (No brackets!)
    this.ctx.shadowBlur = 0;
    this.ctx.font = '600 10px "JetBrains Mono", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = char.roleColor;
    this.ctx.fillText(char.name, 0, 36);

    this.ctx.font = '400 8.5px "JetBrains Mono", sans-serif';
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText(char.roleTitle, 0, 47);

    this.ctx.restore();
  }

  private renderClothing(char: CharacterState, bob: number) {
    this.ctx.save();
    this.ctx.strokeStyle = '#0f172a';
    this.ctx.lineWidth = 1.2;

    switch (char.clothingType) {
      case 'suit': // Blaze (PM) Crimson Blazer
        this.ctx.fillStyle = '#dc2626';
        this.ctx.beginPath();
        this.ctx.roundRect(-12, -12 + bob, 24, 22, 4);
        this.ctx.fill();
        this.ctx.stroke();
        // Lapels & Tie
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(-4, -12 + bob);
        this.ctx.lineTo(0, -2 + bob);
        this.ctx.lineTo(4, -12 + bob);
        this.ctx.fill();
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(-1.5, -4 + bob, 3, 10);
        break;

      case 'coat': // Nova Tech-coat
        this.ctx.fillStyle = '#0f172a';
        this.ctx.beginPath();
        this.ctx.roundRect(-13, -13 + bob, 26, 25, 4);
        this.ctx.fill();
        this.ctx.stroke();
        // Cyan Glowing Collar Trim
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-5, -13 + bob);
        this.ctx.lineTo(-2, 8 + bob);
        this.ctx.moveTo(5, -13 + bob);
        this.ctx.lineTo(2, 8 + bob);
        this.ctx.stroke();
        break;

      case 'hoodie': // Rex Sky Blue Hoodie
        this.ctx.fillStyle = '#0284c7';
        this.ctx.beginPath();
        this.ctx.roundRect(-12, -12 + bob, 24, 22, 6);
        this.ctx.fill();
        this.ctx.stroke();
        // Front pouch
        this.ctx.fillStyle = '#0369a1';
        this.ctx.fillRect(-7, 0 + bob, 14, 7);
        break;

      case 'turtleneck': // Aura Fuchsia Turtleneck
        this.ctx.fillStyle = '#db2777';
        this.ctx.beginPath();
        this.ctx.roundRect(-11, -12 + bob, 22, 22, 4);
        this.ctx.fill();
        this.ctx.stroke();
        // High collar
        this.ctx.fillStyle = '#be185d';
        this.ctx.fillRect(-5, -16 + bob, 10, 5);
        break;

      case 'sweater': // Kael Purple Knit Sweater
        this.ctx.fillStyle = '#7e22ce';
        this.ctx.beginPath();
        this.ctx.roundRect(-12, -12 + bob, 24, 22, 4);
        this.ctx.fill();
        this.ctx.stroke();
        break;

      case 'bomber': // Viper Emerald Bomber
        this.ctx.fillStyle = '#059669';
        this.ctx.beginPath();
        this.ctx.roundRect(-12, -12 + bob, 24, 22, 5);
        this.ctx.fill();
        this.ctx.stroke();
        // Brass zipper
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -12 + bob);
        this.ctx.lineTo(0, 10 + bob);
        this.ctx.stroke();
        break;

      case 'tshirt': // Echo Mint T-Shirt
        this.ctx.fillStyle = '#0d9488';
        this.ctx.beginPath();
        this.ctx.roundRect(-11, -11 + bob, 22, 21, 3);
        this.ctx.fill();
        this.ctx.stroke();
        break;

      case 'vest': // Rook Security Tactical Vest
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(-11, -12 + bob, 22, 22);
        this.ctx.fillStyle = '#b45309';
        this.ctx.fillRect(-12, -10 + bob, 24, 18);
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.strokeRect(-12, -10 + bob, 24, 18);
        break;

      case 'cardigan': // Zero Indigo Cardigan
        this.ctx.fillStyle = '#4338ca';
        this.ctx.beginPath();
        this.ctx.roundRect(-12, -12 + bob, 24, 24, 5);
        this.ctx.fill();
        this.ctx.stroke();
        break;

      case 'utility': // Tark Orange Utility Vest
        this.ctx.fillStyle = '#ea580c';
        this.ctx.beginPath();
        this.ctx.roundRect(-12, -12 + bob, 24, 22, 4);
        this.ctx.fill();
        this.ctx.stroke();
        // Pockets
        this.ctx.fillStyle = '#9a3412';
        this.ctx.fillRect(-9, -2 + bob, 7, 7);
        this.ctx.fillRect(2, -2 + bob, 7, 7);
        break;
    }
    this.ctx.restore();
  }

  private renderHumanHead(char: CharacterState, bob: number, f: number) {
    this.ctx.save();
    const headY = -22 + bob;

    // Neck
    this.ctx.fillStyle = char.skinTone;
    this.ctx.fillRect(-3.5, headY + 7, 7, 6);

    // Head Oval
    this.ctx.fillStyle = char.skinTone;
    this.ctx.beginPath();
    this.ctx.ellipse(0, headY, 10, 11, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Hair
    this.ctx.fillStyle = char.hairColor;
    switch (char.hairStyle) {
      case 'pompadour': // Blaze
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 4, 11, Math.PI, Math.PI * 2);
        this.ctx.roundRect(-10, headY - 14, 20, 10, 4);
        this.ctx.fill();
        break;
      case 'sidepart': // Nova
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 3, 11, Math.PI * 0.9, Math.PI * 2.1);
        this.ctx.fill();
        break;
      case 'bun': // Aura
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 3, 11, Math.PI * 0.8, Math.PI * 2.2);
        this.ctx.arc(0, headY - 15, 6, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'messy': // Rex
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 3, 12, Math.PI * 0.8, Math.PI * 2.2);
        this.ctx.fill();
        // Cyan Headphones around neck
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, headY + 8, 9, 0, Math.PI);
        this.ctx.stroke();
        break;
      case 'spiky': // Viper
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 2, 11, Math.PI, Math.PI * 2);
        this.ctx.fill();
        // Emerald Visor
        this.ctx.fillStyle = '#00ff9d';
        this.ctx.shadowColor = '#00ff9d';
        this.ctx.shadowBlur = 6;
        this.ctx.fillRect(-7, headY - 3, 14, 4);
        this.ctx.shadowBlur = 0;
        break;
      case 'shaggy': // Kael
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 2, 12, Math.PI * 0.7, Math.PI * 2.3);
        this.ctx.fill();
        // Stubble outline
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(0, headY + 4, 7, 0.2, Math.PI - 0.2);
        this.ctx.stroke();
        break;
      case 'bob': // Echo
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 2, 11, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'buzz': // Rook
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 1, 10.5, Math.PI * 0.9, Math.PI * 2.1);
        this.ctx.fill();
        break;
      case 'ponytail': // Zero
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 2, 11, Math.PI * 0.8, Math.PI * 2.2);
        this.ctx.arc(-8 * f, headY - 4, 5, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'rugged': // Tark
        this.ctx.beginPath();
        this.ctx.arc(0, headY - 3, 11.5, Math.PI * 0.8, Math.PI * 2.2);
        this.ctx.fill();
        break;
    }

    // Facial Eyes & Expressions
    const eyeX = f * 3;
    const eyeY = headY - 1;

    if (char.currentAction === 'ARGUING' || char.isRaging) {
      // Angry eyebrows (\ /) & Wide shouting mouth
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1.6;
      this.ctx.beginPath();
      this.ctx.moveTo(eyeX - 4, eyeY - 4);
      this.ctx.lineTo(eyeX, eyeY - 2);
      this.ctx.moveTo(eyeX + 4, eyeY - 4);
      this.ctx.lineTo(eyeX, eyeY - 2);
      this.ctx.stroke();

      // Shouting mouth
      this.ctx.fillStyle = '#991b1b';
      this.ctx.beginPath();
      this.ctx.arc(eyeX, eyeY + 5, 3.5, 0, Math.PI);
      this.ctx.fill();
    } else if (char.currentAction === 'CHILLING') {
      // Happy closed curved eyes (^ ^)
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1.4;
      this.ctx.beginPath();
      this.ctx.arc(eyeX - 3, eyeY, 2.5, Math.PI, 0);
      this.ctx.arc(eyeX + 3, eyeY, 2.5, Math.PI, 0);
      this.ctx.stroke();

      // Content smile
      this.ctx.beginPath();
      this.ctx.arc(eyeX, eyeY + 4, 3, 0.2, Math.PI - 0.2);
      this.ctx.stroke();
    } else if (char.currentAction === 'THINKING' || char.isThinking) {
      // One eyebrow raised, one lowered, pursed mouth
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(eyeX - 4, eyeY - 5);
      this.ctx.lineTo(eyeX - 1, eyeY - 3);
      this.ctx.moveTo(eyeX + 1, eyeY - 3);
      this.ctx.lineTo(eyeX + 4, eyeY - 3);
      this.ctx.stroke();

      // Pursed mouth
      this.ctx.fillRect(eyeX - 1.5, eyeY + 4, 3, 1.2);
    } else {
      // Normal Focused / Calm Eyes
      this.ctx.fillStyle = '#0f172a';
      this.ctx.beginPath();
      this.ctx.arc(eyeX - 3, eyeY, 1.3, 0, Math.PI * 2);
      this.ctx.arc(eyeX + 3, eyeY, 1.3, 0, Math.PI * 2);
      this.ctx.fill();

      // Calm mouth line
      this.ctx.strokeStyle = '#475569';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(eyeX - 2, eyeY + 4);
      this.ctx.lineTo(eyeX + 2, eyeY + 4);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private renderArms(char: CharacterState, bob: number, f: number, walkSwing: number) {
    this.ctx.save();
    this.ctx.strokeStyle = char.skinTone;
    this.ctx.lineWidth = 3.5;
    this.ctx.lineCap = 'round';

    const shoulderL = { x: -11, y: -6 + bob };
    const shoulderR = { x: 11, y: -6 + bob };

    if (char.currentAction === 'WORKING') {
      // Typing rapidly on floating holographic keyboard
      const tap = Math.sin(char.animFrame * 2.2) * 2.5;

      this.ctx.beginPath();
      this.ctx.moveTo(shoulderL.x, shoulderL.y);
      this.ctx.lineTo(-4 + f * 4, 2 + bob + tap);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(shoulderR.x, shoulderR.y);
      this.ctx.lineTo(4 + f * 4, 2 + bob - tap);
      this.ctx.stroke();

      // Glowing floating keyboard keys under hands
      this.ctx.fillStyle = char.roleColor;
      this.ctx.shadowColor = char.roleColor;
      this.ctx.shadowBlur = 6;
      this.ctx.fillRect(f * 2 - 10, 5 + bob, 20, 2);
    } else if (char.currentAction === 'THINKING' || char.isThinking) {
      // Hand touching chin, other arm folded across chest
      this.ctx.beginPath();
      this.ctx.moveTo(shoulderL.x, shoulderL.y);
      this.ctx.lineTo(0, 4 + bob);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(shoulderR.x, shoulderR.y);
      this.ctx.lineTo(f * 4, -14 + bob); // Touch chin
      this.ctx.stroke();
    } else if (char.currentAction === 'ARGUING' || char.isRaging) {
      // Hands on hips / dramatic furious pointing
      this.ctx.beginPath();
      this.ctx.moveTo(shoulderL.x, shoulderL.y);
      this.ctx.lineTo(-15, 2 + bob);
      this.ctx.lineTo(-8, 3 + bob);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(shoulderR.x, shoulderR.y);
      this.ctx.lineTo(16, -10 + bob + Math.sin(char.animFrame * 1.5) * 5); // Pointing forward!
      this.ctx.stroke();
    } else if (char.currentAction === 'CHILLING') {
      // Holding coffee mug to chest
      this.ctx.beginPath();
      this.ctx.moveTo(shoulderR.x, shoulderR.y);
      this.ctx.lineTo(8, -2 + bob);
      this.ctx.stroke();

      // Coffee mug
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fillRect(8, -6 + bob, 6, 8);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(9, -8 + bob, 4, 2); // Foam
    } else if (char.currentAction === 'CELEBRATING') {
      // Both arms raised high in victory!
      this.ctx.beginPath();
      this.ctx.moveTo(shoulderL.x, shoulderL.y);
      this.ctx.lineTo(-15, -24 + bob);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(shoulderR.x, shoulderR.y);
      this.ctx.lineTo(15, -24 + bob);
      this.ctx.stroke();
    } else {
      // Walking natural arm counter-swing
      this.ctx.beginPath();
      this.ctx.moveTo(shoulderL.x, shoulderL.y);
      this.ctx.lineTo(-10 - walkSwing * f * 0.7, 6 + bob);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(shoulderR.x, shoulderR.y);
      this.ctx.lineTo(10 + walkSwing * f * 0.7, 6 + bob);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // Floating Frosted Glass Speech Bubble
  private renderSpeechBubble(char: CharacterState, msg: DialogueMessage) {
    this.ctx.save();
    this.ctx.font = '500 11.5px "JetBrains Mono", sans-serif';

    const padding = 12;
    const maxWidth = 280;
    const words = msg.text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (this.ctx.measureText(testLine).width > maxWidth - padding * 2) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);

    const lineHeight = 16;
    const bubbleW = maxWidth;
    const bubbleH = lines.length * lineHeight + 28;

    const bx = Math.max(15, Math.min(this.width - bubbleW - 15, char.x - bubbleW / 2));
    const by = char.y - bubbleH - 55;

    // Frosted glass bubble background
    this.ctx.fillStyle = 'rgba(10, 16, 31, 0.95)';
    this.ctx.strokeStyle = msg.roleColor;
    this.ctx.shadowColor = msg.roleColor;
    this.ctx.shadowBlur = msg.tone === 'angry' ? 14 : 7;
    this.ctx.lineWidth = 1.8;

    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, bubbleW, bubbleH, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Pointer notch to character head
    this.ctx.fillStyle = 'rgba(10, 16, 31, 0.95)';
    this.ctx.beginPath();
    this.ctx.moveTo(char.x - 7, by + bubbleH);
    this.ctx.lineTo(char.x + 7, by + bubbleH);
    this.ctx.lineTo(char.x, by + bubbleH + 8);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Header label: e.g. "Blaze · Engineering PM" (Clean, NO BRACKETS!)
    this.ctx.shadowBlur = 0;
    this.ctx.font = '700 10px "JetBrains Mono", sans-serif';
    this.ctx.fillStyle = msg.roleColor;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${msg.speakerName} · ${msg.roleTitle}`, bx + padding, by + 14);

    // Dialogue text
    this.ctx.font = '500 11px "JetBrains Mono", sans-serif';
    this.ctx.fillStyle = msg.tone === 'angry' ? '#fecdd3' : '#f8fafc';
    lines.forEach((line, i) => {
      this.ctx.fillText(line, bx + padding, by + 30 + i * lineHeight);
    });

    this.ctx.restore();
  }

  private spawnLaserBeamParticles(x1: number, y1: number, x2: number, y2: number, color: string) {
    for (let i = 0; i < 22; i++) {
      const t = Math.random();
      this.particles.push({
        x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 12,
        y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 35,
        vy: (Math.random() - 0.5) * 35,
        color: color,
        alpha: 0.9,
        size: 2.2 + Math.random() * 2,
        life: 0.8
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private renderParticles() {
    this.ctx.save();
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  public addShockwave(x: number, y: number, color: string) {
    this.shockwaves.push({
      x,
      y,
      radius: 12,
      maxRadius: 110,
      color,
      alpha: 0.85
    });
  }

  private updateShockwaves(dt: number) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += dt * 150;
      s.alpha = Math.max(0, 1 - s.radius / s.maxRadius);

      if (s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private renderShockwaves() {
    this.ctx.save();
    this.shockwaves.forEach(s => {
      this.ctx.strokeStyle = s.color;
      this.ctx.lineWidth = 2.5;
      this.ctx.globalAlpha = s.alpha;
      this.ctx.shadowColor = s.color;
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    });
    this.ctx.restore();
  }
}

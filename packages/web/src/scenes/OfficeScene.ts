import Phaser from 'phaser';
import { KeosAnimation, KeosEvent, KeosRole, KeosSession, KeosWing } from '../types';
import { DialogueEngine } from '../services/DialogueEngine';
import { SoundEffects } from '../services/SoundEffects';

interface AgentEntity {
  id: string;
  role: KeosRole;
  wing: KeosWing;
  harness: string;
  charSprite: Phaser.GameObjects.Sprite;
  container: Phaser.GameObjects.Container;
  roleTag: Phaser.GameObjects.Text;
  bubbleContainer: Phaser.GameObjects.Container;
  bubbleBadge: Phaser.GameObjects.Text;
  bubbleQuote: Phaser.GameObjects.Text;
  bubbleSubtext: Phaser.GameObjects.Text;
  bubbleBg: Phaser.GameObjects.Rectangle;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  state: KeosAnimation;
  stateTimer: number;
  bubbleTimer: number;
}

export class OfficeScene extends Phaser.Scene {
  private agents: Map<string, AgentEntity> = new Map();
  private animatedPCs: Phaser.GameObjects.Sprite[] = [];
  private sparksEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private steamEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private currentView: 'ALL' | 'ALPHA' | 'BETA' | 'PANTRY' = 'ALL';

  constructor() {
    super({ key: 'OfficeScene' });
  }

  preload() {
    // 1. Flooring & Walls
    this.load.image('floor_tile', '/assets/floors/floor_1.png');
    this.load.image('floor_wood', '/assets/floors/floor_3.png');
    this.load.image('floor_carpet', '/assets/floors/floor_5.png');
    this.load.image('wall_tile', '/assets/walls/wall_0.png');

    // 2. Real Furniture Sprites
    this.load.image('desk_front', '/assets/furniture/DESK/DESK_FRONT.png');
    this.load.image('pc_off', '/assets/furniture/PC/PC_FRONT_OFF.png');
    this.load.image('pc_on_1', '/assets/furniture/PC/PC_FRONT_ON_1.png');
    this.load.image('pc_on_2', '/assets/furniture/PC/PC_FRONT_ON_2.png');
    this.load.image('pc_on_3', '/assets/furniture/PC/PC_FRONT_ON_3.png');
    this.load.image('sofa_front', '/assets/furniture/SOFA/SOFA_FRONT.png');
    this.load.image('coffee_machine', '/assets/furniture/COFFEE/COFFEE.png');
    this.load.image('whiteboard', '/assets/furniture/WHITEBOARD/WHITEBOARD.png');
    this.load.image('plant', '/assets/furniture/PLANT/PLANT.png');
    this.load.image('bookshelf', '/assets/furniture/BOOKSHELF/BOOKSHELF.png');
    this.load.image('chair_front', '/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png');
    this.load.image('chair_back', '/assets/furniture/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png');
    this.load.image('clock', '/assets/furniture/CLOCK/CLOCK.png');

    // 3. Characters Spritesheets (16x32 frames)
    this.load.spritesheet('char_0', '/assets/characters/char_0.png', {
      frameWidth: 16,
      frameHeight: 32
    });
    this.load.spritesheet('char_1', '/assets/characters/char_1.png', {
      frameWidth: 16,
      frameHeight: 32
    });
    this.load.spritesheet('char_2', '/assets/characters/char_2.png', {
      frameWidth: 16,
      frameHeight: 32
    });
    this.load.spritesheet('char_3', '/assets/characters/char_3.png', {
      frameWidth: 16,
      frameHeight: 32
    });
    this.load.spritesheet('char_4', '/assets/characters/char_4.png', {
      frameWidth: 16,
      frameHeight: 32
    });
    this.load.spritesheet('char_5', '/assets/characters/char_5.png', {
      frameWidth: 16,
      frameHeight: 32
    });
  }

  create() {
    // 1. Build Animations
    this.buildCharacterAnimations();

    // 2. Render Full Tilemap Floor & Walls
    this.renderOfficeArchitecture();

    // 3. Setup Particle Effects (Sparks & Coffee Steam)
    this.setupParticleEffects();

    // 4. Initialize Character Agents
    this.initOfficeStaff();
  }

  update(time: number, delta: number) {
    this.agents.forEach((agent) => {
      this.updateAgentMotion(agent, delta);
    });
  }

  public handleTelemetryEvent(event: KeosEvent) {
    const wing = event.session.wingId || 'WING_ALPHA';
    const agentKey = `${wing}_${event.role}`;
    let agent = this.agents.get(agentKey);

    if (!agent) {
      agent = this.spawnCharacter(agentKey, event.role, wing, event.session.harness);
    }

    // Determine target location
    const coords = this.getSpotCoordinates(wing, event.targetLocation, event.role);
    agent.targetX = coords.x;
    agent.targetY = coords.y;
    agent.state = event.animation;
    agent.stateTimer = 4500;

    // Generate witty Indonesian speech bubble
    const dialogue = DialogueEngine.getSpeechText(event);
    this.triggerSpeechBubble(agent, dialogue.badge, dialogue.quote, dialogue.subtext);

    // Audio SFX trigger
    if (event.animation === 'TYPE') {
      SoundEffects.playKeyboardClick();
      this.sparksEmitter.explode(10, coords.x, coords.y - 14);
    } else if (event.animation === 'RAGE') {
      SoundEffects.playErrorBuzzer();
    } else if (event.animation === 'COFFEE') {
      SoundEffects.playCoffeeBrew();
    } else if (event.category === 'SUBAGENT') {
      SoundEffects.playElevatorChime();
    } else if (event.category === 'TEST' && event.status === 'SUCCESS') {
      SoundEffects.playSuccessFanfare();
    }
  }

  public setCameraView(view: 'ALL' | 'ALPHA' | 'BETA' | 'PANTRY') {
    this.currentView = view;
    const cam = this.cameras.main;

    if (view === 'ALPHA') {
      cam.pan(250, 200, 600, 'Power2');
      cam.zoomTo(1.35, 600);
    } else if (view === 'BETA') {
      cam.pan(750, 200, 600, 'Power2');
      cam.zoomTo(1.35, 600);
    } else if (view === 'PANTRY') {
      cam.pan(500, 440, 600, 'Power2');
      cam.zoomTo(1.4, 600);
    } else {
      cam.pan(500, 280, 600, 'Power2');
      cam.zoomTo(1.0, 600);
    }
  }

  private buildCharacterAnimations() {
    // Build walk and idle animations for char_0 through char_5
    for (let c = 0; c <= 5; c++) {
      const key = `char_${c}`;

      // Walk Down (row 0: frames 0, 1, 2, 3)
      if (!this.anims.exists(`${key}_walk_down`)) {
        this.anims.create({
          key: `${key}_walk_down`,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
          frameRate: 8,
          repeat: -1
        });
      }

      // Walk Right (row 1: frames 7, 8, 9, 10)
      if (!this.anims.exists(`${key}_walk_right`)) {
        this.anims.create({
          key: `${key}_walk_right`,
          frames: this.anims.generateFrameNumbers(key, { start: 7, end: 10 }),
          frameRate: 8,
          repeat: -1
        });
      }

      // Walk Up (row 2: frames 14, 15, 16, 17)
      if (!this.anims.exists(`${key}_walk_up`)) {
        this.anims.create({
          key: `${key}_walk_up`,
          frames: this.anims.generateFrameNumbers(key, { start: 14, end: 17 }),
          frameRate: 8,
          repeat: -1
        });
      }

      // Typing animation (frames 11, 12 fast)
      if (!this.anims.exists(`${key}_type`)) {
        this.anims.create({
          key: `${key}_type`,
          frames: this.anims.generateFrameNumbers(key, { frames: [7, 11, 7, 12] }),
          frameRate: 10,
          repeat: -1
        });
      }

      // Idle Down (frame 0)
      if (!this.anims.exists(`${key}_idle`)) {
        this.anims.create({
          key: `${key}_idle`,
          frames: [{ key, frame: 0 }],
          frameRate: 1
        });
      }
    }

    // Animated PC Monitor Flicker
    if (!this.anims.exists('pc_glow')) {
      this.anims.create({
        key: 'pc_glow',
        frames: [{ key: 'pc_on_1' }, { key: 'pc_on_2' }, { key: 'pc_on_3' }],
        frameRate: 4,
        repeat: -1
      });
    }
  }

  private renderOfficeArchitecture() {
    // Base Floor Texture Tiling
    for (let x = 0; x < 1000; x += 16) {
      for (let y = 0; y < 560; y += 16) {
        // Wing Alpha gets modern wood parquet (floor_3)
        if (x >= 24 && x <= 420 && y >= 32 && y <= 330) {
          this.add.image(x + 8, y + 8, 'floor_wood').setDepth(0);
        }
        // Wing Beta gets warm executive carpet (floor_5)
        else if (x >= 580 && x <= 976 && y >= 32 && y <= 330) {
          this.add.image(x + 8, y + 8, 'floor_carpet').setDepth(0);
        }
        // War Room gets stone grid tile (floor_1)
        else if (x >= 424 && x <= 576 && y >= 32 && y <= 210) {
          this.add.image(x + 8, y + 8, 'floor_tile').setDepth(0);
        }
        // Pantry gets stylish wood cafe floor
        else if (x >= 240 && x <= 760 && y >= 370 && y <= 530) {
          this.add.image(x + 8, y + 8, 'floor_wood').setDepth(0);
        }
        // Hallways & margins
        else {
          this.add.image(x + 8, y + 8, 'floor_tile').setTint(0x444d56).setDepth(0);
        }
      }
    }

    // Perimeter Walls
    for (let x = 0; x < 1000; x += 16) {
      this.add.image(x + 8, 16, 'wall_tile').setDepth(1);
    }

    // Wall Plangs & Headings (Zero-Emoji)
    this.add
      .text(32, 28, '[WING ALPHA: PROJECT EMS - HARNESS: AGY]', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#58a6ff'
      })
      .setDepth(2);

    this.add
      .text(600, 28, '[WING BETA: PROJECT HARMONY - HARNESS: CLAUDE]', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f0883e'
      })
      .setDepth(2);

    this.add
      .text(446, 28, '[WAR ROOM]', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#3fb950'
      })
      .setDepth(2);

    this.add
      .text(380, 366, '[CENTRAL PANTRY & BREAK LOUNGE]', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e3b341'
      })
      .setDepth(2);

    // Wall Clocks
    this.add.image(220, 20, 'clock').setDepth(2);
    this.add.image(780, 20, 'clock').setDepth(2);

    // Render Real Furniture Layout
    this.placeOfficeFurniture();
  }

  private placeOfficeFurniture() {
    // --- WING ALPHA FURNITURE ---
    this.createWorkstation(90, 90, 'PM / MGR');
    this.createWorkstation(220, 90, 'PLANNER');
    this.createWorkstation(90, 210, 'DEV CUBICLE');
    this.createWorkstation(220, 210, 'QA LAB');

    // Bookshelf & Plant
    this.add.image(350, 80, 'bookshelf').setDepth(2);
    this.add.image(350, 130, 'plant').setDepth(2);
    this.add.image(40, 80, 'plant').setDepth(2);

    // --- WING BETA FURNITURE ---
    this.createWorkstation(650, 90, 'PM / MGR');
    this.createWorkstation(780, 90, 'PLANNER');
    this.createWorkstation(650, 210, 'DEV CUBICLE');
    this.createWorkstation(780, 210, 'QA LAB');

    // Bookshelf & Plant
    this.add.image(910, 80, 'bookshelf').setDepth(2);
    this.add.image(910, 130, 'plant').setDepth(2);
    this.add.image(950, 80, 'plant').setDepth(2);

    // --- WAR ROOM (CENTER TOP) ---
    this.add.image(500, 75, 'whiteboard').setDepth(2);
    // Conference table setup
    this.add.image(500, 130, 'desk_front').setDepth(2);
    this.add.image(470, 130, 'chair_front').setDepth(1);
    this.add.image(530, 130, 'chair_front').setDepth(1);
    this.add.image(500, 155, 'chair_back').setDepth(3);

    // --- CENTRAL PANTRY (CENTER BOTTOM) ---
    // Espresso Counter
    this.add.image(310, 430, 'desk_front').setDepth(2);
    this.add.image(305, 418, 'coffee_machine').setDepth(3);
    this.add.image(330, 422, 'plant').setDepth(3);
    this.add
      .text(285, 452, '[ESPRESSO BAR]', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#e3b341'
      })
      .setDepth(3);

    // Sofa Lounge
    this.add.image(580, 435, 'sofa_front').setDepth(2);
    this.add.image(660, 435, 'sofa_front').setDepth(2);
    this.add.image(620, 470, 'plant').setDepth(3);
    this.add
      .text(590, 465, '[SOFA LOUNGE]', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#8b949e'
      })
      .setDepth(3);
  }

  private createWorkstation(x: number, y: number, label: string) {
    // Wooden Desk
    this.add.image(x, y, 'desk_front').setDepth(2);

    // Ergonomic Chair behind desk
    this.add.image(x, y - 10, 'chair_front').setDepth(1);

    // Animated PC Monitor on Desk
    const pc = this.add.sprite(x, y - 8, 'pc_on_1').setDepth(3);
    pc.play('pc_glow');
    this.animatedPCs.push(pc);

    // Workstation Label
    this.add
      .text(x - 24, y + 20, label, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#8b949e'
      })
      .setDepth(3);
  }

  private setupParticleEffects() {
    // 1. Blue Pixel Sparks for Typing
    const sparkCanvas = this.textures.createCanvas('pixel-spark-fx', 4, 4);
    if (sparkCanvas) {
      const ctx = sparkCanvas.getContext();
      ctx.fillStyle = '#58a6ff';
      ctx.fillRect(0, 0, 4, 4);
      sparkCanvas.refresh();
    }

    this.sparksEmitter = this.add.particles(0, 0, 'pixel-spark-fx', {
      speed: { min: 25, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 300,
      gravityY: 60,
      emitting: false
    });
    this.sparksEmitter.setDepth(25);

    // 2. White Steam for Coffee Machine
    const steamCanvas = this.textures.createCanvas('steam-fx', 3, 3);
    if (steamCanvas) {
      const ctx = steamCanvas.getContext();
      ctx.fillStyle = '#dcdcdc';
      ctx.fillRect(0, 0, 3, 3);
      steamCanvas.refresh();
    }

    this.steamEmitter = this.add.particles(305, 412, 'steam-fx', {
      speedY: { min: -15, max: -30 },
      speedX: { min: -4, max: 4 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 600,
      frequency: 250
    });
    this.steamEmitter.setDepth(15);
  }

  private initOfficeStaff() {
    // Wing Alpha Staff (char_0, char_1, char_2, char_3)
    this.spawnCharacter('WING_ALPHA_PLANNER', 'PLANNER', 'WING_ALPHA', 'ANTIGRAVITY');
    this.spawnCharacter('WING_ALPHA_DEV', 'DEV', 'WING_ALPHA', 'ANTIGRAVITY');
    this.spawnCharacter('WING_ALPHA_MANAGER', 'MANAGER', 'WING_ALPHA', 'ANTIGRAVITY');
    this.spawnCharacter('WING_ALPHA_QA', 'QA', 'WING_ALPHA', 'ANTIGRAVITY');

    // Wing Beta Staff (char_4, char_5, char_1, char_3)
    this.spawnCharacter('WING_BETA_PLANNER', 'PLANNER', 'WING_BETA', 'CLAUDE_CODE');
    this.spawnCharacter('WING_BETA_DEV', 'DEV', 'WING_BETA', 'CLAUDE_CODE');
    this.spawnCharacter('WING_BETA_MANAGER', 'MANAGER', 'WING_BETA', 'CLAUDE_CODE');
    this.spawnCharacter('WING_BETA_QA', 'QA', 'WING_BETA', 'CLAUDE_CODE');
  }

  private spawnCharacter(
    id: string,
    role: KeosRole,
    wing: KeosWing,
    harness: string
  ): AgentEntity {
    const coords = this.getSpotCoordinates(wing, 'PANTRY', role);

    const container = this.add.container(coords.x, coords.y);
    container.setDepth(10);

    // Choose character spritesheet based on role & harness
    let charKey = 'char_1';
    if (role === 'PLANNER') charKey = 'char_0';
    if (role === 'DEV') charKey = wing === 'WING_ALPHA' ? 'char_1' : 'char_5';
    if (role === 'MANAGER') charKey = 'char_2';
    if (role === 'QA') charKey = 'char_3';
    if (role === 'SECURITY') charKey = 'char_4';
    if (role === 'SUBAGENT_WORKER') charKey = 'char_5';

    const charSprite = this.add.sprite(0, 0, charKey, 0);
    charSprite.play(`${charKey}_idle`);

    // Monospace Role Nameplate under character
    const roleTag = this.add.text(-20, 18, `[${role.slice(0, 3)}]`, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: harness === 'ANTIGRAVITY' ? '#58a6ff' : '#f0883e'
    });

    container.add([charSprite, roleTag]);

    // Speech Bubble Container (Styled retro pixel comic bubble)
    const bubbleContainer = this.add.container(0, -42);
    bubbleContainer.setVisible(false);
    bubbleContainer.setDepth(40);

    // Bubble Background Box with thick border
    const bubbleBg = this.add.rectangle(0, 0, 180, 48, 0x05070a, 0.95);
    bubbleBg.setStrokeStyle(1.5, 0x58a6ff, 1);

    // Tail pointer triangle
    const bubbleTail = this.add.triangle(0, 26, -5, 0, 5, 0, 0, 6, 0x58a6ff);

    // Line 1: Badge
    const bubbleBadge = this.add.text(-82, -20, '[PLANNING]', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#d29922',
      fontStyle: 'bold'
    });

    // Line 2: Natural Dialogue
    const bubbleQuote = this.add.text(-82, -8, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff',
      wordWrap: { width: 165 }
    });

    // Line 3: Subtext
    const bubbleSubtext = this.add.text(-82, 12, '', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#8b949e'
    });

    bubbleContainer.add([bubbleBg, bubbleTail, bubbleBadge, bubbleQuote, bubbleSubtext]);
    container.add(bubbleContainer);

    const agent: AgentEntity = {
      id,
      role,
      wing,
      harness,
      charSprite,
      container,
      roleTag,
      bubbleContainer,
      bubbleBadge,
      bubbleQuote,
      bubbleSubtext,
      bubbleBg,
      currentX: coords.x,
      currentY: coords.y,
      targetX: coords.x,
      targetY: coords.y,
      state: 'COFFEE',
      stateTimer: 0,
      bubbleTimer: 0
    };

    this.agents.set(id, agent);
    return agent;
  }

  private updateAgentMotion(agent: AgentEntity, delta: number) {
    const dx = agent.targetX - agent.container.x;
    const dy = agent.targetY - agent.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const charKey = agent.charSprite.texture.key;

    if (dist > 4) {
      const speed = 0.12 * delta;
      agent.container.x += (dx / dist) * Math.min(dist, speed);
      agent.container.y += (dy / dist) * Math.min(dist, speed);

      // Play walking animation
      if (Math.abs(dx) > Math.abs(dy)) {
        agent.charSprite.setFlipX(dx < 0);
        if (agent.charSprite.anims.currentAnim?.key !== `${charKey}_walk_right`) {
          agent.charSprite.play(`${charKey}_walk_right`);
        }
      } else if (dy > 0) {
        if (agent.charSprite.anims.currentAnim?.key !== `${charKey}_walk_down`) {
          agent.charSprite.play(`${charKey}_walk_down`);
        }
      } else {
        if (agent.charSprite.anims.currentAnim?.key !== `${charKey}_walk_up`) {
          agent.charSprite.play(`${charKey}_walk_up`);
        }
      }
    } else {
      agent.container.x = agent.targetX;
      agent.container.y = agent.targetY;

      // Play typing animation when at desk in active state
      if (agent.state === 'TYPE') {
        if (agent.charSprite.anims.currentAnim?.key !== `${charKey}_type`) {
          agent.charSprite.play(`${charKey}_type`);
        }
      } else if (agent.state === 'RAGE') {
        // Red rage pulse
        agent.charSprite.setTint(
          Math.floor(this.time.now / 120) % 2 === 0 ? 0xff4444 : 0xffffff
        );
      } else {
        agent.charSprite.clearTint();
        if (agent.charSprite.anims.currentAnim?.key !== `${charKey}_idle`) {
          agent.charSprite.play(`${charKey}_idle`);
        }
      }
    }

    // Handle bubble auto-fade
    if (agent.bubbleTimer > 0) {
      agent.bubbleTimer -= delta;
      if (agent.bubbleTimer <= 0) {
        agent.bubbleContainer.setVisible(false);
      }
    }
  }

  private triggerSpeechBubble(
    agent: AgentEntity,
    badge: string,
    quote: string,
    subtext: string
  ) {
    agent.bubbleBadge.setText(badge);
    agent.bubbleQuote.setText(quote);
    agent.bubbleSubtext.setText(subtext);

    // Adjust badge color by type
    if (badge.includes('PANIC') || badge.includes('ERR')) {
      agent.bubbleBadge.setColor('#f85149');
      agent.bubbleBg.setStrokeStyle(1.5, 0xf85149);
    } else if (badge.includes('CODING') || badge.includes('IO')) {
      agent.bubbleBadge.setColor('#58a6ff');
      agent.bubbleBg.setStrokeStyle(1.5, 0x58a6ff);
    } else if (badge.includes('TEST') || badge.includes('QA')) {
      agent.bubbleBadge.setColor('#3fb950');
      agent.bubbleBg.setStrokeStyle(1.5, 0x3fb950);
    } else {
      agent.bubbleBadge.setColor('#d29922');
      agent.bubbleBg.setStrokeStyle(1.5, 0xd29922);
    }

    agent.bubbleContainer.setVisible(true);
    agent.bubbleTimer = 4800; // Stay visible for 4.8 seconds
  }

  private getSpotCoordinates(
    wing: KeosWing,
    loc: string,
    role: KeosRole
  ): { x: number; y: number } {
    if (loc === 'PANTRY') {
      const offX = (Math.random() - 0.5) * 110;
      const offY = (Math.random() - 0.5) * 35;
      return { x: 580 + offX, y: 440 + offY };
    }

    if (loc === 'WAR_ROOM') {
      const offX = (Math.random() - 0.5) * 50;
      return { x: 500 + offX, y: 130 };
    }

    // Wing Alpha Desk Spots
    if (wing === 'WING_ALPHA') {
      if (loc === 'OFFICE_PM' || role === 'MANAGER') return { x: 90, y: 105 };
      if (loc === 'DEV_DESK' || role === 'DEV') return { x: 90, y: 225 };
      if (loc === 'QA_LAB' || role === 'QA') return { x: 220, y: 225 };
      return { x: 220, y: 105 };
    }

    // Wing Beta Desk Spots
    if (loc === 'OFFICE_PM' || role === 'MANAGER') return { x: 650, y: 105 };
    if (loc === 'DEV_DESK' || role === 'DEV') return { x: 650, y: 225 };
    if (loc === 'QA_LAB' || role === 'QA') return { x: 780, y: 225 };
    return { x: 780, y: 105 };
  }
}

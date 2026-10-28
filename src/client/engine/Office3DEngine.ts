import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DialogueEngine, DialogueMessage } from '../services/DialogueEngine';
import { SoundEffects } from '../services/SoundEffects';

export interface Character3D {
  id: string;
  name: string;
  roleTitle: string;
  roleColor: string;
  skinTone: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  shoesColor: string;
  root: THREE.Group;
  head: THREE.Group;
  torso: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  coffeeMug?: THREE.Mesh;
  tablet?: THREE.Mesh;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  homeX: number;
  homeZ: number;
  homeRotY: number;
  rotationY: number;
  currentAction: 'WORKING' | 'IDLE' | 'WALKING' | 'COLLABORATING' | 'ARGUING' | 'CHILLING' | 'CELEBRATING' | 'THINKING';
  animTimer: number;
  speechBubble: DialogueMessage | null;
  speechTimer: number;
  isRaging: boolean;
  isThinking: boolean;
}

export class Office3DEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  public dialogueEngine: DialogueEngine;
  public soundEffects: SoundEffects;

  public characters: Map<string, Character3D> = new Map();
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  public fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private autonomousTimer: number = 0;

  private speechBubbleOverlay: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    this.dialogueEngine = new DialogueEngine();
    this.soundEffects = new SoundEffects();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#F0F4F8');
    this.scene.fog = new THREE.FogExp2('#F0F4F8', 0.015);

    // 2. Camera (Isometric-angled Perspective)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.5, 200);
    this.camera.position.set(24, 20, 24);

    // 3. Renderer with High-DPI & Soft Shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.05; // Don't go under floor
    this.controls.minDistance = 8;
    this.controls.maxDistance = 65;
    this.controls.target.set(0, 1.5, 0);

    // 5. Speech Bubble HTML Overlay Container
    this.speechBubbleOverlay = document.createElement('div');
    this.speechBubbleOverlay.style.position = 'absolute';
    this.speechBubbleOverlay.style.top = '0';
    this.speechBubbleOverlay.style.left = '0';
    this.speechBubbleOverlay.style.width = '100%';
    this.speechBubbleOverlay.style.height = '100%';
    this.speechBubbleOverlay.style.pointerEvents = 'none';
    this.speechBubbleOverlay.style.overflow = 'hidden';
    container.appendChild(this.speechBubbleOverlay);

    // 6. Build Environment & Characters
    this.setupLighting();
    this.buildOfficeEnvironment();
    this.initHumanoidCharacters();

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Soft Warm Daylight Lighting
  private setupLighting() {
    // Warm Ambient Light
    const ambient = new THREE.AmbientLight('#FFFDF7', 0.95);
    this.scene.add(ambient);

    // Directional Sunbeam through windows
    const sunLight = new THREE.DirectionalLight('#FFFBEB', 1.4);
    sunLight.position.set(20, 28, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);

    // Soft Blue Skylight Bounce
    const skyLight = new THREE.DirectionalLight('#BAE6FD', 0.4);
    skyLight.position.set(-15, 15, -15);
    this.scene.add(skyLight);
  }

  // Realistic Modern Office Floorplan & Furniture
  private buildOfficeEnvironment() {
    // 1. Warm Scandinavian Oak Wood Floor
    const floorGeo = new THREE.PlaneGeometry(36, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#D4A373',
      roughness: 0.65,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. Woven Charcoal Meeting Rug
    const rugGeo = new THREE.PlaneGeometry(12, 8);
    const rugMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9 });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, -2);
    rug.receiveShadow = true;
    this.scene.add(rug);

    // 3. Lounge Rug
    const loungeRug = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 6),
      new THREE.MeshStandardMaterial({ color: '#E2D4C0', roughness: 0.9 })
    );
    loungeRug.rotation.x = -Math.PI / 2;
    loungeRug.position.set(-10, 0.01, 8);
    loungeRug.receiveShadow = true;
    this.scene.add(loungeRug);

    // 4. Perimeter Walls with Glass Windows
    this.buildWalls();

    // 5. Central Conference / Discussion Room
    this.buildDiscussionRoom();

    // 6. Workstation Desks (East & West Wings)
    this.buildWorkstations();

    // 7. Kitchenette Pantry & Synthesizer Bar (Southeast)
    this.buildPantryBar();

    // 8. Lounge & Casual Discussion (Southwest)
    this.buildLounge();

    // 9. Indoor Potted Plants (Monstera & Ficus)
    this.buildIndoorPlants();
  }

  private buildWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: '#F1F5F9', roughness: 0.8 });
    const darkAccentMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.7 });

    // North Wall (Back accent wall)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 0.4), darkAccentMat);
    northWall.position.set(0, 3, -15);
    northWall.receiveShadow = true;
    this.scene.add(northWall);

    // Architecture Whiteboard with diagrams
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3.5, 0.1),
      new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.2 })
    );
    board.position.set(0, 3.5, -14.7);
    this.scene.add(board);

    // Sticky notes & diagram marks on whiteboard
    const colors = ['#FEF08A', '#BAE6FD', '#FBCFE8', '#BBF7D0'];
    for (let i = 0; i < 8; i++) {
      const note = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.02),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
      );
      note.position.set(-3.5 + (i % 4) * 2.2, 4 - Math.floor(i / 4) * 1.2, -14.63);
      this.scene.add(note);
    }

    // West Glass Windows (Sunlight opening)
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.5, 6), windowFrameMat);
      frame.position.set(-18, 2.8, -10 + i * 7);
      this.scene.add(frame);
    }
  }

  private buildDiscussionRoom() {
    // Large Modern Oval Oak Meeting Table
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: '#B47A46', roughness: 0.45 })
    );
    tableTop.scale.set(1.4, 1, 0.85);
    tableTop.position.set(0, 1.45, -2);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.scene.add(tableTop);

    // Table Pillar Base
    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.9, 1.4, 16),
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.6 })
    );
    tableBase.position.set(0, 0.7, -2);
    tableBase.castShadow = true;
    this.scene.add(tableBase);

    // Conference Swivel Chairs around table
    const chairAngles = [0, 0.7, 1.4, 2.1, Math.PI, Math.PI + 0.7, Math.PI + 1.4, Math.PI + 2.1];
    chairAngles.forEach(ang => {
      const cx = Math.cos(ang) * 4.6;
      const cz = Math.sin(ang) * 3.2 - 2;
      this.createOfficeChair(cx, cz, ang + Math.PI);
    });
  }

  private createOfficeChair(x: number, z: number, rotY: number) {
    const chair = new THREE.Group();

    // Base & castors
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: '#334155' })
    );
    base.position.y = 0.1;
    chair.add(base);

    // Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: '#0F172A' })
    );
    stem.position.y = 0.3;
    chair.add(stem);

    // Seat cushion
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.1, 0.75),
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.8 })
    );
    seat.position.y = 0.52;
    seat.castShadow = true;
    chair.add(seat);

    // Backrest
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.08),
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.8 })
    );
    back.position.set(0, 0.9, -0.35);
    back.castShadow = true;
    chair.add(back);

    chair.position.set(x, 0, z);
    chair.rotation.y = rotY;
    this.scene.add(chair);
  }

  private buildWorkstations() {
    // 6 Development Desks
    const deskConfigs = [
      { x: -11, z: -8, rot: 0 },
      { x: -11, z: -2, rot: 0 },
      { x: 11, z: -8, rot: Math.PI },
      { x: 11, z: -2, rot: Math.PI },
      { x: 11, z: 4, rot: Math.PI },
      { x: -11, z: 4, rot: 0 }
    ];

    deskConfigs.forEach(d => {
      // Desk Top
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.1, 1.8),
        new THREE.MeshStandardMaterial({ color: '#E2B078', roughness: 0.5 })
      );
      desk.position.set(d.x, 1.45, d.z);
      desk.castShadow = true;
      desk.receiveShadow = true;
      this.scene.add(desk);

      // Metal Legs
      const legMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.4 });
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.6), legMat);
      leg1.position.set(d.x - 1.6, 0.7, d.z);
      leg1.castShadow = true;
      this.scene.add(leg1);

      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.6), legMat);
      leg2.position.set(d.x + 1.6, 0.7, d.z);
      leg2.castShadow = true;
      this.scene.add(leg2);

      // Dual Monitors
      const monMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.3 });
      const screenMat = new THREE.MeshBasicMaterial({ color: '#0369A1' });

      [-0.75, 0.75].forEach(offset => {
        const mon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.05), monMat);
        mon.position.set(d.x + offset, 2.1, d.z - 0.5 * (d.rot === 0 ? 1 : -1));
        mon.castShadow = true;
        this.scene.add(mon);

        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), screenMat);
        screen.position.set(d.x + offset, 2.1, d.z - 0.47 * (d.rot === 0 ? 1 : -1));
        screen.rotation.y = d.rot === 0 ? 0 : Math.PI;
        this.scene.add(screen);
      });

      // Chair for Desk
      this.createOfficeChair(d.x, d.z + 1.3 * (d.rot === 0 ? 1 : -1), d.rot);
    });
  }

  private buildPantryBar() {
    const px = 11;
    const pz = 10;

    // Kitchen Counter
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(6, 1.7, 2),
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.6 })
    );
    counter.position.set(px, 0.85, pz);
    counter.castShadow = true;
    this.scene.add(counter);

    // Wood Countertop
    const barTop = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.12, 2.3),
      new THREE.MeshStandardMaterial({ color: '#B47A46', roughness: 0.4 })
    );
    barTop.position.set(px, 1.76, pz);
    barTop.castShadow = true;
    this.scene.add(barTop);

    // Espresso Machine
    const coffeeMachine = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.3, metalness: 0.7 })
    );
    coffeeMachine.position.set(px - 1.8, 2.25, pz);
    coffeeMachine.castShadow = true;
    this.scene.add(coffeeMachine);

    // Water Dispenser
    const dispenser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 1.6, 16),
      new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.3 })
    );
    dispenser.position.set(px + 2, 2.5, pz);
    this.scene.add(dispenser);

    // 2 Barstools
    [-1.2, 1.2].forEach(offset => {
      const stool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16),
        new THREE.MeshStandardMaterial({ color: '#334155' })
      );
      stool.position.set(px + offset, 0.6, pz - 1.8);
      stool.castShadow = true;
      this.scene.add(stool);
    });
  }

  private buildLounge() {
    const lx = -10;
    const lz = 8;

    // Modern Ochre Sofa
    const sofaMat = new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.85 });

    // Seat
    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 1.6), sofaMat);
    sofaSeat.position.set(lx, 0.5, lz);
    sofaSeat.castShadow = true;
    this.scene.add(sofaSeat);

    // Backrest
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 0.4), sofaMat);
    sofaBack.position.set(lx, 1.1, lz + 0.6);
    sofaBack.castShadow = true;
    this.scene.add(sofaBack);

    // Armrests
    [-2, 2].forEach(xOff => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 1.6), sofaMat);
      arm.position.set(lx + xOff, 0.9, lz);
      arm.castShadow = true;
      this.scene.add(arm);
    });

    // Low Coffee Table
    const coffeeTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.5 })
    );
    coffeeTable.position.set(lx, 0.35, lz - 1.6);
    coffeeTable.castShadow = true;
    this.scene.add(coffeeTable);
  }

  private buildIndoorPlants() {
    const plantSpots = [
      { x: -16, z: -13 },
      { x: 16, z: -13 },
      { x: -16, z: 13 },
      { x: 16, z: 13 },
      { x: 0, z: 12 }
    ];

    plantSpots.forEach(pos => {
      // Terracotta Pot
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.45, 1.1, 16),
        new THREE.MeshStandardMaterial({ color: '#C86D51', roughness: 0.8 })
      );
      pot.position.set(pos.x, 0.55, pos.z);
      pot.castShadow = true;
      this.scene.add(pot);

      // Plant Foliage (Spherical Monstera / Ficus clusters)
      const leafMat = new THREE.MeshStandardMaterial({ color: '#2D6A4F', roughness: 0.6 });
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), leafMat);
      foliage.position.set(pos.x, 1.6, pos.z);
      foliage.castShadow = true;
      this.scene.add(foliage);
    });
  }

  // 10 Humanoid 3D Characters with full hierarchical joint rigs
  private initHumanoidCharacters() {
    const roster = [
      { id: 'blaze', name: 'Blaze', roleTitle: 'Engineering PM', roleColor: '#FF3366', skinTone: '#FCD34D', hairColor: '#1E293B', shirtColor: '#DC2626', pantsColor: '#1E293B', shoesColor: '#FFFFFF', homeX: 0, homeZ: -0.2, homeRot: 0 },
      { id: 'nova', name: 'Nova', roleTitle: 'Tech Lead & Architect', roleColor: '#00F0FF', skinTone: '#FDE68A', hairColor: '#64748B', shirtColor: '#0F172A', pantsColor: '#1E293B', shoesColor: '#00F0FF', homeX: -2.8, homeZ: -2, homeRot: Math.PI / 2 },
      { id: 'viper', name: 'Viper', roleTitle: 'QA Lead', roleColor: '#00FF9D', skinTone: '#F59E0B', hairColor: '#047857', shirtColor: '#059669', pantsColor: '#1E293B', shoesColor: '#00FF9D', homeX: 2.8, homeZ: -2, homeRot: -Math.PI / 2 },
      { id: 'echo', name: 'Echo', roleTitle: 'QC / User Tester', roleColor: '#2DD4BF', skinTone: '#FDE68A', hairColor: '#0D9488', shirtColor: '#0D9488', pantsColor: '#334155', shoesColor: '#FFFFFF', homeX: 2.2, homeZ: -3.8, homeRot: -Math.PI * 0.75 },
      { id: 'rex', name: 'Rex', roleTitle: 'Frontend Engineer', roleColor: '#38BDF8', skinTone: '#FCD34D', hairColor: '#78350F', shirtColor: '#0284C7', pantsColor: '#1E293B', shoesColor: '#FFFFFF', homeX: -11, homeZ: -6.5, homeRot: Math.PI },
      { id: 'aura', name: 'Aura', roleTitle: 'UI/UX Designer', roleColor: '#EC4899', skinTone: '#FDE68A', hairColor: '#BE185D', shirtColor: '#DB2777', pantsColor: '#334155', shoesColor: '#FFFFFF', homeX: -11, homeZ: -0.5, homeRot: Math.PI },
      { id: 'kael', name: 'Kael', roleTitle: 'Backend Engineer', roleColor: '#A855F7', skinTone: '#D97706', hairColor: '#0F172A', shirtColor: '#7E22CE', pantsColor: '#1E293B', shoesColor: '#1E293B', homeX: 11, homeZ: -6.5, homeRot: 0 },
      { id: 'tark', name: 'Tark', roleTitle: 'DevOps Specialist', roleColor: '#F97316', skinTone: '#F59E0B', hairColor: '#C2410C', shirtColor: '#EA580C', pantsColor: '#1E293B', shoesColor: '#78350F', homeX: 11, homeZ: -0.5, homeRot: 0 },
      { id: 'rook', name: 'Rook', roleTitle: 'Security Officer', roleColor: '#F59E0B', skinTone: '#D97706', hairColor: '#334155', shirtColor: '#B45309', pantsColor: '#1E293B', shoesColor: '#0F172A', homeX: -2.2, homeZ: -3.8, homeRot: Math.PI * 0.75 },
      { id: 'zero', name: 'Zero', roleTitle: 'R&D Specialist', roleColor: '#6366F1', skinTone: '#FDE68A', hairColor: '#312E81', shirtColor: '#4338CA', pantsColor: '#334155', shoesColor: '#FFFFFF', homeX: 11, homeZ: 2.5, homeRot: 0 }
    ];

    roster.forEach(c => {
      const root = new THREE.Group();

      // Materials
      const skinMat = new THREE.MeshStandardMaterial({ color: c.skinTone, roughness: 0.6 });
      const hairMat = new THREE.MeshStandardMaterial({ color: c.hairColor, roughness: 0.8 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: c.shirtColor, roughness: 0.7 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: c.pantsColor, roughness: 0.8 });
      const shoesMat = new THREE.MeshStandardMaterial({ color: c.shoesColor, roughness: 0.5 });

      // Torso
      const torso = new THREE.Group();
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), shirtMat);
      bodyMesh.castShadow = true;
      bodyMesh.position.y = 1.35;
      torso.add(bodyMesh);

      // Head Group
      const head = new THREE.Group();
      head.position.y = 2.05;

      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), skinMat);
      headMesh.scale.set(1, 1.1, 1);
      headMesh.castShadow = true;
      head.add(headMesh);

      const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), hairMat);
      hairMesh.position.set(0, 0.08, -0.04);
      head.add(hairMesh);

      // Glasses / Visor for Viper & Nova
      if (c.id === 'viper') {
        const visor = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.12, 0.1),
          new THREE.MeshBasicMaterial({ color: '#00FF9D' })
        );
        visor.position.set(0, 0.02, 0.28);
        head.add(visor);
      }

      torso.add(head);

      // Left Arm (Shoulder pivot)
      const leftArm = new THREE.Group();
      leftArm.position.set(-0.46, 1.7, 0);
      const lArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.45, 8), shirtMat);
      lArmMesh.position.y = -0.22;
      lArmMesh.castShadow = true;
      leftArm.add(lArmMesh);

      const leftForearm = new THREE.Group();
      leftForearm.position.y = -0.45;
      const lForeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8), skinMat);
      lForeMesh.position.y = -0.22;
      lForeMesh.castShadow = true;
      leftForearm.add(lForeMesh);
      leftArm.add(leftForearm);
      torso.add(leftArm);

      // Right Arm (Shoulder pivot)
      const rightArm = new THREE.Group();
      rightArm.position.set(0.46, 1.7, 0);
      const rArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.45, 8), shirtMat);
      rArmMesh.position.y = -0.22;
      rArmMesh.castShadow = true;
      rightArm.add(rArmMesh);

      const rightForearm = new THREE.Group();
      rightForearm.position.y = -0.45;
      const rForeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8), skinMat);
      rForeMesh.position.y = -0.22;
      rForeMesh.castShadow = true;
      rightForearm.add(rForeMesh);

      // Coffee mug in right hand for Kael / Zero
      let coffeeMug: THREE.Mesh | undefined;
      if (c.id === 'kael' || c.id === 'zero') {
        coffeeMug = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.16, 12),
          new THREE.MeshStandardMaterial({ color: '#38BDF8' })
        );
        coffeeMug.position.set(0, -0.45, 0.1);
        rightForearm.add(coffeeMug);
      }

      rightArm.add(rightForearm);
      torso.add(rightArm);
      root.add(torso);

      // Left Leg
      const leftLeg = new THREE.Group();
      leftLeg.position.set(-0.2, 0.9, 0);
      const lLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.85, 8), pantsMat);
      lLegMesh.position.y = -0.42;
      lLegMesh.castShadow = true;
      leftLeg.add(lLegMesh);

      const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.35), shoesMat);
      lShoe.position.set(0, -0.85, 0.08);
      lShoe.castShadow = true;
      leftLeg.add(lShoe);
      root.add(leftLeg);

      // Right Leg
      const rightLeg = new THREE.Group();
      rightLeg.position.set(0.2, 0.9, 0);
      const rLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.85, 8), pantsMat);
      rLegMesh.position.y = -0.42;
      rLegMesh.castShadow = true;
      rightLeg.add(rLegMesh);

      const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.35), shoesMat);
      rShoe.position.set(0, -0.85, 0.08);
      rShoe.castShadow = true;
      rightLeg.add(rShoe);
      root.add(rightLeg);

      root.position.set(c.homeX, 0, c.homeZ);
      root.rotation.y = c.homeRot;
      this.scene.add(root);

      this.characters.set(c.id, {
        id: c.id,
        name: c.name,
        roleTitle: c.roleTitle,
        roleColor: c.roleColor,
        skinTone: c.skinTone,
        hairColor: c.hairColor,
        shirtColor: c.shirtColor,
        pantsColor: c.pantsColor,
        shoesColor: c.shoesColor,
        root,
        head,
        torso,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        leftForearm,
        rightForearm,
        coffeeMug,
        x: c.homeX,
        z: c.homeZ,
        targetX: c.homeX,
        targetZ: c.homeZ,
        homeX: c.homeX,
        homeZ: c.homeZ,
        homeRotY: c.homeRot,
        rotationY: c.homeRot,
        currentAction: 'WORKING',
        animTimer: Math.random() * 10,
        speechBubble: null,
        speechTimer: 0,
        isRaging: false,
        isThinking: false
      });
    });
  }

  public start() {
    if (this.animFrameId) return;
    this.lastTime = performance.now();

    const renderLoop = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      this.update(dt);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.updateSpeechBubbles();

      this.frameCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 0.5) {
        this.fps = Math.round(this.frameCount / this.fpsTimer);
        this.frameCount = 0;
        this.fpsTimer = 0;
      }

      this.animFrameId = requestAnimationFrame(renderLoop);
    };

    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private update(dt: number) {
    this.autonomousTimer += dt;

    if (this.autonomousTimer > 11) {
      this.autonomousTimer = 0;
      this.triggerSpontaneousActivity();
    }

    this.characters.forEach(char => {
      char.animTimer += dt * 5;

      if (char.speechBubble) {
        char.speechTimer -= dt * 1000;
        if (char.speechTimer <= 0) {
          char.speechBubble = null;
          char.isRaging = false;
          char.isThinking = false;
        }
      }

      // Movement Pathfinding
      const dx = char.targetX - char.x;
      const dz = char.targetZ - char.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.15) {
        char.currentAction = 'WALKING';
        const speed = 3.6 * dt;
        char.x += (dx / dist) * Math.min(speed, dist);
        char.z += (dz / dist) * Math.min(speed, dist);
        char.root.position.x = char.x;
        char.root.position.z = char.z;

        // Face walking direction
        const targetRot = Math.atan2(dx, dz);
        char.root.rotation.y = targetRot;
      } else {
        char.x = char.targetX;
        char.z = char.targetZ;
        char.root.position.x = char.x;
        char.root.position.z = char.z;

        if (char.currentAction === 'WALKING') {
          if (char.isRaging) {
            char.currentAction = 'ARGUING';
          } else if (char.isThinking) {
            char.currentAction = 'THINKING';
          } else if (char.x === char.homeX && char.z === char.homeZ) {
            char.currentAction = 'WORKING';
            char.root.rotation.y = char.homeRotY;
          } else {
            char.currentAction = 'COLLABORATING';
          }
        }
      }

      // Procedural Humanoid Skeletal Animation
      this.animateHumanoidJoints(char, dt);

      // Key typing sound
      if (char.currentAction === 'WORKING' && Math.random() < 0.05) {
        this.soundEffects.playKeyClick();
      }
    });
  }

  // Articulated 3D Joint Animations (Walking, Typing, Arguing, Chilling)
  private animateHumanoidJoints(char: Character3D, _dt: number) {
    const t = char.animTimer;

    switch (char.currentAction) {
      case 'WALKING': {
        const stride = Math.sin(t * 1.8);
        char.leftLeg.rotation.x = stride * 0.65;
        char.rightLeg.rotation.x = -stride * 0.65;
        char.leftArm.rotation.x = -stride * 0.55;
        char.rightArm.rotation.x = stride * 0.55;
        char.torso.position.y = Math.abs(Math.sin(t * 3.6)) * 0.08;
        char.head.rotation.x = Math.sin(t * 3.6) * 0.04;
        break;
      }

      case 'WORKING': {
        // Seated typing
        char.leftLeg.rotation.x = -Math.PI / 2.2;
        char.rightLeg.rotation.x = -Math.PI / 2.2;
        char.torso.position.y = -0.3; // sit down on chair

        const tapL = Math.sin(t * 2.8) * 0.15;
        const tapR = Math.cos(t * 2.8) * 0.15;
        char.leftArm.rotation.x = -Math.PI / 3 + tapL;
        char.rightArm.rotation.x = -Math.PI / 3 + tapR;
        char.leftForearm.rotation.x = -Math.PI / 4;
        char.rightForearm.rotation.x = -Math.PI / 4;
        char.head.rotation.x = 0.22; // looking at screen
        break;
      }

      case 'ARGUING': {
        // Dramatic angry gestures & head shaking
        char.torso.position.y = 0;
        char.leftLeg.rotation.x = 0;
        char.rightLeg.rotation.x = 0;

        char.leftArm.rotation.x = -0.4; // hand on hip
        char.leftArm.rotation.z = -0.5;

        char.rightArm.rotation.x = -Math.PI / 2.5 + Math.sin(t * 3) * 0.35; // furious pointing
        char.rightArm.rotation.z = 0.2;

        char.head.rotation.y = Math.sin(t * 4) * 0.25; // angry head shake
        break;
      }

      case 'CHILLING': {
        // Sipping coffee at bar or lounging
        char.torso.position.y = 0;
        char.leftLeg.rotation.x = 0;
        char.rightLeg.rotation.x = 0;

        char.leftArm.rotation.x = -0.2;
        char.rightArm.rotation.x = -Math.PI / 2.2 + Math.sin(t * 0.8) * 0.25; // raising mug to lips
        char.head.rotation.x = 0.05;
        break;
      }

      case 'THINKING': {
        // Hand touching chin, looking up
        char.torso.position.y = 0;
        char.leftArm.rotation.x = -Math.PI / 3;
        char.leftForearm.rotation.x = -Math.PI / 3; // arm folded across chest

        char.rightArm.rotation.x = -Math.PI / 1.8;
        char.rightForearm.rotation.x = -Math.PI / 2; // hand to chin
        char.head.rotation.x = -0.25; // looking up
        char.head.rotation.y = 0.2;
        break;
      }

      case 'CELEBRATING': {
        // Both arms raised high in victory!
        char.torso.position.y = Math.abs(Math.sin(t * 3)) * 0.2;
        char.leftArm.rotation.x = -Math.PI * 0.85;
        char.rightArm.rotation.x = -Math.PI * 0.85;
        char.head.rotation.x = -0.3;
        break;
      }

      default: {
        // Calm idle breathing
        char.torso.position.y = Math.sin(t * 0.8) * 0.02;
        char.leftArm.rotation.x = 0;
        char.rightArm.rotation.x = 0;
        char.head.rotation.x = 0;
        break;
      }
    }
  }

  private triggerSpontaneousActivity() {
    const roll = Math.random();

    if (roll < 0.35) {
      const dlg = this.dialogueEngine.getRandomIdleDialogue();
      const speaker = this.characters.get(dlg.speakerId);
      if (speaker) {
        speaker.speechBubble = dlg;
        speaker.speechTimer = dlg.durationMs;
      }
    } else if (roll < 0.6) {
      // Walk to coffee kitchenette
      const candidates = ['zero', 'kael', 'rex', 'aura', 'echo', 'tark'];
      const pickId = candidates[Math.floor(Math.random() * candidates.length)];
      const char = this.characters.get(pickId);
      if (char && char.currentAction === 'WORKING') {
        char.targetX = 10 + (Math.random() * 2 - 1);
        char.targetZ = 8.5 + (Math.random() * 1.5 - 0.75);
        char.currentAction = 'CHILLING';
        this.soundEffects.playCoffeeSip();

        setTimeout(() => {
          if (char.currentAction === 'CHILLING') {
            char.targetX = char.homeX;
            char.targetZ = char.homeZ;
          }
        }, 7000);
      }
    } else if (roll < 0.8) {
      // Pondering in thought
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

            if (msg.targetId) {
              const target = this.characters.get(msg.targetId);
              if (target) {
                // Stomp over to target's desk
                speaker.targetX = target.x + (target.x > speaker.x ? -1.8 : 1.8);
                speaker.targetZ = target.z;

                setTimeout(() => {
                  speaker.targetX = speaker.homeX;
                  speaker.targetZ = speaker.homeZ;
                  speaker.isRaging = false;
                }, 6000);
              }
            }
          } else if (msg.tone === 'celebrate') {
            this.soundEffects.playTestPass();
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

      if (isError) {
        actor.isRaging = true;
        this.soundEffects.playErrorAlert();

        const devTarget = this.characters.get('rex') || this.characters.get('kael');
        if (devTarget && actor.id === 'blaze') {
          actor.targetX = devTarget.x + 1.8;
          actor.targetZ = devTarget.z;
          setTimeout(() => {
            actor.targetX = actor.homeX;
            actor.targetZ = actor.homeZ;
            actor.isRaging = false;
          }, 5500);
        }
      } else {
        this.soundEffects.playHologramSweep();
      }
    }
  }

  // Project 3D World Positions of Characters to HTML Speech Bubbles
  private updateSpeechBubbles() {
    this.speechBubbleOverlay.innerHTML = '';
    const tempVec = new THREE.Vector3();
    const widthHalf = this.container.clientWidth / 2;
    const heightHalf = this.container.clientHeight / 2;

    this.characters.forEach(char => {
      if (!char.speechBubble) return;

      char.root.getWorldPosition(tempVec);
      tempVec.y += 2.8; // position bubble above 3D head
      tempVec.project(this.camera);

      // Check if in front of camera
      if (tempVec.z > 1) return;

      const screenX = tempVec.x * widthHalf + widthHalf;
      const screenY = -tempVec.y * heightHalf + heightHalf;

      const bubble = document.createElement('div');
      bubble.style.position = 'absolute';
      bubble.style.left = `${screenX}px`;
      bubble.style.top = `${screenY}px`;
      bubble.style.transform = 'translate(-50%, -100%)';
      bubble.style.background = 'rgba(15, 23, 42, 0.95)';
      bubble.style.border = `1.5px solid ${char.roleColor}`;
      bubble.style.borderRadius = '8px';
      bubble.style.padding = '8px 14px';
      bubble.style.color = '#F8FAFC';
      bubble.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
      bubble.style.fontSize = '12px';
      bubble.style.maxWidth = '280px';
      bubble.style.boxShadow = `0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px ${char.roleColor}33`;
      bubble.style.pointerEvents = 'none';
      bubble.style.zIndex = '20';

      const header = document.createElement('div');
      header.style.color = char.roleColor;
      header.style.fontWeight = '700';
      header.style.fontSize = '10px';
      header.style.marginBottom = '3px';
      header.textContent = `${char.name} · ${char.roleTitle}`;

      const text = document.createElement('div');
      text.style.lineHeight = '1.4';
      text.style.fontWeight = '500';
      text.textContent = char.speechBubble.text;

      bubble.appendChild(header);
      bubble.appendChild(text);
      this.speechBubbleOverlay.appendChild(bubble);
    });
  }

  public resetCamera() {
    this.camera.position.set(24, 20, 24);
    this.controls.target.set(0, 1.5, 0);
  }
}

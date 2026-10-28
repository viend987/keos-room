import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DialogueEngine, DialogueMessage } from '../services/DialogueEngine';
import { SoundEffects } from '../services/SoundEffects';

export interface Character3D {
  id: string;
  name: string;
  roleTitle: string;
  roleColor: string;
  assetFile: string;
  root: THREE.Group;
  mixer?: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  currentAnimName: string;
  headBone?: THREE.Object3D;
  leftArmBone?: THREE.Object3D;
  rightArmBone?: THREE.Object3D;
  leftForearmBone?: THREE.Object3D;
  rightForearmBone?: THREE.Object3D;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  homeX: number;
  homeZ: number;
  homeRotY: number;
  currentAction: 'WORKING' | 'IDLE' | 'WALKING' | 'COLLABORATING' | 'ARGUING' | 'CHILLING' | 'CELEBRATING' | 'THINKING';
  animTimer: number;
  speechBubble: DialogueMessage | null;
  speechTimer: number;
  isRaging: boolean;
  seed: number;
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
  private gltfLoader: GLTFLoader;
  private loadedModels: Map<string, THREE.Group> = new Map();
  private loadedAnimations: Map<string, THREE.AnimationClip[]> = new Map();
  private modelPromises: Map<string, Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.gltfLoader = new GLTFLoader();

    this.dialogueEngine = new DialogueEngine();
    this.soundEffects = new SoundEffects();

    // 1. Scene with Rich Architectural Atmosphere (No blank white canvas!)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#CBD5E1'); // Soft atmospheric daylight sky
    this.scene.fog = new THREE.FogExp2('#CBD5E1', 0.009);

    // 2. Camera: Isometric-angled Studio View
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(35, aspect, 0.5, 200);
    this.camera.position.set(24, 18, 22);

    // 3. High-Quality WebGL Renderer with ACES Tone Mapping and Soft Shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls with smooth damping
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.08;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 65;
    this.controls.target.set(0, 1.2, 0);

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

    // 6. Build Rich Architectural Office Environment
    this.setupLighting();
    this.buildCityscapeBackdrop();
    this.buildArchitecturalOffice();

    // 7. Initialize 10 Real Human Crew Members
    this.initRealHumanCrew();

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ==========================================
  // LIGHTING & AMBIENT ATMOSPHERE
  // ==========================================
  private setupLighting() {
    // Warm Interior Ambient Fill (Soft, non-sterile)
    const ambient = new THREE.AmbientLight('#FFFBF2', 0.95);
    this.scene.add(ambient);

    // Hemisphere Light: Sky Blue above, Warm Floor Bounce below
    const hemiLight = new THREE.HemisphereLight('#E2EEFF', '#E5D6C5', 0.7);
    hemiLight.position.set(0, 30, 0);
    this.scene.add(hemiLight);

    // Main Sunlight Streaming in through Windows (Warm golden angle)
    const sunLight = new THREE.DirectionalLight('#FFF3D9', 2.3);
    sunLight.position.set(16, 22, 16);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0002;
    this.scene.add(sunLight);

    // Secondary Cool Sky Fill from opposite window side
    const skyFill = new THREE.DirectionalLight('#93C5FD', 0.55);
    skyFill.position.set(-18, 16, -18);
    this.scene.add(skyFill);

    // Warm Architectural Ceiling Pendant Lights over Discussion Table
    const tableSpot = new THREE.PointLight('#FFE7BA', 1.8, 12, 1.2);
    tableSpot.position.set(0, 4.2, -1);
    this.scene.add(tableSpot);
  }

  // ==========================================
  // CITYSCAPE & EXTERIOR WINDOW BACKDROP
  // ==========================================
  private buildCityscapeBackdrop() {
    // Distant City Skyline Silhouettes visible through loft windows
    const cityGroup = new THREE.Group();
    const bldgMat = new THREE.MeshStandardMaterial({
      color: '#64748B',
      roughness: 0.9,
      metalness: 0.1
    });

    const bldgColors = ['#475569', '#334155', '#64748B', '#1E293B', '#94A3B8'];
    for (let i = -14; i <= 14; i += 2.5) {
      const height = 8 + Math.abs(Math.sin(i * 1.5)) * 14;
      const width = 1.8 + Math.abs(Math.cos(i)) * 1.2;
      const mat = new THREE.MeshStandardMaterial({
        color: bldgColors[Math.floor(Math.abs(i)) % bldgColors.length],
        roughness: 0.8
      });
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), mat);
      bldg.position.set(i * 1.8, height / 2 - 2, -24 - Math.abs(Math.sin(i)) * 6);
      cityGroup.add(bldg);

      // Distant East city buildings
      const bldgEast = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.85, width), mat);
      bldgEast.position.set(24 + Math.abs(Math.cos(i)) * 5, (height * 0.85) / 2 - 2, i * 1.8);
      cityGroup.add(bldgEast);
    }

    this.scene.add(cityGroup);
  }

  // ==========================================
  // ARCHITECTURAL OFFICE ENVIRONMENT
  // ==========================================
  private buildArchitecturalOffice() {
    const officeRoot = new THREE.Group();

    // 1. Warm Scandinavian Oak Parquet Floor (28m x 22m)
    const floorGeo = new THREE.BoxGeometry(29, 0.4, 23);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#B08359', // Rich warm oak
      roughness: 0.55,
      metalness: 0.08
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = true;
    officeRoot.add(floor);

    // Floor edge baseboard trim (Dark architectural bronze/charcoal)
    const trimMat = new THREE.MeshStandardMaterial({ color: '#27272A', roughness: 0.8 });
    const trimNorth = new THREE.Mesh(new THREE.BoxGeometry(29, 0.25, 0.15), trimMat);
    trimNorth.position.set(0, 0.125, -11.45);
    officeRoot.add(trimNorth);

    const trimWest = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 23), trimMat);
    trimWest.position.set(-14.45, 0.125, 0);
    officeRoot.add(trimWest);

    // 2. Woven Meeting Area Rug
    this.loadGlbModel('/assets/office-3d/rug-v1.glb', (rug) => {
      rug.scale.set(1.4, 1, 1.4);
      rug.position.set(0, 0.01, -1);
      rug.receiveShadow = true;
      this.scene.add(rug);
    });

    // 3. Lounge Rug
    this.loadGlbModel('/assets/office-3d/rug-v1.glb', (rug) => {
      rug.scale.set(1.1, 1, 1.1);
      rug.position.set(-8.5, 0.01, 6.5);
      rug.receiveShadow = true;
      this.scene.add(rug);
    });

    // 4. Perimeter Walls & Industrial Loft Windows
    this.buildArchitecturalWalls(officeRoot);

    // 5. Central Boardroom Table & Real Chairs
    this.buildBoardroomArea();

    // 6. Developer Workstations (Executive Desks, Chairs, Monitors)
    this.buildWorkstations();

    // 7. Executive Lounge Area
    this.buildExecutiveLounge();

    // 8. Server Tech & Pantry Station
    this.buildTechAndPantry();

    this.scene.add(officeRoot);
  }

  private buildArchitecturalWalls(root: THREE.Group) {
    // North Wall Structure: Brick Accent Center + Industrial Windows on Flanks
    this.loadGlbModel('/assets/office-3d/brick-panel-v1.glb', (brick) => {
      // Center brick panel behind whiteboard
      brick.scale.set(4.5, 1.2, 1);
      brick.position.set(0, 1.8 * 1.2, -11.3);
      brick.castShadow = true;
      brick.receiveShadow = true;
      this.scene.add(brick);
    });

    // Industrial Grid Windows along North wall (Back)
    this.loadGlbModel('/assets/office-3d/grid-window-v1.glb', (win1) => {
      win1.scale.set(1.4, 1.4, 1.4);
      win1.position.set(-8.5, 2.0, -11.3);
      this.scene.add(win1);
    });

    this.loadGlbModel('/assets/office-3d/grid-window-v1.glb', (win2) => {
      win2.scale.set(1.4, 1.4, 1.4);
      win2.position.set(8.5, 2.0, -11.3);
      this.scene.add(win2);
    });

    // West Wall Windows (Left background overlooking skyline)
    this.loadGlbModel('/assets/office-3d/grid-window-v1.glb', (winWest1) => {
      winWest1.scale.set(1.4, 1.4, 1.4);
      winWest1.rotation.y = Math.PI / 2;
      winWest1.position.set(-14.3, 2.0, -5.5);
      this.scene.add(winWest1);
    });

    this.loadGlbModel('/assets/office-3d/grid-window-v1.glb', (winWest2) => {
      winWest2.scale.set(1.4, 1.4, 1.4);
      winWest2.rotation.y = Math.PI / 2;
      winWest2.position.set(-14.3, 2.0, 0.5);
      this.scene.add(winWest2);
    });

    // Large Architecture Whiteboard on Brick Accent Wall
    const whiteboard = new THREE.Mesh(
      new THREE.BoxGeometry(9, 3.2, 0.08),
      new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.2, metalness: 0.1 })
    );
    whiteboard.position.set(0, 3.2, -11.0);
    root.add(whiteboard);

    // Whiteboard header and sticky notes
    const headerBar = new THREE.Mesh(
      new THREE.BoxGeometry(9.1, 0.2, 0.1),
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.7 })
    );
    headerBar.position.set(0, 4.75, -10.98);
    root.add(headerBar);

    const noteColors = ['#FEF08A', '#BAE6FD', '#FBCFE8', '#BBF7D0'];
    for (let i = 0; i < 8; i++) {
      const note = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.02),
        new THREE.MeshBasicMaterial({ color: noteColors[i % noteColors.length] })
      );
      note.position.set(-3.2 + (i % 4) * 2.1, 3.8 - Math.floor(i / 4) * 1.1, -10.94);
      root.add(note);
    }
  }

  private buildBoardroomArea() {
    // Real 3D Conference Table
    this.loadGlbModel('/assets/office-3d/conference-v1.glb', (conf) => {
      conf.scale.set(1.3, 1.3, 1.3);
      conf.position.set(0, 0.81 * 1.3, -0.8);
      conf.castShadow = true;
      conf.receiveShadow = true;
      this.scene.add(conf);
    });

    // Real Executive Chairs around the Conference Table
    const confChairs = [
      { x: 0, z: 0.6, rot: Math.PI },          // South (Blaze - PM)
      { x: -1.45, z: -0.8, rot: Math.PI / 2 }, // West (Nova - Tech Lead)
      { x: 1.45, z: -0.8, rot: -Math.PI / 2 }, // East (Viper - QA Lead)
      { x: 0, z: -2.2, rot: 0 }                // North (Rook - Security)
    ];

    confChairs.forEach(pos => {
      this.loadGlbModel('/assets/office-3d/chair-v1.glb', (chair) => {
        chair.scale.set(1, 1, 1);
        chair.position.set(pos.x, 0.25, pos.z);
        chair.rotation.y = pos.rot;
        chair.castShadow = true;
        this.scene.add(chair);
      });
    });
  }

  private buildWorkstations() {
    // 6 Dedicated Engineering Workstations (3 West Pod, 3 East Pod)
    // Desks face towards the center aisle so developers look into the room
    const workstations = [
      // West Pod (Desk at x = -8.5, developer sits at x = -9.2 facing East/center)
      { id: 'rex', deskX: -8.5, deskZ: -6.5, chairX: -9.25, chairZ: -6.5, rot: Math.PI / 2 },
      { id: 'aura', deskX: -8.5, deskZ: -2.5, chairX: -9.25, chairZ: -2.5, rot: Math.PI / 2 },
      { id: 'zero', deskX: -8.5, deskZ: 1.5, chairX: -9.25, chairZ: 1.5, rot: Math.PI / 2 },

      // East Pod (Desk at x = 8.5, developer sits at x = 9.25 facing West/center)
      { id: 'kael', deskX: 8.5, deskZ: -6.5, chairX: 9.25, chairZ: -6.5, rot: -Math.PI / 2 },
      { id: 'tark', deskX: 8.5, deskZ: -2.5, chairX: 9.25, chairZ: -2.5, rot: -Math.PI / 2 },
      { id: 'echo', deskX: 8.5, deskZ: 1.5, chairX: 9.25, chairZ: 1.5, rot: -Math.PI / 2 }
    ];

    workstations.forEach(ws => {
      // 1. Executive Desk
      this.loadGlbModel('/assets/office-3d/desk-v1.glb', (desk) => {
        desk.scale.set(1.1, 1.1, 1.1);
        desk.position.set(ws.deskX, 0.82 * 1.1, ws.deskZ);
        desk.rotation.y = ws.rot;
        desk.castShadow = true;
        desk.receiveShadow = true;
        this.scene.add(desk);
      });

      // 2. Ergonomic Chair (Placed precisely facing the desk)
      this.loadGlbModel('/assets/office-3d/chair-v1.glb', (chair) => {
        chair.scale.set(1, 1, 1);
        chair.position.set(ws.chairX, 0.25, ws.chairZ);
        chair.rotation.y = ws.rot;
        chair.castShadow = true;
        this.scene.add(chair);
      });

      // 3. Workstation Dual Monitors with active code glow
      this.buildDeskMonitors(ws.deskX, ws.deskZ, ws.rot);
    });
  }

  private buildDeskMonitors(deskX: number, deskZ: number, deskRot: number) {
    const monGroup = new THREE.Group();
    const monStandMat = new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.4, metalness: 0.8 });
    const codeScreenMat = new THREE.MeshBasicMaterial({ color: '#0F172A' }); // Dark IDE background

    // Monitor 1 (Main landscape)
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 12), monStandMat);
    stand.position.set(0, 0.175, 0);
    monGroup.add(stand);

    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.03), monStandMat);
    screenFrame.position.set(0, 0.45, 0);
    monGroup.add(screenFrame);

    // Glowing IDE Screen face
    const codeScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.51),
      new THREE.MeshBasicMaterial({ color: '#1E293B' })
    );
    codeScreen.position.set(0, 0.45, 0.016);
    monGroup.add(codeScreen);

    // Code lines on screen
    for (let l = 0; l < 5; l++) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3 + Math.random() * 0.4, 0.03),
        new THREE.MeshBasicMaterial({ color: l % 2 === 0 ? '#38BDF8' : '#34D399' })
      );
      line.position.set(-0.15, 0.58 - l * 0.07, 0.018);
      monGroup.add(line);
    }

    // Keyboard & Mouse
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.18), monStandMat);
    kb.position.set(0, 0.01, 0.3);
    monGroup.add(kb);

    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.12), monStandMat);
    mouse.position.set(0.35, 0.01, 0.3);
    monGroup.add(mouse);

    monGroup.position.set(deskX, 0.9, deskZ);
    monGroup.rotation.y = deskRot;
    this.scene.add(monGroup);
  }

  private buildExecutiveLounge() {
    // Designer Sofa
    this.loadGlbModel('/assets/office-3d/sofa-v1.glb', (sofa) => {
      sofa.scale.set(1.2, 1.2, 1.2);
      sofa.position.set(-8.5, 0.06, 6.0);
      sofa.rotation.y = Math.PI;
      sofa.castShadow = true;
      sofa.receiveShadow = true;
      this.scene.add(sofa);
    });

    // Armchair
    this.loadGlbModel('/assets/office-3d/armchair-v1.glb', (chair) => {
      chair.scale.set(1.2, 1.2, 1.2);
      chair.position.set(-5.5, 0.06, 7.5);
      chair.rotation.y = -Math.PI / 2;
      chair.castShadow = true;
      this.scene.add(chair);
    });

    // Coffee Table
    this.loadGlbModel('/assets/office-3d/coffee-v1.glb', (table) => {
      table.scale.set(1.2, 1.2, 1.2);
      table.position.set(-8.5, 0.25, 7.5);
      table.castShadow = true;
      this.scene.add(table);
    });

    // Wooden Bookcase against west wall
    this.loadGlbModel('/assets/office-3d/bookcase-v1.glb', (bookcase) => {
      bookcase.scale.set(1.2, 1.2, 1.2);
      bookcase.position.set(-13.8, 1.67 * 1.2, 6.0);
      bookcase.rotation.y = Math.PI / 2;
      bookcase.castShadow = true;
      this.scene.add(bookcase);
    });
  }

  private buildTechAndPantry() {
    // Enterprise Server Rack (Southeast corner)
    this.loadGlbModel('/assets/office-3d/tech-server-rack-v1.glb', (rack) => {
      rack.scale.set(1.1, 1.1, 1.1);
      rack.position.set(12.5, 1.02 * 1.1, -9.0);
      rack.rotation.y = -Math.PI / 2;
      rack.castShadow = true;
      this.scene.add(rack);
    });

    // Kitchenette Coffee Pantry Counter
    const counterMat = new THREE.MeshStandardMaterial({ color: '#27272A', roughness: 0.4 });
    const woodTopMat = new THREE.MeshStandardMaterial({ color: '#8D5B2E', roughness: 0.3 });

    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.95, 1.2), counterMat);
    counter.position.set(10.5, 0.475, 8.5);
    counter.castShadow = true;
    counter.receiveShadow = true;
    this.scene.add(counter);

    const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 1.3), woodTopMat);
    top.position.set(10.5, 0.98, 8.5);
    this.scene.add(top);

    // Espresso Machine
    const coffeeMachine = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.55, 0.55),
      new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.3, metalness: 0.5 })
    );
    coffeeMachine.position.set(11.5, 1.26, 8.5);
    this.scene.add(coffeeMachine);

    // Water Dispenser
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.75, 16),
      new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.2, metalness: 0.3 })
    );
    water.position.set(9.0, 1.35, 8.5);
    this.scene.add(water);

    // Potted Indoor Office Plants (Ficus trees)
    this.buildFicusPlant(-12.5, -9.5);
    this.buildFicusPlant(12.5, 6.0);
    this.buildFicusPlant(5.0, -10.0);
  }

  private buildFicusPlant(x: number, z: number) {
    const plantGroup = new THREE.Group();
    const potMat = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.7 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.6 });

    // Ceramic Planter
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.75, 16), potMat);
    pot.position.set(0, 0.375, 0);
    pot.castShadow = true;
    plantGroup.add(pot);

    // Foliage Clusters
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: '#78350F' })
    );
    trunk.position.set(0, 1.1, 0);
    plantGroup.add(trunk);

    for (let i = 0; i < 4; i++) {
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + i * 0.05, 1), leafMat);
      foliage.position.set(
        Math.sin(i * 1.6) * 0.25,
        1.5 + i * 0.35,
        Math.cos(i * 1.6) * 0.25
      );
      foliage.castShadow = true;
      plantGroup.add(foliage);
    }

    plantGroup.position.set(x, 0, z);
    this.scene.add(plantGroup);
  }

  // ==========================================
  // REAL HUMAN CHARACTER CREW LOADING & RIGGING
  // ==========================================
  private initRealHumanCrew() {
    // 10 Canonical Department Specialists with Distinct 3D Models
    const crewRoster = [
      // Central Meeting Cluster
      {
        id: 'blaze',
        name: 'Blaze',
        roleTitle: 'Engineering PM',
        roleColor: '#EF4444',
        asset: '/assets/crew/office-male-base.glb',
        homeX: 0,
        homeZ: 0.6,
        homeRot: Math.PI,
        startAction: 'WORKING' as const
      },
      {
        id: 'nova',
        name: 'Nova',
        roleTitle: 'Tech Lead & Architect',
        roleColor: '#06B6D4',
        asset: '/assets/crew/office-ara.glb',
        homeX: -1.45,
        homeZ: -0.8,
        homeRot: Math.PI / 2,
        startAction: 'COLLABORATING' as const
      },
      {
        id: 'viper',
        name: 'Viper',
        roleTitle: 'QA Lead',
        roleColor: '#10B981',
        asset: '/assets/crew/office-dohun.glb',
        homeX: 1.45,
        homeZ: -0.8,
        homeRot: -Math.PI / 2,
        startAction: 'COLLABORATING' as const
      },
      {
        id: 'rook',
        name: 'Rook',
        roleTitle: 'Security Officer',
        roleColor: '#F59E0B',
        asset: '/assets/crew/office-jin.glb',
        homeX: 0,
        homeZ: -2.2,
        homeRot: 0,
        startAction: 'WORKING' as const
      },

      // Workstation Cluster (West Pod)
      {
        id: 'rex',
        name: 'Rex',
        roleTitle: 'Frontend Engineer',
        roleColor: '#38BDF8',
        asset: '/assets/crew/office-bomi.glb',
        homeX: -9.25,
        homeZ: -6.5,
        homeRot: Math.PI / 2,
        startAction: 'WORKING' as const
      },
      {
        id: 'aura',
        name: 'Aura',
        roleTitle: 'UI/UX Designer',
        roleColor: '#EC4899',
        asset: '/assets/crew/office-daeun.glb',
        homeX: -9.25,
        homeZ: -2.5,
        homeRot: Math.PI / 2,
        startAction: 'WORKING' as const
      },
      {
        id: 'zero',
        name: 'Zero',
        roleTitle: 'R&D Specialist',
        roleColor: '#6366F1',
        asset: '/assets/crew/office-min.glb',
        homeX: -9.25,
        homeZ: 1.5,
        homeRot: Math.PI / 2,
        startAction: 'THINKING' as const
      },

      // Workstation Cluster (East Pod)
      {
        id: 'kael',
        name: 'Kael',
        roleTitle: 'Backend Engineer',
        roleColor: '#A855F7',
        asset: '/assets/crew/office-chan.glb',
        homeX: 9.25,
        homeZ: -6.5,
        homeRot: -Math.PI / 2,
        startAction: 'WORKING' as const
      },
      {
        id: 'tark',
        name: 'Tark',
        roleTitle: 'DevOps Specialist',
        roleColor: '#F97316',
        asset: '/assets/crew/office-garam.glb',
        homeX: 9.25,
        homeZ: -2.5,
        homeRot: -Math.PI / 2,
        startAction: 'WORKING' as const
      },
      {
        id: 'echo',
        name: 'Echo',
        roleTitle: 'QC / User Tester',
        roleColor: '#2DD4BF',
        asset: '/assets/crew/office-eun.glb',
        homeX: 9.25,
        homeZ: 1.5,
        homeRot: -Math.PI / 2,
        startAction: 'WORKING' as const
      }
    ];

    crewRoster.forEach((c, idx) => {
      this.gltfLoader.load(
        c.asset,
        (gltf) => {
          const charScene = gltf.scene;
          charScene.scale.set(1.0, 1.0, 1.0);

          // Enable shadows and find gesture bones
          let headBone: THREE.Object3D | undefined;
          let leftArmBone: THREE.Object3D | undefined;
          let rightArmBone: THREE.Object3D | undefined;
          let leftForearmBone: THREE.Object3D | undefined;
          let rightForearmBone: THREE.Object3D | undefined;

          charScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
            if (child.name === 'Head') headBone = child;
            if (child.name === 'LeftArm' || child.name === 'UpperArm.L') leftArmBone = child;
            if (child.name === 'RightArm' || child.name === 'UpperArm.R') rightArmBone = child;
            if (child.name === 'LeftForeArm' || child.name === 'LowerArm.L') leftForearmBone = child;
            if (child.name === 'RightForeArm' || child.name === 'LowerArm.R') rightForearmBone = child;
          });

          // Animation Mixer setup
          const mixer = new THREE.AnimationMixer(charScene);
          const actions = new Map<string, THREE.AnimationAction>();

          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            actions.set(clip.name.toLowerCase(), action);
          });

          // Start in Sit animation (character sits squarely on chair cushion)
          const sitAction = actions.get('sit') || actions.get('idle');
          if (sitAction) {
            sitAction.play();
          }

          charScene.position.set(c.homeX, 0, c.homeZ);
          charScene.rotation.y = c.homeRot;
          this.scene.add(charScene);

          this.characters.set(c.id, {
            id: c.id,
            name: c.name,
            roleTitle: c.roleTitle,
            roleColor: c.roleColor,
            assetFile: c.asset,
            root: charScene,
            mixer,
            actions,
            currentAnimName: 'sit',
            headBone,
            leftArmBone,
            rightArmBone,
            leftForearmBone,
            rightForearmBone,
            x: c.homeX,
            z: c.homeZ,
            targetX: c.homeX,
            targetZ: c.homeZ,
            homeX: c.homeX,
            homeZ: c.homeZ,
            homeRotY: c.homeRot,
            currentAction: c.startAction,
            animTimer: Math.random() * 8,
            speechBubble: null,
            speechTimer: 0,
            isRaging: false,
            seed: idx + 1
          });
        },
        undefined,
        (err) => {
          console.warn(`Could not load character asset ${c.asset}:`, err);
        }
      );
    });
  }

  // ==========================================
  // HELPER: GLTF CACHED PROMISE LOADER (DEDUPLICATED)
  // ==========================================
  private loadGlbModel(url: string, onLoad: (model: THREE.Group) => void) {
    let p = this.modelPromises.get(url);
    if (!p) {
      p = new Promise((resolve, reject) => {
        this.gltfLoader.load(
          url,
          (gltf) => {
            resolve({ scene: gltf.scene, animations: gltf.animations });
          },
          undefined,
          reject
        );
      });
      this.modelPromises.set(url, p);
    }

    p.then(({ scene }) => {
      onLoad(SkeletonUtils.clone(scene) as THREE.Group);
    }).catch((err) => {
      console.warn(`Could not load 3D asset ${url}:`, err);
    });
  }

  // ==========================================
  // ANIMATION LOOP & PROCEDURAL LIFE GESTURES
  // ==========================================
  public start() {
    this.lastTime = performance.now();
    const animate = (time: number) => {
      this.animFrameId = requestAnimationFrame(animate);
      const delta = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      // Update FPS calculation
      this.frameCount++;
      this.fpsTimer += delta;
      if (this.fpsTimer >= 1.0) {
        this.fps = Math.round((this.frameCount / this.fpsTimer));
        this.frameCount = 0;
        this.fpsTimer = 0;
      }

      this.controls.update();
      this.updateCrewMembers(delta, time / 1000);
      this.updateSpeechBubbles(delta);
      this.runAutonomousBehaviors(delta);

      this.renderer.render(this.scene, this.camera);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  public stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private updateCrewMembers(delta: number, t: number) {
    this.characters.forEach((c) => {
      if (c.mixer) {
        c.mixer.update(delta);
      }

      // Procedural Idle Motion Overlay (Subtle life: breathing sway, typing, head looking)
      const clock = t + c.seed * 3.1415;
      const isWalking = c.currentAnimName === 'walk';

      if (!isWalking) {
        // Natural Head Yaw (Looking around at screens and peers)
        if (c.headBone) {
          const yaw = Math.sin(clock * 0.7) * 0.18 + Math.cos(clock * 0.3) * 0.08;
          const pitch = Math.sin(clock * 1.1) * 0.06;
          c.headBone.rotation.y = yaw;
          c.headBone.rotation.x = pitch;
        }

        // Active typing burst simulation for seated developers
        if (c.currentAnimName === 'sit' && (c.currentAction === 'WORKING' || c.currentAction === 'COLLABORATING')) {
          const typingFast = Math.sin(clock * 12) * 0.05;
          if (c.leftForearmBone) c.leftForearmBone.rotation.z = typingFast;
          if (c.rightForearmBone) c.rightForearmBone.rotation.z = -typingFast;
        }

        // Subtle Breathing Sway on root
        c.root.position.y = Math.sin(clock * 1.5) * 0.008;
      } else {
        c.root.position.y = 0;
      }

      // Smooth locomotion if target differs from current position
      const dx = c.targetX - c.x;
      const dz = c.targetZ - c.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.08) {
        if (c.currentAnimName !== 'walk') {
          this.crossFadeAction(c, 'walk', 0.25);
        }

        const moveSpeed = 2.4 * delta;
        const step = Math.min(moveSpeed, dist);
        c.x += (dx / dist) * step;
        c.z += (dz / dist) * step;
        c.root.position.set(c.x, 0, c.z);

        // Turn character smoothly toward movement vector
        const targetAngle = Math.atan2(dx, dz);
        let diff = targetAngle - c.root.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        c.root.rotation.y += diff * Math.min(1, 10 * delta);
      } else if (dist <= 0.08 && c.currentAnimName === 'walk') {
        // Arrived at destination: transition to sitting or idle
        c.x = c.targetX;
        c.z = c.targetZ;
        c.root.position.set(c.x, 0, c.z);

        const returnHome = Math.hypot(c.x - c.homeX, c.z - c.homeZ) < 0.2;
        if (returnHome) {
          c.root.rotation.y = c.homeRotY;
          this.crossFadeAction(c, 'sit', 0.4);
        } else {
          this.crossFadeAction(c, 'idle', 0.4);
        }
      }
    });
  }

  private crossFadeAction(c: Character3D, newAnimName: string, duration: number) {
    const currentAction = c.actions.get(c.currentAnimName);
    const newAction = c.actions.get(newAnimName);

    if (newAction && currentAction && currentAction !== newAction) {
      newAction.reset();
      newAction.fadeIn(duration);
      newAction.play();
      currentAction.fadeOut(duration);
      c.currentAnimName = newAnimName;
    } else if (newAction && !currentAction) {
      newAction.play();
      c.currentAnimName = newAnimName;
    }
  }

  // ==========================================
  // AUTONOMOUS COLLABORATION & LIFE CYCLES
  // ==========================================
  private runAutonomousBehaviors(delta: number) {
    this.autonomousTimer += delta;

    // Every 16 seconds, an idle specialist gets up to stretch, visit coffee bar or whiteboard
    if (this.autonomousTimer >= 16) {
      this.autonomousTimer = 0;

      const crewArray = Array.from(this.characters.values());
      const eligible = crewArray.filter(c => c.currentAnimName === 'sit');
      if (eligible.length > 0) {
        const actor = eligible[Math.floor(Math.random() * eligible.length)];
        const destinations = [
          { x: 9.5, z: 7.5 },  // Coffee pantry
          { x: 0, z: -8.5 },   // Whiteboard architecture review
          { x: -5.5, z: 6.5 }  // Lounge armchair
        ];
        const dest = destinations[Math.floor(Math.random() * destinations.length)];
        actor.targetX = dest.x;
        actor.targetZ = dest.z;

        // Schedule return home after 8 seconds
        setTimeout(() => {
          actor.targetX = actor.homeX;
          actor.targetZ = actor.homeZ;
        }, 8000);
      }

      // Generate spontaneous collaborative developer dialogue
      this.triggerSpontaneousTeamChat();
    }
  }

  private triggerSpontaneousTeamChat() {
    const crewArray = Array.from(this.characters.values());
    if (crewArray.length < 2) return;

    const speaker = crewArray[Math.floor(Math.random() * crewArray.length)];
    const naturalConversations = [
      'Refactor API gateway telemetry selesai, latency P99 turun ke 14ms.',
      'Unit test coverage naik ke 98.4%, pipeline CI hijau bersih.',
      'Arsitektur state synchronizer aman, zero race conditions terdeteksi.',
      'Desain token warna sudah sinkron dengan sistem UI design tokens.',
      'Load test 50.000 concurrent RPS stabil tanpa packet drop.',
      'Sip, deployment preview sudah diverifikasi di branch main.',
      'Kopi dulu sebentar sebelum lanjut sprint planning berikutnya.',
      'Security headers dan CORS policy sudah sesuai OWASP standard.'
    ];

    const text = naturalConversations[Math.floor(Math.random() * naturalConversations.length)];
    const msg: DialogueMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      speakerId: speaker.id,
      speakerName: speaker.name,
      roleTitle: speaker.roleTitle,
      roleColor: speaker.roleColor,
      text,
      category: 'TECHNICAL',
      isRage: false
    };

    speaker.speechBubble = msg;
    speaker.speechTimer = 5.0;
    this.soundEffects.playBlip();
  }

  // ==========================================
  // 3D SPEECH BUBBLE PROJECTED BILLBOARDS
  // ==========================================
  private updateSpeechBubbles(delta: number) {
    this.speechBubbleOverlay.innerHTML = '';
    const tempVec = new THREE.Vector3();

    this.characters.forEach((c) => {
      if (c.speechBubble) {
        c.speechTimer -= delta;
        if (c.speechTimer <= 0) {
          c.speechBubble = null;
          return;
        }

        // Project 3D character head location to 2D Screen Space
        tempVec.set(c.x, 2.2, c.z);
        tempVec.project(this.camera);

        // Check if behind camera
        if (tempVec.z > 1) return;

        const x = (tempVec.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-(tempVec.y * 0.5) + 0.5) * this.container.clientHeight;

        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble-3d';
        bubble.style.position = 'absolute';
        bubble.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 12}px)`;
        bubble.style.maxWidth = '260px';
        bubble.style.padding = '8px 12px';
        bubble.style.borderRadius = '8px';
        bubble.style.background = '#0F172A';
        bubble.style.border = `1px solid ${c.roleColor}88`;
        bubble.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
        bubble.style.color = '#F8FAFC';
        bubble.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        bubble.style.fontSize = '12px';
        bubble.style.lineHeight = '1.4';
        bubble.style.pointerEvents = 'none';

        bubble.innerHTML = `
          <div style="font-weight: 700; color: ${c.roleColor}; font-size: 11px; margin-bottom: 2px;">
            ${c.name} · ${c.roleTitle}
          </div>
          <div>${c.speechBubble.text}</div>
        `;

        this.speechBubbleOverlay.appendChild(bubble);
      }
    });
  }

  // ==========================================
  // EXTERNAL CONTROL METHODS
  // ==========================================
  public resetCamera() {
    this.camera.position.set(24, 18, 22);
    this.controls.target.set(0, 1.2, 0);
    this.controls.update();
  }

  public dispatchTelemetryAction(roleId: string, actionText: string) {
    const char = this.characters.get(roleId);
    if (!char) return;

    char.speechBubble = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      speakerId: char.id,
      speakerName: char.name,
      roleTitle: char.roleTitle,
      roleColor: char.roleColor,
      text: actionText,
      category: 'TECHNICAL',
      isRage: false
    };
    char.speechTimer = 5.0;
    this.soundEffects.playBlip();
  }
}

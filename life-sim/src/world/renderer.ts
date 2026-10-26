import * as THREE from 'three';
import type { CameraSetup, LocationScene } from './locationScene';

/** Owns the WebGL renderer, the fixed camera and the render loop. */
export class GameRenderer {
  readonly three: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  private location: LocationScene | null = null;
  private last = 0;
  private elapsed = 0;
  private raf = 0;
  private onFrame: (dt: number) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    this.three = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.three.shadowMap.enabled = true;
    this.three.shadowMap.type = THREE.PCFSoftShadowMap;
    this.three.outputColorSpace = THREE.SRGBColorSpace;
    this.three.toneMapping = THREE.ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.35;
    this.scene.background = new THREE.Color(0x14161b);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setFrameHandler(fn: (dt: number) => void): void {
    this.onFrame = fn;
  }

  loadLocation(loc: LocationScene): void {
    if (this.location) {
      this.scene.remove(this.location.root);
      this.location.dispose();
    }
    this.location = loc;
    this.scene.add(loc.root);
    this.resize();
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.three.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.three.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.location) this.placeCamera(this.location.camera);
    this.camera.updateProjectionMatrix();
  }

  /** Fixed camera: keeps the required world rectangle visible at any aspect ratio. */
  private placeCamera(c: CameraSetup): void {
    this.camera.fov = c.fov;
    this.camera.updateProjectionMatrix();
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const free = 1 - c.uiBottomFraction;
    // Visible vertical span must contain fitHeight inside the free (non-UI) part of the screen.
    const dist = Math.max(c.fitWidth / 2 / (tanHalf * this.camera.aspect), c.fitHeight / free / 2 / tanHalf);
    const yaw = THREE.MathUtils.degToRad(c.yaw);
    const el = THREE.MathUtils.degToRad(c.elevation);
    const [tx, ty, tz] = c.target;
    // Shift the look-at point down so the target sits centred in the free area above the UI sheet.
    const visibleH = 2 * dist * tanHalf;
    const lift = (c.uiBottomFraction * visibleH) / 2;
    this.camera.position.set(tx + Math.sin(yaw) * Math.cos(el) * dist, ty - lift + Math.sin(el) * dist, tz + Math.cos(yaw) * Math.cos(el) * dist);
    this.camera.lookAt(tx, ty - lift, tz);
  }

  start(): void {
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
      this.last = now;
      this.elapsed += dt;
      this.onFrame(dt);
      this.location?.update(dt, this.elapsed);
      this.three.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }
}

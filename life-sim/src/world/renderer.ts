import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BackdropLayer } from './backdropLayer';
import { imagePointToNdc } from './backdropLayout';
import type { CameraSetup, LocationScene } from './locationScene';

export type GraphicsQuality = 'auto' | 'high' | 'low';
const QUALITY_KEY = 'lifesim.graphics';

/** Warm/teal split-toning, soft vignette and a touch of contrast — the "painted" grade. */
const GradeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, vignette: { value: 0.3 }, warmth: { value: 0.06 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vignette; uniform float warmth; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      // shadows lean teal, highlights lean warm
      c.rgb += vec3(warmth, warmth * 0.35, -warmth * 0.6) * smoothstep(0.25, 1.0, l);
      c.rgb += vec3(-warmth * 0.4, 0.0, warmth * 0.5) * (1.0 - smoothstep(0.0, 0.3, l)) * 0.5;
      c.rgb = (c.rgb - 0.18) * 1.08 + 0.18;
      vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.2, length(d * vec2(1.0, 0.85)));
      c.rgb *= mix(1.0 - vignette, 1.0, v);
      gl_FragColor = vec4(max(c.rgb, 0.0), c.a);
    }`,
};

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
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private fxOn = true;
  private quality: GraphicsQuality = 'auto';
  private slowFrames = 0;
  private followX = 0;
  private backdropLayer = new BackdropLayer();
  private frames = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.three = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.three.shadowMap.enabled = true;
    this.three.shadowMap.type = THREE.PCFSoftShadowMap;
    this.three.outputColorSpace = THREE.SRGBColorSpace;
    this.three.toneMapping = THREE.ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.35;
    this.scene.background = new THREE.Color(0x14161b);
    this.scene.add(this.backdropLayer.mesh);
    try {
      const q = new URLSearchParams(location.search).get('fx') ?? localStorage.getItem(QUALITY_KEY);
      if (q === 'high' || q === 'low' || q === 'auto') this.quality = q;
    } catch {
      /* storage unavailable: keep auto */
    }
    this.fxOn = this.quality !== 'low';
    this.buildComposer();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  get graphics(): GraphicsQuality {
    return this.quality;
  }

  setGraphics(q: GraphicsQuality): void {
    this.quality = q;
    this.fxOn = q !== 'low';
    this.slowFrames = 0;
    this.frames = 0;
    try {
      localStorage.setItem(QUALITY_KEY, q);
    } catch {
      /* ignore */
    }
  }

  private buildComposer(): void {
    const c = new EffectComposer(this.three);
    c.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 2.2);
    c.addPass(this.bloom);
    c.addPass(new ShaderPass(GradeShader));
    c.addPass(new OutputPass());
    this.composer = c;
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
    loc.onBackdrop = () => {
      this.applyBackdrop();
      this.resize();
    };
    this.applyBackdrop();
    const r = loc.camera.followRange;
    this.followX = r && loc.focusX ? Math.min(r[1], Math.max(r[0], loc.focusX())) : loc.camera.target[0];
    this.resize();
  }

  /**
   * A painted backdrop is drawn exactly as authored, in screen space (BackdropLayer): no filmic tone mapping, never cropped
   * sideways (see backdropLayout.ts). Scenes without one use the dark default and the filmic look.
   */
  private applyBackdrop(): void {
    const tex = this.location?.backdrop ?? null;
    this.backdropLayer.setTexture(tex);
    if (tex) {
      this.scene.background = new THREE.Color(0x120f0d); // base colour for any slack around the art
      this.three.toneMapping = THREE.NoToneMapping;
      this.three.toneMappingExposure = 1;
      this.fitBackdrop();
    } else {
      this.scene.background = new THREE.Color(0x14161b);
      this.three.toneMapping = THREE.ACESFilmicToneMapping;
      this.three.toneMappingExposure = 1.35;
    }
  }

  private fitBackdrop(): void {
    if (this.location?.backdrop) this.backdropLayer.fit(this.camera.aspect);
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.three.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    this.three.setSize(w, h, false);
    this.composer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.composer?.setSize(w, h);
    this.bloom?.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.fitBackdrop(); // the camera anchor depends on where the art sits on screen
    if (this.location) this.placeCamera(this.location.camera);
    this.camera.updateProjectionMatrix();
  }

  /** Fixed camera: keeps the required world rectangle visible at any aspect ratio. */
  private placeCamera(c: CameraSetup, targetX = c.target[0]): void {
    this.camera.fov = c.fov;
    this.camera.updateProjectionMatrix();
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    if (c.anchor && this.location?.backdrop) {
      // Painted-backdrop mode: constant world width across the screen, and the anchor lands on its spot in the painting.
      const d = c.fitWidth / 2 / (tanHalf * this.camera.aspect);
      const yawA = THREE.MathUtils.degToRad(c.yaw);
      const elA = THREE.MathUtils.degToRad(c.elevation);
      const [ax, ay, az] = c.anchor.world;
      this.camera.position.set(ax + Math.sin(yawA) * Math.cos(elA) * d, ay + Math.sin(elA) * d, az + Math.cos(yawA) * Math.cos(elA) * d);
      this.camera.lookAt(ax, ay, az);
      this.camera.updateMatrixWorld();
      const [nx, ny] = imagePointToNdc(this.backdropLayer.rect, c.anchor.image[0], c.anchor.image[1]);
      const hh = d * tanHalf;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      this.camera.position.addScaledVector(right, -nx * hh * this.camera.aspect).addScaledVector(up, -ny * hh);
      this.camera.updateMatrixWorld();
      this.location.updateForCamera?.(this.camera);
      return;
    }
    const free = 1 - c.uiBottomFraction;
    // Visible vertical span must contain fitHeight inside the free (non-UI) part of the screen.
    const dist = Math.max(c.fitWidth / 2 / (tanHalf * this.camera.aspect), c.fitHeight / free / 2 / tanHalf);
    const yaw = THREE.MathUtils.degToRad(c.yaw);
    const el = THREE.MathUtils.degToRad(c.elevation);
    const [, ty, tz] = c.target;
    const tx = targetX;
    // Shift the look-at point down so the target sits centred in the free area above the UI sheet.
    const visibleH = 2 * dist * tanHalf;
    const lift = (c.uiBottomFraction * visibleH) / 2;
    this.camera.position.set(tx + Math.sin(yaw) * Math.cos(el) * dist, ty - lift + Math.sin(el) * dist, tz + Math.cos(yaw) * Math.cos(el) * dist);
    this.camera.lookAt(tx, ty - lift, tz);
    this.camera.updateMatrixWorld();
    this.location?.updateForCamera?.(this.camera);
  }

  start(): void {
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
      this.last = now;
      this.elapsed += dt;
      this.onFrame(dt);
      this.location?.update(dt, this.elapsed);
      this.followCamera(dt);
      // A painted backdrop is shown exactly as authored: no grade, vignette or bloom, and no half-resolution post buffers.
      if (this.fxOn && this.composer && !this.location?.backdrop) this.composer.render(dt);
      else this.three.render(this.scene, this.camera);
      this.adaptQuality(dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Rooms scroll sideways with the character: smooth follow, clamped to the room (angle/height never change). */
  private followCamera(dt: number): void {
    const loc = this.location;
    const range = loc?.camera.followRange;
    if (!loc || !range || !loc.focusX) return;
    const want = Math.min(range[1], Math.max(range[0], loc.focusX()));
    this.followX += (want - this.followX) * (1 - Math.exp(-5 * dt));
    this.placeCamera(loc.camera, this.followX);
  }

  /** Cast a ray from a screen point (CSS px) and return the first hit's `userData.interactable`. */
  pick(clientX: number, clientY: number, meshes: THREE.Object3D[]): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    return (hit?.object.userData.interactable as string | undefined) ?? null;
  }

  /** In 'auto', drop the post effects if the device can't hold ~25 fps after warm-up. */
  private adaptQuality(dt: number): void {
    if (this.quality !== 'auto' || !this.fxOn) return;
    this.frames++;
    if (this.frames < 30) return; // warm-up
    this.slowFrames += dt > 0.04 ? 1 : -1;
    this.slowFrames = Math.max(0, this.slowFrames);
    if (this.slowFrames > 45) this.fxOn = false;
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }
}

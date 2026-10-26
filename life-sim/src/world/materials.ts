import * as THREE from 'three';

/** Shared look: toon-shaded surfaces with thick dark inverted-hull outlines. */
export const OUTLINE_COLOR = 0x14161b;

let gradient: THREE.DataTexture | null = null;
function toonGradient(): THREE.DataTexture {
  if (!gradient) {
    // 4-step ramp keeps shading readable but soft.
    const data = new Uint8Array([120, 165, 215, 255]);
    gradient = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();
export function toon(color: number, emissive = 0x000000): THREE.MeshToonMaterial {
  const key = `${color}:${emissive}`;
  let m = toonCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, emissive, gradientMap: toonGradient() });
    toonCache.set(key, m);
  }
  return m;
}

let vertexToon: THREE.MeshToonMaterial | null = null;
/** Shared toon material for batched meshes that carry per-vertex colour. */
export function toonVertexColor(): THREE.MeshToonMaterial {
  vertexToon ??= new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() });
  return vertexToon;
}

const outlineCache = new Map<number, THREE.ShaderMaterial>();
/** Outline material: pushes vertices along their normals, renders back faces only. */
export function outlineMaterial(thickness: number): THREE.ShaderMaterial {
  let m = outlineCache.get(thickness);
  if (!m) {
    m = new THREE.ShaderMaterial({
      uniforms: { uThickness: { value: thickness }, uColor: { value: new THREE.Color(OUTLINE_COLOR) } },
      vertexShader: `
        uniform float uThickness;
        void main() {
          vec3 p = position + normalize(normal) * uThickness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        void main() { gl_FragColor = vec4(uColor, 1.0); }`,
      side: THREE.BackSide,
    });
    outlineCache.set(thickness, m);
  }
  return m;
}

/** A mesh plus its outline hull sharing one geometry. Swap geometry via `setGeometry`. */
export class OutlinedMesh extends THREE.Group {
  readonly fill: THREE.Mesh;
  readonly hull: THREE.Mesh;
  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, outline = 0.012) {
    super();
    this.fill = new THREE.Mesh(geometry, material);
    this.fill.castShadow = true;
    this.fill.receiveShadow = true;
    this.hull = new THREE.Mesh(geometry, outlineMaterial(outline));
    this.add(this.fill, this.hull);
  }
  setGeometry(g: THREE.BufferGeometry): void {
    this.fill.geometry.dispose();
    this.fill.geometry = g;
    this.hull.geometry = g;
  }
}

export function outlined(geometry: THREE.BufferGeometry, color: number, outline = 0.012): OutlinedMesh {
  return new OutlinedMesh(geometry, toon(color), outline);
}

/** Plain lit mesh without outline (large surfaces such as walls and floors). */
export function surface(geometry: THREE.BufferGeometry, material: THREE.Material, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.receiveShadow = shadow;
  return m;
}

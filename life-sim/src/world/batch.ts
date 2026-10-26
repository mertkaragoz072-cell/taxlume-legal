import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toonVertexColor } from './materials';

export interface Place {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
}

/**
 * Collects many small shapes into ONE mesh with per-vertex colour. Static
 * background props use this so a whole rack of dumbbells is a single draw call.
 */
export class Batch {
  private geos: THREE.BufferGeometry[] = [];

  add(geo: THREE.BufferGeometry, color: number, p: Place = {}): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(p.pos ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))),
      new THREE.Vector3(...(p.scale ?? [1, 1, 1])),
    );
    g.applyMatrix4(m);
    const c = new THREE.Color(color);
    const n = g.attributes.position!.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    this.geos.push(g);
    geo.dispose();
    return this;
  }

  box(w: number, h: number, d: number, color: number, p: Place = {}, radius = 0.012): this {
    return this.add(radius > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d), color, p);
  }
  cyl(rTop: number, rBot: number, h: number, color: number, p: Place = {}, seg = 14): this {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), color, p);
  }

  build(castShadow = true): THREE.Mesh {
    const merged = mergeGeometries(this.geos, false);
    this.geos.forEach((g) => g.dispose());
    this.geos = [];
    const mesh = new THREE.Mesh(merged ?? new THREE.BufferGeometry(), toonVertexColor());
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    return mesh;
  }
}

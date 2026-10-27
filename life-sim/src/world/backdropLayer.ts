import * as THREE from 'three';
import { layoutBackdrop, type NdcRect } from './backdropLayout';

/**
 * Screen-space layer that draws a painted backdrop exactly as authored (see backdropLayout.ts for the fit rule).
 * It ignores the camera and the depth buffer, so the 3D scene is always drawn on top of it.
 */
export class BackdropLayer {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private aspect = 0.5625;
  rect: NdcRect = layoutBackdrop(0.5625, 0.5625);

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: null as THREE.Texture | null }, rect: { value: new THREE.Vector4(-1, -1, 1, 1) } },
      vertexShader: `
        uniform vec4 rect; varying vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(mix(rect.xy, rect.zw, vUv), 0.9999, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D map; varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(map, vUv);
          #include <colorspace_fragment>
        }`,
      depthTest: false,
      depthWrite: false,
      transparent: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.visible = false;
  }

  setTexture(tex: THREE.Texture | null): void {
    this.material.uniforms.map!.value = tex;
    const img = tex?.image as { width: number; height: number } | undefined;
    if (img) this.aspect = img.width / img.height;
    this.mesh.visible = !!tex;
  }

  /** Recompute the on-screen rectangle for the current canvas aspect. */
  fit(screenAspect: number): NdcRect {
    this.rect = layoutBackdrop(screenAspect, this.aspect);
    (this.material.uniforms.rect!.value as THREE.Vector4).set(this.rect.x0, this.rect.y0, this.rect.x1, this.rect.y1);
    return this.rect;
  }
}

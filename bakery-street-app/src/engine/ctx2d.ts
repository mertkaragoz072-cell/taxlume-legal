// A Canvas 2D context on top of React Native Skia, covering exactly what the game's scene code uses (paths, gradients, clipping, images,
// text, blend modes, blur). It lets the scenes be drawn in immediate mode like they were on the web, but natively on iOS and Android.
import {
  BlendMode, ClipOp, FilterMode, MipmapMode, PaintStyle, Skia, StrokeCap, StrokeJoin, TileMode,
  type SkCanvas, type SkColor, type SkFont, type SkImage, type SkImageFilter, type SkColorFilter, type SkPaint, type SkPath, type SkPathEffect, type SkShader, type SkSurface,
} from "@shopify/react-native-skia";
import { Platform } from "react-native";
import { fontFor } from "./fonts";
import { setCanvasFactory } from "../util.js";

const colorCache = new Map<string, SkColor>();
/** CSS colour string -> Skia colour (cached). Supports #rgb, #rrggbb, rgb(), rgba(), names Skia knows. */
export function color(css: string): SkColor {
  let c = colorCache.get(css);
  if (!c) {
    c = Skia.Color(css.startsWith("rgb") ? normalizeRgb(css) : css);
    if (colorCache.size > 4000) colorCache.clear();
    colorCache.set(css, c);
  }
  return c;
}
/** Skia's parser wants rgba() alpha in 0..1 and integer channels; browsers accept e.g. "rgba(40,16,4,.4)" and decimals too. */
function normalizeRgb(css: string): string {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return css;
  const p = m[1].split(",").map((s) => s.trim());
  const ch = (v: string) => Math.max(0, Math.min(255, Math.round(parseFloat(v))));
  const a = p[3] === undefined ? 1 : Math.max(0, Math.min(1, parseFloat(p[3])));
  return `rgba(${ch(p[0])}, ${ch(p[1])}, ${ch(p[2])}, ${a})`;
}
const withAlpha = (c: SkColor, a: number): SkColor => (a >= 1 ? c : new Float32Array([c[0], c[1], c[2], c[3] * a]));

/** A loaded picture. `naturalWidth/Height` mirror HTMLImageElement so the scene code reads the same. */
export class GameImage {
  naturalWidth: number;
  naturalHeight: number;
  constructor(public image: SkImage) { this.naturalWidth = image.width(); this.naturalHeight = image.height(); }
  get width() { return this.naturalWidth; }
  get height() { return this.naturalHeight; }
}

/** Gradients are rebuilt by the scene code every frame with identical numbers; the Skia shader is made once per distinct gradient. */
const shaderCache = new Map<string, SkShader | null>();

export class Gradient {
  stops: { pos: number; color: SkColor }[] = [];
  constructor(public kind: "linear" | "radial", public a: number[]) {}
  addColorStop(pos: number, css: string) { this.stops.push({ pos, color: color(css) }); }
  shader(): SkShader | null {
    if (!this.stops.length) return null;
    const key = `${this.kind}|${this.a.map((n) => Math.round(n * 10)).join(",")}|${this.stops.map((s) => `${s.pos}:${s.color.join(",")}`).join(";")}`;
    let sh = shaderCache.get(key);
    if (!sh) {
      sh = this.make();
      if (sh) { if (shaderCache.size > 300) shaderCache.clear(); shaderCache.set(key, sh); }
    }
    return sh;
  }
  private make(): SkShader | null {
    const colors = this.stops.map((s) => s.color), pos = this.stops.map((s) => s.pos);
    if (this.kind === "linear") {
      const [x0, y0, x1, y1] = this.a;
      return Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors, pos, TileMode.Clamp);
    }
    const [x0, y0, r0, x1, y1, r1] = this.a;
    if (r0 < 0.01) return Skia.Shader.MakeRadialGradient({ x: x1, y: y1 }, Math.max(r1, 0.01), colors, pos, TileMode.Clamp);
    return Skia.Shader.MakeTwoPointConicalGradient({ x: x0, y: y0 }, r0, { x: x1, y: y1 }, r1, colors, pos, TileMode.Clamp);
  }
}

export class Pattern { constructor(public source: Surface2D | GameImage) {} }

type Source = GameImage | Surface2D;
type Style = string | Gradient | Pattern;
type M6 = [number, number, number, number, number, number];
const IDENT: M6 = [1, 0, 0, 1, 0, 0];
const mul = (m: M6, n: M6): M6 => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const inv = (m: M6): M6 => { const d = m[0] * m[3] - m[1] * m[2] || 1e-9; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
const toSk = (m: M6) => [m[0], m[2], m[4], m[1], m[3], m[5], 0, 0, 1];

interface State {
  fillStyle: Style; strokeStyle: Style; lineWidth: number; lineCap: string; lineJoin: string; dash: number[]; alpha: number; op: string; filter: string;
  font: string; textAlign: string; textBaseline: string; m: M6;
}

const widthCache = new WeakMap<SkFont, Map<string, number>>();
/** Text width. `measureText` is missing in Skia's web build (used for development screenshots), so fall back to summing glyph widths. */
function textWidth(font: SkFont, s: string): number {
  let m = widthCache.get(font);
  if (!m) { m = new Map(); widthCache.set(font, m); }
  const hit = m.get(s);
  if (hit !== undefined) return hit;
  let w: number;
  try { w = font.measureText(s).width; }
  catch { w = font.getGlyphWidths(font.getGlyphIDs(s)).reduce((a, b) => a + b, 0); }
  if (m.size > 600) m.clear();
  m.set(s, w);
  return w;
}

export class Ctx2D {
  fillStyle: Style = "#000";
  strokeStyle: Style = "#000";
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  filter = "none";
  font = "10px sans-serif";
  textAlign = "start";
  textBaseline = "alphabetic";
  imageSmoothingQuality = "high";
  private dash: number[] = [];
  private m: M6 = IDENT;
  private stack: State[] = [];
  private path: SkPath = Skia.Path.Make();
  private cx = 0;
  private cy = 0;
  constructor(public sk: SkCanvas, public canvas: { width: number; height: number }) {}

  // ---- state / transform -------------------------------------------------------------------------------------------------------------
  save() {
    this.stack.push({ fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, lineCap: this.lineCap, lineJoin: this.lineJoin, dash: this.dash, alpha: this.globalAlpha, op: this.globalCompositeOperation, filter: this.filter, font: this.font, textAlign: this.textAlign, textBaseline: this.textBaseline, m: this.m });
    this.sk.save();
  }
  restore() {
    const s = this.stack.pop(); if (!s) return;
    this.fillStyle = s.fillStyle; this.strokeStyle = s.strokeStyle; this.lineWidth = s.lineWidth; this.lineCap = s.lineCap; this.lineJoin = s.lineJoin; this.dash = s.dash;
    this.globalAlpha = s.alpha; this.globalCompositeOperation = s.op; this.filter = s.filter; this.font = s.font; this.textAlign = s.textAlign; this.textBaseline = s.textBaseline; this.m = s.m;
    this.sk.restore();
  }
  translate(x: number, y: number) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); this.sk.translate(x, y); }
  scale(x: number, y: number) { this.m = mul(this.m, [x, 0, 0, y, 0, 0]); this.sk.scale(x, y); }
  rotate(rad: number) { const c = Math.cos(rad), s = Math.sin(rad); this.m = mul(this.m, [c, s, -s, c, 0, 0]); this.sk.rotate((rad * 180) / Math.PI, 0, 0); }
  transform(a: number, b: number, c: number, d: number, e: number, f: number) { this.m = mul(this.m, [a, b, c, d, e, f]); this.sk.concat(toSk([a, b, c, d, e, f])); }
  setTransform(a: number | { a: number; b: number; c: number; d: number; e: number; f: number }, b = 0, c = 0, d = 1, e = 0, f = 0) {
    if (typeof a === "object") ({ a, b, c, d, e, f } = a);
    const target: M6 = [a, b, c, d, e, f], delta = mul(inv(this.m), target);
    this.sk.concat(toSk(delta)); this.m = target;
  }
  getTransform() { const [a, b, c, d, e, f] = this.m; return { a, b, c, d, e, f }; }
  setLineDash(d: number[]) { this.dash = d.length ? d : []; }
  clearRect(x: number, y: number, w: number, h: number) {
    const p = (this.shared ??= Skia.Paint()); p.reset(); p.setBlendMode(BlendMode.Clear);
    this.sk.drawRect(Skia.XYWHRect(x, y, w, h), p);
  }

  // ---- paths -------------------------------------------------------------------------------------------------------------------------
  beginPath() { if (this.pathBuf) { this.pathBuf.rewind(); this.path = this.pathBuf; } else this.path = this.pathBuf = Skia.Path.Make(); }
  closePath() { this.path.close(); }
  moveTo(x: number, y: number) { this.path.moveTo(x, y); this.cx = x; this.cy = y; }
  lineTo(x: number, y: number) { this.path.lineTo(x, y); this.cx = x; this.cy = y; }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) { this.path.quadTo(cx, cy, x, y); this.cx = x; this.cy = y; }
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number) { this.path.cubicTo(a, b, c, d, x, y); this.cx = x; this.cy = y; }
  rect(x: number, y: number, w: number, h: number) { this.path.addRect(Skia.XYWHRect(x, y, w, h)); }
  roundRect(x: number, y: number, w: number, h: number, r: number | number[]) {
    const rr = Array.isArray(r) ? r[0] : r;
    this.path.addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), Math.min(rr, w / 2), Math.min(rr, h / 2)));
  }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw = false) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw = false) {
    const TAU = Math.PI * 2;
    let sweep = a1 - a0;
    if (!ccw && sweep >= TAU - 1e-6) sweep = TAU; else if (ccw && -sweep >= TAU - 1e-6) sweep = -TAU;
    else if (!ccw) { sweep %= TAU; if (sweep < 0) sweep += TAU; } else { sweep %= TAU; if (sweep > 0) sweep -= TAU; }
    const oval = Skia.XYWHRect(x - rx, y - ry, rx * 2, ry * 2);
    const target = rot ? Skia.Path.Make() : this.path;
    if (Math.abs(sweep) >= TAU - 1e-6) {                                  // a full turn: a closed oval (keep the start angle's direction)
      const t = Skia.Path.Make(); t.addOval(oval, sweep < 0);
      if (rot) { target.addPath(t); } else { this.path.addPath(t); }
    } else target.arcToOval(oval, (a0 * 180) / Math.PI, (sweep * 180) / Math.PI, false);
    if (rot) {
      const mat = Skia.Matrix(); mat.translate(x, y); mat.rotate(rot); mat.translate(-x, -y);
      this.path.addPath(target, mat, true);
    }
  }

  // ---- painting ----------------------------------------------------------------------------------------------------------------------
  private shared: SkPaint | null = null;
  private pathBuf: SkPath | null = null;
  private blurs = new Map<number, SkImageFilter>();
  private paint(style: Style, stroke: boolean): SkPaint {
    const p = (this.shared ??= Skia.Paint());                // one paint per context, reset for every draw (no garbage per shape)
    p.reset();
    p.setAntiAlias(true);
    p.setStyle(stroke ? PaintStyle.Stroke : PaintStyle.Fill);
    if (typeof style === "string") p.setColor(withAlpha(color(style), this.globalAlpha));
    else if (style instanceof Gradient) { const sh = style.shader(); if (sh) p.setShader(sh); p.setAlphaf(this.globalAlpha); }
    else if (style instanceof Pattern) {
      const img = style.source instanceof GameImage ? style.source.image : style.source.snapshot();
      p.setShader(img.makeShaderOptions(TileMode.Repeat, TileMode.Repeat, FilterMode.Linear, MipmapMode.None)); p.setAlphaf(this.globalAlpha);
    }
    if (stroke) {
      p.setStrokeWidth(this.lineWidth);
      p.setStrokeCap(this.lineCap === "round" ? StrokeCap.Round : this.lineCap === "square" ? StrokeCap.Square : StrokeCap.Butt);
      p.setStrokeJoin(this.lineJoin === "round" ? StrokeJoin.Round : this.lineJoin === "bevel" ? StrokeJoin.Bevel : StrokeJoin.Miter);
      if (this.dash.length) p.setPathEffect(Skia.PathEffect.MakeDash(this.dash, 0) as SkPathEffect);
    }
    this.applyCommon(p);
    return p;
  }
  private applyCommon(p: SkPaint) {
    const op = this.globalCompositeOperation;
    if (op === "lighter") p.setBlendMode(BlendMode.Plus);
    else if (op === "multiply") p.setBlendMode(BlendMode.Multiply);
    else if (op === "source-atop") p.setBlendMode(BlendMode.SrcATop);
    else if (op === "destination-in") p.setBlendMode(BlendMode.DstIn);
    else if (op === "destination-out") p.setBlendMode(BlendMode.DstOut);
    const f = this.filter;
    if (f !== "none") {
      const blur = f.match(/blur\(([\d.]+)px\)/);
      if (blur) { const r = parseFloat(blur[1]); let f = this.blurs.get(r); if (!f) { f = Skia.ImageFilter.MakeBlur(r, r, TileMode.Decal, null) as SkImageFilter; this.blurs.set(r, f); } p.setImageFilter(f); }
      const gray = f.match(/grayscale\(([\d.]+)\)/);
      if (gray) {
        const s = 1 - parseFloat(gray[1]), r = 0.2126 * (1 - s), g = 0.7152 * (1 - s), b = 0.0722 * (1 - s);
        p.setColorFilter(Skia.ColorFilter.MakeMatrix([r + s, g, b, 0, 0, r, g + s, b, 0, 0, r, g, b + s, 0, 0, 0, 0, 0, 1, 0]) as SkColorFilter);
      }
    }
  }
  fill() { this.sk.drawPath(this.path, this.paint(this.fillStyle, false)); }
  stroke() { this.sk.drawPath(this.path, this.paint(this.strokeStyle, true)); }
  clip() { this.sk.clipPath(this.path, ClipOp.Intersect, true); }
  fillRect(x: number, y: number, w: number, h: number) { this.sk.drawRect(Skia.XYWHRect(x, y, w, h), this.paint(this.fillStyle, false)); }
  strokeRect(x: number, y: number, w: number, h: number) { this.sk.drawRect(Skia.XYWHRect(x, y, w, h), this.paint(this.strokeStyle, true)); }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number) { return new Gradient("linear", [x0, y0, x1, y1]); }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) { return new Gradient("radial", [x0, y0, r0, x1, y1, r1]); }
  createPattern(source: Source) { return new Pattern(source); }

  // ---- images ------------------------------------------------------------------------------------------------------------------------
  drawImage(src: Source | null | undefined, ...a: number[]) {
    if (!src) return;
    const img = src instanceof GameImage ? src.image : src.snapshot();
    const iw = img.width(), ih = img.height();
    let sx = 0, sy = 0, sw = iw, sh = ih, dx: number, dy: number, dw: number, dh: number;
    if (a.length === 2) { [dx, dy] = a; dw = iw; dh = ih; }
    else if (a.length === 4) { [dx, dy, dw, dh] = a; }
    else { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    if (dw <= 0 || dh <= 0 || sw <= 0 || sh <= 0) return;
    const p = (this.shared ??= Skia.Paint());
    p.reset();
    p.setAlphaf(this.globalAlpha);
    this.applyCommon(p);
    this.sk.drawImageRectOptions(img, Skia.XYWHRect(sx, sy, sw, sh), Skia.XYWHRect(dx, dy, dw, dh), FilterMode.Linear, MipmapMode.Linear, p);
  }

  // ---- text --------------------------------------------------------------------------------------------------------------------------
  private fontNow(): SkFont { return fontFor(this.font); }
  measureText(s: string) { return { width: textWidth(this.fontNow(), s) }; }
  private textPos(s: string, x: number, y: number) {
    const f = this.fontNow(), w = textWidth(f, s), mt = f.getMetrics();
    let px = x; if (this.textAlign === "center") px = x - w / 2; else if (this.textAlign === "right" || this.textAlign === "end") px = x - w;
    let py = y;
    if (this.textBaseline === "middle") py = y - (mt.ascent + mt.descent) / 2;
    else if (this.textBaseline === "top") py = y - mt.ascent;
    else if (this.textBaseline === "bottom") py = y - mt.descent;
    return { f, px, py };
  }
  fillText(s: string, x: number, y: number) { const { f, px, py } = this.textPos(s, x, y); this.sk.drawText(s, px, py, this.paint(this.fillStyle, false), f); }
  strokeText(s: string, x: number, y: number) { const { f, px, py } = this.textPos(s, x, y); this.sk.drawText(s, px, py, this.paint(this.strokeStyle, true), f); }
}

/** An off-screen drawing surface ("canvas" in the scene code): draw into it with getContext('2d'), then use it as an image source. */
export class Surface2D {
  private surface: SkSurface;
  private ctx: Ctx2D | null = null;
  private snap: SkImage | null = null;
  constructor(public width: number, public height: number) {
    const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
    // on the web (development screenshots) an off-screen GPU surface lives in its own WebGL context and cannot be drawn into the main canvas: use a CPU one
    const s = Platform.OS === "web" ? Skia.Surface.Make(w, h) : Skia.Surface.MakeOffscreen(w, h);
    if (!s) throw new Error("Skia could not create an off-screen surface");
    this.surface = s;
  }
  getContext(_: "2d" = "2d"): Ctx2D {
    this.snap = null;                                   // anything drawn from here on invalidates the picture taken earlier
    return (this.ctx ??= new Ctx2D(this.surface.getCanvas(), this));
  }
  snapshot(): SkImage {
    this.surface.flush();
    return (this.snap ??= this.surface.makeImageSnapshot());
  }
}
export const createCanvas = (w: number, h: number) => new Surface2D(w, h);
setCanvasFactory(createCanvas);

"""Calibrates the bench-station sprite (public/art/bench-station.webp) against the 3D station.

Fits camera yaw/elevation, scale, sprite offset and a few free rack/pad dimensions so that points measured on the sprite (pixels, in the
cropped 1168x1182 image) coincide with the projected 3D model points. Output feeds: STATION_YAW, camera elevation, SPRITE{widthM,ox,oy} in
src/world/gymScene.ts and BENCH.padHeadX/padFootX, HOOK, RACK_Z in src/world/benchGeometry.ts / props.ts.
Re-measure the pixel points (grid helper: see docs/ART_SPEC.md) if the asset changes. Needs numpy + scipy."""

import numpy as np
from scipy.optimize import least_squares
PAD_Y=0.46
def model(v):
    th,eps,s,tx,ty,xh,xf,xk,yk,zk=v
    return [
     ((260,525),  (xh,PAD_Y,0)),
     ((1000,715), (xf,PAD_Y,0)),
     ((215,262),  (xk,yk,zk)),
     ((815,205),  (xk,yk,-zk)),
     ((95,925),   (xk-0.06,0,zk)),
     ((930,1090), (xf-0.1,0,0)),
    ]
def proj(p, th, eps, s, tx, ty):
    x,y,z=p
    X=x*np.cos(th)+z*np.sin(th); Z=-x*np.sin(th)+z*np.cos(th)
    return np.array([tx+s*X, ty+s*(-y*np.cos(eps)+Z*np.sin(eps))])
def resid(v):
    th,eps,s,tx,ty=v[:5]
    r=[]
    for (px,p) in model(v): r.extend(proj(p,th,eps,s,tx,ty)-np.array(px))
    return np.array(r)
lo=[-1.4,0.08,300,-3000,-3000,-0.72,0.55,-0.72,0.55,0.38]
hi=[-0.3,0.7,2500,3000,3000,-0.45,0.85,-0.5,0.95,0.46]
best=None
rng=np.random.default_rng(1)
for i in range(60):
    x0=[rng.uniform(-1.2,-0.5),rng.uniform(0.15,0.5),rng.uniform(600,1200),700,900,-0.58,0.65,-0.58,0.75,0.42]
    sol=least_squares(resid,x0,bounds=(lo,hi))
    if best is None or sol.cost<best.cost: best=sol
v=best.x
th,eps,s,tx,ty,xh,xf,xk,yk,zk=v
print('theta %.3f (%.0f deg) eps %.3f (%.0f deg) s %.0f anchor (%.0f,%.0f)'%(th,np.degrees(th),eps,np.degrees(eps),s,tx,ty))
print('pad head x %.2f foot x %.2f | hook x %.2f y %.2f | upright z %.2f'%(xh,xf,xk,yk,zk))
print('rms %.1f px'%np.sqrt(np.mean(resid(v)**2)))
for (px,p),e in zip(model(v),resid(v).reshape(-1,2)): print(px,np.round(p,2),'err',np.round(e,0))
W,H=1168,1182
print('SPRITE widthM %.3f ox %.3f oy %.3f'%(W/s,(W/2-tx)/s,-(H/2-ty)/s))

import sys
from PIL import Image
import numpy as np
shot_path=sys.argv[1]
src=Image.open('/home/user/taxlume-legal/life-sim/public/art/gym-backdrop.webp').convert('RGB')
shot=Image.open(shot_path).convert('RGB')
print('src',src.size,'shot',shot.size)
ref=src.resize(shot.size, Image.LANCZOS)
a=np.asarray(ref).astype(float); b=np.asarray(shot).astype(float)
mse=((a-b)**2).mean(); print('PSNR vs source: %.1f dB'%(10*np.log10(255**2/mse)))
print('mean brightness  src %.1f  shot %.1f'%(a.mean(), b.mean()))
def sharp(x):
    g=x.mean(axis=2); return np.abs(np.diff(g,axis=0)).mean()+np.abs(np.diff(g,axis=1)).mean()
print('edge sharpness   src %.2f  shot %.2f  (ratio %.2f)'%(sharp(a),sharp(b),sharp(b)/sharp(a)))

"""
fix_viva_v3.py
──────────────
VIVA background = (180,180,180) uniform gray.
Old bg_thr=210 NEVER caught the background (178 < 210).

Fix: use bg_thr=175.
  • Background (178-186): all channels > 175 → near_bg → border-connected → removed ✓
  • Machine red (180, 0, 0): G=0 < 175 → NOT near_bg → breaks connectivity ✓
  • Machine dark (50,50,50): < 175 → NOT near_bg → breaks connectivity ✓
  • Machine white body (209): > 175 → near_bg, but ENCLOSED by red/dark ring → isolated island
    (binary_fill_holes restores it if it forms a hole; or it stays if not border-connected)
"""

import os
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
from scipy.ndimage import (binary_fill_holes, distance_transform_edt,
                           label as sp_label)

BASE    = r'C:\Users\Optica Enterprises\OneDrive\Desktop\Optica Enterprises website'
SRC     = os.path.join(BASE, 'Product images')
OUT     = os.path.join(BASE, 'product-images')
SESSION = new_session('isnet-general-use')


def remove_border_bg(src_arr, bg_thr):
    """Return boolean mask: True = border-connected background."""
    r = src_arr[:, :, 0].astype(int)
    g = src_arr[:, :, 1].astype(int)
    b = src_arr[:, :, 2].astype(int)
    near_bg = (r > bg_thr) & (g > bg_thr) & (b > bg_thr)
    lab, _  = sp_label(near_bg)
    H, W    = src_arr.shape[:2]
    edge    = set()
    for y in range(H):
        for x in [0, W - 1]:
            if lab[y, x] > 0: edge.add(lab[y, x])
    for x in range(W):
        for y in [0, H - 1]:
            if lab[y, x] > 0: edge.add(lab[y, x])
    return np.isin(lab, list(edge))


def add_3d_effects(img):
    W, H   = img.size
    alpha  = np.array(img.convert('RGBA'), dtype=np.uint8)[:, :, 3].astype(np.float32) / 255.0
    blur_r = max(28, int(min(W, H) * 0.055))
    glow_y = max(18, int(H * 0.055))
    rh = int(H * 0.32);  rmax = 0.34;  rgap = 6
    cH = H + glow_y + blur_r + rh + rgap
    canvas = Image.new('RGBA', (W, cH), (0, 0, 0, 0))

    ga = np.zeros((H, W, 4), dtype=np.uint8)
    gs = np.zeros((H, W), dtype=np.float32)
    gs[int(H * 0.70):] = alpha[int(H * 0.70):]
    ga[:, :, 0] = 20;  ga[:, :, 1] = 110;  ga[:, :, 2] = 35
    ga[:, :, 3] = np.clip(gs * 210, 0, 200).astype(np.uint8)
    gi = Image.fromarray(ga).filter(ImageFilter.GaussianBlur(blur_r))
    canvas.paste(gi, (0, glow_y), gi)

    sa = np.zeros((H, W, 4), dtype=np.uint8)
    sa[:, :, 3] = np.clip(alpha * 130, 0, 130).astype(np.uint8)
    si = Image.fromarray(sa).filter(ImageFilter.GaussianBlur(blur_r // 2))
    canvas.paste(si, (0, glow_y // 2), si)

    canvas.paste(img, (0, 0), img)

    strip = img.crop((0, H - rh, W, H)).transpose(Image.FLIP_TOP_BOTTOM).filter(
        ImageFilter.GaussianBlur(1.5))
    ref = np.array(strip.convert('RGBA'), dtype=np.float32)
    for row in range(ref.shape[0]):
        ref[row, :, 3] = np.clip(ref[row, :, 3] * rmax * (1 - row / ref.shape[0]), 0, 255)
    ri = Image.fromarray(ref.astype(np.uint8))
    canvas.paste(ri, (0, H + rgap), ri)
    return canvas


def save_check(final, name):
    th = final.copy()
    th.thumbnail((380, 480))
    bg = Image.new('RGBA', th.size, (7, 11, 7, 255))
    bg.paste(th, mask=th.split()[3])
    bg.convert('RGB').save(f'chk_{name}', 'PNG')


print('\nmispa-viva.png  (EDT + bg_thr=175 to catch gray bg at 178)')
img_rgb = Image.open(os.path.join(SRC, 'mispa-viva.jpg')).convert('RGB')
src = np.array(img_rgb, dtype=np.uint8)
H, W = src.shape[:2]
print(f'  source: {img_rgb.size}')

# EDT anchors from rembg
r1     = remove(img_rgb, session=SESSION, alpha_matting=False)
a1     = np.array(r1.convert('RGBA'), dtype=np.uint8)[:, :, 3]
anchor = a1 > 50
print(f'  anchor pixels: {anchor.sum():,} / {H*W:,} ({100*anchor.sum()//(H*W)}%)')

dist         = distance_transform_edt(~anchor)
machine_zone = dist < 350
print(f'  EDT zone: {machine_zone.sum():,} / {H*W:,} ({100*machine_zone.sum()//(H*W)}%)')

# bg_thr=175 catches the gray background (178 > 175)
# Red/dark parts (G,B<175) break connectivity → white body is isolated island
bg_mask      = remove_border_bg(src, bg_thr=175)
machine_mask = machine_zone & ~bg_mask
print(f'  after bg_thr=175 removal: {machine_mask.sum():,} / {H*W:,} ({100*machine_mask.sum()//(H*W)}%)')

# Fill any holes (white body that was near_bg but isolated → now a hole → fill it)
filled   = binary_fill_holes(machine_mask)
new_px   = filled & ~machine_mask
print(f'  fill_holes added: {new_px.sum():,} pixels')
if new_px.sum() < H * W * 0.25:
    machine_mask = filled

# Drop tiny components
lab2, n = sp_label(machine_mask)
if n > 1:
    szs = [(int(np.sum(lab2 == i)), i) for i in range(1, n + 1)]
    mx  = max(s for s, _ in szs)
    for s, i in szs:
        if s < mx * 0.02:
            machine_mask[lab2 == i] = False
print(f'  final mask: {machine_mask.sum():,} / {H*W:,} ({100*machine_mask.sum()//(H*W)}%)')

rgba = np.zeros((H, W, 4), dtype=np.uint8)
rgba[:, :, :3] = src
rgba[:, :, 3]  = (machine_mask * 255).astype(np.uint8)

final = add_3d_effects(Image.fromarray(rgba))
final.save(os.path.join(OUT, 'mispa-viva.png'), 'PNG')
save_check(final, 'mispa-viva.png')
print(f'  saved: {final.size}')

print('\nDone.')

"""
fix_viva_countx.py
──────────────────
Targeted fix for two machines that had issues in fix_white_machines.py:

  VIVA      – gray gradient background leaked into top-right. Fix: use
              standard rembg (gray bg gives rembg enough contrast) + fill_holes.

  Count X   – EDT radius 200 was too large; colored anchor pixels near the
              red screen expanded the zone into the bottom-left background corner.
              Fix: reduce edt_radius to 130.
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


# ── Shared helpers ─────────────────────────────────────────────────────────────

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


def clean_mask(arr, fill_holes=True, comp_thr=0.02):
    arr[arr[:, :, 3] < 15, 3] = 0
    if fill_holes:
        binary = arr[:, :, 3] > 0
        filled = binary_fill_holes(binary)
        new_px = filled & ~binary
        if np.sum(new_px) < arr.shape[0] * arr.shape[1] * 0.25:
            arr[new_px, 3] = 255
    binary = arr[:, :, 3] > 0
    lab, n = sp_label(binary)
    if n > 1:
        szs = [(int(np.sum(lab == i)), i) for i in range(1, n + 1)]
        mx  = max(s for s, _ in szs)
        for s, i in szs:
            if s < mx * comp_thr:
                arr[lab == i, 3] = 0
    return arr


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


# ── 1. VIVA – standard rembg (gray background gives good contrast) ─────────────
print('\nmispa-viva.png  (standard rembg + fill_holes)')
img_rgb = Image.open(os.path.join(SRC, 'mispa-viva.jpg')).convert('RGB')
print(f'  source: {img_rgb.size}')

result = remove(img_rgb, session=SESSION, alpha_matting=False)
arr    = np.array(result.convert('RGBA'), dtype=np.uint8)
arr    = clean_mask(arr, fill_holes=True, comp_thr=0.02)

# Extra: remove any residual border-connected near-white background from the mask
src_arr = np.array(img_rgb, dtype=np.uint8)
bg_mask = remove_border_bg(src_arr, bg_thr=170)  # catch the gray gradient
arr[bg_mask, 3] = 0

final = add_3d_effects(Image.fromarray(arr))
final.save(os.path.join(OUT, 'mispa-viva.png'), 'PNG')
save_check(final, 'mispa-viva.png')
print(f'  saved: {final.size}')


# ── 2. Count X – EDT with smaller radius (130 instead of 200) ─────────────────
print('\nmispa-count-x.png  (EDT radius=130)')
img_rgb = Image.open(os.path.join(SRC, 'mispa-count-x-plus.png')).convert('RGB')
print(f'  source: {img_rgb.size}')

src    = np.array(img_rgb, dtype=np.uint8)
H, W   = src.shape[:2]

r1     = remove(img_rgb, session=SESSION, alpha_matting=False)
a1     = np.array(r1.convert('RGBA'), dtype=np.uint8)[:, :, 3]
anchor = a1 > 60

print(f'  anchor pixels: {anchor.sum():,} / {H*W:,}')

dist         = distance_transform_edt(~anchor)
machine_zone = dist < 130  # reduced from 200 to 130
print(f'  EDT zone (r=130): {machine_zone.sum():,} / {H*W:,} ({100*machine_zone.sum()//(H*W)}%)')

bg_mask      = remove_border_bg(src, bg_thr=245)
machine_mask = machine_zone & ~bg_mask

filled   = binary_fill_holes(machine_mask)
new_px   = filled & ~machine_mask
if new_px.sum() < H * W * 0.25:
    machine_mask = filled

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
final.save(os.path.join(OUT, 'mispa-count-x.png'), 'PNG')
save_check(final, 'mispa-count-x.png')
print(f'  saved: {final.size}')

print('\nDone.')

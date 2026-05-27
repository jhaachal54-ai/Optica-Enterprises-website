"""
fix_hx50_clog.py
────────────────
HX50 and CLOG both have a studio background with a blue-tinted gradient light:
  - Corners: pure black  (0,0,0)          ← vignette
  - Centre:  cool blue-white (~224,240,249) for HX50
             cool blue-gray  (~192,198,211) for CLOG

Machine bodies are NEUTRAL or WARM white — NOT blue-dominant.
Strategy:
  1. rembg soft mask → anchor pixels (dark/colored machine parts).
  2. EDT expansion → machine zone.
  3. Custom bg removal: near_bg = very_dark (R,G,B < dark_thr)
                                  OR  blue_dominant (B > R + blue_excess)
     This catches the vignette AND the cool background light while leaving
     the neutral/warm white machine body untouched.
  4. machine_mask = EDT_zone & ~border_connected(near_bg)
  5. fill_holes → component cleanup → 3D effects.
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

MIN_SHORT = 600

# (src, out, anchor_thr, edt_radius, dark_thr, blue_excess)
JOBS = [
    # HX50: white body + black screen. Screen anchors EDT; large radius covers full body.
    # blue_excess=12 → background (B-R≈25) caught; machine white (B-R≈0) safe.
    ('Mispa-HX50.jpeg', 'mispa-hx50.png',  30, 450,  45, 12),

    # CLOG: gray probe/keypad anchor EDT; background (B-R≈19) caught; warm white safe.
    ('Mispa-Clog.jpeg', 'mispa-clog.png',  40, 320,  45, 12),
]


def prepare(img_rgb):
    W, H = img_rgb.size
    short = min(W, H)
    if short < MIN_SHORT:
        scale = MIN_SHORT / short
        img_rgb = img_rgb.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
        print(f'    upscaled -> {img_rgb.size}')
    return img_rgb


def remove_border_bg_blue(src_arr, dark_thr=45, blue_excess=12):
    """
    Background mask = border-connected pixels where:
      (all channels < dark_thr)  ← vignette / black corners
      OR
      (B > R + blue_excess)       ← cool blue-tinted studio light
    Machine white body (neutral/warm) has B ≈ R → NOT blue-dominant → safe.
    """
    r = src_arr[:, :, 0].astype(int)
    g = src_arr[:, :, 1].astype(int)
    b = src_arr[:, :, 2].astype(int)
    very_dark     = (r < dark_thr) & (g < dark_thr) & (b < dark_thr)
    blue_dominant = b > (r + blue_excess)
    near_bg       = very_dark | blue_dominant

    lab, _ = sp_label(near_bg)
    H, W   = src_arr.shape[:2]
    edge   = set()
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
    canvas.paste(Image.fromarray(ref.astype(np.uint8)), (0, H + rgap),
                 Image.fromarray(ref.astype(np.uint8)))
    return canvas


def save_check(final, name):
    th = final.copy(); th.thumbnail((380, 480))
    bg = Image.new('RGBA', th.size, (7, 11, 7, 255))
    bg.paste(th, mask=th.split()[3])
    bg.convert('RGB').save(f'chk_{name}', 'PNG')


# ── Run ────────────────────────────────────────────────────────────────────────
for src_name, out_name, anchor_thr, edt_radius, dark_thr, blue_excess in JOBS:
    print(f'\n{out_name}  <-  {src_name}')
    img_rgb = Image.open(os.path.join(SRC, src_name)).convert('RGB')
    img_rgb = prepare(img_rgb)
    print(f'  size: {img_rgb.size}')
    src = np.array(img_rgb, dtype=np.uint8)
    H, W = src.shape[:2]

    # Step 1 – rembg anchor
    r1     = remove(img_rgb, session=SESSION, alpha_matting=False)
    a1     = np.array(r1.convert('RGBA'), dtype=np.uint8)[:, :, 3]
    anchor = a1 > anchor_thr
    print(f'  anchor pixels: {anchor.sum():,} / {H*W:,} ({100*anchor.sum()//(H*W)}%)')

    # Step 2 – EDT expansion
    dist         = distance_transform_edt(~anchor)
    machine_zone = dist < edt_radius
    print(f'  EDT zone (r={edt_radius}): {machine_zone.sum():,} / {H*W:,} ({100*machine_zone.sum()//(H*W)}%)')

    # Step 3 – blue-dominant background removal
    bg_mask      = remove_border_bg_blue(src, dark_thr=dark_thr, blue_excess=blue_excess)
    machine_mask = machine_zone & ~bg_mask
    print(f'  after bg removal: {machine_mask.sum():,} / {H*W:,} ({100*machine_mask.sum()//(H*W)}%)')

    # Step 4 – fill holes
    filled = binary_fill_holes(machine_mask)
    new_px = filled & ~machine_mask
    if new_px.sum() < H * W * 0.25:
        machine_mask = filled

    # Step 5 – drop tiny components
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
    final.save(os.path.join(OUT, out_name), 'PNG')
    save_check(final, out_name)
    print(f'  saved: {final.size}')

print('\nAll done.')

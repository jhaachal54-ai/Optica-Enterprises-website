"""
fix_white_machines.py
─────────────────────
Fixes the 6 product images where the white machine body was lost against the
white/near-white studio background.

Strategy (per machine):
  1. rembg soft mask  → anchor pixels (dark/coloured parts reliably detected).
  2. distance_transform_edt from anchor  → 'machine zone' within N pixels.
  3. Remove border-connected background pixels from the zone.
  4. Compose RGBA from original photo colours + zone mask.
  5. fill_holes  →  component cleanup  →  3-D effects.
"""

import os, io
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

# ── Per-machine parameters ────────────────────────────────────────────────────
# anchor_thr  : rembg soft-alpha threshold for seed pixels (lower = more seeds)
# edt_radius  : max pixel distance from any seed to be in the machine zone
# bg_thr      : RGB threshold for 'background-like' pixels (border-connected
#               pixels above this value are removed as background)
JOBS = [
    # (src_filename,   out_filename,       anchor_thr, edt_radius, bg_thr)
    ('mispa_maestro.jpg',       'mispa-maestro.png',  60, 220, 245),
    ('mispa-plus-advanced.jpg', 'mispa-plus.png',     60, 220, 245),
    ('mispa-count-x-plus.png',  'mispa-count-x.png',  60, 200, 245),
    ('mispa-viva.jpg',          'mispa-viva.png',      50, 350, 210),  # grey bg
    ('Mispa-HX50.jpg',          'mispa-hx50.png',      30, 450, 245),  # all-white
    ('Mispa-Coagulation-Analyzer.png', 'mispa-clog.png', 30, 350, 240),
]


def prepare(img_rgb):
    W, H = img_rgb.size
    short = min(W, H)
    if short < MIN_SHORT:
        scale = MIN_SHORT / short
        img_rgb = img_rgb.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    return img_rgb


def remove_border_bg(src_arr, bg_thr):
    """Return boolean mask: True = border-connected background."""
    r = src_arr[:,:,0].astype(int)
    g = src_arr[:,:,1].astype(int)
    b = src_arr[:,:,2].astype(int)
    near_bg = (r > bg_thr) & (g > bg_thr) & (b > bg_thr)
    lab, _ = sp_label(near_bg)
    H, W   = src_arr.shape[:2]
    edge   = set()
    for y in range(H):
        for x in [0, W-1]:
            if lab[y,x] > 0: edge.add(lab[y,x])
    for x in range(W):
        for y in [0, H-1]:
            if lab[y,x] > 0: edge.add(lab[y,x])
    return np.isin(lab, list(edge))


def extract_white_machine(img_rgb, anchor_thr, edt_radius, bg_thr):
    src = np.array(img_rgb, dtype=np.uint8)
    H, W = src.shape[:2]

    # Step 1 – rembg anchor
    r1     = remove(img_rgb, session=SESSION, alpha_matting=False)
    a1     = np.array(r1.convert('RGBA'), dtype=np.uint8)[:,:,3]
    anchor = a1 > anchor_thr
    print(f'    anchor pixels: {anchor.sum():,} / {H*W:,} ({100*anchor.sum()//(H*W)}%)')

    # Step 2 – EDT expansion
    dist         = distance_transform_edt(~anchor)
    machine_zone = dist < edt_radius
    print(f'    EDT zone (r={edt_radius}): {machine_zone.sum():,} / {H*W:,} ({100*machine_zone.sum()//(H*W)}%)')

    # Step 3 – remove border-connected background
    bg_mask      = remove_border_bg(src, bg_thr)
    machine_mask = machine_zone & ~bg_mask

    # Step 4 – fill holes
    filled   = binary_fill_holes(machine_mask)
    new_px   = filled & ~machine_mask
    if new_px.sum() < H * W * 0.25:
        machine_mask = filled

    # Step 5 – drop tiny components
    lab2, n = sp_label(machine_mask)
    if n > 1:
        szs = [(int(np.sum(lab2 == i)), i) for i in range(1, n+1)]
        mx  = max(s for s,_ in szs)
        for s, i in szs:
            if s < mx * 0.02:
                machine_mask[lab2 == i] = False
    print(f'    final mask:  {machine_mask.sum():,} / {H*W:,} ({100*machine_mask.sum()//(H*W)}%)')

    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[:,:,:3] = src
    rgba[:,:,3]  = (machine_mask * 255).astype(np.uint8)
    return Image.fromarray(rgba)


def add_3d_effects(img):
    W, H    = img.size
    alpha   = np.array(img.convert('RGBA'), dtype=np.uint8)[:,:,3].astype(np.float32) / 255.0
    blur_r  = max(28, int(min(W, H) * 0.055))
    glow_y  = max(18, int(H * 0.055))
    rh = int(H*0.32);  rmax = 0.34;  rgap = 6
    cH = H + glow_y + blur_r + rh + rgap
    canvas = Image.new('RGBA', (W, cH), (0,0,0,0))
    ga = np.zeros((H, W, 4), dtype=np.uint8)
    gs = np.zeros((H, W), dtype=np.float32)
    gs[int(H*0.70):] = alpha[int(H*0.70):]
    ga[:,:,0]=20; ga[:,:,1]=110; ga[:,:,2]=35
    ga[:,:,3] = np.clip(gs*210, 0, 200).astype(np.uint8)
    gi = Image.fromarray(ga).filter(ImageFilter.GaussianBlur(blur_r))
    canvas.paste(gi, (0, glow_y), gi)
    sa = np.zeros((H, W, 4), dtype=np.uint8)
    sa[:,:,3] = np.clip(alpha*130, 0, 130).astype(np.uint8)
    si = Image.fromarray(sa).filter(ImageFilter.GaussianBlur(blur_r//2))
    canvas.paste(si, (0, glow_y//2), si)
    canvas.paste(img, (0, 0), img)
    strip = img.crop((0, H-rh, W, H)).transpose(Image.FLIP_TOP_BOTTOM).filter(
        ImageFilter.GaussianBlur(1.5))
    ref = np.array(strip.convert('RGBA'), dtype=np.float32)
    for row in range(ref.shape[0]):
        ref[row,:,3] = np.clip(ref[row,:,3]*rmax*(1-row/ref.shape[0]), 0, 255)
    ri = Image.fromarray(ref.astype(np.uint8))
    canvas.paste(ri, (0, H+rgap), ri)
    return canvas


# ── Run ───────────────────────────────────────────────────────────────────────
for src_name, out_name, anchor_thr, edt_radius, bg_thr in JOBS:
    print(f'\n{out_name}')
    img_rgb = Image.open(os.path.join(SRC, src_name)).convert('RGB')
    img_rgb = prepare(img_rgb)
    print(f'  size: {img_rgb.size}')

    rgba  = extract_white_machine(img_rgb, anchor_thr, edt_radius, bg_thr)
    final = add_3d_effects(rgba)
    final.save(os.path.join(OUT, out_name), 'PNG')

    # Quick dark-bg preview
    th = final.copy(); th.thumbnail((380, 480))
    bg = Image.new('RGBA', th.size, (7,11,7,255))
    bg.paste(th, mask=th.split()[3])
    bg.convert('RGB').save(f'chk_{out_name}', 'PNG')
    print(f'  saved: {final.size}')

print('\nAll done.')

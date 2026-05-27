"""
fix_hx50_clog_v2.py
────────────────────
Strategy: both machines nearly fill the frame. The background is mainly the
dark vignette at the borders. Remove ONLY dark border-connected pixels;
use EDT to expand rembg anchors (dark/colored elements) across the full
white body.  No blue-dominant removal needed.

HX50: 24 % is pure black vignette; machine fills the rest.
CLOG: small dark areas on left/bottom; light gray at top is also background.
      Use a wider dark_thr=55 to catch the mid-dark border gradient, plus
      an additional luminance cap to catch the lighter top strip.
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

# (src, out, anchor_thr, edt_radius, dark_thr)
JOBS = [
    # HX50: 24% black vignette; machine (black screen+feet) gives EDT anchors.
    # Very low anchor_thr=5 captures any weak rembg signal on the white panel too.
    ('Mispa-HX50.jpeg', 'mispa-hx50.png', 5, 380, 28),

    # CLOG: dark vignette on left/bottom; gray probe+keypad give anchors.
    # dark_thr=55 catches the mid-dark gradient on left/bottom sides.
    ('Mispa-Clog.jpeg',  'mispa-clog.png', 5, 340, 55),
]


def prepare(img_rgb):
    W, H = img_rgb.size
    short = min(W, H)
    if short < MIN_SHORT:
        scale = MIN_SHORT / short
        img_rgb = img_rgb.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
        print(f'    upscaled -> {img_rgb.size}')
    return img_rgb


def remove_border_dark(src_arr, dark_thr):
    """Remove border-connected pixels where ALL channels < dark_thr."""
    r = src_arr[:, :, 0].astype(int)
    g = src_arr[:, :, 1].astype(int)
    b = src_arr[:, :, 2].astype(int)
    near_bg = (r < dark_thr) & (g < dark_thr) & (b < dark_thr)
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
    canvas.paste(Image.fromarray(ref.astype(np.uint8)), (0, H + rgap),
                 Image.fromarray(ref.astype(np.uint8)))
    return canvas


def save_check(final, name):
    th = final.copy(); th.thumbnail((380, 480))
    bg = Image.new('RGBA', th.size, (7, 11, 7, 255))
    bg.paste(th, mask=th.split()[3])
    bg.convert('RGB').save(f'chk_{name}', 'PNG')


for src_name, out_name, anchor_thr, edt_radius, dark_thr in JOBS:
    print(f'\n{out_name}  <-  {src_name}')
    img_rgb = Image.open(os.path.join(SRC, src_name)).convert('RGB')
    img_rgb = prepare(img_rgb)
    src = np.array(img_rgb, dtype=np.uint8)
    H, W = src.shape[:2]
    print(f'  size: {img_rgb.size}')

    # Step 1 – rembg anchor (very permissive)
    r1     = remove(img_rgb, session=SESSION, alpha_matting=False)
    a1     = np.array(r1.convert('RGBA'), dtype=np.uint8)[:, :, 3]
    anchor = a1 > anchor_thr
    print(f'  anchor pixels (thr={anchor_thr}): {anchor.sum():,} / {H*W:,} ({100*anchor.sum()//(H*W)}%)')

    # Step 2 – EDT expansion
    dist         = distance_transform_edt(~anchor)
    machine_zone = dist < edt_radius
    print(f'  EDT zone (r={edt_radius}): {machine_zone.sum():,} / {H*W:,} ({100*machine_zone.sum()//(H*W)}%)')

    # Step 3 – remove dark border vignette only
    bg_mask      = remove_border_dark(src, dark_thr=dark_thr)
    machine_mask = machine_zone & ~bg_mask
    print(f'  after dark removal (thr={dark_thr}): {machine_mask.sum():,} / {H*W:,} ({100*machine_mask.sum()//(H*W)}%)')

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

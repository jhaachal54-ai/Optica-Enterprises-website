"""
fix_viva_countx_v2.py
─────────────────────
Count X: source PNG already has a clean alpha channel → use it directly.

VIVA:   Background is uniform gray (178,178,178) which is BELOW the old
        bg_thr=210 threshold → gray patch was never caught.
        Fix: use color-tolerance flood fill from border (T=55).
        - Gray background (178-186) is within T=55 of itself → removed ✓
        - Machine white body (240+) is distance ~107 from bg → protected ✓
        Then EDT + fill_holes to complete the white body.
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


def color_tol_border_bg(src_arr, tolerance=55):
    """
    Flood fill from image border.  A pixel is 'background-like' if its
    Euclidean RGB distance from the AVERAGE border corner color is < tolerance.
    Returns boolean mask: True = border-connected background.
    """
    H, W = src_arr.shape[:2]
    src_f = src_arr.astype(np.float32)

    # Sample average background color from 10×10 corners
    s = 10
    corners = np.vstack([
        src_f[:s, :s].reshape(-1, 3),
        src_f[:s, -s:].reshape(-1, 3),
        src_f[-s:, :s].reshape(-1, 3),
        src_f[-s:, -s:].reshape(-1, 3),
    ])
    bg_color = np.median(corners, axis=0)
    print(f'    bg color (corner median): {bg_color.astype(int)}')

    dist_from_bg = np.sqrt(np.sum((src_f - bg_color) ** 2, axis=2))
    bg_like = dist_from_bg < tolerance

    lab, _ = sp_label(bg_like)
    edge   = set()
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


# ── 1. Count X – use the pre-existing alpha channel from the source PNG ────────
print('\nmispa-count-x.png  (using pre-existing alpha from source PNG)')
img_src = Image.open(os.path.join(SRC, 'mispa-count-x-plus.png')).convert('RGBA')
print(f'  source: {img_src.size}, mode: RGBA')

arr = np.array(img_src, dtype=np.uint8)
arr = clean_mask(arr, fill_holes=True, comp_thr=0.02)

final = add_3d_effects(Image.fromarray(arr))
final.save(os.path.join(OUT, 'mispa-count-x.png'), 'PNG')
save_check(final, 'mispa-count-x.png')
print(f'  saved: {final.size}')


# ── 2. VIVA – EDT + color-tolerance border removal ─────────────────────────────
print('\nmispa-viva.png  (EDT + color-tolerance border removal, T=55)')
img_rgb = Image.open(os.path.join(SRC, 'mispa-viva.jpg')).convert('RGB')
print(f'  source: {img_rgb.size}')

src = np.array(img_rgb, dtype=np.uint8)
H, W = src.shape[:2]

# EDT anchors from rembg
r1     = remove(img_rgb, session=SESSION, alpha_matting=False)
a1     = np.array(r1.convert('RGBA'), dtype=np.uint8)[:, :, 3]
anchor = a1 > 50
print(f'  anchor pixels: {anchor.sum():,} / {H*W:,} ({100*anchor.sum()//(H*W)}%)')

dist         = distance_transform_edt(~anchor)
machine_zone = dist < 350
print(f'  EDT zone: {machine_zone.sum():,} / {H*W:,} ({100*machine_zone.sum()//(H*W)}%)')

# Color-tolerance border removal (catches the uniform gray at ~178-186)
bg_mask      = color_tol_border_bg(src, tolerance=55)
machine_mask = machine_zone & ~bg_mask
print(f'  after bg removal: {machine_mask.sum():,} / {H*W:,} ({100*machine_mask.sum()//(H*W)}%)')

# Fill holes
filled   = binary_fill_holes(machine_mask)
new_px   = filled & ~machine_mask
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

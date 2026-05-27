"""
process_new_photos.py
─────────────────────
Processes 5 newly uploaded product photos from 'Product images/'.
All have pure-black-corner vignette studio backgrounds → standard rembg works.

Pipeline per machine:
  upscale if small  →  rembg  →  fill_holes  →  component cleanup  →  3D effects
"""

import os
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
from scipy.ndimage import binary_fill_holes, label as sp_label

BASE    = r'C:\Users\Optica Enterprises\OneDrive\Desktop\Optica Enterprises website'
SRC     = os.path.join(BASE, 'Product images')
OUT     = os.path.join(BASE, 'product-images')
SESSION = new_session('isnet-general-use')

MIN_SHORT_SIDE = 600

JOBS = [
    ('Mispa-Maestro.jpeg',              'mispa-maestro.png'),
    ('Mispa-Plus-Semi-Automated.jpeg',  'mispa-plus.png'),
    ('Mispa-REVO.jpeg',                 'mispa-revo.png'),
    ('Mispa-HX50.jpeg',                 'mispa-hx50.png'),
    ('Mispa-Clog.jpeg',                 'mispa-clog.png'),
]


def prepare(img_rgb):
    W, H = img_rgb.size
    short = min(W, H)
    if short < MIN_SHORT_SIDE:
        scale = MIN_SHORT_SIDE / short
        new_size = (int(W * scale), int(H * scale))
        img_rgb = img_rgb.resize(new_size, Image.LANCZOS)
        print(f'    upscaled {W}x{H} -> {new_size[0]}x{new_size[1]}')
    return img_rgb


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


# ── Main loop ──────────────────────────────────────────────────────────────────
for src_name, out_name in JOBS:
    print(f'\n{out_name}  <-  {src_name}')
    img_rgb = Image.open(os.path.join(SRC, src_name)).convert('RGB')
    print(f'  source: {img_rgb.size}')

    img_rgb = prepare(img_rgb)

    result = remove(img_rgb, session=SESSION, alpha_matting=False)
    arr    = np.array(result.convert('RGBA'), dtype=np.uint8)

    before = (arr[:, :, 3] > 0).sum()
    arr    = clean_mask(arr, fill_holes=True, comp_thr=0.02)
    after  = (arr[:, :, 3] > 0).sum()
    H, W   = arr.shape[:2]
    print(f'  mask: {after:,} / {H*W:,} ({100*after//(H*W)}%)')

    final = add_3d_effects(Image.fromarray(arr))
    final.save(os.path.join(OUT, out_name), 'PNG')
    save_check(final, out_name)
    print(f'  saved: {final.size}')

print('\nAll done.')

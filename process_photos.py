"""
process_photos.py
─────────────────
Processes real product photos from 'Product images/' folder.
For each: upsample if small → rembg background removal → fill holes →
component cleanup → 3D glow/shadow/reflection effects → save to product-images/
"""

import os, io
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
from scipy.ndimage import binary_fill_holes, label as sp_label

BASE  = r'C:\Users\Optica Enterprises\OneDrive\Desktop\Optica Enterprises website'
SRC   = os.path.join(BASE, 'Product images')
OUT   = os.path.join(BASE, 'product-images')
SESSION = new_session('isnet-general-use')

# ── Input photo → Output filename mapping ─────────────────────────────────────
JOBS = [
    ('Edan-i15-blood-gas-analyzer.jpg',                           'edan-i15.png'),
    ('EXIAS-E1-Analyzer.jpg',                                     'exias-e1.png'),
    ('Getein-1100-Immunofluorescence-Analyzer.jpg',               'getein-1100.png'),
    ('Mispa-Coagulation-Analyzer.png',                            'mispa-clog.png'),
    ('mispa-count-x-plus.png',                                    'mispa-count-x.png'),
    ('Mispa-CXL-Pro-Plus-Fully-Automated-Biochemistry-Analyzer.jpg', 'mispa-cxl.png'),
    ('Mispa-FAB-120.png',                                         'mispa-fab120.png'),
    ('Mispa-HX50.jpg',                                            'mispa-hx50.png'),
    ('mispa-i3.png',                                              'mispa-i3.png'),
    ('mispa_maestro.jpg',                                         'mispa-maestro.png'),
    ('mispa-nano-plus.jpg',                                       'mispa-nano.png'),
    ('mispa-plus-advanced.jpg',                                   'mispa-plus.png'),
    ('mispa-revo-plus.png',                                       'mispa-revo.png'),
    ('mispa-viva.jpg',                                            'mispa-viva.png'),
]

MIN_SHORT_SIDE = 600   # upscale photos smaller than this


def prepare(img_rgb):
    """Upscale if the short side is below MIN_SHORT_SIDE."""
    W, H = img_rgb.size
    short = min(W, H)
    if short < MIN_SHORT_SIDE:
        scale = MIN_SHORT_SIDE / short
        new_size = (int(W * scale), int(H * scale))
        img_rgb = img_rgb.resize(new_size, Image.LANCZOS)
        print(f'    upscaled {W}x{H} -> {new_size[0]}x{new_size[1]}')
    return img_rgb


def clean_mask(arr, fill_holes=True, comp_thr=0.02):
    """
    arr: RGBA numpy array from rembg.
    - Remove near-transparent pixels (alpha < 15).
    - Fill enclosed holes in the alpha mask.
    - Drop disconnected components smaller than comp_thr × largest.
    """
    arr[arr[:, :, 3] < 15, 3] = 0

    if fill_holes:
        binary = arr[:, :, 3] > 0
        filled = binary_fill_holes(binary)
        new_px = filled & ~binary
        # Only fill if holes aren't absurdly large (>25 % of canvas)
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
    W, H = img.size
    alpha   = np.array(img.convert('RGBA'), dtype=np.uint8)[:, :, 3].astype(np.float32) / 255.0
    blur_r  = max(28, int(min(W, H) * 0.055))
    glow_y  = max(18, int(H * 0.055))
    rh  = int(H * 0.32);  rmax = 0.34;  rgap = 6
    cH  = H + glow_y + blur_r + rh + rgap
    canvas = Image.new('RGBA', (W, cH), (0, 0, 0, 0))

    # Green ground glow
    ga = np.zeros((H, W, 4), dtype=np.uint8)
    gs = np.zeros((H, W), dtype=np.float32)
    gs[int(H * 0.70):] = alpha[int(H * 0.70):]
    ga[:, :, 0] = 20;  ga[:, :, 1] = 110;  ga[:, :, 2] = 35
    ga[:, :, 3] = np.clip(gs * 210, 0, 200).astype(np.uint8)
    canvas.paste(Image.fromarray(ga).filter(ImageFilter.GaussianBlur(blur_r)),
                 (0, glow_y), Image.fromarray(ga).filter(ImageFilter.GaussianBlur(blur_r)))

    # Ambient shadow
    sa = np.zeros((H, W, 4), dtype=np.uint8)
    sa[:, :, 3] = np.clip(alpha * 130, 0, 130).astype(np.uint8)
    canvas.paste(Image.fromarray(sa).filter(ImageFilter.GaussianBlur(blur_r // 2)),
                 (0, glow_y // 2), Image.fromarray(sa).filter(ImageFilter.GaussianBlur(blur_r // 2)))

    # Machine
    canvas.paste(img, (0, 0), img)

    # Floor reflection
    strip = img.crop((0, H - rh, W, H)).transpose(Image.FLIP_TOP_BOTTOM).filter(
        ImageFilter.GaussianBlur(1.5))
    ref = np.array(strip.convert('RGBA'), dtype=np.float32)
    for row in range(ref.shape[0]):
        ref[row, :, 3] = np.clip(ref[row, :, 3] * rmax * (1 - row / ref.shape[0]), 0, 255)
    ri = Image.fromarray(ref.astype(np.uint8))
    canvas.paste(ri, (0, H + rgap), ri)
    return canvas


# ── Main loop ─────────────────────────────────────────────────────────────────
for src_name, out_name in JOBS:
    src_path = os.path.join(SRC, src_name)
    out_path = os.path.join(OUT, out_name)

    print(f'\n{out_name}  <-  {src_name}')

    img_rgb = Image.open(src_path).convert('RGB')
    print(f'  source: {img_rgb.size}')

    img_rgb = prepare(img_rgb)

    # Background removal
    result = remove(img_rgb, session=SESSION, alpha_matting=False)
    arr    = np.array(result.convert('RGBA'), dtype=np.uint8)

    # Clean mask
    arr    = clean_mask(arr, fill_holes=True, comp_thr=0.02)

    # 3-D effects
    final  = add_3d_effects(Image.fromarray(arr))
    final.save(out_path, 'PNG')
    print(f'  saved:  {final.size}')

print('\nAll done.')

"""
fix_viva_v4.py
──────────────
Green background approach for VIVA.

VIVA source: gray background (178-186 RGB) that blends into the white machine
body (~209+). No clean luminance cut exists between them.

Strategy:
  1. Compute background color from top row (clearly uniform gray).
  2. Flood fill from border with Euclidean tolerance T=25 — catches gray bg (dist
     0-17) but stops at machine white surface (dist 50+).
  3. Replace captured background pixels with bright green (0,200,0).
  4. Run rembg on the green image — white machine vs green background is
     extremely clear contrast, giving a perfect clean cut.
  5. fill_holes + component cleanup + 3D effects.
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


def green_bg_flood_fill(img_rgb, tolerance=25):
    """
    Find border-connected pixels within Euclidean tolerance of the top-row
    background color.  Return (modified_image_with_green_bg, bg_mask).
    """
    src   = np.array(img_rgb, dtype=np.uint8)
    H, W  = src.shape[:2]
    src_f = src.astype(np.float32)

    # Background color = median of top 3 rows (clearly uniform background)
    bg_color = np.median(src_f[:3, :, :].reshape(-1, 3), axis=0)
    print(f'    bg reference color: {bg_color.astype(int)}')

    dist_from_bg = np.sqrt(np.sum((src_f - bg_color) ** 2, axis=2))
    bg_like      = dist_from_bg < tolerance
    print(f'    bg_like pixels (T={tolerance}): {bg_like.sum():,} / {H*W:,} ({100*bg_like.sum()//(H*W)}%)')

    # Keep only border-connected
    lab, _ = sp_label(bg_like)
    edge   = set()
    for y in range(H):
        for x in [0, W - 1]:
            if lab[y, x] > 0: edge.add(lab[y, x])
    for x in range(W):
        for y in [0, H - 1]:
            if lab[y, x] > 0: edge.add(lab[y, x])
    bg_mask = np.isin(lab, list(edge))
    print(f'    border-connected bg: {bg_mask.sum():,} pixels ({100*bg_mask.sum()//(H*W)}%)')

    # Replace background with bright green
    out = src.copy()
    out[bg_mask] = [0, 200, 0]
    return Image.fromarray(out), bg_mask


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


print('\nmispa-viva.png  (green bg approach, T=25)')
img_rgb = Image.open(os.path.join(SRC, 'mispa-viva.jpg')).convert('RGB')
print(f'  source: {img_rgb.size}')

# Step 1: replace background with green
green_img, bg_mask = green_bg_flood_fill(img_rgb, tolerance=25)
green_img.save('dbg_viva_green.png')   # debug: inspect the green-bg image

# Step 2: rembg on green image — white body vs green is crystal clear
print('  running rembg on green image...')
result = remove(green_img, session=SESSION, alpha_matting=False)
arr    = np.array(result.convert('RGBA'), dtype=np.uint8)

opaque  = (arr[:, :, 3] == 255).sum()
transp  = (arr[:, :, 3] == 0).sum()
print(f'  rembg result: {opaque:,} opaque, {transp:,} transparent')

# Step 2b: restore original colors where the flood fill replaced gray with green,
# then ZERO those pixels out — they are background, not machine.
# fill_holes will restore the silhouette cleanly.
arr[bg_mask, 3] = 0
print(f'  after removing flood-filled bg pixels: {(arr[:,:,3]>0).sum():,} opaque')

# Also zero out any residual green-dominant pixels (G > R+30 AND G > B+30)
rgb = arr[:, :, :3].astype(int)
green_tint = (rgb[:,:,1] > rgb[:,:,0] + 30) & (rgb[:,:,1] > rgb[:,:,2] + 30) & (arr[:,:,3] > 0)
arr[green_tint, 3] = 0
print(f'  after green-tint cleanup: {(arr[:,:,3]>0).sum():,} opaque')

# Step 3: clean mask
arr = clean_mask(arr, fill_holes=True, comp_thr=0.02)
print(f'  final mask pixels: {(arr[:,:,3] > 0).sum():,}')

# Step 4: 3D effects
final = add_3d_effects(Image.fromarray(arr))
final.save(os.path.join(OUT, 'mispa-viva.png'), 'PNG')
save_check(final, 'mispa-viva.png')
print(f'  saved: {final.size}')

print('\nDone.')

import fitz, os, io
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session
from scipy.ndimage import binary_dilation, binary_fill_holes, label as sp_label

BASE = r'C:\Users\Optica Enterprises\OneDrive\Desktop\Optica Enterprises website'
CAT  = os.path.join(BASE, 'Catalogue')
OUT  = os.path.join(BASE, 'product-images')
SESSION = new_session('isnet-general-use')

def render_crop(pdf, pg, st, sb, sl, sr, zoom=2.5):
    doc = fitz.open(f'{CAT}/{pdf}')
    page = doc[pg]
    pix  = page.get_pixmap(matrix=fitz.Matrix(zoom,zoom), alpha=False)
    img  = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    doc.close()
    W, H = img.size
    return img.crop((int(W*sl), int(H*st), W-int(W*sr), H-int(H*sb)))

def replace_white_bg_careful(img_rgb, fake=(0,200,0), thr=200):
    arr = np.array(img_rgb, dtype=np.uint8)
    H, W = arr.shape[:2]
    r = arr[:,:,0].astype(int)
    g = arr[:,:,1].astype(int)
    b = arr[:,:,2].astype(int)
    white = (r > thr) & (g > thr) & (b > thr)
    lab, _ = sp_label(white)
    edge = set()
    for y in range(H):
        for x in [0, W-1]:
            if lab[y,x] > 0: edge.add(lab[y,x])
    for x in range(W):
        for y in [0, H-1]:
            if lab[y,x] > 0: edge.add(lab[y,x])
    if not edge:
        return img_rgb
    mask = np.isin(lab, list(edge))
    mod = arr.copy()
    mod[mask] = fake
    return Image.fromarray(mod)

def remove_green_artifacts(arr):
    r = arr[:,:,0].astype(int)
    g = arr[:,:,1].astype(int)
    b = arr[:,:,2].astype(int)
    a = arr[:,:,3]
    green = (g > r+60) & (g > b+60) & (g > 100) & (a > 0)
    arr[green, 3] = 0
    return arr

def post_process(arr, white_body, fill_holes=False, white_dil=0, comp_thr=0.04):
    if white_body:
        r,g,b,a = arr[:,:,0],arr[:,:,1],arr[:,:,2],arr[:,:,3]
        semi  = (a > 0) & (a < 245)
        light = (r > 140) & (g > 140) & (b > 140)
        arr[semi & light & (a > 60), 3] = 255
        arr[semi & light & (a <= 60), 3] = 0
    else:
        arr[arr[:,:,3] < 20, 3] = 0

    if fill_holes:
        binary = (arr[:,:,3] > 128)
        filled = binary_fill_holes(binary)
        new_px = filled & ~binary
        if np.sum(new_px) < arr.shape[0] * arr.shape[1] * 0.30:
            arr[new_px, 3] = 255

    if white_dil > 0:
        r,g,b,a = arr[:,:,0],arr[:,:,1],arr[:,:,2],arr[:,:,3]
        seeds = (r > 155) & (g > 155) & (b > 155) & (a > 0)
        zone  = binary_dilation(seeds, structure=np.ones((white_dil,white_dil), bool))
        arr[(a > 0) & ~zone, 3] = 0

    binary = (arr[:,:,3] > 0)
    lab2, n = sp_label(binary)
    if n > 1:
        szs = [(int(np.sum(lab2==i)), i) for i in range(1, n+1)]
        mx  = max(s for s,_ in szs)
        for s, i in szs:
            if s < mx * comp_thr:
                arr[lab2==i, 3] = 0
    return arr

def add_3d_effects(img):
    W, H = img.size
    machine = np.array(img.convert('RGBA'), dtype=np.uint8)
    alpha   = machine[:,:,3].astype(np.float32) / 255.0
    blur_r  = max(28, int(min(W,H)*0.055))
    glow_y  = max(18, int(H*0.055))
    rh = int(H*0.32); rmax=0.34; rgap=6
    cH = H + glow_y + blur_r + rh + rgap
    canvas = Image.new('RGBA', (W,cH), (0,0,0,0))
    ga = np.zeros((H,W,4), dtype=np.uint8)
    gs = np.zeros((H,W), dtype=np.float32)
    gs[int(H*0.70):] = alpha[int(H*0.70):]
    ga[:,:,0]=20; ga[:,:,1]=110; ga[:,:,2]=35
    ga[:,:,3] = np.clip(gs*210, 0, 200).astype(np.uint8)
    gi = Image.fromarray(ga).filter(ImageFilter.GaussianBlur(blur_r))
    canvas.paste(gi, (0,glow_y), gi)
    sa = np.zeros((H,W,4), dtype=np.uint8)
    sa[:,:,3] = np.clip(alpha*130, 0, 130).astype(np.uint8)
    si = Image.fromarray(sa).filter(ImageFilter.GaussianBlur(blur_r//2))
    canvas.paste(si, (0,glow_y//2), si)
    canvas.paste(img, (0,0), img)
    strip = img.crop((0,H-rh,W,H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(1.5))
    ref = np.array(strip.convert('RGBA'), dtype=np.float32)
    for row in range(ref.shape[0]):
        ref[row,:,3] = np.clip(ref[row,:,3]*rmax*(1-row/ref.shape[0]), 0, 255)
    ri = Image.fromarray(ref.astype(np.uint8))
    canvas.paste(ri, (0,H+rgap), ri)
    return canvas

# --- FIX 1: Count X - binary mask + fill_holes, correct crop ---
print('Count X...')
cropped = render_crop('Mispa-Count-X-Auto-Hematalogy-Analyzer.pdf', 1, 0.18,0.28,0.00,0.25)
result  = remove(cropped, session=SESSION, alpha_matting=False)
arr     = np.array(result.convert('RGBA'), dtype=np.uint8)
arr     = post_process(arr, True, fill_holes=True, comp_thr=0.04)
final   = add_3d_effects(Image.fromarray(arr))
final.save(f'{OUT}/mispa-count-x.png', 'PNG')
print(f'  done {final.size}')

# --- FIX 2: FAB 120 - binary mask + fill_holes, no fake_bg ---
print('FAB 120...')
cropped = render_crop('Mispa-FAB-120-Fully-Automatic-Clinical-Chemistry-Analyzer.pdf', 0, 0.12,0.25,0.00,0.00)
result  = remove(cropped, session=SESSION, alpha_matting=False)
arr     = np.array(result.convert('RGBA'), dtype=np.uint8)
arr     = post_process(arr, False, fill_holes=True, comp_thr=0.04)
final   = add_3d_effects(Image.fromarray(arr))
final.save(f'{OUT}/mispa-fab120.png', 'PNG')
print(f'  done {final.size}')

# --- FIX 3: Maestro - lower-threshold fake_bg (thr=200) + fill_holes ---
print('Maestro...')
cropped    = render_crop('Mispa-Maestro.pdf', 0, 0.13,0.26,0.00,0.00)
cropped_fg = replace_white_bg_careful(cropped, thr=200)
result     = remove(cropped_fg, session=SESSION, alpha_matting=False)
arr        = np.array(result.convert('RGBA'), dtype=np.uint8)
arr        = remove_green_artifacts(arr)
arr        = post_process(arr, True, fill_holes=True, comp_thr=0.04)
final      = add_3d_effects(Image.fromarray(arr))
final.save(f'{OUT}/mispa-maestro.png', 'PNG')
print(f'  done {final.size}')

# --- FIX 4: Plus - lower-threshold fake_bg + fill_holes + white_dilation ---
print('Plus...')
cropped    = render_crop('Mispa-Plus-Advanced-Semi-Automated-Biochemistry-Analyzer.pdf', 0, 0.12,0.25,0.00,0.00)
cropped_fg = replace_white_bg_careful(cropped, thr=200)
result     = remove(cropped_fg, session=SESSION, alpha_matting=False)
arr        = np.array(result.convert('RGBA'), dtype=np.uint8)
arr        = remove_green_artifacts(arr)
arr        = post_process(arr, True, fill_holes=True, white_dil=120, comp_thr=0.04)
final      = add_3d_effects(Image.fromarray(arr))
final.save(f'{OUT}/mispa-plus.png', 'PNG')
print(f'  done {final.size}')

# --- FIX 5: Revo - binary mask + fill_holes (no alpha_matting) ---
print('Revo...')
cropped = render_crop('Mispa-REVO-Dry-Immunoassay-Analyzer.pdf', 0, 0.39,0.20,0.00,0.30)
result  = remove(cropped, session=SESSION, alpha_matting=False)
arr     = np.array(result.convert('RGBA'), dtype=np.uint8)
arr     = post_process(arr, False, fill_holes=True, comp_thr=0.04)
final   = add_3d_effects(Image.fromarray(arr))
final.save(f'{OUT}/mispa-revo.png', 'PNG')
print(f'  done {final.size}')

# --- FIX 6: VIVA - tighter crop to avoid decorations + component cleanup ---
print('VIVA...')
cropped = render_crop('Mispa-VIVA-Semi-Automated-Clinical-Chemistry-Analyzer.pdf', 0, 0.42,0.20,0.00,0.00)
result  = remove(cropped, session=SESSION, alpha_matting=False)
arr     = np.array(result.convert('RGBA'), dtype=np.uint8)
arr     = post_process(arr, True, fill_holes=False, comp_thr=0.04)
final   = add_3d_effects(Image.fromarray(arr))
final.save(f'{OUT}/mispa-viva.png', 'PNG')
print(f'  done {final.size}')

# --- FIX 7: nano - remove green artifact ---
print('nano (green fix)...')
arr = np.array(Image.open(f'{OUT}/mispa-nano.png').convert('RGBA'), dtype=np.uint8)
arr = remove_green_artifacts(arr)
Image.fromarray(arr).save(f'{OUT}/mispa-nano.png', 'PNG')
print('  done')

# --- FIX 8: HX50 - remove green artifact ---
print('HX50 (green fix)...')
arr = np.array(Image.open(f'{OUT}/mispa-hx50.png').convert('RGBA'), dtype=np.uint8)
arr = remove_green_artifacts(arr)
Image.fromarray(arr).save(f'{OUT}/mispa-hx50.png', 'PNG')
print('  done')

print('All targeted fixes applied.')

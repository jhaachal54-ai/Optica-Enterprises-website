"""
rebuild_images.py — Re-process all 16 product images for dark background.

Key changes vs original fix_images.py:
  1. Higher render zoom (2.5x) for sharper source
  2. rembg with alpha_matting=False for cleaner binary mask (no grey halos)
  3. Post-process: white-ish semi-transparent pixels → fully opaque
     (preserves white machine bodies cleanly on dark containers)
  4. Dark-optimised 3D effects:
       – Green-tinted base glow instead of pure-dark shadow
       – Enhanced floor reflection (works beautifully on dark)
"""

import fitz, os, io
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session

# ── Paths ────────────────────────────────────────────────────────────────────
BASE = r"C:\Users\Optica Enterprises\OneDrive\Desktop\Optica Enterprises website"
CAT  = os.path.join(BASE, "Catalogue")
OUT  = os.path.join(BASE, "product-images")
os.makedirs(OUT, exist_ok=True)

# ── rembg session (load model once) ─────────────────────────────────────────
SESSION = new_session("isnet-general-use")

# ── Config ───────────────────────────────────────────────────────────────────
# (pdf_name, out_name, page_idx,
#  skip_top, skip_bot, skip_left, skip_right,
#  white_body)   ← white_body: machine is predominantly white/light-coloured
CONFIG = [
    ("EDAN-i15-Blood-Gas-and-Chemistry-Analyzer.pdf",
     "edan-i15.png",      0, 0.15, 0.30, 0.00, 0.00, True),

    ("EXIAS-E1-Electrolyte-Analyzer.pdf",
     "exias-e1.png",      0, 0.32, 0.04, 0.43, 0.00, True),

    ("Getein-1100-Immunofluorescence-Quantitative-Analyzer.pdf",
     "getein-1100.png",   0, 0.46, 0.10, 0.33, 0.00, False),

    ("Mispa-CLOG-Smart-Hemostasis-Analyzer.pdf",
     "mispa-clog.png",    0, 0.12, 0.25, 0.00, 0.00, True),

    ("Mispa-CXL-Pro-Plus-random-Access-Clinical-Chdemistry-Analyzer.pdf",
     "mispa-cxl.png",     0, 0.12, 0.25, 0.00, 0.00, False),

    ("Mispa-Count-X-Auto-Hematalogy-Analyzer.pdf",
     "mispa-count-x.png", 1, 0.28, 0.36, 0.00, 0.00, True),

    ("Mispa-FAB-120-Fully-Automatic-Clinical-Chemistry-Analyzer.pdf",
     "mispa-fab120.png",  0, 0.15, 0.30, 0.00, 0.00, False),

    ("Mispa-HX50-Automatic-5-Part-Hematology-Analyzer.pdf",
     "mispa-hx50.png",    0, 0.18, 0.24, 0.16, 0.16, True),

    ("Mispa-Maestro.pdf",
     "mispa-maestro.png", 0, 0.13, 0.26, 0.00, 0.00, False),

    ("Mispa-Plus-Advanced-Semi-Automated-Biochemistry-Analyzer.pdf",
     "mispa-plus.png",    0, 0.12, 0.25, 0.00, 0.00, True),

    ("Mispa-REVO-Dry-Immunoassay-Analyzer.pdf",
     "mispa-revo.png",    0, 0.39, 0.20, 0.00, 0.30, False),

    ("Mispa-VIVA-Semi-Automated-Clinical-Chemistry-Analyzer.pdf",
     "mispa-viva.png",    0, 0.50, 0.21, 0.00, 0.00, True),

    ("Mispa-i3-Automated-Cartridge-Based-Specific-Protein-Analyzer.pdf",
     "mispa-i3.png",      0, 0.38, 0.27, 0.36, 0.00, False),

    ("Mispa-nano-Plus-Fully-Automatic-Clinical-Chemistry-Analyzer.pdf",
     "mispa-nano.png",    0, 0.15, 0.30, 0.00, 0.00, True),

    ("OPTI-CCA-TS-2.pdf",
     "opti-cca.png",      0, 0.47, 0.10, 0.00, 0.00, True),

    ("Wondfo-Optical-Coagulation-Analyzer-OCG-102.pdf",
     "wondfo-ocg.png",    0, 0.38, 0.24, 0.00, 0.00, True),
]


# ── Helper: render PDF page → cropped PIL image ──────────────────────────────
def render_crop(pdf_path, page_idx, skip_top, skip_bot, skip_left, skip_right,
                zoom=2.5):
    doc = fitz.open(pdf_path)
    page = doc[page_idx]
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    doc.close()
    W, H = img.size
    left   = int(W * skip_left)
    right  = W - int(W * skip_right)
    top    = int(H * skip_top)
    bottom = H - int(H * skip_bot)
    return img.crop((left, top, right, bottom))


# ── Helper: remove background ────────────────────────────────────────────────
def remove_bg(img: Image.Image, white_body: bool) -> Image.Image:
    """
    Run rembg then post-process for dark-background display.
    white_body=True: machine is mostly white/light → use binary mask
                      and solidify semi-transparent white edges.
    """
    # Always use alpha_matting=False → cleaner binary mask, no grey halos
    result = remove(
        img,
        session=SESSION,
        alpha_matting=False,
    )
    arr = np.array(result.convert("RGBA"), dtype=np.uint8)

    if white_body:
        # For white machines: semi-transparent pixels where R,G,B are all
        # light (>140) look grey on dark backgrounds.  Solidify them.
        r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
        semi   = (a > 0) & (a < 245)
        light  = (r > 140) & (g > 140) & (b > 140)
        # Mostly opaque light pixels → force to fully opaque (preserve white)
        keep = semi & light & (a > 60)
        arr[keep, 3] = 255
        # Mostly transparent light pixels → force fully transparent (background)
        drop = semi & light & (a <= 60)
        arr[drop, 3] = 0
    else:
        # For coloured machines: clean up very faint semi-transparent fringe
        a = arr[:,:,3]
        arr[a < 30, 3] = 0   # kill near-transparent fringe

    return Image.fromarray(arr)


# ── Helper: add dark-optimised 3D effects ────────────────────────────────────
def add_3d_effects(img: Image.Image) -> Image.Image:
    """
    Bake shadow glow + floor reflection onto a transparent canvas.
    Designed for display inside a dark container.
    """
    W, H = img.size
    machine = np.array(img.convert("RGBA"), dtype=np.uint8)
    alpha   = machine[:, :, 3].astype(np.float32) / 255.0

    # Sizing
    blur_r       = max(28, int(min(W, H) * 0.055))   # glow blur radius
    glow_y       = max(18, int(H * 0.055))            # glow offset downward
    reflect_frac = 0.32                               # reflection height ratio
    reflect_max  = 0.34                               # max reflection opacity
    reflect_gap  = 6                                  # gap (px) machine → reflection

    reflect_h = int(H * reflect_frac)
    canvas_h  = H + glow_y + blur_r + reflect_h + reflect_gap

    canvas = Image.new("RGBA", (W, canvas_h), (0, 0, 0, 0))

    # ── 1. Green-tinted base glow ────────────────────────────────────────────
    # Pull only the bottom 30 % of the machine alpha to create the glow shape
    glow_arr = np.zeros((H, W, 4), dtype=np.uint8)
    bottom_start = int(H * 0.70)
    glow_strength = np.zeros((H, W), dtype=np.float32)
    glow_strength[bottom_start:] = alpha[bottom_start:]

    glow_arr[:, :, 0] = 20           # R
    glow_arr[:, :, 1] = 110          # G  (green dominant)
    glow_arr[:, :, 2] = 35           # B
    glow_arr[:, :, 3] = np.clip(glow_strength * 210, 0, 200).astype(np.uint8)

    glow_img = Image.fromarray(glow_arr).filter(ImageFilter.GaussianBlur(blur_r))
    canvas.paste(glow_img, (0, glow_y), glow_img)

    # Also add a soft full-machine ambient shadow (dark, barely visible)
    sh_arr = np.zeros((H, W, 4), dtype=np.uint8)
    sh_arr[:, :, 3] = np.clip(alpha * 130, 0, 130).astype(np.uint8)
    sh_img = Image.fromarray(sh_arr).filter(ImageFilter.GaussianBlur(blur_r // 2))
    canvas.paste(sh_img, (0, glow_y // 2), sh_img)

    # ── 2. Machine ────────────────────────────────────────────────────────────
    canvas.paste(img, (0, 0), img)

    # ── 3. Floor reflection ───────────────────────────────────────────────────
    crop_y = H - reflect_h
    strip  = img.crop((0, crop_y, W, H)).transpose(Image.FLIP_TOP_BOTTOM)
    strip  = strip.filter(ImageFilter.GaussianBlur(1.5))
    ref    = np.array(strip.convert("RGBA"), dtype=np.float32)
    for row in range(ref.shape[0]):
        fade = reflect_max * (1.0 - row / ref.shape[0])
        ref[row, :, 3] = np.clip(ref[row, :, 3] * fade, 0, 255)
    canvas.paste(
        Image.fromarray(ref.astype(np.uint8)),
        (0, H + reflect_gap),
        Image.fromarray(ref.astype(np.uint8))
    )

    return canvas


# ── Main loop ────────────────────────────────────────────────────────────────
for (pdf_name, out_name, page_idx,
     skip_top, skip_bot, skip_left, skip_right,
     white_body) in CONFIG:

    pdf_path = os.path.join(CAT, pdf_name)
    out_path = os.path.join(OUT, out_name)

    print(f"\n{'-'*60}")
    print(f"  {out_name}")

    # 1. Render & crop
    print("  Rendering PDF...")
    cropped = render_crop(pdf_path, page_idx,
                          skip_top, skip_bot, skip_left, skip_right)

    # 2. Background removal
    print("  Removing background...")
    no_bg = remove_bg(cropped, white_body)

    # 3. 3D effects
    print("  Applying 3D effects...")
    final = add_3d_effects(no_bg)

    # 4. Save
    final.save(out_path, "PNG")
    print(f"  Saved -> {out_path}")

print("\n\nAll 16 images rebuilt.")

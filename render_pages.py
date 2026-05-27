import fitz, os
from PIL import Image
import io

base = r"C:\Users\Optica Enterprises\OneDrive\Desktop\Optica Enterprises website"
cat  = os.path.join(base, "Catalogue")
out  = os.path.join(base, "cat-pages")
os.makedirs(out, exist_ok=True)

pdfs = [
    ("EDAN-i15-Blood-Gas-and-Chemistry-Analyzer.pdf",                     "edan-i15"),
    ("EXIAS-E1-Electrolyte-Analyzer.pdf",                                 "exias-e1"),
    ("Getein-1100-Immunofluorescence-Quantitative-Analyzer.pdf",          "getein-1100"),
    ("Mispa-CLOG-Smart-Hemostasis-Analyzer.pdf",                          "mispa-clog"),
    ("Mispa-CXL-Pro-Plus-random-Access-Clinical-Chdemistry-Analyzer.pdf", "mispa-cxl"),
    ("Mispa-Count-X-Auto-Hematalogy-Analyzer.pdf",                        "mispa-count-x"),
    ("Mispa-FAB-120-Fully-Automatic-Clinical-Chemistry-Analyzer.pdf",     "mispa-fab120"),
    ("Mispa-HX50-Automatic-5-Part-Hematology-Analyzer.pdf",               "mispa-hx50"),
    ("Mispa-Maestro.pdf",                                                  "mispa-maestro"),
    ("Mispa-Plus-Advanced-Semi-Automated-Biochemistry-Analyzer.pdf",      "mispa-plus"),
    ("Mispa-REVO-Dry-Immunoassay-Analyzer.pdf",                           "mispa-revo"),
    ("Mispa-VIVA-Semi-Automated-Clinical-Chemistry-Analyzer.pdf",         "mispa-viva"),
    ("Mispa-i3-Automated-Cartridge-Based-Specific-Protein-Analyzer.pdf",  "mispa-i3"),
    ("Mispa-nano-Plus-Fully-Automatic-Clinical-Chemistry-Analyzer.pdf",   "mispa-nano"),
    ("OPTI-CCA-TS-2.pdf",                                                  "opti-cca"),
    ("Wondfo-Optical-Coagulation-Analyzer-OCG-102.pdf",                   "wondfo-ocg"),
]

for pdf_name, short in pdfs:
    doc = fitz.open(os.path.join(cat, pdf_name))
    for i in range(min(2, len(doc))):
        pix = doc[i].get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        img.save(os.path.join(out, f"{short}_p{i}.jpg"), "JPEG", quality=85)
    doc.close()
    print(f"Done {short}")
print("All rendered.")

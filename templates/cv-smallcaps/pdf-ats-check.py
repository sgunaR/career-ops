#!/usr/bin/env python3
"""ATS check for a compiled CV PDF (verify-ats.mjs only reads HTML).

  python local/pdf-ats-check.py <cv.pdf> --keywords "SAP BTP,Node.js,tool calling,..."

Structural weights mirror verify-ats.mjs (text 15, headings 20, email 15, single
column 20, no images 10, fonts 10, no hidden text 5, clean extraction 5).
Keywords are literal phrases matched case-insensitively on word boundaries, so
"SAP HANA" does not match "S/4HANA". Advisory only; never changes the score.
Requires PyMuPDF (pip install pymupdf).
"""
import argparse, json, re, sys
import fitz

ap = argparse.ArgumentParser()
ap.add_argument("pdf")
ap.add_argument("--keywords", default="")
args = ap.parse_args()

doc = fitz.open(args.pdf)
text = "\n".join(p.get_text("text") for p in doc)
flat = re.sub(r"\s+", " ", text)
checks = []

def add(name, weight, ok, detail=""):
    checks.append({"check": name, "weight": weight, "pass": bool(ok), "detail": detail})

add("Real selectable text (>=300 chars)", 15, len(flat) >= 300, f"{len(flat)} chars")

lines = [l.strip().lower() for l in text.splitlines()]
HEADINGS = {
    "summary": {"summary", "professional summary"},
    "education": {"education"},
    "skills": {"skills", "skills summary", "technical skills"},
    "experience": {"experience", "work experience", "professional experience"},
}
found, pos = [], []
for name, variants in HEADINGS.items():
    idx = [i for i, l in enumerate(lines) if l in variants]
    if idx:
        found.append(name)
        pos.append(idx[0])
add("Standard section headings", 20, {"education", "skills", "experience"} <= set(found),
    f"found {found}")

has_phone = re.search(r"\+?\d[\d\s-]{8,}", flat) is not None
add("Contact email in body text", 15, re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", flat) is not None,
    f"phone present: {has_phone}")

page = doc[0]
blocks = [b for b in page.get_text("blocks") if b[4].strip()]
wide_gap = [b for b in blocks if b[0] > page.rect.width * 0.55 and (b[2] - b[0]) > page.rect.width * 0.3]
add("Single column", 20, not wide_gap, f"{len(wide_gap)} wide right-column blocks")

imgs = sum(len(p.get_images()) for p in doc)
add("No text baked into images", 10, imgs == 0, f"{imgs} images")
fonts = sorted({f[3].split("+")[-1] for p in doc for f in p.get_fonts()})
add("Standard embeddable fonts", 10, bool(fonts), ", ".join(fonts))
hidden = sum(1 for p in doc for b in p.get_text("dict")["blocks"] for l in b.get("lines", [])
             for s in l["spans"] if s["color"] == 0xFFFFFF and s["text"].strip())
add("No hidden text", 5, hidden == 0, f"{hidden} white spans")
add("Clean text extraction", 5, "�" not in text, "")

out = {"pages": len(doc), "structural_score": sum(c["weight"] for c in checks if c["pass"]),
       "failed": [c for c in checks if not c["pass"]], "phone_in_header": has_phone}

kws = [k.strip() for k in args.keywords.split(",") if k.strip()]
if kws:
    hit = [k for k in kws if re.search(r"(?<![\w/])" + re.escape(k) + r"(?![\w])", flat, re.I)]
    out["keyword_coverage"] = {"found": len(hit), "total": len(kws),
                               "percent": round(100 * len(hit) / len(kws)),
                               "missing": [k for k in kws if k not in hit]}
print(json.dumps(out, indent=1))
sys.exit(0 if out["structural_score"] >= 70 and out["pages"] >= 1 else 1)

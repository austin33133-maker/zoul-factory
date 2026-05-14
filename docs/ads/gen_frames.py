"""Generate 8 background frames for the Spartifexon 45W 30s animatic.

Each frame is 1080x1920 (9:16). Visuals are abstract / typographic — no
product photography is embedded. Bilingual subtitles are burned by ffmpeg
in a later step.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, math

W, H = 1080, 1920
OUT = "/tmp/frames"
os.makedirs(OUT, exist_ok=True)

INK = (11, 20, 36)
INK2 = (27, 40, 64)
ACCENT = (10, 132, 255)
CYAN = (90, 220, 230)
PURPLE = (130, 90, 220)
PAPER = (246, 247, 251)
MUTED = (107, 114, 128)

FONT_DIR = "/usr/share/fonts/opentype/noto"
def font(size, bold=False):
    name = "NotoSansCJK-Bold.ttc" if bold else "NotoSansCJK-Regular.ttc"
    return ImageFont.truetype(f"{FONT_DIR}/{name}", size)


def radial_bg(dark=True, hot=(20, 30, 60), cold=(5, 8, 16)):
    img = Image.new("RGB", (W, H), cold)
    px = img.load()
    cx, cy = W // 2, int(H * 0.4)
    maxd = math.hypot(W, H)
    for y in range(H):
        for x in range(0, W, 3):  # stride for speed
            d = math.hypot(x - cx, y - cy) / maxd
            t = max(0, 1 - d * 1.6)
            r = int(cold[0] + (hot[0] - cold[0]) * t)
            g = int(cold[1] + (hot[1] - cold[1]) * t)
            b = int(cold[2] + (hot[2] - cold[2]) * t)
            for dx in range(3):
                if x + dx < W:
                    px[x + dx, y] = (r, g, b)
    return img


def vertical_split_bg():
    """Top dark navy, bottom paper white — visual transition feel."""
    img = Image.new("RGB", (W, H), PAPER)
    px = img.load()
    for y in range(H):
        t = y / H
        if t < 0.55:
            r = int(INK[0] + (40 - INK[0]) * (t / 0.55))
            g = int(INK[1] + (60 - INK[1]) * (t / 0.55))
            b = int(INK[2] + (100 - INK[2]) * (t / 0.55))
            row = (r, g, b)
        else:
            blend = (t - 0.55) / 0.45
            row = tuple(int(40 + (PAPER[i] - 40) * blend) for i in range(3))
        for x in range(W):
            px[x, y] = row
    return img


def soft_circle(img, cx, cy, r, color, alpha=120):
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (alpha,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(80))
    img.paste(overlay, (0, 0), overlay)


def brand_mark(img, color=(255, 255, 255), y=H - 120):
    d = ImageDraw.Draw(img)
    f = font(36, bold=True)
    text = "Spartifexon"
    bbox = d.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2, y), text, fill=color, font=f)


def centered_text(img, lines, y_start, sizes, colors, bold_flags, spacing=20):
    d = ImageDraw.Draw(img)
    y = y_start
    for i, line in enumerate(lines):
        f = font(sizes[i], bold=bold_flags[i])
        bbox = d.textbbox((0, 0), line, font=f)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) // 2, y), line, fill=colors[i], font=f)
        y += (bbox[3] - bbox[1]) + spacing


# ---------- Shot 1: black opener with pulsing dot, brand mark fade-in ----------
def shot1():
    img = Image.new("RGB", (W, H), (4, 6, 12))
    soft_circle(img, W // 2, H // 2, 240, ACCENT, alpha=160)
    soft_circle(img, W // 2, H // 2, 120, CYAN, alpha=100)
    brand_mark(img, color=(230, 235, 245), y=H // 2 + 280)
    return img


# ---------- Shot 2: dark gradient, "Power, redesigned" ----------
def shot2():
    img = radial_bg(hot=(35, 50, 110), cold=(6, 10, 22))
    soft_circle(img, W // 2, int(H * 0.38), 380, PURPLE, alpha=130)
    soft_circle(img, W // 2, int(H * 0.38), 220, CYAN, alpha=110)
    d = ImageDraw.Draw(img)
    # eyebrow
    f = font(34, bold=True)
    txt = "SHOT 02"
    d.text((90, 120), txt, fill=ACCENT, font=f)
    # headline
    centered_text(img, [""], 1500, [1], [INK], [False])
    f1 = font(96, bold=True)
    line = "Power,"
    bbox = d.textbbox((0, 0), line, font=f1)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1320), line, fill=(240, 245, 255), font=f1)
    line2 = "redesigned."
    bbox = d.textbbox((0, 0), line2, font=f1)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1440), line2, fill=ACCENT, font=f1)
    brand_mark(img, color=(180, 190, 210))
    return img


# ---------- Shot 3: 45W headline ----------
def shot3():
    img = radial_bg(hot=(25, 40, 90), cold=(4, 6, 14))
    d = ImageDraw.Draw(img)
    f_big = font(360, bold=True)
    txt = "45W"
    bbox = d.textbbox((0, 0), txt, font=f_big)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 650), txt, fill=(245, 250, 255), font=f_big)
    f_sub = font(54, bold=True)
    sub = "One port."
    bbox = d.textbbox((0, 0), sub, font=f_sub)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1180), sub, fill=CYAN, font=f_sub)
    sub2 = "Full speed."
    bbox = d.textbbox((0, 0), sub2, font=f_sub)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1260), sub2, fill=CYAN, font=f_sub)
    f_eb = font(28, bold=True)
    d.text((90, 120), "SHOT 03", fill=ACCENT, font=f_eb)
    brand_mark(img, color=(180, 190, 210))
    return img


# ---------- Shot 4: GaN chip suggestion ----------
def shot4():
    img = radial_bg(hot=(30, 55, 120), cold=(4, 6, 14))
    d = ImageDraw.Draw(img)
    # chip square
    cx, cy = W // 2, int(H * 0.42)
    size = 320
    d.rounded_rectangle((cx - size, cy - size, cx + size, cy + size),
                        radius=40, outline=ACCENT, width=6, fill=(15, 22, 40))
    # chip grid
    for i in range(-2, 3):
        d.line((cx - size, cy + i * 90, cx + size, cy + i * 90), fill=(40, 70, 130), width=2)
        d.line((cx + i * 90, cy - size, cx + i * 90, cy + size), fill=(40, 70, 130), width=2)
    d.text((cx - 110, cy - 40), "GaN", fill=(220, 235, 255), font=font(120, bold=True))
    soft_circle(img, cx, cy, 420, ACCENT, alpha=70)
    f_h = font(70, bold=True)
    line = "Cooler. Smaller."
    bbox = d.textbbox((0, 0), line, font=f_h)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1380), line, fill=(240, 245, 255), font=f_h)
    line2 = "Smarter."
    bbox = d.textbbox((0, 0), line2, font=f_h)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1470), line2, fill=ACCENT, font=f_h)
    d.text((90, 120), "SHOT 04", fill=ACCENT, font=font(28, bold=True))
    brand_mark(img, color=(180, 190, 210))
    return img


# ---------- Shot 5: transition + scale ----------
def shot5():
    img = vertical_split_bg()
    d = ImageDraw.Draw(img)
    f = font(80, bold=True)
    line = "Small enough"
    bbox = d.textbbox((0, 0), line, font=f)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1200), line, fill=INK, font=f)
    line2 = "to forget."
    bbox = d.textbbox((0, 0), line2, font=f)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1300), line2, fill=ACCENT, font=f)
    # small cube hint
    cx, cy = W // 2, 600
    d.rounded_rectangle((cx - 140, cy - 140, cx + 140, cy + 140), radius=24,
                        fill=(60, 70, 100), outline=ACCENT, width=4)
    d.text((cx - 60, cy - 50), "45W", fill=(240, 245, 255), font=font(70, bold=True))
    d.text((90, 120), "SHOT 05", fill=ACCENT, font=font(28, bold=True))
    brand_mark(img, color=MUTED, y=H - 100)
    return img


# ---------- Shot 6: three icons row ----------
def shot6():
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    icons_y = int(H * 0.42)
    labels = ["Temp", "Shield", "Travel"]
    labels_zh = ["温控", "保护", "出行"]
    xs = [W // 4, W // 2, 3 * W // 4]
    for i, x in enumerate(xs):
        d.ellipse((x - 100, icons_y - 100, x + 100, icons_y + 100),
                  outline=ACCENT, width=6, fill=(255, 255, 255))
        # mini glyph
        if i == 0:
            d.rectangle((x - 14, icons_y - 50, x + 14, icons_y + 30), outline=ACCENT, width=4)
            d.ellipse((x - 30, icons_y + 20, x + 30, icons_y + 60), fill=ACCENT)
        elif i == 1:
            d.polygon([(x, icons_y - 60), (x - 50, icons_y - 30), (x - 50, icons_y + 30),
                       (x, icons_y + 60), (x + 50, icons_y + 30), (x + 50, icons_y - 30)],
                      outline=ACCENT, width=6)
            d.line([(x - 16, icons_y), (x - 4, icons_y + 18)], fill=ACCENT, width=6)
            d.line([(x - 4, icons_y + 18), (x + 20, icons_y - 18)], fill=ACCENT, width=6)
        else:
            d.polygon([(x - 50, icons_y + 30), (x + 50, icons_y + 30),
                       (x + 30, icons_y - 30), (x - 30, icons_y - 30)],
                      outline=ACCENT, width=6)
            d.line([(x - 50, icons_y + 30), (x + 50, icons_y + 30)], fill=ACCENT, width=6)
        f = font(40, bold=True)
        bbox = d.textbbox((0, 0), labels[i], font=f)
        d.text((x - (bbox[2] - bbox[0]) // 2, icons_y + 140), labels[i], fill=INK, font=f)
        f2 = font(34, bold=False)
        bbox2 = d.textbbox((0, 0), labels_zh[i], font=f2)
        d.text((x - (bbox2[2] - bbox2[0]) // 2, icons_y + 200), labels_zh[i], fill=MUTED, font=f2)
    # headline
    f_h = font(72, bold=True)
    line = "Smart. Safe."
    bbox = d.textbbox((0, 0), line, font=f_h)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1400), line, fill=INK, font=f_h)
    line2 = "Ready to go."
    bbox = d.textbbox((0, 0), line2, font=f_h)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1490), line2, fill=ACCENT, font=f_h)
    d.text((90, 120), "SHOT 06", fill=ACCENT, font=font(28, bold=True))
    brand_mark(img, color=MUTED, y=H - 100)
    return img


# ---------- Shot 7: hero with RGB ring ----------
def shot7():
    img = radial_bg(hot=(40, 60, 130), cold=(4, 8, 18))
    cx, cy = W // 2, int(H * 0.45)
    # concentric RGB ring suggestion
    for i, color in enumerate([(255, 80, 120), (255, 180, 80), (90, 220, 230), (130, 90, 220)]):
        soft_circle(img, cx, cy, 320 + i * 30, color, alpha=70)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((cx - 200, cy - 200, cx + 200, cy + 200), radius=30,
                        fill=(20, 28, 50), outline=(240, 245, 255), width=4)
    d.text((cx - 110, cy - 80), "45W", fill=(240, 245, 255), font=font(110, bold=True))
    f_h = font(64, bold=True)
    l1 = "Stable power."
    bbox = d.textbbox((0, 0), l1, font=f_h)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1380), l1, fill=(240, 245, 255), font=f_h)
    l2 = "Confident charging."
    bbox = d.textbbox((0, 0), l2, font=f_h)
    d.text(((W - (bbox[2] - bbox[0])) // 2, 1470), l2, fill=ACCENT, font=f_h)
    d.text((90, 120), "SHOT 07", fill=ACCENT, font=font(28, bold=True))
    brand_mark(img, color=(180, 190, 210))
    return img


# ---------- Shot 8: end card ----------
def shot8():
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    f_big = font(150, bold=True)
    txt = "Spartifexon"
    bbox = d.textbbox((0, 0), txt, font=f_big)
    d.text(((W - (bbox[2] - bbox[0])) // 2, H // 2 - 100), txt, fill=INK, font=f_big)
    f_sub = font(48, bold=False)
    sub = "45W GaN Charger"
    bbox = d.textbbox((0, 0), sub, font=f_sub)
    d.text(((W - (bbox[2] - bbox[0])) // 2, H // 2 + 90), sub, fill=MUTED, font=f_sub)
    f_sub2 = font(40, bold=False)
    sub2 = "45W 氮化镓快充"
    bbox = d.textbbox((0, 0), sub2, font=f_sub2)
    d.text(((W - (bbox[2] - bbox[0])) // 2, H // 2 + 160), sub2, fill=MUTED, font=f_sub2)
    return img


shots = [shot1, shot2, shot3, shot4, shot5, shot6, shot7, shot8]
for i, fn in enumerate(shots, 1):
    img = fn()
    img.save(f"{OUT}/shot{i:02d}.png")
    print(f"wrote shot{i:02d}.png")
print("done")

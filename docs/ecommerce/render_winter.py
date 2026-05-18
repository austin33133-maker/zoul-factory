"""Spartifexon · Winter campaign renderer.

Outputs:
  dist/ecommerce/alibaba/12-winter-hero.jpg   (1200 × 1600 flagship hero)
  /tmp/winter_frames/shot[1-8].png            (8 shots for 30s animatic)

All assets are original — abstract winter visuals (gradients, polygon
ridges, particle snow) with dashed placeholder boxes where the real
product photography will be dropped in.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os, math, random

random.seed(42)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_HERO = os.path.join(ROOT, "dist", "ecommerce", "alibaba")
OUT_FRAMES = "/tmp/winter_frames"
os.makedirs(OUT_HERO, exist_ok=True)
os.makedirs(OUT_FRAMES, exist_ok=True)

# Winter brand palette
NIGHT = (10, 22, 48)
DEEP = (16, 38, 78)
ICE = (164, 200, 232)
FROST = (220, 235, 248)
SNOW = (248, 252, 255)
ACCENT = (10, 132, 255)
CYAN = (140, 210, 240)
INK = (11, 20, 36)
MUTED = (110, 125, 145)
WHITE = (255, 255, 255)

CJK_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
CJK_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"


def fnt(size, bold=False):
    return ImageFont.truetype(CJK_BOLD if bold else CJK_REG, size)


def tw(draw, txt, font):
    b = draw.textbbox((0, 0), txt, font=font)
    return b[2] - b[0]


def vgradient(w, h, top, bottom, stops=None):
    """Multi-stop vertical gradient. stops = [(0.0, color), (0.5, color), ...]."""
    img = Image.new("RGB", (w, h), top)
    px = img.load()
    if stops is None:
        stops = [(0.0, top), (1.0, bottom)]
    for y in range(h):
        t = y / max(1, h - 1)
        # find segment
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                lt = (t - t0) / max(1e-6, (t1 - t0))
                r = int(c0[0] + (c1[0] - c0[0]) * lt)
                g = int(c0[1] + (c1[1] - c0[1]) * lt)
                b = int(c0[2] + (c1[2] - c0[2]) * lt)
                break
        else:
            r, g, b = stops[-1][1]
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def mountain_ridges(img, ridge_specs):
    """Draw layered polygon mountain ridges with parallax depth.

    ridge_specs = list of (y_base, height, color, jitter, peaks)
    """
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for y_base, height, color, jitter, peaks in ridge_specs:
        pts = [(0, h)]
        step = w / peaks
        for i in range(peaks + 1):
            x = i * step
            # asymmetric ridge profile
            local_h = height * (0.5 + 0.5 * math.sin(i * 1.3 + jitter))
            local_h *= 0.7 + 0.3 * math.cos(i * 0.7)
            y = y_base - local_h + random.uniform(-jitter, jitter)
            pts.append((x, y))
        pts.append((w, h))
        d.polygon(pts, fill=color)
    img.paste(overlay, (0, 0), overlay)


def snow_particles(img, count=180, sizes=(1, 3), alpha_range=(80, 220),
                   blur=1.5, region=None, drift_x=0):
    w, h = img.size
    if region is None:
        region = (0, 0, w, h)
    rx0, ry0, rx1, ry1 = region
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for _ in range(count):
        x = random.uniform(rx0, rx1) + random.uniform(-drift_x, drift_x)
        y = random.uniform(ry0, ry1)
        r = random.uniform(sizes[0], sizes[1])
        a = int(random.uniform(*alpha_range))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, a))
    if blur:
        overlay = overlay.filter(ImageFilter.GaussianBlur(blur))
    img.paste(overlay, (0, 0), overlay)


def soft_glow(img, cx, cy, r, color, alpha=120, blur=80):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (alpha,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(blur))
    img.paste(overlay, (0, 0), overlay)


def dashed_rect(draw, box, color, width=3, dash=14, gap=10):
    x0, y0, x1, y1 = box

    def line(p0, p1):
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        length = math.hypot(dx, dy)
        if length == 0:
            return
        ux, uy = dx / length, dy / length
        d = 0
        on = True
        while d < length:
            step = dash if on else gap
            s = min(step, length - d)
            if on:
                draw.line(
                    [(p0[0] + ux * d, p0[1] + uy * d),
                     (p0[0] + ux * (d + s), p0[1] + uy * (d + s))],
                    fill=color, width=width
                )
            d += s
            on = not on
    line((x0, y0), (x1, y0))
    line((x1, y0), (x1, y1))
    line((x1, y1), (x0, y1))
    line((x0, y1), (x0, y0))


def product_placeholder(img, box, label_en="[ Product Photo ]",
                        label_zh="（请放入产品照片）",
                        bg=(252, 254, 255, 220), border=(140, 175, 210)):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    panel = Image.new("RGBA", (w, h), bg)
    img.paste(panel, (x0, y0), panel)
    d = ImageDraw.Draw(img)
    dashed_rect(d, (x0 + 6, y0 + 6, x1 - 6, y1 - 6), border, width=3, dash=18, gap=12)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    d.line([(cx - 36, cy), (cx + 36, cy)], fill=border, width=2)
    d.line([(cx, cy - 36), (cx, cy + 36)], fill=border, width=2)
    d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), outline=border, width=2)
    f1 = fnt(26, bold=True)
    f2 = fnt(20)
    t1 = label_en
    t2 = label_zh
    d.text((cx - tw(d, t1, f1) // 2, cy + 60), t1, fill=(95, 115, 140), font=f1)
    d.text((cx - tw(d, t2, f2) // 2, cy + 100), t2, fill=(135, 155, 175), font=f2)


def brand_mark(img, color=WHITE, scale=1.0, align="center", y=None, x=None):
    d = ImageDraw.Draw(img)
    size = int(34 * scale)
    f = fnt(size, bold=True)
    txt = "Spartifexon"
    width = tw(d, txt, f)
    if y is None:
        y = 60
    if x is None:
        if align == "center":
            x = (img.width - width) // 2
        elif align == "right":
            x = img.width - width - 60
        else:
            x = 60
    d.text((x, y), txt, fill=color, font=f)


# =====================================================================
#  HERO IMAGE — 1200 × 1600 flagship
# =====================================================================

def winter_hero():
    W, H = 1200, 1600
    img = vgradient(W, H, NIGHT, FROST, stops=[
        (0.00, (4, 10, 22)),
        (0.30, (12, 32, 70)),
        (0.55, (70, 120, 175)),
        (0.80, (180, 215, 240)),
        (1.00, (236, 246, 252)),
    ])
    # distant sun / cold glow
    soft_glow(img, W // 2, int(H * 0.42), 360, (170, 210, 245), alpha=160, blur=140)
    soft_glow(img, W // 2, int(H * 0.42), 200, (220, 240, 255), alpha=140, blur=80)
    # back mountains (lightest)
    mountain_ridges(img, [
        (int(H * 0.62), 220, (120, 160, 195, 200), 8, 9),
        (int(H * 0.70), 280, (75, 115, 160, 220), 12, 7),
        (int(H * 0.78), 330, (35, 70, 115, 240), 16, 5),
    ])
    # snow particles (foreground heavier, background lighter)
    snow_particles(img, count=140, sizes=(1, 2), alpha_range=(70, 160),
                   blur=2, region=(0, 0, W, int(H * 0.65)))
    snow_particles(img, count=90, sizes=(2, 4), alpha_range=(160, 230),
                   blur=1.5, region=(0, 0, W, H))
    snow_particles(img, count=40, sizes=(3, 6), alpha_range=(210, 255),
                   blur=0.5, region=(0, 0, W, H))

    d = ImageDraw.Draw(img)
    brand_mark(img, color=(230, 240, 250), scale=0.95, y=70)
    # eyebrow
    f_eb = fnt(26, bold=True)
    eb = "WINTER · POWER SERIES · 冬季系列"
    d.text(((W - tw(d, eb, f_eb)) // 2, 130), eb, fill=CYAN, font=f_eb)

    # product placeholder (centered, sized for portrait product)
    pad_x = 280
    pad_y_top = 380
    pad_y_bot = 460
    pb = (pad_x, pad_y_top, W - pad_x, H - pad_y_bot)
    # subtle frosted plate behind placeholder
    frost = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frost)
    fd.rounded_rectangle((pb[0] - 40, pb[1] - 40, pb[2] + 40, pb[3] + 40),
                         radius=40, fill=(220, 235, 250, 60))
    frost = frost.filter(ImageFilter.GaussianBlur(20))
    img.paste(frost, (0, 0), frost)
    product_placeholder(img, pb,
                        label_en="[ Place product photo here ]",
                        label_zh="（请放入产品图）",
                        bg=(252, 254, 255, 235),
                        border=(150, 180, 210))

    # headline block
    f_h = fnt(78, bold=True)
    f_zh = fnt(54, bold=True)
    f_sub = fnt(26)
    f_sub_zh = fnt(22)
    y = H - 420
    l1 = "Power, even in the cold."
    d.text(((W - tw(d, l1, f_h)) // 2, y), l1, fill=SNOW, font=f_h)
    l2 = "极寒之地，依然满速。"
    d.text(((W - tw(d, l2, f_zh)) // 2, y + 100), l2, fill=ACCENT, font=f_zh)

    l3 = "45W GaN · Smart Display · Wide-Voltage 110–240V"
    d.text(((W - tw(d, l3, f_sub)) // 2, y + 200), l3, fill=(220, 235, 248), font=f_sub)
    l4 = "45W 氮化镓 · 智屏可视 · 110–240V 全球电压"
    d.text(((W - tw(d, l4, f_sub_zh)) // 2, y + 240), l4, fill=(190, 215, 235), font=f_sub_zh)

    # chip row
    chips = ["−20 °C tested", "Wide Voltage", "Smart Display", "GaN"]
    f_c = fnt(22, bold=True)
    sizes = []
    for c in chips:
        sizes.append(tw(d, c, f_c) + 32)
    gap = 18
    total = sum(sizes) + gap * (len(chips) - 1)
    x = (W - total) // 2
    y_chip = H - 110
    for i, c in enumerate(chips):
        d.rounded_rectangle((x, y_chip, x + sizes[i], y_chip + 46),
                            radius=20, fill=(20, 38, 70), outline=(120, 170, 220), width=2)
        d.text((x + 16, y_chip + 10), c, fill=SNOW, font=f_c)
        x += sizes[i] + gap

    return img


# =====================================================================
#  30s ANIMATIC FRAMES — 1080 × 1920 vertical
# =====================================================================

VW, VH = 1080, 1920


def video_bg_dark(snow_seed=0, mountains=True, glow_y=0.4, glow_color=(170, 210, 245)):
    img = vgradient(VW, VH, NIGHT, FROST, stops=[
        (0.00, (3, 8, 18)),
        (0.40, (12, 30, 65)),
        (0.70, (60, 110, 165)),
        (1.00, (200, 225, 245)),
    ])
    soft_glow(img, VW // 2, int(VH * glow_y), 380, glow_color, alpha=140, blur=120)
    if mountains:
        mountain_ridges(img, [
            (int(VH * 0.68), 220, (110, 155, 195, 200), 8, 7),
            (int(VH * 0.74), 280, (60, 100, 150, 230), 12, 6),
            (int(VH * 0.80), 330, (25, 60, 105, 245), 16, 4),
        ])
    random.seed(snow_seed)
    snow_particles(img, count=160, sizes=(1, 2), alpha_range=(60, 150),
                   blur=2.5, region=(0, 0, VW, VH))
    snow_particles(img, count=110, sizes=(2, 4), alpha_range=(140, 220),
                   blur=1.5)
    snow_particles(img, count=50, sizes=(3, 6), alpha_range=(200, 255),
                   blur=0.5)
    return img


def video_bg_light(snow_seed=0):
    img = vgradient(VW, VH, FROST, SNOW, stops=[
        (0.00, (220, 235, 248)),
        (0.50, (240, 248, 254)),
        (1.00, (252, 255, 255)),
    ])
    random.seed(snow_seed)
    snow_particles(img, count=70, sizes=(1, 3), alpha_range=(40, 110),
                   blur=2, region=(0, 0, VW, VH))
    snow_particles(img, count=40, sizes=(2, 5), alpha_range=(60, 130),
                   blur=0.8)
    return img


def add_eyebrow(img, num, color=CYAN):
    d = ImageDraw.Draw(img)
    f = fnt(28, bold=True)
    d.text((80, 130), f"SHOT {num:02d}", fill=color, font=f)


def shot1():  # 0–3s: cold open, snow drift, faint logo
    img = vgradient(VW, VH, (2, 4, 10), (8, 16, 32), stops=[
        (0.0, (2, 4, 10)), (1.0, (10, 20, 40))
    ])
    soft_glow(img, VW // 2, VH // 2, 280, (170, 210, 245), alpha=120, blur=160)
    random.seed(1)
    snow_particles(img, count=200, sizes=(1, 4), alpha_range=(120, 230), blur=1.2)
    d = ImageDraw.Draw(img)
    f = fnt(78, bold=True)
    txt = "Spartifexon"
    d.text(((VW - tw(d, txt, f)) // 2, VH // 2 + 240), txt, fill=(220, 230, 245), font=f)
    return img


def shot2():  # 3–7s: ice ridge reveal "Power, even in the cold."
    img = video_bg_dark(snow_seed=2, glow_y=0.4)
    d = ImageDraw.Draw(img)
    add_eyebrow(img, 2)
    brand_mark(img, color=(200, 215, 235), scale=0.9, align="right", y=100)
    f_h = fnt(96, bold=True)
    f_zh = fnt(56, bold=True)
    y = 1250
    l1 = "Power, even"
    d.text(((VW - tw(d, l1, f_h)) // 2, y), l1, fill=SNOW, font=f_h)
    l2 = "in the cold."
    d.text(((VW - tw(d, l2, f_h)) // 2, y + 110), l2, fill=ACCENT, font=f_h)
    l3 = "极寒之地，依然满速。"
    d.text(((VW - tw(d, l3, f_zh)) // 2, y + 240), l3, fill=(200, 225, 245), font=f_zh)
    return img


def shot3():  # 7–11s: 45W ice crystal
    img = video_bg_dark(snow_seed=3, glow_y=0.42, glow_color=(140, 200, 250))
    d = ImageDraw.Draw(img)
    add_eyebrow(img, 3)
    brand_mark(img, color=(200, 215, 235), scale=0.9, align="right", y=100)
    # diamond ice frame around 45W
    cx, cy = VW // 2, 760
    pts = [(cx, cy - 320), (cx + 280, cy), (cx, cy + 320), (cx - 280, cy)]
    soft_glow(img, cx, cy, 300, (160, 220, 255), alpha=150, blur=80)
    d.polygon(pts, outline=(190, 230, 255), width=6)
    f_big = fnt(280, bold=True)
    txt = "45W"
    d.text(((VW - tw(d, txt, f_big)) // 2, cy - 200), txt, fill=SNOW, font=f_big)
    # caption
    f_h = fnt(60, bold=True)
    f_zh = fnt(40, bold=True)
    y = 1350
    l1 = "Full speed."
    d.text(((VW - tw(d, l1, f_h)) // 2, y), l1, fill=ACCENT, font=f_h)
    l2 = "−20 °C tested."
    d.text(((VW - tw(d, l2, f_h)) // 2, y + 70), l2, fill=SNOW, font=f_h)
    l3 = "−20°C 极寒测试通过"
    d.text(((VW - tw(d, l3, f_zh)) // 2, y + 160), l3, fill=(200, 225, 245), font=f_zh)
    return img


def shot4():  # 11–15s: GaN core revealed in ice
    img = video_bg_dark(snow_seed=4, glow_y=0.38, glow_color=(180, 230, 255))
    d = ImageDraw.Draw(img)
    add_eyebrow(img, 4)
    brand_mark(img, color=(200, 215, 235), scale=0.9, align="right", y=100)
    cx, cy = VW // 2, 740
    # frosted square plate
    plate = Image.new("RGBA", (VW, VH), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plate)
    pd.rounded_rectangle((cx - 240, cy - 240, cx + 240, cy + 240),
                         radius=24, fill=(220, 240, 255, 110), outline=(220, 240, 255, 220), width=4)
    plate = plate.filter(ImageFilter.GaussianBlur(3))
    img.paste(plate, (0, 0), plate)
    # chip grid lines
    for i in range(-3, 4):
        d.line([(cx - 200, cy + i * 60), (cx + 200, cy + i * 60)],
               fill=(140, 180, 215), width=1)
        d.line([(cx + i * 60, cy - 200), (cx + i * 60, cy + 200)],
               fill=(140, 180, 215), width=1)
    f_gan = fnt(140, bold=True)
    txt = "GaN"
    d.text(((VW - tw(d, txt, f_gan)) // 2, cy - 80), txt, fill=SNOW, font=f_gan)
    f_h = fnt(60, bold=True)
    f_zh = fnt(40, bold=True)
    y = 1380
    l1 = "Cooler. Smaller."
    d.text(((VW - tw(d, l1, f_h)) // 2, y), l1, fill=SNOW, font=f_h)
    l2 = "Smarter."
    d.text(((VW - tw(d, l2, f_h)) // 2, y + 75), l2, fill=ACCENT, font=f_h)
    l3 = "更小 · 更冷 · 更智能"
    d.text(((VW - tw(d, l3, f_zh)) // 2, y + 170), l3, fill=(200, 225, 245), font=f_zh)
    return img


def shot5():  # 15–19s: product placeholder rises through clouds
    img = video_bg_dark(snow_seed=5, glow_y=0.45)
    d = ImageDraw.Draw(img)
    add_eyebrow(img, 5)
    brand_mark(img, color=(200, 215, 235), scale=0.9, align="right", y=100)
    # cloud band suggestion
    cloud = Image.new("RGBA", (VW, VH), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cloud)
    for i in range(5):
        cd.ellipse((100 + i * 200 - 80, 920, 100 + i * 200 + 200, 1120),
                   fill=(220, 235, 250, 90))
    cloud = cloud.filter(ImageFilter.GaussianBlur(35))
    img.paste(cloud, (0, 0), cloud)
    product_placeholder(img, (240, 380, 840, 980),
                        label_en="[ Product Photo ]", label_zh="（产品图）",
                        bg=(252, 254, 255, 230),
                        border=(150, 180, 210))
    f_h = fnt(60, bold=True)
    f_zh = fnt(40, bold=True)
    y = 1380
    l1 = "Built for travel."
    d.text(((VW - tw(d, l1, f_h)) // 2, y), l1, fill=SNOW, font=f_h)
    l2 = "Tested for power."
    d.text(((VW - tw(d, l2, f_h)) // 2, y + 75), l2, fill=ACCENT, font=f_h)
    l3 = "出行随身 · 大功率可靠"
    d.text(((VW - tw(d, l3, f_zh)) // 2, y + 170), l3, fill=(200, 225, 245), font=f_zh)
    return img


def shot6():  # 19–23s: 110V / 240V cold map suggestion
    img = video_bg_dark(snow_seed=6, glow_y=0.5)
    d = ImageDraw.Draw(img)
    add_eyebrow(img, 6)
    brand_mark(img, color=(200, 215, 235), scale=0.9, align="right", y=100)
    f_big = fnt(180, bold=True)
    t1 = "110V"
    d.text(((VW - tw(d, t1, f_big)) // 2, 380), t1, fill=ACCENT, font=f_big)
    t2 = "240V"
    d.text(((VW - tw(d, t2, f_big)) // 2, 700), t2, fill=SNOW, font=f_big)
    # connecting arrow
    d.line([(VW // 2, 600), (VW // 2, 700)], fill=ICE, width=4)
    d.polygon([(VW // 2, 720), (VW // 2 - 18, 695), (VW // 2 + 18, 695)], fill=ICE)
    f_h = fnt(60, bold=True)
    f_zh = fnt(40, bold=True)
    y = 1330
    l1 = "Wherever you land."
    d.text(((VW - tw(d, l1, f_h)) // 2, y), l1, fill=SNOW, font=f_h)
    l2 = "Wide-voltage. Worldwide."
    d.text(((VW - tw(d, l2, f_h)) // 2, y + 75), l2, fill=ACCENT, font=f_h)
    l3 = "全球通用电压，出行无忧"
    d.text(((VW - tw(d, l3, f_zh)) // 2, y + 170), l3, fill=(200, 225, 245), font=f_zh)
    return img


def shot7():  # 23–27s: hero placeholder with frosted glow ring
    img = video_bg_dark(snow_seed=7, glow_y=0.4, glow_color=(190, 230, 255))
    d = ImageDraw.Draw(img)
    add_eyebrow(img, 7)
    brand_mark(img, color=(200, 215, 235), scale=0.9, align="right", y=100)
    # frosted glow rings
    cx, cy = VW // 2, 760
    for i, (col, a, blur) in enumerate([
        ((150, 200, 240), 130, 120),
        ((200, 235, 255), 110, 60),
    ]):
        soft_glow(img, cx, cy, 360 + i * 40, col, alpha=a, blur=blur)
    product_placeholder(img, (cx - 250, cy - 250, cx + 250, cy + 250),
                        label_en="[ Hero Shot ]", label_zh="（主视觉）",
                        bg=(252, 254, 255, 235),
                        border=(150, 180, 210))
    f_h = fnt(58, bold=True)
    f_zh = fnt(40, bold=True)
    y = 1380
    l1 = "Stable power."
    d.text(((VW - tw(d, l1, f_h)) // 2, y), l1, fill=SNOW, font=f_h)
    l2 = "Confident charging."
    d.text(((VW - tw(d, l2, f_h)) // 2, y + 75), l2, fill=ACCENT, font=f_h)
    l3 = "稳定电力 · 从容快充"
    d.text(((VW - tw(d, l3, f_zh)) // 2, y + 170), l3, fill=(200, 225, 245), font=f_zh)
    return img


def shot8():  # 27–30s: end card on snow-white
    img = vgradient(VW, VH, SNOW, FROST, stops=[
        (0, (252, 254, 255)), (1, (228, 240, 250))
    ])
    random.seed(8)
    snow_particles(img, count=60, sizes=(1, 3), alpha_range=(80, 140), blur=2)
    d = ImageDraw.Draw(img)
    f_big = fnt(150, bold=True)
    txt = "Spartifexon"
    d.text(((VW - tw(d, txt, f_big)) // 2, VH // 2 - 110), txt, fill=INK, font=f_big)
    f_sub = fnt(46)
    sub = "45W GaN · Winter Series"
    d.text(((VW - tw(d, sub, f_sub)) // 2, VH // 2 + 90), sub, fill=MUTED, font=f_sub)
    f_sub_zh = fnt(40)
    sub_zh = "45W 氮化镓 · 冬季系列"
    d.text(((VW - tw(d, sub_zh, f_sub_zh)) // 2, VH // 2 + 160), sub_zh, fill=MUTED, font=f_sub_zh)
    return img


# =====================================================================
#  RUN
# =====================================================================

print("Rendering winter flagship hero (1200x1600)…")
hero = winter_hero()
hero_path = os.path.join(OUT_HERO, "12-winter-hero.jpg")
hero.convert("RGB").save(hero_path, "JPEG", quality=92, optimize=True)
print(f"  ✓ {os.path.relpath(hero_path, ROOT)}")

print("\nRendering 8 winter video frames (1080x1920)…")
shots = [shot1, shot2, shot3, shot4, shot5, shot6, shot7, shot8]
for i, fn in enumerate(shots, 1):
    img = fn()
    p = os.path.join(OUT_FRAMES, f"shot{i:02d}.png")
    img.save(p, "PNG")
    print(f"  ✓ {p}")

print("\nDone.")

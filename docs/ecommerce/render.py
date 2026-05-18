"""Spartifexon e-commerce panel renderer.

Outputs original, brand-clean panels for Alibaba detail pages, Amazon main
listings and A+ Content banners. All product imagery is placeholder zones
the user replaces with their own factory photography before publishing.

Run: python3 docs/ecommerce/render.py
Output: dist/ecommerce/{alibaba,amazon,aplus}/
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os, math

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_ALI = os.path.join(ROOT, "dist", "ecommerce", "alibaba")
OUT_AMZ = os.path.join(ROOT, "dist", "ecommerce", "amazon")
OUT_APLUS = os.path.join(ROOT, "dist", "ecommerce", "aplus")
for d in (OUT_ALI, OUT_AMZ, OUT_APLUS):
    os.makedirs(d, exist_ok=True)

# Brand palette (original)
INK = (11, 20, 36)
INK2 = (27, 40, 64)
ACCENT = (10, 132, 255)
CYAN = (90, 220, 230)
PAPER = (247, 248, 252)
LINE = (224, 228, 236)
MUTED = (107, 114, 128)
WHITE = (255, 255, 255)

CJK_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
CJK_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
CJK_BLACK = "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc"


def fnt(size, weight="regular"):
    # Only Regular and Bold variants ship with Noto Sans CJK; map "black" to Bold.
    path = CJK_BOLD if weight in ("bold", "black") else CJK_REG
    return ImageFont.truetype(path, size)


def text_width(draw, txt, font):
    bbox = draw.textbbox((0, 0), txt, font=font)
    return bbox[2] - bbox[0]


def draw_centered(img, txt, y, font, color):
    d = ImageDraw.Draw(img)
    tw = text_width(d, txt, font)
    d.text(((img.width - tw) // 2, y), txt, fill=color, font=font)
    bbox = d.textbbox((0, 0), txt, font=font)
    return y + (bbox[3] - bbox[1])


def linear_gradient(w, h, top_color, bottom_color):
    img = Image.new("RGB", (w, h), top_color)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def soft_glow(img, cx, cy, r, color, alpha=120):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color + (alpha,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(80))
    img.paste(overlay, (0, 0), overlay)


def dashed_rect(draw, box, color, width=3, dash=12, gap=8):
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
                sx = p0[0] + ux * d
                sy = p0[1] + uy * d
                ex = p0[0] + ux * (d + s)
                ey = p0[1] + uy * (d + s)
                draw.line([(sx, sy), (ex, ey)], fill=color, width=width)
            d += s
            on = not on
    line((x0, y0), (x1, y0))
    line((x1, y0), (x1, y1))
    line((x1, y1), (x0, y1))
    line((x0, y1), (x0, y0))


def product_placeholder(img, box, label_en="[ Product Photo ]", label_zh="（请放入产品照片）",
                        bg=None, border=None, crosshair=True):
    """A premium-looking placeholder zone for the actual product image."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if bg is None:
        bg = (252, 253, 255)
    if border is None:
        border = (155, 170, 190)
    # subtle inner panel
    panel = Image.new("RGBA", (w, h), bg + (255,))
    img.paste(panel, (x0, y0))
    d = ImageDraw.Draw(img)
    dashed_rect(d, (x0 + 4, y0 + 4, x1 - 4, y1 - 4), border, width=3, dash=16, gap=10)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    if crosshair:
        d.line([(cx - 30, cy), (cx + 30, cy)], fill=border, width=2)
        d.line([(cx, cy - 30), (cx, cy + 30)], fill=border, width=2)
        d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), outline=border, width=2)
    # labels
    f1 = fnt(22, "bold")
    f2 = fnt(18, "regular")
    tw = text_width(d, label_en, f1)
    d.text((cx - tw // 2, cy + 50), label_en, fill=(100, 115, 140), font=f1)
    tw2 = text_width(d, label_zh, f2)
    d.text((cx - tw2 // 2, cy + 85), label_zh, fill=(140, 155, 175), font=f2)


def brand_mark(img, x=None, y=None, color=None, scale=1.0, align="right"):
    d = ImageDraw.Draw(img)
    size = int(28 * scale)
    f = fnt(size, "black")
    txt = "Spartifexon"
    tw = text_width(d, txt, f)
    if color is None:
        color = WHITE
    if x is None:
        if align == "right":
            x = img.width - tw - 40
        elif align == "center":
            x = (img.width - tw) // 2
        else:
            x = 40
    if y is None:
        y = 40
    d.text((x, y), txt, fill=color, font=f)


def small_chip(draw, x, y, text, fg=ACCENT, bg=(232, 242, 255)):
    f = fnt(20, "bold")
    bbox = draw.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 14, 8
    draw.rounded_rectangle((x, y, x + tw + pad_x * 2, y + th + pad_y * 2),
                           radius=14, fill=bg)
    draw.text((x + pad_x, y + pad_y - 2), text, fill=fg, font=f)
    return tw + pad_x * 2


# =====================================================================
#  ALIBABA DETAIL PANELS — 800 × 1200 each
# =====================================================================

ALI_W, ALI_H = 800, 1200


def ali_hero():
    img = linear_gradient(ALI_W, ALI_H, (8, 14, 30), (4, 8, 20))
    soft_glow(img, 400, 460, 380, ACCENT, 140)
    soft_glow(img, 400, 460, 240, CYAN, 100)
    brand_mark(img, align="center", y=70, color=WHITE)
    d = ImageDraw.Draw(img)
    f_eyebrow = fnt(22, "bold")
    eb = "POWER · SERIES"
    tw = text_width(d, eb, f_eyebrow)
    d.text(((ALI_W - tw) // 2, 130), eb, fill=CYAN, font=f_eyebrow)
    product_placeholder(img, (140, 260, 660, 760),
                        bg=(255, 255, 255), border=(150, 175, 220))
    f_h1 = fnt(58, "black")
    f_h1_zh = fnt(48, "black")
    f_sub = fnt(24, "regular")
    y = 820
    line1 = "Pocket-sized 45W."
    tw = text_width(d, line1, f_h1)
    d.text(((ALI_W - tw) // 2, y), line1, fill=WHITE, font=f_h1)
    line2 = "Premium-grade GaN."
    tw = text_width(d, line2, f_h1)
    d.text(((ALI_W - tw) // 2, y + 70), line2, fill=ACCENT, font=f_h1)
    line3 = "口袋级 45W · 品牌级氮化镓"
    tw = text_width(d, line3, f_h1_zh)
    d.text(((ALI_W - tw) // 2, y + 160), line3, fill=(220, 230, 245), font=f_h1_zh)
    f_tag = fnt(20, "regular")
    tag = "Smart Display · Multi-Protocol · Wide-Voltage 110–240V"
    tw = text_width(d, tag, f_tag)
    d.text(((ALI_W - tw) // 2, y + 245), tag, fill=(190, 205, 225), font=f_tag)
    return img


def ali_panel(title_en, title_zh, body_en, body_zh, big_label=None,
              big_label_color=None, hero_box=(120, 460, 680, 880),
              footer_chips=None, dark=True):
    if dark:
        img = linear_gradient(ALI_W, ALI_H, (10, 18, 36), (4, 8, 18))
        text_color = WHITE
        sub_color = (190, 205, 225)
        ph_bg = (250, 252, 255)
    else:
        img = linear_gradient(ALI_W, ALI_H, (252, 253, 255), (230, 238, 248))
        text_color = INK
        sub_color = MUTED
        ph_bg = WHITE
    brand_mark(img, color=text_color, scale=0.85, align="right", y=42)
    d = ImageDraw.Draw(img)
    f_h = fnt(46, "black")
    f_zh = fnt(34, "black")
    f_b = fnt(22, "regular")
    f_b_zh = fnt(20, "regular")
    # Heading
    tw = text_width(d, title_en, f_h)
    d.text(((ALI_W - tw) // 2, 110), title_en, fill=text_color, font=f_h)
    tw = text_width(d, title_zh, f_zh)
    d.text(((ALI_W - tw) // 2, 175), title_zh, fill=ACCENT, font=f_zh)
    # Body
    tw = text_width(d, body_en, f_b)
    d.text(((ALI_W - tw) // 2, 240), body_en, fill=sub_color, font=f_b)
    tw = text_width(d, body_zh, f_b_zh)
    d.text(((ALI_W - tw) // 2, 275), body_zh, fill=sub_color, font=f_b_zh)
    # Optional huge label (e.g. "45W", "GaN")
    if big_label:
        f_big = fnt(220, "black")
        tw = text_width(d, big_label, f_big)
        clr = big_label_color or (ACCENT if dark else (220, 235, 255))
        d.text(((ALI_W - tw) // 2, 325), big_label, fill=clr, font=f_big)
    # Product placeholder
    product_placeholder(img, hero_box, bg=ph_bg,
                        border=(150, 175, 220) if dark else (175, 190, 210))
    # Footer chips
    if footer_chips:
        chip_y = 1010
        # Calculate total width first
        total = 0
        sizes = []
        for c in footer_chips:
            f = fnt(20, "bold")
            bbox = d.textbbox((0, 0), c, font=f)
            tw = bbox[2] - bbox[0] + 28
            sizes.append(tw)
            total += tw
        gap = 16
        total += gap * (len(footer_chips) - 1)
        x = (ALI_W - total) // 2
        for i, c in enumerate(footer_chips):
            small_chip(d, x, chip_y, c,
                       fg=ACCENT if not dark else WHITE,
                       bg=(232, 242, 255) if not dark else (25, 50, 90))
            x += sizes[i] + gap
    # Footer mark
    f_foot = fnt(18, "regular")
    foot = "Spartifexon · 45W GaN Charger · Model SX-45"
    tw = text_width(d, foot, f_foot)
    d.text(((ALI_W - tw) // 2, ALI_H - 50), foot, fill=sub_color, font=f_foot)
    return img


def ali_compat():
    img = linear_gradient(ALI_W, ALI_H, (252, 253, 255), (230, 238, 248))
    brand_mark(img, color=INK, scale=0.85, align="right", y=42)
    d = ImageDraw.Draw(img)
    f_h = fnt(46, "black")
    f_zh = fnt(34, "black")
    f_b = fnt(22, "regular")
    title = "Charge it all."
    tw = text_width(d, title, f_h)
    d.text(((ALI_W - tw) // 2, 110), title, fill=INK, font=f_h)
    title_zh = "一充全搞定"
    tw = text_width(d, title_zh, f_zh)
    d.text(((ALI_W - tw) // 2, 175), title_zh, fill=ACCENT, font=f_zh)
    body = "Phones, tablets, lightweight laptops & accessories."
    tw = text_width(d, body, f_b)
    d.text(((ALI_W - tw) // 2, 240), body, fill=MUTED, font=f_b)
    body_zh = "手机 · 平板 · 轻薄笔电 · 各类配件"
    tw = text_width(d, body_zh, fnt(20))
    d.text(((ALI_W - tw) // 2, 278), body_zh, fill=MUTED, font=fnt(20))
    # Central charger placeholder
    product_placeholder(img, (290, 360, 510, 580),
                        label_en="[ Charger ]", label_zh="（充电器）",
                        bg=WHITE, border=(175, 190, 210))
    # Surrounding device silhouettes (abstract, original)
    devices = [
        ("Phone", "手机", 140, 360),
        ("Tablet", "平板", 660, 360),
        ("Laptop", "笔电", 140, 700),
        ("Earbuds", "耳机", 660, 700),
    ]
    for label, zh, cx, cy in devices:
        # generic rounded rect silhouette
        size = 70
        d.rounded_rectangle((cx - size, cy - size, cx + size, cy + size),
                            radius=14, outline=INK, width=4, fill=(245, 248, 252))
        f_l = fnt(20, "bold")
        f_z = fnt(18, "regular")
        tw = text_width(d, label, f_l)
        d.text((cx - tw // 2, cy + size + 14), label, fill=INK, font=f_l)
        tw = text_width(d, zh, f_z)
        d.text((cx - tw // 2, cy + size + 42), zh, fill=MUTED, font=f_z)
        # connector line from device to center
        d.line([(cx + (110 if cx < 400 else -110), cy),
                (400, 470)], fill=(180, 200, 220), width=2)
    # bottom band of protocol chips
    chips = ["PD 3.0", "PPS", "QC", "UFCS", "AFC", "Apple 2.4A"]
    f = fnt(18, "bold")
    total = 0
    sizes = []
    for c in chips:
        bbox = d.textbbox((0, 0), c, font=f)
        tw = bbox[2] - bbox[0] + 24
        sizes.append(tw)
        total += tw
    gap = 12
    total += gap * (len(chips) - 1)
    x = (ALI_W - total) // 2
    for i, c in enumerate(chips):
        d.rounded_rectangle((x, 970, x + sizes[i], 970 + 38),
                            radius=12, fill=INK)
        bbox = d.textbbox((0, 0), c, font=f)
        d.text((x + 12, 970 + 8), c, fill=WHITE, font=f)
        x += sizes[i] + gap
    f_foot = fnt(18, "regular")
    foot = "Compatibility tested with mainstream brand devices · 兼容主流品牌设备"
    tw = text_width(d, foot, f_foot)
    d.text(((ALI_W - tw) // 2, 1060), foot, fill=MUTED, font=f_foot)
    return img


def ali_specs():
    img = linear_gradient(ALI_W, ALI_H, (252, 253, 255), (240, 245, 252))
    brand_mark(img, color=INK, scale=0.85, align="right", y=42)
    d = ImageDraw.Draw(img)
    f_h = fnt(46, "black")
    f_zh = fnt(34, "black")
    title = "Specifications."
    tw = text_width(d, title, f_h)
    d.text(((ALI_W - tw) // 2, 110), title, fill=INK, font=f_h)
    title_zh = "技术规格"
    tw = text_width(d, title_zh, f_zh)
    d.text(((ALI_W - tw) // 2, 175), title_zh, fill=ACCENT, font=f_zh)
    rows = [
        ("Output Power 输出功率", "45W Max (PD / PPS)"),
        ("Input Voltage 输入电压", "AC 110–240V · 50/60Hz"),
        ("Port 接口", "1 × USB-C (PD 3.0)"),
        ("Protocols 协议", "PD 3.0 · PPS · QC · UFCS · AFC"),
        ("Chip 核芯方案", "3rd-Gen GaN"),
        ("Display 屏幕", "Color TFT smart display"),
        ("Plug 插脚", "EU / US / UK / AU (configurable)"),
        ("Material 外壳", "PC V0 flame-retardant + alloy front"),
        ("Certification 认证", "CE · FCC · RoHS · UKCA · CCC"),
        ("Dimensions 尺寸", "~50 × 50 × 30 mm"),
        ("Weight 重量", "~95 g"),
        ("Warranty 保修", "24 months"),
    ]
    f_k = fnt(22, "bold")
    f_v = fnt(22, "regular")
    y = 260
    for k, v in rows:
        d.rounded_rectangle((60, y, ALI_W - 60, y + 60), radius=12,
                            fill=WHITE, outline=LINE, width=1)
        d.text((85, y + 18), k, fill=INK, font=f_k)
        bbox = d.textbbox((0, 0), v, font=f_v)
        tw = bbox[2] - bbox[0]
        d.text((ALI_W - 85 - tw, y + 18), v, fill=INK2, font=f_v)
        y += 70
    f_foot = fnt(16, "regular")
    foot = "Specifications may vary slightly between production batches · 规格因批次可能略有差异"
    tw = text_width(d, foot, f_foot)
    d.text(((ALI_W - tw) // 2, ALI_H - 40), foot, fill=MUTED, font=f_foot)
    return img


def ali_box_contents():
    img = linear_gradient(ALI_W, ALI_H, (252, 253, 255), (236, 242, 250))
    brand_mark(img, color=INK, scale=0.85, align="right", y=42)
    d = ImageDraw.Draw(img)
    f_h = fnt(46, "black")
    f_zh = fnt(34, "black")
    f_b = fnt(22, "regular")
    title = "What's in the box."
    tw = text_width(d, title, f_h)
    d.text(((ALI_W - tw) // 2, 110), title, fill=INK, font=f_h)
    title_zh = "包装清单"
    tw = text_width(d, title_zh, f_zh)
    d.text(((ALI_W - tw) // 2, 175), title_zh, fill=ACCENT, font=f_zh)
    items = [
        ("45W GaN Charger ×1", "45W 氮化镓充电器 ×1"),
        ("USB-C to USB-C Cable ×1", "USB-C 数据线 ×1"),
        ("User Manual ×1", "用户手册 ×1"),
        ("Warranty Card ×1", "保修卡 ×1"),
        ("Branded Gift Box ×1", "品牌礼盒 ×1"),
    ]
    y = 280
    for en, zh in items:
        d.rounded_rectangle((60, y, ALI_W - 60, y + 110), radius=16,
                            fill=WHITE, outline=LINE, width=1)
        # mini placeholder square
        d.rounded_rectangle((80, y + 15, 80 + 80, y + 95), radius=8,
                            fill=(245, 248, 252), outline=(180, 200, 220), width=2)
        d.line([(110, y + 55), (130, y + 55)], fill=(180, 200, 220), width=2)
        d.line([(120, y + 45), (120, y + 65)], fill=(180, 200, 220), width=2)
        d.text((185, y + 25), en, fill=INK, font=f_b)
        d.text((185, y + 60), zh, fill=MUTED, font=fnt(20))
        y += 130
    return img


# =====================================================================
#  AMAZON LISTING IMAGES — 2000 × 2000
# =====================================================================

AMZ = 2000


def amz_main():
    """Main image: pure white background per Amazon policy."""
    img = Image.new("RGB", (AMZ, AMZ), WHITE)
    d = ImageDraw.Draw(img)
    # Centered placeholder with crosshair — instructs user to drop in
    # their isolated product photo (transparent BG, 85% frame fill).
    product_placeholder(img, (300, 300, 1700, 1700),
                        label_en="[ Place isolated product photo here ]",
                        label_zh="（请放入去背产品图）",
                        bg=WHITE, border=(200, 210, 225))
    # Small reminder text (non-printing layer suggestion)
    f = fnt(28, "regular")
    note = "Amazon main image: white BG, product 85% of frame, no text/logos."
    tw = text_width(d, note, f)
    d.text(((AMZ - tw) // 2, AMZ - 110), note, fill=(150, 160, 175), font=f)
    note_zh = "亚马逊主图：白底，产品占画幅 85%，不可加文字/LOGO"
    tw = text_width(d, note_zh, f)
    d.text(((AMZ - tw) // 2, AMZ - 70), note_zh, fill=(150, 160, 175), font=f)
    return img


def amz_secondary(title_en, title_zh, sub_en, sub_zh, big=None,
                  big_color=None, dark=False, chips=None):
    if dark:
        img = linear_gradient(AMZ, AMZ, (10, 18, 36), (4, 8, 18))
        text_color = WHITE
        sub_color = (190, 205, 225)
    else:
        img = linear_gradient(AMZ, AMZ, (252, 253, 255), (232, 240, 250))
        text_color = INK
        sub_color = MUTED
    d = ImageDraw.Draw(img)
    f_h = fnt(110, "black")
    f_zh = fnt(80, "black")
    f_s = fnt(48, "regular")
    f_s_zh = fnt(40, "regular")
    tw = text_width(d, title_en, f_h)
    d.text(((AMZ - tw) // 2, 180), title_en, fill=text_color, font=f_h)
    tw = text_width(d, title_zh, f_zh)
    d.text(((AMZ - tw) // 2, 320), title_zh, fill=ACCENT, font=f_zh)
    tw = text_width(d, sub_en, f_s)
    d.text(((AMZ - tw) // 2, 460), sub_en, fill=sub_color, font=f_s)
    tw = text_width(d, sub_zh, f_s_zh)
    d.text(((AMZ - tw) // 2, 530), sub_zh, fill=sub_color, font=f_s_zh)
    if big:
        f_big = fnt(540, "black")
        tw = text_width(d, big, f_big)
        clr = big_color or (ACCENT if dark else (210, 230, 250))
        d.text(((AMZ - tw) // 2, 640), big, fill=clr, font=f_big)
    product_placeholder(img, (450, 1100, 1550, 1700),
                        label_en="[ Product Photo ]", label_zh="（产品图）",
                        bg=WHITE if dark else (255, 255, 255),
                        border=(180, 200, 220))
    if chips:
        f = fnt(40, "bold")
        total = 0
        sizes = []
        for c in chips:
            bbox = d.textbbox((0, 0), c, font=f)
            tw = bbox[2] - bbox[0] + 60
            sizes.append(tw)
            total += tw
        gap = 32
        total += gap * (len(chips) - 1)
        x = (AMZ - total) // 2
        for i, c in enumerate(chips):
            bg_chip = INK if not dark else WHITE
            fg_chip = WHITE if not dark else INK
            d.rounded_rectangle((x, 1780, x + sizes[i], 1860), radius=28,
                                fill=bg_chip)
            d.text((x + 30, 1790), c, fill=fg_chip, font=f)
            x += sizes[i] + gap
    f_brand = fnt(38, "black")
    tw = text_width(d, "Spartifexon", f_brand)
    d.text(((AMZ - tw) // 2, AMZ - 90), "Spartifexon", fill=text_color, font=f_brand)
    return img


# =====================================================================
#  AMAZON A+ CONTENT BANNERS — 1464 × 600
# =====================================================================

APLUS_W, APLUS_H = 1464, 600


def aplus_banner(title_en, title_zh, sub_en, sub_zh, dark=True, with_placeholder=True):
    if dark:
        img = linear_gradient(APLUS_W, APLUS_H, (10, 18, 36), (4, 8, 18))
        text_color = WHITE
        sub_color = (190, 205, 225)
    else:
        img = linear_gradient(APLUS_W, APLUS_H, (252, 253, 255), (230, 240, 250))
        text_color = INK
        sub_color = MUTED
    d = ImageDraw.Draw(img)
    soft_glow(img, 1100, 300, 280, ACCENT, 90) if dark else None
    # Left text block
    f_h = fnt(60, "black")
    f_zh = fnt(46, "black")
    f_s = fnt(26, "regular")
    f_s_zh = fnt(22, "regular")
    d.text((80, 130), title_en, fill=text_color, font=f_h)
    d.text((80, 215), title_zh, fill=ACCENT, font=f_zh)
    d.text((80, 305), sub_en, fill=sub_color, font=f_s)
    d.text((80, 348), sub_zh, fill=sub_color, font=f_s_zh)
    f_brand = fnt(24, "black")
    d.text((80, 510), "Spartifexon", fill=text_color, font=f_brand)
    # Right placeholder
    if with_placeholder:
        product_placeholder(img, (900, 80, 1380, 520),
                            label_en="[ Product Photo ]", label_zh="（产品图）",
                            bg=WHITE, border=(180, 200, 220))
    return img


# =====================================================================
#  GENERATE
# =====================================================================

def save_jpg(img, path, quality=92):
    img.convert("RGB").save(path, "JPEG", quality=quality, optimize=True)
    print(f"  ✓ {os.path.relpath(path, ROOT)}")


print("Generating Alibaba detail panels (800×1200) …")
save_jpg(ali_hero(), f"{OUT_ALI}/01-hero.jpg")

save_jpg(ali_panel(
    "Smart Display Inside.", "智屏内置 · 看见每一度电",
    "A color TFT panel shows real-time output, port status and protocol.",
    "彩色 TFT 屏实时显示输出功率、端口状态与协议匹配。",
    big_label="DISPLAY",
    footer_chips=["TFT", "Real-time", "Live Protocol"],
    dark=True,
), f"{OUT_ALI}/02-smart-display.jpg")

save_jpg(ali_panel(
    "45W. When you need it.", "45W 满速 · 按需供电",
    "Adaptive output ramps from 5V trickle to full 45W on demand.",
    "5V 涓流到 45W 满载，按设备需求智能动态分配。",
    big_label="45W",
    big_label_color=ACCENT,
    footer_chips=["PD 3.0", "PPS", "Adaptive"],
    dark=True,
), f"{OUT_ALI}/03-45w-output.jpg")

save_jpg(ali_panel(
    "3rd-Gen GaN inside.", "第三代氮化镓核芯",
    "Up to 40% smaller and cooler than silicon at the same wattage.",
    "相同功率下，体积更小、温度更低、效率更高。",
    big_label="GaN",
    big_label_color=(220, 230, 245),
    footer_chips=["Cooler", "Smaller", "Smarter"],
    dark=False,
), f"{OUT_ALI}/04-gan.jpg")

save_jpg(ali_panel(
    "Every standard. One port.", "全协议覆盖 · 一口通吃",
    "PD 3.0 · PPS · QC · UFCS · AFC · Apple 2.4A.",
    "支持 PD 3.0 / PPS / QC / UFCS / AFC / Apple 2.4A 等主流快充。",
    big_label="USB-C",
    footer_chips=["PD 3.0", "PPS", "QC", "UFCS"],
    dark=True,
), f"{OUT_ALI}/05-protocols.jpg")

save_jpg(ali_panel(
    "110V to 240V. Wherever you land.", "110–240V 全球电压",
    "Wide-voltage input — no travel adapter needed.",
    "全球电压自适应，出行无需换插头转换器。",
    big_label="GLOBAL",
    big_label_color=(210, 230, 250),
    footer_chips=["110V", "240V", "EU/US/UK/AU"],
    dark=False,
), f"{OUT_ALI}/06-voltage.jpg")

save_jpg(ali_compat(), f"{OUT_ALI}/07-compatibility.jpg")

save_jpg(ali_panel(
    "Built-in safety.", "全方位安全守护",
    "Smart temperature control, over-current and short-circuit protection.",
    "智能温控 · 过流保护 · 短路保护 · 过压保护。",
    big_label="SAFE",
    big_label_color=ACCENT,
    footer_chips=["Temp Ctrl", "Over-Current", "Short-Circuit"],
    dark=True,
), f"{OUT_ALI}/08-safety.jpg")

save_jpg(ali_specs(), f"{OUT_ALI}/09-specs.jpg")
save_jpg(ali_box_contents(), f"{OUT_ALI}/10-box.jpg")

# Brand panel
save_jpg(ali_panel(
    "Spartifexon.", "17 年 OEM & ODM 制造积淀",
    "17 years of consumer-electronics manufacturing heritage.",
    "为全球品牌提供消费电子的设计、研发与量产。",
    big_label="SX",
    big_label_color=ACCENT,
    footer_chips=["OEM", "ODM", "Custom"],
    dark=True,
), f"{OUT_ALI}/11-brand.jpg")

print("\nGenerating Amazon listing images (2000×2000) …")
save_jpg(amz_main(), f"{OUT_AMZ}/01-main-white.jpg")
save_jpg(amz_secondary(
    "Pocket-sized 45W.", "口袋级 45W",
    "Premium GaN fast charging that goes anywhere.",
    "氮化镓快充，随身随用",
    big="45W",
    chips=["PD 3.0", "PPS", "GaN"],
    dark=True,
), f"{OUT_AMZ}/02-power.jpg")
save_jpg(amz_secondary(
    "Smart Display.", "智屏可视",
    "Real-time wattage, status and protocol on a color TFT.",
    "彩色 TFT 实时显示功率、状态与协议",
    big="TFT",
    big_color=(220, 235, 255),
    chips=["Live W", "Status", "Protocol"],
    dark=False,
), f"{OUT_AMZ}/03-display.jpg")
save_jpg(amz_secondary(
    "Every standard.", "全协议覆盖",
    "PD 3.0 · PPS · QC · UFCS · AFC — one port, all protocols.",
    "一口覆盖全部主流快充协议",
    big="USB-C",
    chips=["PD", "PPS", "QC", "UFCS"],
    dark=True,
), f"{OUT_AMZ}/04-protocols.jpg")
save_jpg(amz_secondary(
    "110V to 240V.", "全球电压",
    "Wide-voltage input — no travel adapter needed.",
    "出行无需换插头转换器",
    big="GLOBAL",
    big_color=(220, 235, 255),
    chips=["EU", "US", "UK", "AU"],
    dark=False,
), f"{OUT_AMZ}/05-voltage.jpg")
save_jpg(amz_secondary(
    "Safe by design.", "安全护盾",
    "Smart temperature, over-current and short-circuit protection.",
    "智能温控 · 过流 · 短路保护",
    big="SAFE",
    big_color=ACCENT,
    chips=["Temp", "OCP", "SCP"],
    dark=True,
), f"{OUT_AMZ}/06-safety.jpg")

print("\nGenerating Amazon A+ Content banners (1464×600) …")
save_jpg(aplus_banner(
    "Pocket-sized 45W.",
    "口袋级 45W · 品牌级 GaN",
    "Premium GaN fast charging that travels with you.",
    "氮化镓快充，随身随用，一充全搞定。",
    dark=True,
), f"{OUT_APLUS}/01-hero.jpg")
save_jpg(aplus_banner(
    "Watch every watt.",
    "看见每一度电",
    "A color TFT panel shows real-time output and protocol.",
    "彩色 TFT 屏实时显示输出功率与协议匹配。",
    dark=False,
), f"{OUT_APLUS}/02-display.jpg")
save_jpg(aplus_banner(
    "One charger, every standard.",
    "一只充电器，覆盖全部快充协议",
    "PD 3.0 · PPS · QC · UFCS · AFC · Apple 2.4A.",
    "PD 3.0 / PPS / QC / UFCS / AFC / Apple 2.4A 全覆盖。",
    dark=True,
), f"{OUT_APLUS}/03-protocols.jpg")

print("\nDone.")

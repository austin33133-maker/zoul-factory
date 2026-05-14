#!/usr/bin/env python3
"""Generate 6 keyframes for the 30-second 40W charger video ad (9:16, 1080x1920)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, math

W, H = 1080, 1920
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(OUT_DIR, "frames")
os.makedirs(FRAMES, exist_ok=True)

FONT_CJK = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_REG = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

def f(size, bold=True):
    return ImageFont.truetype(FONT_CJK if bold else FONT_REG, size)

BLUE = (30, 136, 229)
DARK_BLUE = (13, 71, 161)
GOLD = (251, 191, 36)
DARK = (26, 26, 26)
GRAY = (180, 180, 180)
LIGHT_BG = (245, 247, 250)


def text_w(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def draw_subtitle_top(draw, text, color=(255, 255, 255), bg=(0, 0, 0, 130)):
    font = f(64)
    tw, th = text_w(draw, text, font)
    x = (W - tw) // 2
    y = 120
    # bg box
    pad = 24
    draw.rounded_rectangle([x - pad, y - 12, x + tw + pad, y + th + 18], radius=14, fill=bg)
    draw.text((x, y), text, font=font, fill=color)


def draw_subtitle_bottom(draw, text):
    font = f(40, bold=False)
    tw, th = text_w(draw, text, font)
    x = (W - tw) // 2
    y = H - 280
    pad = 20
    draw.rounded_rectangle([x - pad, y - 10, x + tw + pad, y + th + 14], radius=12, fill=(0, 0, 0, 160))
    draw.text((x, y), text, font=font, fill=(255, 255, 255))


def draw_charger(img, draw, cx, cy, size=300, glow=True):
    """Draw stylized white square charger with USB-C port + prongs."""
    half = size // 2
    # body shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([cx - half + 10, cy - half + 30, cx + half + 10, cy + half + 30],
                            radius=40, fill=(0, 0, 0, 80))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    img.alpha_composite(shadow)
    # prongs
    pdraw = draw
    pw = 18; ph = 90
    px1 = cx - 50
    px2 = cx + 32
    py = cy - half - ph + 20
    pdraw.rounded_rectangle([px1, py, px1 + pw, py + ph], radius=4, fill=(200, 200, 205))
    pdraw.rounded_rectangle([px2, py, px2 + pw, py + ph], radius=4, fill=(200, 200, 205))
    # body
    draw.rounded_rectangle([cx - half, cy - half, cx + half, cy + half], radius=40,
                           fill=(255, 255, 255), outline=(220, 220, 220), width=2)
    # apple-style indent dot
    draw.ellipse([cx - half + 30, cy - 30, cx - half + 70, cy + 10], outline=(210, 210, 210), width=2)
    # USB-C port
    port_w, port_h = 90, 32
    px = cx - port_w // 2
    py = cy + 40
    if glow:
        # glow halo
        for r, alpha in [(40, 60), (25, 120), (12, 200)]:
            glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow_layer)
            gd.rounded_rectangle([px - r, py - r, px + port_w + r, py + port_h + r],
                                 radius=20, fill=(*BLUE, alpha))
            glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(r // 2))
            img.alpha_composite(glow_layer)
    draw.rounded_rectangle([px, py, px + port_w, py + port_h], radius=16, fill=(30, 30, 30))


def new_canvas(bg_top=(255, 255, 255), bg_bot=(240, 245, 252)):
    img = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    # vertical gradient
    for y in range(H):
        t = y / H
        r = int(bg_top[0] * (1 - t) + bg_bot[0] * t)
        g = int(bg_top[1] * (1 - t) + bg_bot[1] * t)
        b = int(bg_top[2] * (1 - t) + bg_bot[2] * t)
        ImageDraw.Draw(img).line([(0, y), (W, y)], fill=(r, g, b))
    return img


# ============ SCENE 1: HOOK (0-3s) ============
def scene_1():
    img = new_canvas((255, 255, 255), (250, 240, 240))
    draw = ImageDraw.Draw(img)
    # phone outline
    pw, ph = 420, 800
    cx, cy = W // 2, H // 2
    draw.rounded_rectangle([cx - pw // 2, cy - ph // 2, cx + pw // 2, cy + ph // 2],
                           radius=60, fill=(26, 26, 30), outline=(50, 50, 55), width=8)
    # screen
    draw.rounded_rectangle([cx - pw // 2 + 20, cy - ph // 2 + 30, cx + pw // 2 - 20, cy + ph // 2 - 30],
                           radius=44, fill=(15, 15, 18))
    # battery 1%
    font_big = f(220)
    text = "1%"
    tw, th = text_w(draw, text, font_big)
    draw.text((cx - tw // 2, cy - 200), text, font=font_big, fill=(255, 59, 48))
    # warn
    font_warn = f(48)
    warn = "⚠ 电量严重不足"
    tw2, _ = text_w(draw, warn, font_warn)
    draw.text((cx - tw2 // 2, cy + 80), warn, font=font_warn, fill=(255, 59, 48))
    # subtitles
    draw_subtitle_top(draw, "还在为充电慢烦恼？", color=(26, 26, 26), bg=(255, 255, 255, 200))
    draw_subtitle_bottom(draw, "Tired of waiting forever to charge?")
    img.convert("RGB").save(f"{FRAMES}/scene1.png", "PNG")


# ============ SCENE 2: 40W MAIN (3-9s) ============
def scene_2():
    img = new_canvas((227, 242, 253), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    # diagonal light streaks
    streak = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(streak)
    for i in range(-8, 12):
        x = i * 180
        sd.polygon([(x, 0), (x + 80, 0), (x + 280, H), (x + 200, H)], fill=(30, 136, 229, 25))
    streak = streak.filter(ImageFilter.GaussianBlur(8))
    img.alpha_composite(streak)
    # big 40W
    font_huge = f(360)
    text = "40W"
    tw, th = text_w(draw, text, font_huge)
    # shadow
    draw.text((W // 2 - tw // 2 + 6, 340 + 6), text, font=font_huge, fill=(0, 0, 0, 30))
    draw.text((W // 2 - tw // 2, 340), text, font=font_huge, fill=BLUE)
    # 动态快充 below
    font_sub = f(90)
    sub = "动态快充"
    tw2, _ = text_w(draw, sub, font_sub)
    draw.text((W // 2 - tw2 // 2, 740), sub, font=font_sub, fill=(26, 26, 26))
    # charger
    draw_charger(img, draw, W // 2, 1180, size=320)
    # feature pills
    pills = ["智能分配", "稳定输出", "PD 3.0"]
    font_pill = f(36)
    pill_y = 1480
    total_w = 0
    pill_sizes = []
    for p in pills:
        tw, _ = text_w(draw, p, font_pill)
        pill_sizes.append(tw + 60)
        total_w += tw + 60
    total_w += 30 * (len(pills) - 1)
    x = (W - total_w) // 2
    for i, p in enumerate(pills):
        pw = pill_sizes[i]
        draw.rounded_rectangle([x, pill_y, x + pw, pill_y + 80], radius=40,
                               fill=(255, 255, 255), outline=BLUE, width=3)
        tw, _ = text_w(draw, p, font_pill)
        draw.text((x + (pw - tw) // 2, pill_y + 18), p, font=font_pill, fill=BLUE)
        x += pw + 30
    draw_subtitle_top(draw, "40W 动态快充 · 智能调节电流", color=(255, 255, 255), bg=(*DARK_BLUE, 200))
    draw_subtitle_bottom(draw, "40W Dynamic · Smart Current Control")
    img.convert("RGB").save(f"{FRAMES}/scene2.png", "PNG")


# ============ SCENE 3: MULTI-DEVICE (9-15s) ============
def scene_3():
    img = new_canvas((245, 247, 250), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    font_title = f(110)
    title = "多设备兼容"
    tw, _ = text_w(draw, title, font_title)
    draw.text((W // 2 - tw // 2, 280), title, font=font_title, fill=(26, 26, 26))
    font_en = f(52, bold=False)
    en = "iPhone / iPad / AirPods / Type-C"
    tw, _ = text_w(draw, en, font_en)
    draw.text((W // 2 - tw // 2, 430), en, font=font_en, fill=BLUE)
    # central charger
    draw_charger(img, draw, W // 2, 950, size=280, glow=False)
    # device grid
    devices = [("📱", "Phone"), ("📟", "Pad"), ("🎧", "Pod"), ("⚡", "Type-C")]
    grid_y = 1380
    cell_w = 240
    start_x = (W - cell_w * 2 - 60) // 2
    font_emoji = f(110)
    font_lbl = f(40)
    positions = [(0, 0), (1, 0), (0, 1), (1, 1)]
    for (col, row), (emo, lbl) in zip(positions, devices):
        cx = start_x + col * (cell_w + 60)
        cy = grid_y + row * 200
        draw.rounded_rectangle([cx, cy, cx + cell_w, cy + 160], radius=24,
                               fill=(255, 255, 255), outline=BLUE, width=3)
        tw, _ = text_w(draw, emo, font_emoji)
        draw.text((cx + (cell_w - tw) // 2, cy + 5), emo, font=font_emoji, fill=BLUE)
        tw, _ = text_w(draw, lbl, font_lbl)
        draw.text((cx + (cell_w - tw) // 2, cy + 110), lbl, font=font_lbl, fill=(60, 60, 60))
    draw_subtitle_top(draw, "一个适配器 · 全设备通吃", color=(255, 255, 255), bg=(*DARK_BLUE, 200))
    draw_subtitle_bottom(draw, "One Adapter · All Your Devices")
    img.convert("RGB").save(f"{FRAMES}/scene3.png", "PNG")


# ============ SCENE 4: TYPE-C CLOSEUP (15-21s) ============
def scene_4():
    img = new_canvas((255, 255, 255), (227, 242, 253))
    draw = ImageDraw.Draw(img)
    # giant charger zoomed-in showing port
    cx, cy = W // 2, H // 2 + 80
    size = 700
    half = size // 2
    # shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([cx - half + 20, cy - half + 30, cx + half + 20, cy + half + 30],
                         radius=80, fill=(0, 0, 0, 100))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    img.alpha_composite(shadow)
    # body
    draw.rounded_rectangle([cx - half, cy - half, cx + half, cy + half], radius=80,
                           fill=(255, 255, 255), outline=(220, 220, 220), width=3)
    # huge USB-C port
    port_w, port_h = 280, 90
    px = cx - port_w // 2
    py = cy + 30
    # glow
    for r, alpha in [(80, 80), (50, 140), (25, 220)]:
        glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow_layer)
        gd.rounded_rectangle([px - r, py - r, px + port_w + r, py + port_h + r],
                             radius=50, fill=(*BLUE, alpha))
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(r // 2))
        img.alpha_composite(glow_layer)
    draw.rounded_rectangle([px, py, px + port_w, py + port_h], radius=45, fill=(30, 30, 30))
    # indicator label
    font_label = f(60)
    label = "Type-C 快充接口"
    tw, _ = text_w(draw, label, font_label)
    draw.text((W // 2 - tw // 2, py + port_h + 100), label, font=font_label, fill=BLUE)
    font_en = f(40, bold=False)
    en = "Fast Charging Port"
    tw, _ = text_w(draw, en, font_en)
    draw.text((W // 2 - tw // 2, py + port_h + 190), en, font=font_en, fill=(100, 100, 100))
    draw_subtitle_top(draw, "Type-C 快充接口 · 稳定高效", color=(255, 255, 255), bg=(*DARK_BLUE, 200))
    draw_subtitle_bottom(draw, "Type-C Port · Stable & Efficient")
    img.convert("RGB").save(f"{FRAMES}/scene4.png", "PNG")


# ============ SCENE 5: KIT (21-27s) ============
def scene_5():
    img = new_canvas((255, 255, 255), (248, 250, 252))
    draw = ImageDraw.Draw(img)
    font_title = f(100)
    title = "40W 快充套装"
    tw, _ = text_w(draw, title, font_title)
    draw.text((W // 2 - tw // 2, 280), title, font=font_title, fill=BLUE)
    # divider
    draw.line([(W // 2 - 80, 430), (W // 2 + 80, 430)], fill=BLUE, width=4)
    # charger + cable
    draw_charger(img, draw, W // 2 - 220, 900, size=320, glow=False)
    # cable coil
    cable_cx, cable_cy = W // 2 + 220, 900
    for ring_r in [140, 110, 80]:
        draw.ellipse([cable_cx - ring_r, cable_cy - ring_r, cable_cx + ring_r, cable_cy + ring_r],
                     outline=(200, 200, 200), width=20)
    # plug head
    draw.rounded_rectangle([cable_cx - 30, cable_cy - 170, cable_cx + 30, cable_cy - 110],
                           radius=10, fill=(240, 240, 240), outline=(200, 200, 200), width=3)
    # 4 badges
    badge_y = 1380
    badges = [("PD", "3.0"), ("Type", "-C"), ("稳定", "输出"), ("小巧", "便携")]
    badge_w = 200
    spacing = 30
    total = badge_w * 4 + spacing * 3
    x = (W - total) // 2
    font_b1 = f(48)
    font_b2 = f(36)
    for top, bot in badges:
        # circle
        draw.ellipse([x, badge_y, x + badge_w, badge_y + badge_w], outline=BLUE, width=4,
                     fill=(255, 255, 255))
        tw, _ = text_w(draw, top, font_b1)
        draw.text((x + (badge_w - tw) // 2, badge_y + 40), top, font=font_b1, fill=BLUE)
        tw, _ = text_w(draw, bot, font_b2)
        draw.text((x + (badge_w - tw) // 2, badge_y + 110), bot, font=font_b2, fill=BLUE)
        x += badge_w + spacing
    draw_subtitle_top(draw, "充电头 + 编织线 · 一盒搞定", color=(255, 255, 255), bg=(*DARK_BLUE, 200))
    draw_subtitle_bottom(draw, "Charger + Braided Cable · All-in-One Kit")
    img.convert("RGB").save(f"{FRAMES}/scene5.png", "PNG")


# ============ SCENE 6: CTA (27-30s) ============
def scene_6():
    img = new_canvas((13, 71, 161), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    # charger
    draw_charger(img, draw, W // 2, 700, size=300)
    # price
    font_price = f(280)
    price = "¥69"
    tw, _ = text_w(draw, price, font_price)
    draw.text((W // 2 - tw // 2 + 4, 1050 + 4), price, font=font_price, fill=(0, 0, 0, 120))
    draw.text((W // 2 - tw // 2, 1050), price, font=font_price, fill=GOLD)
    # old price
    font_old = f(56)
    old = "原价 ¥129"
    tw, _ = text_w(draw, old, font_old)
    draw.text((W // 2 - tw // 2, 1370), old, font=font_old, fill=(150, 150, 150))
    # strike line
    draw.line([(W // 2 - tw // 2, 1395), (W // 2 + tw // 2, 1395)], fill=(150, 150, 150), width=3)
    # CTA button
    btn_w, btn_h = 600, 130
    btn_x = (W - btn_w) // 2
    btn_y = 1480
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=65, fill=GOLD)
    font_btn = f(64)
    btn_text = "🛒 立即购买 →"
    tw, _ = text_w(draw, btn_text, font_btn)
    draw.text((W // 2 - tw // 2, btn_y + 30), btn_text, font=font_btn, fill=(26, 26, 26))
    draw_subtitle_top(draw, "限时直降 ¥69 · 立即购买", color=GOLD, bg=(0, 0, 0, 180))
    draw_subtitle_bottom(draw, "Just $9.99 Today · Shop Now")
    img.convert("RGB").save(f"{FRAMES}/scene6.png", "PNG")


if __name__ == "__main__":
    scene_1(); print("✓ scene 1")
    scene_2(); print("✓ scene 2")
    scene_3(); print("✓ scene 3")
    scene_4(); print("✓ scene 4")
    scene_5(); print("✓ scene 5")
    scene_6(); print("✓ scene 6")
    print(f"\nFrames saved to: {FRAMES}/")

# Spartifexon · E-Commerce Graphics Set

A complete, brand-original set of listing graphics for **Alibaba**, **Amazon**
and **A+ Content**. Every panel is generated from `render.py` — no third-party
product imagery is embedded. The dashed boxes are **placeholders**; drop in
your own factory photography before publishing.

## Output / 输出

```
dist/ecommerce/
├── alibaba/        11 × 800 × 1200 jpg   (detail-page panels)
├── amazon/          6 × 2000 × 2000 jpg  (main + secondary listing images)
└── aplus/           3 × 1464 × 600 jpg   (A+ Content banners)
```

## Panel index / 面板索引

### Alibaba 详情页 (800 × 1200)
| # | File | Theme |
|---|---|---|
| 01 | `01-hero.jpg` | Brand hero · 品牌主图 |
| 02 | `02-smart-display.jpg` | Smart TFT display · 智屏 |
| 03 | `03-45w-output.jpg` | 45W output · 45W 输出 |
| 04 | `04-gan.jpg` | GaN tech · 氮化镓 |
| 05 | `05-protocols.jpg` | Multi-protocol · 全协议 |
| 06 | `06-voltage.jpg` | Global voltage 110–240V · 全球电压 |
| 07 | `07-compatibility.jpg` | Device compatibility · 兼容性 |
| 08 | `08-safety.jpg` | Safety · 安全 |
| 09 | `09-specs.jpg` | Spec table · 规格表 |
| 10 | `10-box.jpg` | Box contents · 包装清单 |
| 11 | `11-brand.jpg` | Brand closing · 品牌收尾 |

### Amazon 主图 + 副图 (2000 × 2000)
| # | File | Purpose |
|---|---|---|
| 01 | `01-main-white.jpg` | Main image (pure white BG — Amazon policy) |
| 02 | `02-power.jpg` | 45W · GaN |
| 03 | `03-display.jpg` | TFT smart display |
| 04 | `04-protocols.jpg` | Multi-protocol |
| 05 | `05-voltage.jpg` | Global voltage |
| 06 | `06-safety.jpg` | Safety features |

### Amazon A+ Content (1464 × 600)
| # | File | Purpose |
|---|---|---|
| 01 | `01-hero.jpg` | Brand hero banner |
| 02 | `02-display.jpg` | Smart display banner |
| 03 | `03-protocols.jpg` | Protocol coverage banner |

## How to use / 使用方式

1. **Open each panel in Photoshop / Figma / Photopea**
2. **Replace the dashed placeholder box with your real product photo**
   - For Amazon `01-main-white.jpg`: use an **isolated, transparent-background**
     product photo. Product should fill ~85% of the frame. No text or logos
     allowed on the main image per Amazon policy.
   - For Alibaba detail pages: any quality factory render or lifestyle photo
     works. Drop it into the placeholder zone, then merge.
3. **Optional polish**: add subtle drop shadow under the product, adjust
   product color balance to match the panel's accent.
4. **Export** as JPG quality 90 for upload.

## Editing the templates / 修改模板

To regenerate panels (change copy, sizes, colours, add SKUs):

```bash
python3 docs/ecommerce/render.py
```

The script is one self-contained file. Key things to edit:
- **Brand palette** (top of file) — change `INK`, `ACCENT`, `CYAN` etc.
- **Headlines / Chinese / English copy** — search for the panel name (e.g.
  `ali_panel(`) and edit the strings.
- **Add new SKU** — duplicate one of the `save_jpg(ali_panel(...))` blocks at
  the bottom of the file.

## Specifications matrix / 规格参考

The spec table panel (`09-specs.jpg`) currently reflects:

| Item | Value |
|---|---|
| Output | 45W max (PD / PPS) |
| Input | AC 110–240V · 50/60Hz |
| Port | 1 × USB-C (PD 3.0) |
| Protocols | PD 3.0 · PPS · QC · UFCS · AFC |
| Chip | 3rd-Gen GaN |
| Display | Color TFT smart display |
| Plug | EU / US / UK / AU (configurable) |
| Certification | CE · FCC · RoHS · UKCA · CCC |
| Dimensions | ~50 × 50 × 30 mm |
| Weight | ~95 g |
| Warranty | 24 months |

Update the `rows` list in `ali_specs()` for your exact factory spec sheet
and rerun the script.

## Brand assets / 品牌资源

- Wordmark: `assets/logo.svg`
- Shared web stylesheet: `assets/styles.css`
- Hero pages (HTML): `docs/hero/*.html`

## What's intentionally not included / 故意不包含

- No copied product photography from any source
- No copied marketing copy or layouts
- All panels are blank-product placeholders waiting for your own product
  shoot — this keeps the asset library 100% safe for global publishing.

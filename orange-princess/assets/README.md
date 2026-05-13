# 美术资源接入路径

游戏运行**不需要**任何外部资源——程序化 Canvas 绘制（水果、公主、道具）是默认渲染路径。

## 想接入真实 PNG sprite sheet？

把以下两个文件放进本目录即可，`Assets` loader 会在启动时自动识别并替换 emoji/Canvas 绘制：

```
orange-princess/assets/
├── sprites.png       # sprite sheet 图像
└── sprites.json      # 帧索引
```

`sprites.json` 格式：

```json
{
  "frames": {
    "piece.orange":    { "x":   0, "y":   0, "w": 96, "h": 96 },
    "piece.red":       { "x":  96, "y":   0, "w": 96, "h": 96 },
    "piece.yellow":    { "x": 192, "y":   0, "w": 96, "h": 96 },
    "piece.green":     { "x": 288, "y":   0, "w": 96, "h": 96 },
    "piece.blue":      { "x": 384, "y":   0, "w": 96, "h": 96 },
    "piece.purple":    { "x": 480, "y":   0, "w": 96, "h": 96 },
    "piece.bomb":      { "x":   0, "y":  96, "w": 96, "h": 96 },
    "piece.rocketH":   { "x":  96, "y":  96, "w": 96, "h": 96 },
    "piece.rocketV":   { "x": 192, "y":  96, "w": 96, "h": 96 },
    "piece.lightball": { "x": 288, "y":  96, "w": 96, "h": 96 },
    "piece.crate":     { "x":   0, "y": 192, "w": 96, "h": 96 },
    "piece.gift":      { "x":  96, "y": 192, "w": 96, "h": 96 },
    "piece.princess":  { "x": 192, "y": 192, "w": 96, "h": 96 },
    "tile.jelly":      { "x":   0, "y": 288, "w": 96, "h": 96 }
  }
}
```

## 推荐的合法免费资源

**只用 CC0 / 公域 / 明确写明商用免费的资源。** 商业游戏（Royal Match、Candy Crush 等）的 sprite **绝对不要**用，即使授权了也是侵权。

- **Kenney.nl Match-3 Pack** — CC0 公域，可商用免署名
  - 站点：`https://kenney.nl/assets/match-3-icons`
  - 下载 zip → 解压 → 用任意 sprite packer（如 TexturePacker, free-tex-packer.com）合成一张 sheet → 改名 sprites.png + sprites.json 丢到本目录
- **OpenGameArt.org** — 大量 CC0/CC-BY 素材，可商用
  - 搜 `match 3 fruit`、`candy icons`
- **Itch.io 免费包** — 注意检查 license，多数 itch 包是 CC-BY，需要署名

接入后请同时新增 `assets/LICENSE.txt` 注明出处与署名要求。

## 现状

当前所有视觉元素都是**程序化 Canvas 绘制**：

- 6 种水果：橙子（毛孔 + 叶）/ 草莓（心形 + 种子 + 绿冠）/ 柠檬（椭圆 + 尖凸）/ 青苹果（凹底 + 茎叶 + 腮）/ 蓝梅（圆球 + 白霜 + 花萼）/ 葡萄（6 颗叠加 + 叶）
- 道具：木箱 / 礼物盒 / 炸弹 / 火箭 / 彩球 / 冰冻 / 果冻 / 藤蔓 / 传送门
- 角色：橙子公主（多层渲染 + 5 种表情）
- PWA 图标：assets/icon.svg

这些都是从零写的代码，可商用、可改、零外部依赖。

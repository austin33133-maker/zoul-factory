# 枪火幸存者 · ZOUL SURVIVORS

单指操作的移动端 Roguelite 射击游戏。HTML5 + Canvas，**零依赖、零构建**，iOS / Android 浏览器直接玩，套壳后可上双端商店。

---

## 立刻试玩

```bash
cd games/zoul-survivors
python3 -m http.server 8080
# 手机和电脑连同一个 WiFi，手机浏览器打开 http://<你的电脑IP>:8080
```

桌面调试用 WASD / 方向键，或按住鼠标拖动。

---

## 为什么不是第一人称

上一份策划案（`docs/games/11-fps/`）设计的是 PC 端第一人称射击。移到手机上，第一人称的双摇杆瞄准在触屏上手感永远差一截——这不是打磨能解决的，是输入设备的物理限制。真正在移动端赚到钱的射击游戏（Survivor.io、Archero）全部放弃了手动瞄准。

所以内核保留、操作换掉：

| FPS 策划案里的设计 | 在这里的落地 |
|---|---|
| 五通道命中反馈 | 闪白 + 分材质命中音 + 粒子 + 伤害数字 + 击退，同帧触发 |
| 后座/延迟规格 | 摇杆不做平滑、不做加速；移动无插值直给 |
| 不靠血量膨胀造难度 | 血量成长封顶 4.2×，难度主要靠出场密度和敌人组合 |
| 每种敌人只教一件事 | 6 种敌人原型，各自逼玩家改一个习惯 |
| 三选一的抽卡契约 | 至少 1 张强相关 + 1 张全新；濒死时强插生存卡 |
| Roguelite 构筑 | 16 项属性 + 6 把副武器 + 4 张异常卡 |

---

## 玩法

- **操作**：按住屏幕任意位置拖动 = 浮动摇杆。手指按在哪，摇杆原点就在哪。
- **开火**：自动锁定最近敌人，玩家只管走位。
- **单局 5 分钟**：2:30 出精英，5:00 出 BOSS，击杀 BOSS 通关。
- **升级**：吃经验升级 → 三选一 → 一局约 25–35 次选择。
- **局外**：金币买 8 项永久强化，上限刻意压低（元进度是安慰剂，不能变成练级碾压）。

---

## 代码结构

```
index.html          页面骨架 + 所有 UI 层
css/style.css       移动端优先样式，含安全区适配
js/
  save.js           localStorage 存档（金币、永久强化、设置）
  audio.js          WebAudio 实时合成音效 —— 零音频资源，包体 0KB
  monetize.js       广告 / 内购适配层（stub ↔ AdMob 可热插拔）
  input.js          浮动虚拟摇杆 + 键盘调试
  upgrades.js       升级池、抽卡规则、永久强化表
  entities.js       对象池、空间网格、敌人数值表
  ui.js             屏幕切换、HUD、卡牌、商店
  game.js           主循环、战斗、生成器、渲染
```

### 几个关键实现

**对象池 + 空间网格**：战斗中不 new 任何对象（手机上 GC 卡顿是掉帧头号来源）。敌人碰撞和互相分离都走统一网格，没有它 170 个敌人两两分离就是 2.9 万次距离计算/帧。

**音效全合成**：8 种音效由 WebAudio 振荡器实时生成，按材质分层、音高随机化避免听感疲劳，每帧限 6 个发声位防爆音。不需要任何 .mp3。

**固定步长 + 顿帧**：逻辑固定 1/60 步进，单帧最多追 5 步（切后台回来不会一次推进几十秒）。只有精英/BOSS 击杀给 0.1s 顿帧，杂兵不给——否则清场会变得黏滞。

---

## 实测数据

iPhone 13 视口（Playwright + Chromium）：

| 场景 | 结果 |
|---|---|
| 末期满配（170 敌人 / 300 掉落 / 235 粒子） | **59.7 FPS**，最差单帧 62ms，1809 帧中仅 6 帧 > 33ms |
| 首次三选一 | 约 6 秒 |
| 正常玩家 70 秒 | Lv.10 / 204 击杀 / 9 次选卡 |
| 全流程（升级→精英→BOSS→死亡→复活→结算→商店） | 无 JS 错误 |

---

## 上架到 iOS / Android

用 Capacitor 套壳，游戏代码不用改：

```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "ZoulSurvivors" "com.zoul.survivors" --web-dir=.
npx cap add ios && npx cap add android
npx cap sync
npx cap open ios      # Xcode 出包
npx cap open android  # Android Studio 出包
```

接真实广告：

```bash
npm i @capacitor-community/admob
```

然后在 `js/monetize.js` 里把 `admob._unitId` 换成真实广告位 ID 即可——`Monetize` 会自动检测到 `window.AdMob` 并切换适配器，游戏逻辑一行不改。

**上架前还缺的**（详见 [MONETIZATION.md](./MONETIZATION.md) 最后一节）：应用图标与启动图、隐私政策页、GDPR/ATT 同意弹窗、云存档、崩溃上报。

---

## 调参入口

改数值不用翻代码，都集中在这几处：

| 想改什么 | 改哪里 |
|---|---|
| 单局时长、精英/BOSS 时间点 | `js/game.js` 顶部 `RUN_TIME` / `ELITE_AT` |
| 玩家基础属性、射程、拾取半径 | `js/game.js` 的 `BASE` |
| 刷怪密度曲线 | `js/game.js` `updateDirector()` 里的 `spawnTimer` 与 `n` |
| 升级速度 | `js/game.js` `xpForLevel()` |
| 敌人数值 | `js/entities.js` `ENEMY_TYPES` |
| 副武器数值 | `js/upgrades.js` `WEAPON_DATA` |
| 永久强化价格曲线 | `js/upgrades.js` `metaCost()` |
| 广告位次数限制 | `js/monetize.js` `LIMITS` |

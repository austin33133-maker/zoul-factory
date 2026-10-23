# zoul-factory 自动交易（freqtrade）

基于开源框架 [freqtrade](https://github.com/freqtrade/freqtrade) 的加密货币自动交易脚手架。
**默认模拟盘（dry-run），不花真钱、不需要 API key**，用来先跑通流程、验证策略。

> ⚠️ **先读这段再动手**
> - 这是**学习/练手**用的。10U（10 USDT）本金无法真实跑交易：交易所单笔最小下单额约 5 USDT，手续费会吃掉小本金，10U 连分仓都不够。
> - 示例策略 `SampleStrategy` 是教学用，**默认不保证盈利**。上真钱前必须回测 + 模拟盘验证。
> - **密钥绝不要发给任何人（包括 AI）**。本仓库 `.gitignore` 已忽略 `.env`，不会被提交。

---

## 目录结构

```
.
├── docker-compose.yml              # 一键运行
├── .env.example                    # API key 模板（真实交易才需要）
├── .gitignore                      # 忽略密钥和运行产物
└── user_data/
    ├── config.json                 # 主配置（交易所、币对、金额、风控）
    └── strategies/
        └── SampleStrategy.py       # 示例策略（EMA 交叉 + RSI）
```

---

## 前置要求

安装 Docker（最省事，不用配 Python 环境）：
- Windows / Mac：装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Linux：`curl -fsSL https://get.docker.com | sh`

验证：`docker --version` 和 `docker compose version` 能正常输出。

---

## 第一步：模拟盘跑起来（不碰真钱）

```bash
# 1. 拉取 freqtrade 镜像
docker compose pull

# 2. 先下载历史数据（回测要用）
docker compose run --rm freqtrade download-data \
  --exchange binance --pairs BTC/USDT ETH/USDT SOL/USDT BNB/USDT \
  --timeframes 5m --days 30

# 3. 回测：看策略在过去 30 天表现如何
docker compose run --rm freqtrade backtesting \
  --strategy SampleStrategy --timeframe 5m \
  --timerange=$(date -d '30 days ago' +%Y%m%d)-

# 4. 启动模拟盘（dry-run，实时行情 + 假钱）
docker compose up -d

# 5. 看日志
docker compose logs -f freqtrade
```

> 回测结果如果是亏的，**不要上真钱**。先改策略参数、换币对、重新回测，直到你理解它为什么赚/亏。

### 网页看盘（可选）

配置里已开 REST API。浏览器打开 `http://127.0.0.1:8080`，用 `config.json` 里 `api_server` 的
`username` / `password` 登录（**先把默认 `CHANGE_ME` 改掉**）。

停止：`docker compose down`

---

## 第二步：连接交易所（真实交易，想清楚再做）

### 1. 在交易所创建 API Key

以币安为例（OKX / Bybit / Gate 同理）：
1. 登录交易所 → API 管理 → 创建 API。
2. 权限**只勾「现货交易」**，**一定关闭「提现」权限**。
3. 绑定 **IP 白名单**（填你跑 bot 的服务器/家里公网 IP）。
4. 记下 `API Key` 和 `Secret`（Secret 只显示一次）。

### 2. 填密钥（两种方式，任选其一）

**方式 A：用 .env（推荐，密钥和配置分离）**
```bash
cp .env.example .env
# 编辑 .env，填入 KEY 和 SECRET
```

**方式 B：直接写进 `user_data/config.json` 的 `exchange.key` / `exchange.secret`**
（注意这个文件会被 git 跟踪，别把填了密钥的版本提交上去）

### 3. 关掉模拟盘开关

编辑 `user_data/config.json`：
```json
"dry_run": false,
```

### 4. 换交易所（如果不用币安）

改 `config.json` 里 `exchange.name`：`binance` → `okx` / `bybit` / `gate` 等。
freqtrade 通过 [ccxt](https://github.com/ccxt/ccxt) 支持上百家交易所。
部分交易所（如 OKX）还需要 `password`（API passphrase），在 `exchange` 下加 `"password": "..."`。

### 5. 小额实盘启动

```bash
docker compose up -d
docker compose logs -f freqtrade
```

> 建议：第一次实盘把 `config.json` 的 `max_open_trades` 设为 1、`stake_amount` 设成交易所最小额，
> 用你**亏得起**的钱跑，观察几天确认挂单/成交/止损都正常，再逐步加。

---

## 调参数的地方

| 想改什么 | 改哪里 |
|---|---|
| 交易哪些币 | `config.json` → `exchange.pair_whitelist` |
| 每单下多少钱 | `config.json` → `stake_amount` |
| 最多同时开几单 | `config.json` → `max_open_trades` |
| 止盈目标 | `SampleStrategy.py` → `minimal_roi` |
| 止损线 | `SampleStrategy.py` → `stoploss` |
| 买卖逻辑 | `SampleStrategy.py` → `populate_entry_trend` / `populate_exit_trend` |

---

## Polymarket / 预测市场怎么办？

freqtrade 不支持 Polymarket。如果你要做 Polymarket，方向完全不同：
- 官方下单客户端：[Polymarket/py-clob-client](https://github.com/Polymarket/py-clob-client)
- 回测：[prediction-market-backtesting](https://github.com/evan-kolberg/prediction-market-backtesting)

但 Polymarket 是**事件预测市场**（谁赢选举之类），不是价格波动市场，10U 更没有操作空间。先把这套加密现货的模拟盘玩明白再说。

---

## 免责声明

交易有风险，可能损失全部本金。本项目仅供学习，不构成任何投资建议。
加密货币交易在部分地区（含中国大陆）属受限/违规活动，请自行确认当地合规性。

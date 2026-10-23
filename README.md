# 情报站 · Intel Hub

一个自托管、零成本、全自动的情报聚合看板。GitHub Actions 每小时抓取多个信息源,
跨源聚类去重后生成静态网页,部署到 GitHub Pages。**同一件事被多个源同时报道会自动
标红为"热门事件"** —— 这才是"热点逃不出视线"的关键:抓的是共振,不是堆数量。

## 效果

- **实时热榜**:本次抓取的全部条目,按"热度 × 跨源共振"排序。
- **今日摘要**:滚动 24 小时内最热的 30 条。
- 支持按来源(科技 / AI / 新闻)筛选、只看跨源事件、关键词搜索。
- 网页每 10 分钟自动刷新。

## 数据源(全部免费、无需 API Key)

| 源 | 方式 | 说明 |
|---|---|---|
| Hacker News | 官方 API | 科技/创投第一现场,最稳 |
| GitHub | 官方 Search API | 近期高星新仓(正在爆发的项目) |
| RSS | The Verge / Ars / TechCrunch / MIT TR / arXiv / HuggingFace / Google News / BBC 等 | 改 `config.json` 增删 |
| Reddit | 默认**关闭** | Reddit 现封数据中心 IP,Actions 云 IP 会 403,需 OAuth 才能用 |

## 启用步骤(一次性)

1. 把本分支合并到 `main`(或让 Actions 跑在你要的分支上)。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
3. 仓库 **Settings → Actions → General → Workflow permissions** 确认允许 Actions 运行。
4. 到 **Actions** 页签手动触发一次 `Update Intel Hub`(`Run workflow`),或等整点自动跑。
5. 跑完后,Pages 地址会显示在该 workflow 的 `deploy` 任务里(形如
   `https://<用户名>.github.io/<仓库名>/`)。

## 自定义

全部在 `config.json`,改完提交推送即可,**无需动代码**:

- `rss`:增删 RSS 源(`type` 填 `tech`/`ai`/`news` 决定网页上的分类标签)。
- `keywords_highlight`:命中这些词的条目会高亮关键词标签。
- `github.languages` / `github.days`:调整抓哪些语言、回看多少天的新仓。
- `output`:热榜/摘要条数、归档与摘要的时间窗口。
- 抓取频率:改 `.github/workflows/update.yml` 里的 `cron`(当前每小时)。

## 架构

```
config.json              # 源与参数(你改这里)
scripts/fetch.py         # 抓取 → 跨源聚类去重 → 生成 public/
site/index.html          # 看板模板(纯静态,无框架)
.github/workflows/       # 每小时 cron → 构建 → 部署 Pages
```

- **滚动归档**(近 72h)用 **Actions cache** 持久化,**不写入 git 历史**,仓库保持干净。
- 每个源独立容错:单源挂掉不影响其余;所有请求带超时。

## 成本与限制(实话实说)

- **免费**:GitHub Actions 公开仓库免费;私有仓库每小时一跑,月用量约 300~400 分钟,
  在免费额度(2000 分钟/月)内。想更省就把 cron 调成每几小时一次。
- **抓不全是必然**:X/Twitter、微博没有免费稳定 API,本站不含。Reddit 需自行接 OAuth。
  真正覆盖面靠你在 `config.json` 里补对领域的 RSS 源。
- **聚类是启发式**:按 URL 规范化 + 标题分词相似度合并,偶有漏合或误合,属正常。

## 本地调试

```bash
pip install -r requirements.txt
python scripts/fetch.py          # 生成 public/
python -m http.server -d public  # 浏览器打开 http://localhost:8000
```

#!/usr/bin/env python3
"""
情报站抓取与聚合主程序。

流程:
  1. 从多个免费源抓取条目(HN / GitHub Trending / Reddit / RSS)。
  2. 跨源聚类去重 —— 同一件事被多个源报道则合并,并按"热度 + 跨源共振"排序。
  3. 维护一个 72 小时滚动归档(archive.jsonl),用于生成"今日摘要"。
  4. 产出 public/ 静态站点(index.html + data/latest.json + data/digest.json)供 GitHub Pages 部署。

设计要点:
  - 每个源独立 try/except,单源失败不影响整体;所有网络请求带超时。
  - 不依赖任何 API Key;Reddit/GitHub 需要 User-Agent。
  - 归档用 JSONL 增量更新 + 按时间裁剪,配合 Actions cache 持久化,不污染 git 历史。
"""

from __future__ import annotations

import json
import math
import os
import re
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import feedparser
import requests

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.json"
SITE_DIR = ROOT / "site"
PUBLIC_DIR = ROOT / "public"
ARCHIVE_PATH = ROOT / "data" / "archive.jsonl"

HTTP_TIMEOUT = 20
USER_AGENT = (
    "Mozilla/5.0 (compatible; IntelHub/1.0; +https://github.com/) "
    "python-requests"
)

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT})


def log(msg: str) -> None:
    print(f"[intel] {msg}", file=sys.stderr, flush=True)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


# --------------------------------------------------------------------------- #
# 工具:URL 规范化、标题归一、稳定 ID
# --------------------------------------------------------------------------- #

_TRACKING = re.compile(r"^(utm_|fbclid|gclid|ref$|ref_|spm$)")
_WORD = re.compile(r"[a-z0-9一-鿿]+")


def canon_url(url: str) -> str:
    """规范化 URL 用于去重:去协议差异、去 www、去追踪参数、去尾斜杠。"""
    if not url:
        return ""
    try:
        p = urlparse(url.strip())
    except ValueError:
        return url.strip().lower()
    host = (p.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    path = (p.path or "").rstrip("/")
    return f"{host}{path}".lower()


def norm_tokens(title: str) -> set[str]:
    """标题分词(英文按词、中文按单字),用于模糊去重。"""
    if not title:
        return set()
    low = title.lower()
    tokens: set[str] = set()
    for m in _WORD.findall(low):
        if re.search(r"[一-鿿]", m):
            tokens.update(m)  # 中文拆成单字
        elif len(m) > 2:
            tokens.add(m)
    return tokens


def stable_id(source: str, url: str, title: str) -> str:
    import hashlib

    key = canon_url(url) or f"{source}:{title}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    if inter == 0:
        return 0.0
    return inter / len(a | b)


# --------------------------------------------------------------------------- #
# 各数据源
# --------------------------------------------------------------------------- #

def fetch_hacker_news(cfg: dict) -> list[dict]:
    limit = int(cfg.get("limit", 30))
    items: list[dict] = []
    top = SESSION.get(
        "https://hacker-news.firebaseio.com/v0/topstories.json",
        timeout=HTTP_TIMEOUT,
    ).json()
    for hid in top[:limit]:
        try:
            it = SESSION.get(
                f"https://hacker-news.firebaseio.com/v0/item/{hid}.json",
                timeout=HTTP_TIMEOUT,
            ).json()
        except Exception as e:  # noqa: BLE001
            log(f"HN item {hid} failed: {e}")
            continue
        if not it or it.get("type") != "story" or it.get("dead") or it.get("deleted"):
            continue
        url = it.get("url") or f"https://news.ycombinator.com/item?id={hid}"
        score = int(it.get("score", 0))
        comments = int(it.get("descendants", 0))
        items.append(
            make_item(
                source="Hacker News",
                source_type="tech",
                title=it.get("title", "").strip(),
                url=url,
                metric=score + 2 * comments,
                score=score,
                comments=comments,
                published=datetime.fromtimestamp(
                    it.get("time", time.time()), tz=timezone.utc
                ),
                discuss=f"https://news.ycombinator.com/item?id={hid}",
            )
        )
    return items


def fetch_github(cfg: dict) -> list[dict]:
    """用官方 Search API 抓近期高星新仓。

    GitHub Trending 页面无官方 API 且反爬,Reddit 式封 IP;Search API 稳定、
    在 Actions 里用自带 GITHUB_TOKEN 免配额(60 → 5000 req/h)。
    抓取维度:最近 N 天内新建、按 star 降序 —— 即"正在爆发的新项目"。
    """
    from datetime import timedelta

    days = int(cfg.get("days", 14))
    per = int(cfg.get("per_query", 10))
    since_date = (now_utc() - timedelta(days=days)).strftime("%Y-%m-%d")

    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    items: list[dict] = []
    seen_repos: set[str] = set()
    for lang in cfg.get("languages", [""]):
        q = f"created:>{since_date} stars:>20"
        if lang:
            q += f" language:{lang}"
        try:
            r = SESSION.get(
                "https://api.github.com/search/repositories",
                params={"q": q, "sort": "stars", "order": "desc", "per_page": per},
                headers=headers,
                timeout=HTTP_TIMEOUT,
            )
            data = r.json()
        except Exception as e:  # noqa: BLE001
            log(f"GitHub search ({lang or 'all'}) failed: {e}")
            continue
        for repo in data.get("items", []):
            full = repo.get("full_name", "")
            if not full or full in seen_repos:
                continue
            seen_repos.add(full)
            stars = int(repo.get("stargazers_count", 0))
            desc = (repo.get("description") or "").strip()
            lang_name = repo.get("language") or ""
            pub = now_utc()
            if repo.get("created_at"):
                try:
                    pub = datetime.fromisoformat(
                        repo["created_at"].replace("Z", "+00:00")
                    )
                except ValueError:
                    pass
            items.append(
                make_item(
                    source="GitHub",
                    source_type="tech",
                    title=f"{full}" + (f" — {desc}" if desc else ""),
                    url=repo.get("html_url", f"https://github.com/{full}"),
                    metric=max(stars, 1) * 3,
                    score=stars,
                    comments=int(repo.get("open_issues_count", 0)),
                    published=pub,
                    native_label=f"{stars}⭐" + (f" · {lang_name}" if lang_name else ""),
                )
            )
    return items


def fetch_reddit(cfg: dict) -> list[dict]:
    window = cfg.get("window", "day")
    limit = int(cfg.get("limit", 12))
    items: list[dict] = []
    for sub in cfg.get("subreddits", []):
        url = f"https://www.reddit.com/r/{sub}/top.json?t={window}&limit={limit}"
        try:
            data = SESSION.get(url, timeout=HTTP_TIMEOUT).json()
        except Exception as e:  # noqa: BLE001
            log(f"Reddit r/{sub} failed: {e}")
            continue
        for child in data.get("data", {}).get("children", []):
            d = child.get("data", {})
            if d.get("stickied") or d.get("over_18"):
                continue
            score = int(d.get("score", 0))
            comments = int(d.get("num_comments", 0))
            ext_url = d.get("url_overridden_by_dest") or d.get("url") or ""
            permalink = "https://www.reddit.com" + d.get("permalink", "")
            if not ext_url or ext_url.startswith("https://www.reddit.com"):
                ext_url = permalink
            items.append(
                make_item(
                    source=f"Reddit r/{sub}",
                    source_type="news" if sub in ("worldnews", "news") else "tech",
                    title=d.get("title", "").strip(),
                    url=ext_url,
                    metric=score + 3 * comments,
                    score=score,
                    comments=comments,
                    published=datetime.fromtimestamp(
                        d.get("created_utc", time.time()), tz=timezone.utc
                    ),
                    discuss=permalink,
                )
            )
    return items


def fetch_rss(feeds: list[dict]) -> list[dict]:
    items: list[dict] = []
    for feed in feeds:
        url = feed.get("url", "")
        name = feed.get("name", url)
        ftype = feed.get("type", "news")
        try:
            raw = SESSION.get(url, timeout=HTTP_TIMEOUT).content
            parsed = feedparser.parse(raw)
        except Exception as e:  # noqa: BLE001
            log(f"RSS {name} failed: {e}")
            continue
        for entry in parsed.entries[:25]:
            pub = now_utc()
            tm = entry.get("published_parsed") or entry.get("updated_parsed")
            if tm:
                try:
                    pub = datetime.fromtimestamp(time.mktime(tm), tz=timezone.utc)
                except Exception:  # noqa: BLE001
                    pass
            # RSS 无热度指标:按新鲜度给基础分(48h 内线性衰减,最低 1)。
            age_h = max(0.0, (now_utc() - pub).total_seconds() / 3600.0)
            metric = max(1.0, 12.0 * (1.0 - age_h / 48.0))
            items.append(
                make_item(
                    source=name,
                    source_type=ftype,
                    title=(entry.get("title") or "").strip(),
                    url=(entry.get("link") or "").strip(),
                    metric=metric,
                    score=0,
                    comments=0,
                    published=pub,
                    native_label="",
                )
            )
    return items


def make_item(
    *,
    source: str,
    source_type: str,
    title: str,
    url: str,
    metric: float,
    score: int,
    comments: int,
    published: datetime,
    discuss: str = "",
    native_label: str | None = None,
) -> dict:
    heat = math.log1p(max(metric, 0.0))
    return {
        "id": stable_id(source, url, title),
        "source": source,
        "source_type": source_type,
        "title": title,
        "url": url,
        "discuss": discuss,
        "score": score,
        "comments": comments,
        "heat": round(heat, 4),
        "metric": round(float(metric), 2),
        "native_label": native_label,
        "published": iso(published),
        "first_seen": iso(now_utc()),
    }


# --------------------------------------------------------------------------- #
# 聚类:同一事件跨源合并
# --------------------------------------------------------------------------- #

def cluster(items: list[dict], keywords: list[str]) -> list[dict]:
    """把指向同一事件的条目合并成一个簇。跨源越多,热度越高。"""
    valid = [it for it in items if it.get("title") and it.get("url")]
    n = len(valid)
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    canon = [canon_url(it["url"]) for it in valid]
    toks = [norm_tokens(it["title"]) for it in valid]

    for i in range(n):
        for j in range(i + 1, n):
            same = False
            if canon[i] and canon[i] == canon[j]:
                same = True
            elif len(toks[i]) >= 4 and len(toks[j]) >= 4 and jaccard(toks[i], toks[j]) >= 0.6:
                same = True
            if same:
                union(i, j)

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)

    kw_lower = [k.lower() for k in keywords]
    clusters: list[dict] = []
    for members_idx in groups.values():
        members = [valid[i] for i in members_idx]
        rep = max(members, key=lambda m: m["heat"])
        sources = sorted({m["source"] for m in members})
        distinct = len(sources)
        base = sum(m["heat"] for m in members)
        cluster_score = base * (1.0 + 0.4 * (distinct - 1))
        title_low = rep["title"].lower()
        hot_kw = sorted({k for k, kl in zip(keywords, kw_lower) if kl in title_low})
        clusters.append(
            {
                "id": rep["id"],
                "title": rep["title"],
                "url": rep["url"],
                "discuss": rep.get("discuss", ""),
                "source": rep["source"],
                "source_type": rep["source_type"],
                "sources": sources,
                "source_count": distinct,
                "is_event": distinct >= 2,
                "keywords": hot_kw,
                "score": max(m["score"] for m in members),
                "comments": max(m["comments"] for m in members),
                "native_label": rep.get("native_label"),
                "cluster_score": round(cluster_score, 4),
                "published": min(m["published"] for m in members),
                "first_seen": min(m["first_seen"] for m in members),
            }
        )

    clusters.sort(key=lambda c: c["cluster_score"], reverse=True)
    return clusters


# --------------------------------------------------------------------------- #
# 归档(72h 滚动)
# --------------------------------------------------------------------------- #

def load_archive() -> dict[str, dict]:
    store: dict[str, dict] = {}
    if not ARCHIVE_PATH.exists():
        return store
    for line in ARCHIVE_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            it = json.loads(line)
        except json.JSONDecodeError:
            continue
        if it.get("id"):
            store[it["id"]] = it
    return store


def save_archive(store: dict[str, dict], keep_hours: int) -> None:
    cutoff = now_utc().timestamp() - keep_hours * 3600
    ARCHIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    kept = []
    for it in store.values():
        try:
            seen = datetime.fromisoformat(it["first_seen"]).timestamp()
        except Exception:  # noqa: BLE001
            seen = now_utc().timestamp()
        if seen >= cutoff:
            kept.append(it)
    kept.sort(key=lambda x: x.get("first_seen", ""))
    with ARCHIVE_PATH.open("w", encoding="utf-8") as f:
        for it in kept:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")
    log(f"archive: {len(kept)} items kept (<= {keep_hours}h)")


# --------------------------------------------------------------------------- #
# 主流程
# --------------------------------------------------------------------------- #

def gather(config: dict) -> list[dict]:
    items: list[dict] = []
    collectors = [
        ("hacker_news", lambda c: fetch_hacker_news(c)),
        ("github", lambda c: fetch_github(c)),
        ("reddit", lambda c: fetch_reddit(c)),
    ]
    for key, fn in collectors:
        c = config.get(key, {})
        if not c.get("enabled", False):
            continue
        try:
            got = fn(c)
            log(f"{key}: {len(got)} items")
            items.extend(got)
        except Exception as e:  # noqa: BLE001
            log(f"{key} FAILED: {e}")
    try:
        rss = fetch_rss(config.get("rss", []))
        log(f"rss: {len(rss)} items")
        items.extend(rss)
    except Exception as e:  # noqa: BLE001
        log(f"rss FAILED: {e}")
    return items


def build_public(config: dict, latest: list[dict], digest: list[dict]) -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    (PUBLIC_DIR / "data").mkdir(parents=True, exist_ok=True)
    # 拷贝站点模板
    shutil.copyfile(SITE_DIR / "index.html", PUBLIC_DIR / "index.html")
    # GitHub Pages 不走 Jekyll,避免下划线目录被忽略
    (PUBLIC_DIR / ".nojekyll").write_text("", encoding="utf-8")

    meta = {
        "title": config.get("site_title", "情报站"),
        "generated_at": iso(now_utc()),
    }
    (PUBLIC_DIR / "data" / "latest.json").write_text(
        json.dumps({"meta": meta, "items": latest}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (PUBLIC_DIR / "data" / "digest.json").write_text(
        json.dumps({"meta": meta, "items": digest}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"public built: {len(latest)} latest, {len(digest)} digest")


def main() -> int:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    out = config.get("output", {})
    keywords = config.get("keywords_highlight", [])

    items = gather(config)
    if not items:
        log("WARNING: no items fetched from any source")

    # 更新归档
    store = load_archive()
    for it in items:
        if it["id"] in store:
            # 保留最早的 first_seen,刷新热度/评论
            it["first_seen"] = store[it["id"]].get("first_seen", it["first_seen"])
        store[it["id"]] = it
    save_archive(store, int(out.get("archive_hours", 72)))

    # 实时热榜:本次抓取聚类
    latest = cluster(items, keywords)[: int(out.get("latest_limit", 90))]

    # 今日摘要:归档中近 24h 的条目聚类
    digest_cut = now_utc().timestamp() - int(out.get("digest_hours", 24)) * 3600
    recent = []
    for it in store.values():
        try:
            seen = datetime.fromisoformat(it["first_seen"]).timestamp()
        except Exception:  # noqa: BLE001
            seen = now_utc().timestamp()
        if seen >= digest_cut:
            recent.append(it)
    digest = cluster(recent, keywords)[: int(out.get("digest_limit", 30))]

    build_public(config, latest, digest)
    return 0


if __name__ == "__main__":
    sys.exit(main())

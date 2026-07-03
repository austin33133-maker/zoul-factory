---
name: project-status
description: 汇总当前仓库状态（分支、最近提交、未提交变更、TODO）。当用户想快速了解项目进展或输入 /project-status 时使用。
---

# Project Status 报告

按以下步骤生成一份简短的项目状态报告：

1. 运行 `git branch --show-current` 和 `git log --oneline -10` 获取分支与最近提交。
2. 运行 `git status --short` 查看未提交的变更。
3. 用 Grep 搜索代码中的 `TODO` / `FIXME` 标记。
4. 输出一份 Markdown 报告，包含：当前分支、最近提交摘要、待提交文件、未完成事项列表。

保持报告在 30 行以内，只列出重要信息。

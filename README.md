# zoul-factory

Claude Code 自定义 **agents（子代理）** 和 **skills（技能）** 的示例仓库。

## Agents vs Skills

| | Agent (subagent) | Skill |
|---|---|---|
| 位置 | `.claude/agents/<name>.md` | `.claude/skills/<name>/SKILL.md` |
| 是什么 | 一个独立运行的子代理：有自己的系统提示、工具白名单和上下文窗口 | 一段可复用的指令/流程，注入到当前对话中执行 |
| 触发方式 | Claude 根据 `description` 自动委派，或用户点名要求 | 用户输入 `/<name>`，或 Claude 根据 `description` 自动调用 |
| 适合场景 | 需要隔离上下文的大任务（大范围搜索、代码审查、并行探索） | 固定流程、领域知识、常用操作模板 |

## 本仓库的示例

### `.claude/agents/code-reviewer.md`
代码审查子代理。frontmatter 里的关键字段：

- `name` — 代理名称
- `description` — Claude 决定何时委派的依据（写清楚触发条件）
- `tools` — 允许使用的工具白名单（如 `Read, Grep, Glob, Bash`）
- `model` — 使用的模型（`inherit` 表示跟随主会话）

正文就是该代理的系统提示。

### `.claude/skills/project-status/SKILL.md`
项目状态汇总技能。在 Claude Code 中输入 `/project-status` 即可触发，
或直接说"看看项目进展"让 Claude 自动匹配。

- `name` — 技能名（即斜杠命令名）
- `description` — 触发条件描述，越具体自动匹配越准
- 正文是执行该技能时 Claude 遵循的步骤说明
- 同目录下可以放辅助文件（脚本、参考文档），在 SKILL.md 里引用

## 使用方法

把本仓库结构复制到任何项目里，Claude Code 启动时会自动加载
`.claude/agents/` 和 `.claude/skills/` 下的定义。个人级（跨项目）定义
放在 `~/.claude/agents/` 和 `~/.claude/skills/`。

文档：<https://code.claude.com/docs/en/sub-agents> ·
<https://code.claude.com/docs/en/skills>

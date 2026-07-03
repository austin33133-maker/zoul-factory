# Agents 与 Skills 指南 / Agents & Skills Guide

本仓库使用 Claude Code 的两种扩展机制:**agents(子代理)** 和 **skills(技能)**。
This repo uses Claude Code's two extension mechanisms: **agents** (subagents) and **skills**.

## Agents(子代理)

Agent 是一个独立运行的 Claude 实例,由主会话派生出来完成一个子任务,拥有自己的上下文窗口、
工具白名单和模型配置。适合放到 agent 里的工作:大范围代码搜索、跑测试、并行的独立子任务。

An agent is a separately-spawned Claude instance with its own context window,
tool allowlist, and model. Good fits: broad code searches, running tests,
parallelizable independent subtasks.

### 定义位置 / Where they live

`.claude/agents/<name>.md` — Markdown 文件,YAML frontmatter 定义元数据,正文是该 agent 的系统提示词。

```markdown
---
name: my-agent            # 调用时使用的名字
description: 何时使用这个 agent(主会话靠它决定是否派发任务)
tools: Read, Grep, Bash   # 允许使用的工具;省略则继承全部
model: haiku              # haiku / sonnet / opus;省略则继承主会话模型
---

这里写 agent 的系统提示词(它的角色、工作流程、输出格式)。
```

### 本仓库自带的 agents

| Agent | 用途 |
|---|---|
| `code-explorer` | 只读代码调研:找文件、答"X 在哪 / Y 怎么工作" |
| `test-runner` | 跑测试并汇总失败原因,不动代码 |

## Skills(技能)

Skill 是一段可复用的指令(过程性知识),被触发时注入当前会话——不派生新实例,
在主会话里直接执行。用户可以用 `/<skill-name>` 手动触发,Claude 也会在
description 匹配当前任务时自动加载。适合放到 skill 里的:固定流程(发布、提交规范)、
领域知识、团队约定。

A skill is reusable procedural instruction injected into the *current* session
when triggered — no new instance is spawned. Users invoke via `/<skill-name>`;
Claude also auto-loads a skill whose description matches the task. Good fits:
fixed workflows (release, commit conventions), domain knowledge, team norms.

### 定义位置 / Where they live

`.claude/skills/<name>/SKILL.md` — 同样是 frontmatter + 正文,目录内可以附带脚本和参考文件。

```markdown
---
name: my-skill
description: 何时触发这个 skill(写清楚触发词,Claude 靠它匹配)
---

这里写触发后 Claude 要遵循的具体步骤和规则。
```

### 本仓库自带的 skills

| Skill | 用途 |
|---|---|
| `/commit-helper` | 按逻辑拆分改动、写规范的 commit message 并提交 |

## Agent vs Skill 怎么选 / Choosing between them

| | Agent | Skill |
|---|---|---|
| 运行方式 | 新的独立实例、独立上下文 | 注入当前会话 |
| 适合 | 大搜索、跑测试、可并行子任务 | 固定流程、规范、领域知识 |
| 成本 | 高(冷启动、重建上下文) | 低(只是加载指令) |
| 触发 | 主会话派发 / 用户点名 | `/<name>` 或描述自动匹配 |

经验法则:先考虑 skill;只有当任务需要隔离的上下文或并行执行时才用 agent。
Rule of thumb: reach for a skill first; use an agent only when the task needs
an isolated context window or parallel execution.

---
name: AGENT_NAME
description: 一句话说明何时该派发这个 agent(主会话靠这句话决定是否使用它)。
tools: Read, Glob, Grep
model: haiku
---

你是一个 __(角色)__ agent。

## 职责

1. __(第一步做什么)__
2. __(第二步做什么)__

## 边界

- __(不允许做的事,例如:不得修改文件)__

## 汇报格式

- 第一行:结论(一句话直接回答任务)。
- 之后:支撑证据,文件引用写成 `path:line`。

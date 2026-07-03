---
name: new-agent
description: Generate a new subagent definition in .claude/agents/ from a short description. Use when the user asks to create/add an agent, or says /new-agent <描述>.
---

# New Agent Generator

根据用户的一句话描述,生成一个新的子代理定义文件。

## 步骤

1. 从用户描述中确定:
   - **name**:小写 kebab-case(如 `doc-writer`)。检查 `.claude/agents/`
     中是否已有同名文件,有则提示用户换名或确认覆盖。
   - **职责**:这个 agent 具体做什么、产出什么。
   - **tools**:按最小权限原则选择。只读调研类给 `Read, Glob, Grep`;
     需要跑命令再加 `Bash`;需要改文件再加 `Edit, Write`。
   - **model**:机械性/搜索类任务用 `haiku`,一般任务用 `sonnet`,
     复杂推理才用 `opus`。
2. 以 `templates/agent.md` 为骨架,填入以上内容,写入
   `.claude/agents/<name>.md`。
3. 运行 `python3 scripts/validate.py` 校验格式。
4. 向用户展示生成的文件,说明:新 agent 在**下次会话**(或重新加载后)生效。

## 规则

- description 必须写"何时使用",不是"它是什么"——主会话靠这句话做派发决策。
- 系统提示词正文必须包含:职责、边界(不允许做的事)、汇报格式三部分。
- 不要授予任务不需要的工具。

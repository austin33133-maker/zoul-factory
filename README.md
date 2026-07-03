# zoul-factory

Claude Code agent 与 skill 的脚手架仓库 / Scaffold for Claude Code agents and skills.

## 目录结构 / Layout

```
.claude/
  agents/            # 子代理定义 (subagent definitions)
    code-explorer.md   # 只读代码调研 agent
    test-runner.md     # 测试执行 agent
  skills/            # 技能定义 (skill definitions)
    commit-helper/     # /commit-helper — 规范化 git 提交
      SKILL.md
docs/
  agents-and-skills.md # 概念说明与编写指南 (concepts & authoring guide)
```

详见 [docs/agents-and-skills.md](docs/agents-and-skills.md)。

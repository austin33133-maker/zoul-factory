# zoul-factory

Claude Code agent 与 skill 的生产工厂 / A factory for Claude Code agents and skills.

用 `/new-agent <描述>` 和 `/new-skill <描述>` 生成新的定义,用
`python3 scripts/validate.py` 校验所有定义文件的格式。

## 目录结构 / Layout

```
.claude/
  agents/              # 子代理定义 (subagent definitions)
    code-explorer.md     # 只读代码调研 agent
    test-runner.md       # 测试执行 agent
  skills/              # 技能定义 (skill definitions)
    commit-helper/       # /commit-helper — 规范化 git 提交
    new-agent/           # /new-agent — 生成新的 agent 定义
    new-skill/           # /new-skill — 生成新的 skill 定义
templates/
  agent.md             # 新 agent 的骨架模板
  skill.md             # 新 skill 的骨架模板
scripts/
  validate.py          # 校验所有 agent/skill 定义的 frontmatter
docs/
  agents-and-skills.md # 概念说明与编写指南 (concepts & authoring guide)
```

## 校验 / Validation

```
$ python3 scripts/validate.py
OK — 2 agent(s), 3 skill(s) valid.
```

检查项:frontmatter 完整、`name`/`description` 必填、name 为 kebab-case
且与文件路径一致、`model` 和 `tools` 取值合法。

详见 [docs/agents-and-skills.md](docs/agents-and-skills.md)。

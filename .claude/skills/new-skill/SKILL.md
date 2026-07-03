---
name: new-skill
description: Generate a new skill definition in .claude/skills/ from a short description. Use when the user asks to create/add a skill, or says /new-skill <描述>.
---

# New Skill Generator

根据用户的一句话描述,生成一个新的 skill 定义。

## 步骤

1. 从用户描述中确定:
   - **name**:小写 kebab-case(如 `release-notes`)。检查
     `.claude/skills/` 下是否已有同名目录,有则提示用户换名或确认覆盖。
   - **触发条件**:用户会说什么话、什么任务场景下应该加载它。
   - **流程**:触发后要执行的具体步骤,按顺序编号。
   - **规则**:硬性约束和禁止行为。
2. 以 `templates/skill.md` 为骨架,填入以上内容,写入
   `.claude/skills/<name>/SKILL.md`。
3. 如果流程依赖脚本或参考资料,放在同一目录下并在 SKILL.md 中引用。
4. 运行 `python3 scripts/validate.py` 校验格式。
5. 向用户展示生成的文件,说明:用 `/<name>` 手动触发,或由描述自动匹配。

## 规则

- description 里必须包含触发词,写给"决定是否加载"的匹配逻辑看。
- 步骤要具体到可执行(写命令、写文件路径),不写空泛的"分析需求"。
- 一个 skill 只做一件事;流程超过 ~10 步应拆分。

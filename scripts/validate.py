#!/usr/bin/env python3
"""Validate agent and skill definition files.

Checks .claude/agents/*.md and .claude/skills/*/SKILL.md for:
- valid YAML-ish frontmatter delimited by ---
- required fields (name, description)
- name matches file/directory name and is kebab-case
- known values for optional fields (model, tools)

Exit code 0 = all valid, 1 = problems found.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
KNOWN_MODELS = {"haiku", "sonnet", "opus", "inherit"}
KNOWN_TOOLS = {
    "Read", "Write", "Edit", "Glob", "Grep", "Bash",
    "WebFetch", "WebSearch", "NotebookEdit", "Agent", "Skill",
}

errors: list[str] = []


def err(path: Path, msg: str) -> None:
    errors.append(f"{path.relative_to(ROOT)}: {msg}")


def parse_frontmatter(path: Path) -> dict[str, str] | None:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        err(path, "missing frontmatter (file must start with ---)")
        return None
    end = text.find("\n---", 4)
    if end == -1:
        err(path, "frontmatter not closed with ---")
        return None
    fields: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if not line.strip() or line.lstrip() != line:
            continue  # skip blanks and nested/continued lines
        if ":" not in line:
            err(path, f"malformed frontmatter line: {line!r}")
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()
    return fields


def check_common(path: Path, fm: dict[str, str], expected_name: str) -> None:
    name = fm.get("name", "")
    if not name:
        err(path, "missing required field: name")
    elif not KEBAB.match(name):
        err(path, f"name {name!r} is not kebab-case")
    elif name != expected_name:
        err(path, f"name {name!r} does not match path (expected {expected_name!r})")

    desc = fm.get("description", "")
    if not desc:
        err(path, "missing required field: description")
    elif len(desc) < 20:
        err(path, "description too short to be a useful trigger (< 20 chars)")


def check_agent(path: Path) -> None:
    fm = parse_frontmatter(path)
    if fm is None:
        return
    check_common(path, fm, path.stem)
    model = fm.get("model")
    if model and model not in KNOWN_MODELS:
        err(path, f"unknown model {model!r} (expected one of {sorted(KNOWN_MODELS)})")
    tools = fm.get("tools")
    if tools:
        for tool in (t.strip() for t in tools.split(",")):
            if tool and not tool.startswith("mcp__") and tool not in KNOWN_TOOLS:
                err(path, f"unknown tool {tool!r}")


def check_skill(path: Path) -> None:
    fm = parse_frontmatter(path)
    if fm is None:
        return
    check_common(path, fm, path.parent.name)


def main() -> int:
    agents = sorted((ROOT / ".claude" / "agents").glob("*.md"))
    skills = sorted((ROOT / ".claude" / "skills").glob("*/SKILL.md"))
    for p in agents:
        check_agent(p)
    for p in skills:
        check_skill(p)

    checked = len(agents) + len(skills)
    if errors:
        print(f"FAIL — {len(errors)} problem(s) in {checked} file(s):")
        for e in errors:
            print(f"  {e}")
        return 1
    print(f"OK — {len(agents)} agent(s), {len(skills)} skill(s) valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

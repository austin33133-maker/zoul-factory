# AGENTS.md

Instructions for coding agents working in this repository. Codex reads this file
automatically; deeper `AGENTS.md` files override it for their subtree.

## What this repo is

`zoul-factory` packages agent capabilities. The current contents are the **codex
skill**: a max-power configuration and operating manual for the OpenAI Codex CLI.

```
.claude/skills/codex/       canonical skill (Claude Code loads it from here)
  SKILL.md                  the skill
  assets/config.toml        max-power base config -> $CODEX_HOME/config.toml
  assets/*.config.toml      profiles, layered with `codex exec -p <name>`
  reference/                verified config.toml and CLI references
  scripts/setup-codex.sh    install + validate + roll back on failure
.agents/skills/codex        symlink to the above, so Codex discovers the same skill
```

The skill follows the open Agent Skills standard, so one `SKILL.md` serves both
Claude Code and Codex.

## Ground rules

**Verify against the binary, never from memory.** Codex renames and removes config
keys and flags between releases; published docs lag and at least three entries in
them were already wrong for 0.146.0. Before documenting any key or flag:

```bash
codex --version
codex exec --help
codex features list
codex exec --strict-config --skip-git-repo-check < /dev/null   # validates config.toml
codex debug models                    # models, reasoning levels, context windows
codex debug prompt-input "x"          # exact model-visible context
codex sandbox -- <cmd>                # real sandbox behaviour
```

The last three need no auth and cost nothing. `codex debug models` is the
authority on reasoning levels — the published docs stop at `xhigh` and are wrong;
`max` and `ultra` exist. `codex debug prompt-input` is how to prove a skill,
an `AGENTS.md`, or a setting actually reached the model.

`--strict-config` reports unknown fields with file, line, and column. It is the
authority for anything in `assets/*.toml`.

**Any change to `assets/*.toml` must be validated before commit.** A config that
fails to parse breaks every Codex run on the machine, not just one.

```bash
CODEX_HOME=$(mktemp -d) .claude/skills/codex/scripts/setup-codex.sh --force
```

**TOML ordering.** Every top-level scalar must appear before the first `[table]`.
A key placed after one is silently reparented into it and rejected as
`unknown configuration field <table>.<key>`.

**Keep the two references in sync with reality.** `reference/config.md` and
`reference/cli.md` mark each entry *verified* (exercised against the binary) or
*documented* (from published docs, untested). Do not promote an entry to verified
without actually running it.

## Conventions

- Shell scripts: `bash`, `set -euo pipefail`, `bash -n` clean, `--dry-run` where
  they mutate anything outside the repo.
- Anything that overwrites a user file backs it up first and restores on failure.
- Record the Codex version any claim was verified against.

# zoul-factory

The **codex skill** — a max-power configuration and operating manual for the
[OpenAI Codex CLI](https://developers.openai.com/codex), packaged as an
[Agent Skill](https://agentskills.io) that both Claude Code and Codex can load.

Out of the box Codex is tuned conservatively: `medium` reasoning, `cached` web
search, a read-only sandbox, no network. This skill turns every one of those dials
up and documents what each is actually worth.

## Install

```bash
npm install -g @openai/codex          # if you don't have it
codex login

.claude/skills/codex/scripts/setup-codex.sh
```

The script backs up any existing `~/.codex/config.toml`, preserves your workspace
trust entries, validates the result with Codex's own strict parser, and rolls back
if anything is rejected. `--dry-run` shows the diff first.

Then max power is simply the default:

```bash
codex exec --skip-git-repo-check "<task>"
```

## What "max power" means here

| Dial | Codex default | Here |
|---|---|---|
| Model | plan-dependent | `gpt-5.6-sol` — flagship |
| Reasoning effort | `low` on sol | `ultra` — top of the ladder |
| Plan-mode reasoning | `medium` | `ultra` |
| Web search | `cached` | `live` |
| Sandbox | `read-only` | `workspace-write` |
| Sandbox network | off | on |
| Approvals | `untrusted` | `never` — fully headless |
| Cross-session memory | off | on |
| Sub-agent orchestration | v1 | v2 |

The reasoning ladder is `low` < `medium` < `high` < `xhigh` < `max` < `ultra`.
Published docs stop at `xhigh`; `codex debug models` does not. `ultra` is
"maximum reasoning with automatic task delegation" and needs `sol` or `terra`.
Note that `sol`'s own default is `low`, so picking the flagship without setting
effort gives you the flagship at its shallowest.

`workspace-write` is deliberately the ceiling: it is the strongest sandbox that is
still a sandbox. Removing it entirely (`--dangerously-bypass-approvals-and-sandbox`)
is documented in the skill, but is not the default and is not a good idea outside a
disposable container.

**Know what the sandbox does not do.** Verified with `codex sandbox`: it blocks
writes outside the workspace, but reads are unrestricted — `/root`, SSH keys,
`.env` files and neighbouring repos are all readable. Combined with network access
(on by default here), assume anything on the disk can be read and can leave. Good
trade in a disposable container; reconsider on a laptop holding production
credentials.

Two profiles ship alongside it:

```bash
codex exec -p fast  "<task>"   # gpt-5.6-luna, low effort — bulk work
codex exec -p audit "<task>"   # gpt-5.6-sol, max, read-only — review with no write authority
```

## Layout

```
.claude/skills/codex/
  SKILL.md                  operating manual: dials, recipes, safety ladder
  assets/config.toml        max-power base config
  assets/fast.config.toml   profile: fast/cheap
  assets/audit.config.toml  profile: deep reasoning, zero write authority
  reference/config.md       every config.toml key + allowed values
  reference/cli.md          full CLI flag surface + drift-check procedure
  scripts/setup-codex.sh    install, validate, roll back
.agents/skills/codex        symlink — Codex discovers the same skill
AGENTS.md                   repo instructions for coding agents
```

## Verification

Every flag, config key, model, and feature flag in this repo was checked against
**codex-cli 0.146.0** by running the binary, not by reading documentation. The
published docs were wrong about five things:

- the reasoning ceiling — `max` and `ultra` exist above `xhigh`
- `tools.view_image` — removed
- `tools.web_search = "live"` as a bare string — rejected
- `experimental_instructions_file` — now `model_instructions_file`
- skill discovery — `$CODEX_HOME/skills` is a scanned root and is undocumented

Skill discovery was established by planting probe skills in each candidate root
and reading `codex debug prompt-input` back; sandbox limits by running commands
under `codex sandbox`.

Codex moves fast. After `codex update`, re-check:

```bash
codex exec --strict-config --skip-git-repo-check < /dev/null   # config still parses?
codex features list                                            # what's new / newly stable?
codex debug models                                             # models, reasoning levels, windows
codex debug prompt-input "x"                                   # what the model actually receives
```

`reference/` marks each entry *verified* (exercised against the binary) or
*documented* (from published docs, untested).

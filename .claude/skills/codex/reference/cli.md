# CLI reference

Verified against `codex-cli 0.146.0` by reading `--help` on the installed binary.

## Subcommands

| Command | Purpose |
|---|---|
| `codex [PROMPT]` | interactive TUI |
| `codex exec` (alias `e`) | non-interactive run |
| `codex exec resume` | resume a session by id, or `--last` |
| `codex exec review` | review from within exec |
| `codex review` | non-interactive code review |
| `codex resume` / `fork` | resume or fork an interactive session (picker, or `--last`) |
| `codex apply` (alias `a`) | `git apply` the agent's latest diff to the working tree |
| `codex login` / `login status` / `logout` | auth |
| `codex mcp` | manage MCP servers |
| `codex plugin` | `add`, `list`, `remove`, `marketplace` |
| `codex features` | `list`, `enable`, `disable` |
| `codex doctor` | diagnose install, config, auth, runtime |
| `codex sandbox` | run a command inside Codex's sandbox |
| `codex update` | self-update |
| `codex archive` / `unarchive` / `delete` | manage saved sessions |
| `codex mcp-server` | run Codex itself as an MCP server (stdio) |
| `codex completion` | shell completions |
| `codex cloud`, `app-server`, `exec-server`, `remote-control`, `debug` | experimental |

## Global options

| Flag | Notes |
|---|---|
| `-c, --config <key=value>` | dotted path; value parsed as TOML, falls back to literal string. Repeatable. |
| `--enable <FEATURE>` / `--disable <FEATURE>` | repeatable; same as `-c features.<name>=true/false` |
| `--strict-config` | error on unrecognised config fields |
| `-m, --model <MODEL>` | |
| `-i, --image <FILE>...` | attach image(s) |
| `-p, --profile <NAME>` | layers `$CODEX_HOME/<NAME>.config.toml` over the base config |
| `-s, --sandbox <MODE>` | `read-only`, `workspace-write`, `danger-full-access` |
| `-a, --ask-for-approval <POLICY>` | `untrusted`, `on-request`, `never` — **interactive only** |
| `--search` | live web search — **interactive only** |
| `-C, --cd <DIR>` | working root |
| `--add-dir <DIR>` | extra writable root |
| `--dangerously-bypass-approvals-and-sandbox` | no sandbox, no approvals |
| `--dangerously-bypass-hook-trust` | run hooks without persisted trust |
| `--oss` / `--local-provider <lmstudio\|ollama>` | local models |
| `--remote <ADDR>` / `--remote-auth-token-env <VAR>` | remote app server |
| `--no-alt-screen` | inline TUI, preserves scrollback |

Quoting for `-c`: strings need inner quotes — `-c model_reasoning_effort='"xhigh"'`.
Booleans and numbers do not — `-c sandbox_workspace_write.network_access=true`.

## `codex exec` options

Everything above except `-a/--ask-for-approval`, `--search`, and `--no-alt-screen`
(interactive-only), plus:

| Flag | Notes |
|---|---|
| `--json` | JSONL event stream to stdout |
| `-o, --output-last-message <FILE>` | write only the final message to a file |
| `--output-schema <FILE>` | JSON Schema constraining the final response |
| `--skip-git-repo-check` | allow running outside a git repo |
| `--ephemeral` | do not persist session files |
| `--ignore-user-config` | skip `$CODEX_HOME/config.toml` (auth still uses `CODEX_HOME`) |
| `--ignore-rules` | skip user/project execpolicy `.rules` files |
| `--color <always\|never\|auto>` | |

The prompt is positional, or `-`/piped stdin. If both a prompt argument and piped
stdin are present, stdin is appended as a `<stdin>` block.

Because `exec` has no `-a`, set the approval policy via config:
`-c approval_policy='"never"'`.

## `codex review`

| Flag | Notes |
|---|---|
| `--uncommitted` | staged, unstaged, and untracked changes |
| `--base <BRANCH>` | diff against a base branch |
| `--commit <SHA>` | changes introduced by one commit |
| `--title <TITLE>` | title shown in the review summary |
| `[PROMPT]` | custom review instructions; `-` reads stdin |

## `codex exec resume`

```
codex exec resume [OPTIONS] [SESSION_ID] [PROMPT]
```

`SESSION_ID` is a UUID or thread name; omit it and pass `--last` for the most recent
session. The id is printed in the run header of every run.

## Drift check

Codex renames and removes things between releases. When something here is rejected:

```bash
codex --version
codex --help                 # subcommands and global flags
codex exec --help            # exec surface
codex features list          # real feature names, stages, effective state
codex doctor                 # config/auth/runtime health

# does this config still parse on this build?
codex exec --strict-config --skip-git-repo-check < /dev/null
```

The installed binary is the authority — it validates config with file/line/column
errors and prints the effective model, effort, approval policy, sandbox, and
network state in every run header. Prefer it over any documentation, including this
file.

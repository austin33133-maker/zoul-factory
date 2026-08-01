# `config.toml` reference

Lives at `$CODEX_HOME/config.toml`, default `~/.codex/config.toml`.

Keys marked **verified** were accepted or rejected by `codex-cli 0.146.0` running
`codex exec --strict-config`. Keys marked *documented* come from the published
config reference and are not yet exercised here.

> **TOML ordering trap.** Every top-level scalar must appear before the first
> `[table]` header. Codex also appends a `[projects."<path>"]` trust table to your
> config on first run — anything you add after it gets reparented under it and
> rejected as `unknown configuration field projects.<path>.<key>`.

## Model

| Key | Values | Status |
|---|---|---|
| `model` | `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex-spark` | verified |
| `model_reasoning_effort` | `minimal` \| `low` \| `medium` \| `high` \| `xhigh` | verified (`xhigh`) |
| `plan_mode_reasoning_effort` | `none` \| `minimal` \| `low` \| `medium` \| `high` \| `xhigh` | verified |
| `model_reasoning_summary` | `auto` \| `concise` \| `detailed` \| `none` | verified |
| `model_verbosity` | `low` \| `medium` \| `high` | verified |
| `model_context_window` | integer | verified |
| `model_auto_compact_token_limit` | integer | verified |
| `model_auto_compact_token_limit_scope` | `total` \| `body_after_prefix` | documented |
| `model_instructions_file` | path | verified |
| `model_provider` | provider id, default `openai` | documented |
| `model_supports_reasoning_summaries` | bool | documented |
| `model_catalog_json` | path | documented |

`xhigh` is the deepest level the CLI exposes. `gpt-5.6-luna` and `gpt-5.4-mini` do
not support it — the run header shows the effort actually applied.

Removed in 0.146.0: **`experimental_instructions_file`** → use `model_instructions_file`.

## Approvals and sandbox

| Key | Values | Status |
|---|---|---|
| `approval_policy` | `untrusted` \| `on-request` \| `never` \| `{ granular = {...} }` | verified (`never`) |
| `sandbox_mode` | `read-only` \| `workspace-write` \| `danger-full-access` | verified |
| `sandbox_workspace_write.network_access` | bool | verified |
| `sandbox_workspace_write.writable_roots` | array of paths | documented |
| `sandbox_workspace_write.exclude_slash_tmp` | bool | verified |
| `sandbox_workspace_write.exclude_tmpdir_env_var` | bool | verified |
| `approvals_reviewer` | `user` \| `auto_review` | documented |

`approval_policy` granular sub-keys (documented): `sandbox_approval`, `rules`,
`mcp_elicitations`, `request_permissions`, `skill_approval`.

Under `workspace-write` the writable set is the workspace root, `/tmp`, and
`$TMPDIR` — confirmed in the run header.

## Tools

| Key | Values | Status |
|---|---|---|
| `web_search` (top level) | `disabled` \| `cached` \| `indexed` \| `live` | verified |
| `tools.web_search` | bool, or table e.g. `{ mode = "live" }` | verified — the bare string form `tools.web_search = "live"` is **rejected** |
| `tools.view_image` | — | **removed in 0.146.0**, rejected |

Prefer the top-level `web_search` key: one documented spelling, no enum-variant
ambiguity, and it is what `--search` sets. Default is `cached`, so live search is
opt-in and `codex exec` has no flag for it.

## Features

Enumerate the real list on your build — this changes between releases:

```bash
codex features list          # name | stage | effective state
codex features enable <name>
codex features disable <name>
```

Per-invocation: `--enable <feature>` / `--disable <feature>`, both repeatable,
equivalent to `-c features.<name>=true|false`.

Stable but **off** by default on 0.146.0 — real capability left on the table:

| Feature | Effect |
|---|---|
| `memories` | cross-session recall |
| `multi_agent_v2` | newer sub-agent orchestration |
| `secret_auth_storage` | OS keychain for credentials (security, not capability) |

Stable and already on: `multi_agent`, `shell_tool`, `unified_exec`, `skill_search`,
`skill_mcp_dependency_install`, `tool_suggest`, `computer_use`, `browser_use`,
`browser_use_full_cdp_access`, `image_generation`, `in_app_browser`, `hooks`,
`plugins`, `goals`, `personality`, `fast_mode`, `guardian_approval`,
`workspace_dependencies`, `remote_compaction_v2`.

Experimental, off: `network_proxy`, `prevent_idle_sleep`. Leave `under development`
flags alone for real work.

## MCP servers

`codex mcp list | get | add | remove | login | logout`, or in config
(all documented):

| Key | Values |
|---|---|
| `mcp_servers.<id>.command` | executable |
| `mcp_servers.<id>.url` | HTTP endpoint |
| `mcp_servers.<id>.enabled` | bool |
| `mcp_servers.<id>.auth` | `oauth` \| `chatgpt` |
| `mcp_servers.<id>.default_tools_approval_mode` | `auto` \| `prompt` \| `writes` \| `approve` |
| `mcp_servers.<id>.enabled_tools` / `.disabled_tools` | array of tool names |

## Environment, history, misc

| Key | Values | Status |
|---|---|---|
| `shell_environment_policy.inherit` | `all` \| (subset policies) | verified (`all`) |
| `history.persistence` | `save-all` \| `none` | verified |
| `hide_agent_reasoning` | bool | verified |
| `file_opener` | `vscode` \| `vscode-insiders` \| `windsurf` \| `cursor` \| `none` | verified |
| `notify` | array of command strings | documented |
| `log_dir` | path | documented |

`shell_environment_policy.inherit = "all"` hands the agent your full environment —
more capable, but it exposes every secret in your shell to the model. Not in the
shipped config; opt in deliberately.

## Profiles (v2)

Separate files at `$CODEX_HOME/<name>.config.toml`, layered over the base config
with `-p <name>` / `--profile <name>`. Same key surface as the base file. The old
`[profiles.<name>]` inline tables are gone.

## Validating a config

```bash
codex exec --strict-config --skip-git-repo-check < /dev/null
```

`--strict-config` errors on any field this build does not recognise, with file,
line, and column. Run it after every edit and after every `codex update`. It is not
supported on `codex features`.

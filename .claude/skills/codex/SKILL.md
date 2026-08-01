---
name: codex
description: Delegate coding work to the OpenAI Codex CLI at maximum capability — flagship model, ultra reasoning, live web search, network-enabled sandbox, full autonomy. Use when the user asks to run/use Codex, wants a second opinion from another model, wants a deep independent code or security review, or wants a long autonomous task farmed out. Also use when setting up, configuring, or tuning Codex itself (config.toml, profiles, feature flags, skills, MCP servers). Do not use for ordinary edits you can make directly.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Codex at max power

Drive `codex` so it runs at the strongest settings the CLI exposes, instead of its
conservative defaults (medium reasoning, cached search, no network in sandbox).

Everything here was verified against **codex-cli 0.146.0**. Codex ships fast and
renames things — if a flag or key is rejected, run the drift check in
`reference/cli.md` before assuming this document is right.

## Preflight

```bash
codex --version          # expect >= 0.146.0; `codex update` to upgrade
codex login status       # must be logged in; `codex login` (ChatGPT) or `codex login --with-api-key`
codex doctor             # config/auth/runtime health; reports config parse errors
```

If `codex` is missing: `npm install -g @openai/codex`.
If the config is not installed yet, run `scripts/setup-codex.sh` (see Setup below).

## The default invocation

Once `assets/config.toml` is installed, max power is the default and the command
stays short:

```bash
codex exec --skip-git-repo-check "<task>"
```

To be explicit at the call site without relying on the installed config — this is
the full max-power form, and the one to use when you cannot verify what config is
on the machine:

```bash
codex exec \
  -m gpt-5.6-sol \
  -c model_reasoning_effort='"ultra"' \
  -c web_search='"live"' \
  -c sandbox_workspace_write.network_access=true \
  --enable memories --enable multi_agent_v2 \
  -s workspace-write \
  --skip-git-repo-check \
  "<task>"
```

`-c` values are parsed as TOML, so string values need inner quotes: `-c key='"value"'`.
Booleans and numbers do not: `-c key=true`.

## The power dials

| Dial | Weak default | Max | How to set |
|---|---|---|---|
| Model | plan-dependent | `gpt-5.6-sol` (flagship) | `-m` / `model` |
| Reasoning | `low` on sol | `ultra` | `-c model_reasoning_effort='"ultra"'` |
| Plan-mode reasoning | `medium` | `ultra` | `plan_mode_reasoning_effort` |
| Web search | `cached` | `live` | `web_search` (see note) |
| Sandbox | `read-only` | `workspace-write` | `-s workspace-write` |
| Sandbox network | off | on | `sandbox_workspace_write.network_access=true` |
| Approvals | `untrusted` | `never` | `-a never` |
| Cross-session memory | off | on | `--enable memories` |
| Sub-agents | v1 | v2 | `--enable multi_agent_v2` |

**Reasoning ladder** (from `codex debug models`, the authoritative catalog):

`low` < `medium` < `high` < `xhigh` < `max` < `ultra`

`xhigh` is *not* the top — published docs stop there, the catalog does not. `max`
is the deepest single-agent level; `ultra` is "maximum reasoning with automatic
task delegation". `ultra` needs `gpt-5.6-sol` or `gpt-5.6-terra`; `luna` supports
up to `max`; `gpt-5.5` and older stop at `xhigh`.

Note sol's **default effort is `low`** — running it without setting effort is
nowhere near max power, and the run header is the only place that tells you.

Model tiers: `gpt-5.6-sol` (deepest) > `gpt-5.6-terra` (balanced) > `gpt-5.6-luna`
(fast/cheap). All three share a **272,000-token context window** (95% effective).

Do not set `model_auto_compact_token_limit` above 272000. Codex accepts a larger
value silently without clamping, and a limit above the window means auto-compaction
never fires — a long run dies on context overflow instead of compacting.

Check the full matrix any time: `codex debug models | python3 -m json.tool`.

**Web search note:** the `--search` flag is interactive-only. `codex exec` has no
`--search`, so headless runs get live search *only* from the `web_search = "live"`
config key or `-c web_search='"live"'`. This is the single easiest max-power dial
to leave off by accident.

## Setup

```bash
.claude/skills/codex/scripts/setup-codex.sh          # install config + profiles, validate
.claude/skills/codex/scripts/setup-codex.sh --dry-run
```

It backs up any existing `~/.codex/config.toml` to `config.toml.bak.<timestamp>`
before writing, installs the `fast` and `audit` profiles, and validates the result
with Codex's own strict parser. Never hand-edit `~/.codex/config.toml` without
re-running the validation step — a bad key makes *every* Codex run fail to start.

`$CODEX_HOME` overrides `~/.codex` if you need an isolated setup.

## Profiles

Profiles are separate files at `$CODEX_HOME/<name>.config.toml`, layered over the
base config with `-p <name>`. (This is profiles v2 — the old `[profiles.x]` inline
tables are gone.)

```bash
codex exec -p fast  "<task>"    # luna + low effort: bulk, latency-sensitive work
codex exec -p audit "<task>"    # sol + xhigh + read-only: review with no write authority
```

Use `audit` for anything where Codex should analyse but not touch the tree. It is
strictly safer than trusting a prompt that says "don't edit anything".

## Recipes

**Capture just the final answer** (best for piping into your own reasoning):

```bash
codex exec --skip-git-repo-check -o /tmp/codex-out.md "<task>" >/dev/null
```

**Machine-readable event stream:**

```bash
codex exec --json --skip-git-repo-check "<task>" | tee /tmp/codex.jsonl
```

**Structured output** — constrain the final message to a JSON Schema:

```bash
codex exec --output-schema schema.json -o /tmp/result.json "<task>"
```

**Continue a run** (Codex keeps full session context; far better than re-prompting):

```bash
codex exec resume --last "now add tests for the branch you just wrote"
codex exec resume <session-id> "<follow-up>"
```

The session id is printed in the run header.

**Independent code review** — a real subcommand, not a prompt:

```bash
codex review --uncommitted            # staged + unstaged + untracked
codex review --base main              # everything vs. a base branch
codex review --commit <sha>
codex review "focus on concurrency and error handling"
```

**Multi-repo work** — grant extra writable roots:

```bash
codex exec -C /path/to/main-repo --add-dir /path/to/other-repo "<task>"
```

**Images** (screenshots, diagrams, failing UI):

```bash
codex exec -i shot1.png -i shot2.png "why does this layout break at 768px?"
```

**Parallel fan-out** — independent tasks, one session each:

```bash
for t in "audit auth" "audit billing" "audit webhooks"; do
  codex exec -p audit --skip-git-repo-check -o "/tmp/${t// /-}.md" "$t" >/dev/null &
done
wait
```

Keep fan-out to genuinely independent tasks. Parallel `workspace-write` sessions on
one tree will clobber each other — fan out with `-p audit`, or give each its own
worktree.

**Throwaway run**, leaves no session on disk: add `--ephemeral`.

## Sandbox and approval ladder

Pick the weakest rung that does the job.

1. `-s read-only` — analysis, review, answering questions.
2. `-s workspace-write` + `network_access=true` — **the default here.** Full write
   access inside the workspace, `/tmp`, and `$TMPDIR`; network on for installs and
   API calls. Writes anywhere else are refused.

   **The sandbox constrains writes, not reads.** Verified with `codex sandbox`:
   a write to `/root` is blocked, but reading `/root` succeeds. Nothing on the
   filesystem is hidden from the model — SSH keys, `.env` files, cloud
   credentials, other repos are all readable. With `network_access = true` the
   run can also reach the internet, so treat "workspace-write + network" as
   *everything on this disk is readable and could leave it*. That is the right
   trade for a disposable container or a machine whose secrets you accept the
   model seeing; it is the wrong default for a laptop holding production
   credentials. Turn network off for untrusted work:
   `-c sandbox_workspace_write.network_access=false`.

   You can verify the boundary yourself without spending a token:

   ```bash
   codex sandbox -c sandbox_mode='"workspace-write"' -- \
     bash -c 'touch ./x && echo in-ok; touch /root/x || echo out-blocked'
   ```
3. `--dangerously-bypass-approvals-and-sandbox` (alias `--yolo`) — no sandbox, no
   approvals, writes anywhere the user can. This is *more* than max power; it is
   removing the safety rail. Only in a disposable container or CI box that is
   already externally sandboxed, and only when the user has asked for it. Never on
   a developer's own machine by default.

`-a never` means Codex never pauses for a human; execution failures go back to the
model to solve. That is what you want for headless runs, and the wrong choice for
anything with irreversible side effects (deploys, migrations, force pushes).

## Codex's own skills

Codex loads Agent Skills (`SKILL.md`) from these roots — all five confirmed by
planting probe skills and reading them back out of `codex debug prompt-input`:

- `$CODEX_HOME/skills` — where the 5 built-in system skills live (`imagegen`,
  `openai-docs`, `plugin-creator`, `skill-creator`, `skill-installer`, under
  `.system/`) and where `skill-installer` puts new ones. **Recurses**, so
  `$CODEX_HOME/skills/<group>/<skill>/SKILL.md` is found too.
- `$CWD/.agents/skills`
- `$REPO_ROOT/.agents/skills`
- `$HOME/.agents/skills` — note `$HOME`, which is not `$CODEX_HOME`
- `/etc/codex/skills`

The `.agents/skills` scan walks **from the cwd upward** to the repo root. A
`sub/.agents/skills` directory *below* your cwd is not picked up — verified.

Symlinked skill directories resolve correctly; the locator reported to the model
is the real path, not the link.

Frontmatter keys accepted by 0.146.0: `name`, `description` (both required and
non-empty), plus optional `allowed-tools`, `model`, `version`, `license`,
`metadata`. Unknown keys are rejected outright, and `disable-model-invocation`
must be `false` if present. In a session: `/skills` to list, `$name` to invoke
explicitly, `/learn` to install from agentskill.sh.

Keep `skill_search` enabled (it is in the shipped config) so Codex finds skills by
search rather than only by frontmatter matching — it matters once you have more
than a handful.

## Inspecting what Codex can actually do

These need no auth and no tokens, and they beat any documentation:

```bash
codex debug models                 # full model catalog: reasoning levels,
                                   # context windows, modalities, tool modes
codex debug prompt-input "x"       # the exact context the model receives:
                                   # skills list, sub-agent instructions,
                                   # permissions block, AGENTS.md injection
codex sandbox -- <cmd>             # run a command under the real sandbox
codex features list                # every feature flag, stage, effective state
codex doctor --json                # machine-readable health report
```

`codex debug prompt-input` is the fastest way to answer "did Codex actually pick
up my skill / my AGENTS.md / this setting" — the answer is literally in the
payload. It is how every skill-discovery claim in this document was established.

## Extending reach

```bash
codex mcp list                        # MCP servers Codex can call
codex mcp add <name> -- <command>
codex plugin marketplace list
codex plugin add <name>
codex features list                   # every flag, its stage, and effective state
```

`codex features list` is the ground truth for what your build can do. Anything
marked `stable` but `false` is capability you are leaving on the table; anything
`under development` is not worth enabling for real work.

## Repo instructions

Codex reads `AGENTS.md` from the repo root and from every directory on the path to
a file it touches, with deeper files winning. Put build/test/lint commands and
conventions there — it is the highest-leverage, lowest-effort accuracy win, and it
applies to every Codex run without any flags.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Error loading config.toml: unknown configuration field X` | Key removed/renamed in your version. Check `reference/config.md`, then `codex doctor`. |
| A top-level key silently reparented under a table | TOML: every top-level scalar must appear **before** the first `[table]`. |
| `unknown configuration field tools.view_image` | Removed in 0.146.0. |
| `experimental_instructions_file` rejected | Renamed to `model_instructions_file`. |
| Runs feel shallow despite `xhigh` | `xhigh` is two rungs below the top. Use `max`, or `ultra` on sol/terra. Check the run header for the effective effort. |
| Long run dies on context overflow | `model_auto_compact_token_limit` set above the 272k window, so compaction never fired. |
| Sub-agents never spawn | `ultra` effort or `multi_agent_v2` not enabled; confirm with `codex debug prompt-input`, which shows the sub-agent instruction block when active. |
| Codex cannot reach the network | `sandbox_workspace_write.network_access = true` missing. |
| Stale answers about libraries/APIs | `web_search` still `cached`; `--search` does not exist on `exec`. |
| `--strict-config is not supported for codex features` | Use `codex exec --strict-config` to validate instead. |

Always read the run header Codex prints — it states the effective model, approval
policy, sandbox, network, and reasoning effort. It is the fastest way to confirm
max power actually took effect.

## References

- `reference/config.md` — every verified `config.toml` key and its allowed values
- `reference/cli.md` — full verified flag surface, plus the drift-check procedure

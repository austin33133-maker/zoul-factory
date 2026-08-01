#!/usr/bin/env bash
# Install the max-power Codex config and profiles, then validate them with Codex's
# own strict parser. Backs up anything it would overwrite.
#
#   setup-codex.sh [--dry-run] [--force]
#
# --dry-run  show what would change, write nothing
# --force    skip the "existing config differs" prompt

set -euo pipefail

DRY_RUN=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --force)   FORCE=1 ;;
    -h|--help) sed -n '2,9p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS="$SKILL_DIR/assets"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

say()  { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

step "Checking Codex"
command -v codex >/dev/null 2>&1 || die "codex not found on PATH. Install with: npm install -g @openai/codex"
say "$(codex --version)"
say "CODEX_HOME=$CODEX_HOME"

[ -f "$ASSETS/config.toml" ] || die "missing $ASSETS/config.toml"

step "Installing config"
if [ "$DRY_RUN" -eq 1 ]; then
  say "(dry run) would write:"
  say "  $CODEX_HOME/config.toml"
  for p in "$ASSETS"/*.config.toml; do
    [ -e "$p" ] && say "  $CODEX_HOME/$(basename "$p")"
  done
  if [ -f "$CODEX_HOME/config.toml" ]; then
    say ""
    say "diff (current -> new), config.toml:"
    diff -u "$CODEX_HOME/config.toml" "$ASSETS/config.toml" || true
  fi
  exit 0
fi

mkdir -p "$CODEX_HOME"

# Preserve the [projects."..."] trust tables Codex appends to its own config —
# losing them makes Codex re-prompt for workspace trust. Dedupe by header and keep
# the first occurrence: Codex can append a table it already wrote, and TOML rejects
# a duplicate table outright, which would break every subsequent run.
TRUST_BLOCK=""
BACKUP=""
if [ -f "$CODEX_HOME/config.toml" ]; then
  TRUST_BLOCK="$(awk '
    /^\[projects\./ {
      hdr = $0
      if (hdr in seen) { cur = ""; next }
      seen[hdr] = 1; order[++n] = hdr; cur = hdr; next
    }
    /^\[/ { cur = ""; next }
    cur != "" { buf[cur] = buf[cur] $0 "\n" }
    END { for (i = 1; i <= n; i++) printf "%s\n%s", order[i], buf[order[i]] }
  ' "$CODEX_HOME/config.toml")"

  if ! cmp -s "$CODEX_HOME/config.toml" "$ASSETS/config.toml" && [ "$FORCE" -eq 0 ]; then
    say "An existing $CODEX_HOME/config.toml differs from the one being installed."
    say "It will be backed up first. Re-run with --dry-run to see the diff."
    printf 'Continue? [y/N] '
    read -r reply
    case "$reply" in [yY]*) ;; *) die "aborted" ;; esac
  fi

  BACKUP="$CODEX_HOME/config.toml.bak.$(date +%Y%m%d-%H%M%S)"
  cp "$CODEX_HOME/config.toml" "$BACKUP"
  say "backed up existing config -> $BACKUP"
fi

cp "$ASSETS/config.toml" "$CODEX_HOME/config.toml"
say "wrote $CODEX_HOME/config.toml"

if [ -n "$TRUST_BLOCK" ]; then
  printf '\n%s\n' "$TRUST_BLOCK" >> "$CODEX_HOME/config.toml"
  say "preserved existing [projects.*] trust entries"
fi

for p in "$ASSETS"/*.config.toml; do
  [ -e "$p" ] || continue
  cp "$p" "$CODEX_HOME/$(basename "$p")"
  say "wrote $CODEX_HOME/$(basename "$p")"
done

step "Validating with Codex's strict parser"
# --strict-config rejects any key this build does not recognise, with file:line:col.
# A config that fails to parse breaks *every* codex run, so roll back rather than
# leaving the machine in that state.
rollback() {
  if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
    cp "$BACKUP" "$CODEX_HOME/config.toml"
    say "restored previous config from $BACKUP"
  else
    rm -f "$CODEX_HOME/config.toml"
    say "removed the config this script wrote (there was no previous one)"
  fi
}

out="$(codex exec --strict-config --skip-git-repo-check </dev/null 2>&1 || true)"
if printf '%s' "$out" | grep -q "Error loading config"; then
  printf '%s\n' "$out" >&2
  rollback
  die "config rejected by codex — see the key reported above"
fi
say "base config OK"

for p in "$ASSETS"/*.config.toml; do
  [ -e "$p" ] || continue
  name="$(basename "$p" .config.toml)"
  out="$(codex exec -p "$name" --strict-config --skip-git-repo-check </dev/null 2>&1 || true)"
  if printf '%s' "$out" | grep -q "Error loading config"; then
    printf '%s\n' "$out" >&2
    rm -f "$CODEX_HOME/$(basename "$p")"
    die "profile '$name' rejected by codex — profile removed, base config left in place"
  fi
  say "profile '$name' OK"
done

step "Effective settings"
printf 'hi\n' | codex exec --skip-git-repo-check 2>&1 \
  | sed -n '/^--------$/,/^--------$/p' | head -12 || true

step "Auth"
codex login status 2>&1 || say "not logged in — run: codex login"

step "Done"
say "Max power is now the default. Run:  codex exec --skip-git-repo-check \"<task>\""
say "Profiles:  codex exec -p fast \"<task>\"   |   codex exec -p audit \"<task>\""

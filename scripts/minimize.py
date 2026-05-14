#!/usr/bin/env python3
"""
Minimize a JS input that misbehaves under Hermes (crash or divergence
vs Node/V8) down to a tiny PoC.

Strategy: line-level delta debugging (cheap and good enough for typical
Hermes bugs). Drops every contiguous chunk it can while preserving the
"interesting" condition.

Interesting condition is configured by --check:
  asan      — Hermes prints AddressSanitizer / runtime error
  diverge   — Hermes stdout != Node stdout (on success-vs-success)
  crash     — Hermes returns non-zero AND Node returns zero
  custom:STR— Hermes stderr+stdout contains STR

Usage:
  HERMES_BIN=/path/to/hermes ./minimize.py --check asan input.js
"""
from __future__ import annotations
import argparse, os, subprocess, sys, tempfile, time
from pathlib import Path

HERMES_BIN = os.environ.get("HERMES_BIN", "hermes")
NODE_BIN = os.environ.get("NODE_BIN", "node")
TIMEOUT = float(os.environ.get("MINIMIZE_TIMEOUT", "8"))


def run(bin_: str, src: str) -> tuple[int, str, str]:
    try:
        if bin_ == NODE_BIN:
            p = subprocess.run([bin_, "-e", src], capture_output=True, text=True, timeout=TIMEOUT)
        else:
            with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
                f.write(src)
                path = f.name
            try:
                p = subprocess.run([bin_, path], capture_output=True, text=True, timeout=TIMEOUT)
            finally:
                try:
                    os.unlink(path)
                except OSError:
                    pass
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"


def interesting(src: str, mode: str) -> bool:
    h_rc, h_out, h_err = run(HERMES_BIN, src)
    if mode == "asan":
        return "AddressSanitizer" in h_err or "runtime error" in h_err
    if mode == "crash":
        v_rc, _, _ = run(NODE_BIN, src)
        return h_rc != 0 and v_rc == 0 and "SyntaxError" not in h_err
    if mode == "diverge":
        if h_rc != 0:
            return False
        v_rc, v_out, _ = run(NODE_BIN, src)
        return v_rc == 0 and h_out.rstrip() != v_out.rstrip()
    if mode.startswith("custom:"):
        needle = mode.split(":", 1)[1]
        return needle in (h_out + h_err)
    raise SystemExit(f"unknown check: {mode}")


def minimize(src: str, mode: str) -> str:
    if not interesting(src, mode):
        sys.exit("input is not interesting to begin with — wrong --check?")
    lines = src.splitlines(keepends=True)
    changed = True
    pass_no = 0
    while changed and len(lines) > 1:
        changed = False
        pass_no += 1
        chunk = max(1, len(lines) // 2)
        while chunk >= 1:
            i = 0
            while i + chunk <= len(lines):
                trial = lines[:i] + lines[i + chunk:]
                src_t = "".join(trial)
                if src_t.strip() and interesting(src_t, mode):
                    lines = trial
                    changed = True
                    sys.stderr.write(f"[pass {pass_no} chunk={chunk}] kept {len(lines)} lines\n")
                else:
                    i += chunk
            chunk //= 2
    return "".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--check", required=True, help="asan|crash|diverge|custom:STR")
    ap.add_argument("-o", "--output", default="poc.min.js")
    args = ap.parse_args()
    src = Path(args.input).read_text()
    t0 = time.time()
    out = minimize(src, args.check)
    Path(args.output).write_text(out)
    print(f"\nminimized {len(src)} -> {len(out)} bytes in {time.time()-t0:.1f}s")
    print(f"wrote {args.output}")
    print("--- minimized PoC ---")
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())

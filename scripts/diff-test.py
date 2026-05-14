#!/usr/bin/env python3
"""
Differential tester: run the same JS in Node (V8) and Hermes, diff output.

Any disagreement on a normal-looking input is a bug candidate. Crashes,
ASAN reports, or hangs are obviously interesting; silent output divergence
on a deterministic snippet is also worth a closer look (historically a
high-yield source of Hermes IR / typing bugs).

Usage:
    HERMES_BIN=/path/to/hermes ./diff-test.py corpus/
    HERMES_BIN=/path/to/hermes ./diff-test.py one.js
    ./diff-test.py --generate 1000 corpus/   # cheap structured generator
"""
from __future__ import annotations

import argparse
import os
import random
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

HERMES_BIN = os.environ.get("HERMES_BIN", "hermes")
NODE_BIN = os.environ.get("NODE_BIN", "node")
TIMEOUT = float(os.environ.get("DIFF_TIMEOUT", "5"))


def run(cmd: list[str], stdin: str = "") -> tuple[int, str, str, bool]:
    try:
        p = subprocess.run(
            cmd,
            input=stdin,
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
        )
        return p.returncode, p.stdout, p.stderr, False
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT", True


def run_hermes(js: str) -> tuple[int, str, str, bool]:
    # Hermes expects a path argument, not `-`. Write to a temp file.
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(js)
        path = f.name
    try:
        return run([HERMES_BIN, path])
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


NODE_SHIM = "var print=(...a)=>console.log(...a.map(x=>String(x)));"


def run_node(js: str) -> tuple[int, str, str, bool]:
    return run([NODE_BIN, "-e", NODE_SHIM + "\n" + js])


def normalize(stdout: str, stderr: str, rc: int) -> str:
    # We don't care about exact error messages, only the success-vs-error
    # shape and the normal output. Hermes and V8 phrase errors differently.
    if rc != 0:
        kind = "ERROR"
        for token in ("SyntaxError", "TypeError", "RangeError", "ReferenceError"):
            if token in stderr:
                kind = token
                break
        return f"<{kind}>"
    return stdout.rstrip()


def test_one(js: str, label: str) -> tuple[bool, str]:
    h_rc, h_out, h_err, h_to = run_hermes(js)
    v_rc, v_out, v_err, v_to = run_node(js)

    # Sanitizer reports = always interesting.
    asan = "AddressSanitizer" in h_err or "runtime error" in h_err
    if asan:
        return True, f"!! SANITIZER on {label}\n{h_err[-2000:]}"

    if h_to and not v_to:
        return True, f"?? HERMES TIMEOUT (v8 fine) on {label}"

    h_norm = normalize(h_out, h_err, h_rc)
    v_norm = normalize(v_out, v_err, v_rc)
    if h_norm != v_norm:
        return True, textwrap.dedent(
            f"""\
            ?? DIVERGENCE on {label}
            --- hermes (rc={h_rc}) ---
            {h_norm[:1000]}
            --- v8 (rc={v_rc}) ---
            {v_norm[:1000]}
            """
        )
    return False, ""


# --------- tiny structured fuzz generator ---------
SNIPPETS = [
    "function f(){{ {body} }}; print(f());",
    "var a=[]; for(var i=0;i<{n};i++) a.push(i*{m}); print(a.reduce((x,y)=>x+y,0));",
    "var o={{}}; Object.defineProperty(o,'x',{{get(){{return {expr};}}}}); print(o.x);",
    "var p=new Proxy({{}},{{get(t,k){{return {expr};}}}}); print(p.foo);",
    "var s=''; for(var i=0;i<{n};i++) s+=String.fromCharCode(65+i%26); print(s.length);",
    "function f(a,b,c){{ return [a,b,c]; }} print(f.apply(null,Array({n}).fill({m})));",
    "var x={expr}; print(typeof x, x|0, x>>>0);",
]
EXPRS = [
    "1+1", "0/0", "-0", "1/0", "(-1)>>>0", "2**32",
    "({}).toString.call({})",
    "Array(2**16).fill(1).length",
    "Number.MAX_SAFE_INTEGER+1",
]


def generate_corpus(n: int, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for i in range(n):
        tmpl = random.choice(SNIPPETS)
        js = tmpl.format(
            body=f"return {random.choice(EXPRS)};",
            n=random.choice([1, 8, 64, 4096]),
            m=random.choice([1, 3, 0.5, -1]),
            expr=random.choice(EXPRS),
        )
        (out / f"case_{i:05d}.js").write_text(js)


# --------- main ---------
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("target", nargs="?", help="file or directory of .js to test")
    ap.add_argument("--generate", type=int, metavar="N", help="emit N generated cases into target dir and exit")
    args = ap.parse_args()

    if args.generate:
        if not args.target:
            sys.exit("--generate requires a target directory")
        generate_corpus(args.generate, Path(args.target))
        print(f"wrote {args.generate} cases to {args.target}")
        return 0

    if not args.target:
        sys.exit("need a .js file or a directory")

    path = Path(args.target)
    files = sorted(path.rglob("*.js")) if path.is_dir() else [path]

    interesting = 0
    for f in files:
        js = f.read_text(errors="replace")
        hit, report = test_one(js, f.name)
        if hit:
            interesting += 1
            print(report)
    print(f"\n[done] {interesting}/{len(files)} interesting")
    return 0 if interesting == 0 else 2


if __name__ == "__main__":
    sys.exit(main())

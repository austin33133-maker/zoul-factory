# Hermes Bug Bounty Playbook

Hands-on workflow for hunting and reporting Hermes JS engine vulnerabilities
to Meta's bug bounty program.

---

## Program facts

| | |
|---|---|
| Submission entry | https://bugbounty.meta.com/ |
| Scope clause | All of `github.com/facebook/*` is in scope (covers `facebook/hermes`) |
| Min payout | $500 (any accepted bug) |
| Typical Hermes payout | $500 – $3,000 |
| Notable high payout | ~$12,000 (Hermes OOB read, 2022 "Quicksort to Doom" research) |
| Mobile RCE umbrella | Up to $300,000 — only if you chain to a real RN-app RCE |
| Out of scope | Pure DoS, crashes on 2+ year old OS, archived repos, third-party integrations |
| Disclosure | Coordinated, default 90 days |

**Note**: There is no `hackerone.com/hermes` for the JS engine. That HackerOne page belongs to Hermès the luxury brand — do not submit there.

---

## Workflow

### 0. Bootstrap (once)

```bash
./scripts/setup-hermes-research.sh
# exports HERMES_BIN, HERMESC_BIN, HBCDUMP_BIN
```

### 1. Pick a surface

Highest historical yield:

- **BCGen / IR optimization passes** (CVE-2022-40138, CVE-2023-30470) — write JS that confuses type inference vs. runtime value
- **HBC deserializer** — feed malformed `.hbc` blobs to `hbc_fuzz` harness
- **Builtins**: `Function.prototype.apply`, `Array.prototype.*`, `Proxy` traps, `RegExp`, `JSON`
- **GC corners**: finalizers, `WeakRef`, allocations inside getters
- **Hidden class / inline cache** invalidations via Proxy or prototype mutation

### 2. Generate inputs

```bash
# 1k structured JS samples for differential testing
./scripts/diff-test.py --generate 1000 corpus/

# Run them through both engines, surface divergences and ASAN reports
./scripts/diff-test.py corpus/
```

### 3. Fuzz the bytecode parser

```bash
# After setup-hermes-research.sh built the libs:
clang++ -std=c++17 -g -O1 -fsanitize=fuzzer,address,undefined \
  -I$HERMES_SRC/include -I$HERMES_SRC/external \
  harness/hbc_fuzz.cc $HERMES_BUILD/lib/libhermesvm.a -o hbc_fuzz

# Seed with a real compiled module to bypass header validation early
$HERMESC_BIN -emit-binary -out=corpus/seed.hbc /dev/stdin <<< 'print(1)'

./hbc_fuzz -max_len=65536 -dict=harness/hbc.dict corpus/
```

### 4. Triage a candidate

1. Minimize PoC (target: < 30 lines of JS or < 1 KB of HBC)
2. Reproduce on a clean Hermes build at `origin/main` HEAD
3. `git bisect` to find the introducing commit (helps Meta a lot, often bumps the bounty)
4. Classify impact honestly:
   - DoS only → **likely rejected**
   - Out-of-bounds read of attacker-chosen offsets → low-mid
   - Out-of-bounds write / UAF / type confusion with controlled object → mid
   - Demonstrated RIP control or arbitrary read/write primitive → high
   - Chained into an RN app loading attacker-controlled JS / OTA bytecode → **Mobile RCE category**

### 5. Submit

Use the template in `SUBMISSION_TEMPLATE.md`. Attach:

- The minimized PoC file (`poc.js` or `poc.hbc`)
- ASAN report (full stack frames, not just the summary line)
- Hermes commit SHA you reproduced on
- Build flags used
- `git bisect log` output
- (Optional) suggested patch as a unified diff

---

## What Meta will downgrade or reject

- Requires `eval(attackerString)` to trigger → expected, not a bug unless the engine has a guarantee otherwise
- Requires a debug-only build path → not in scope
- Requires running with `-O0` or unusual flags only
- Reproduces only on a build older than the current `main`
- Triggers only on `hermesc` (the compiler, not the runtime) with attacker JS source, since shipped apps run pre-compiled bytecode — **report it anyway** but expect a smaller payout unless you can show an RN app accepting source at runtime

---

## Submission template (copy this into the BBP form)

```
Title: <component>: <one-line impact> in Hermes <short SHA>

Summary
-------
<2-3 sentences: where, what kind of bug, what an attacker gains>

Affected
--------
Repo     : facebook/hermes
Commit   : <full SHA you tested>
Branch   : main
Builds   : Debug + ASAN, also reproduces on Release
Platform : Linux x86_64 / macOS arm64 / Android arm64 / ...

Proof of concept
----------------
<paste minimized PoC; attach poc.js / poc.hbc as a file too>

Reproduction
------------
1. Build Hermes at <SHA> with: <cmake flags>
2. Run:  $HERMES_BIN poc.js
3. Observe ASAN report (attached) — write of size 8 at heap-buffer-overflow

Root cause (best guess)
-----------------------
<file:line, what assumption is violated, why the existing bounds check
is insufficient>

Impact
------
<DoS / OOB read / OOB write / UAF / type confusion / arbitrary R-W /
RCE>. <Honest statement about what is and is not demonstrated.>

Suggested patch
---------------
<unified diff if you have one, otherwise a short description>

git bisect
----------
<bisect log narrowing to the introducing commit>

Disclosure timeline
-------------------
Discovered : YYYY-MM-DD
Reporting  : YYYY-MM-DD
Default 90-day coordinated disclosure unless agreed otherwise.
```

---

## Useful reading

- Engineering at Meta — "Using Hermes's Quicksort to run Doom" (2022)
- Past Hermes CVEs cataloged in `HERMES_VULNERABILITIES.md`
- Hermes source: https://github.com/facebook/hermes
- Meta payout guidelines: https://bugbounty.meta.com/payout-guidelines/
- Meta scope: https://bugbounty.meta.com/scope/

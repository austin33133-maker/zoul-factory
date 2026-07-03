---
name: commit-helper
description: Stage related changes and write a well-formed commit message. Use when the user asks to commit work or says /commit-helper.
---

# Commit Helper

Create a clean, well-scoped git commit from the current working tree.

## Steps

1. Run `git status` and `git diff` to see what changed.
2. Group the changes: if the diff contains unrelated changes, propose
   splitting them into separate commits instead of one mixed commit.
3. Stage the files for the current logical change (`git add <files>`,
   never `git add -A` blindly).
4. Write the commit message:
   - Subject line: imperative mood, ≤ 72 chars, says WHAT changed.
   - Body (optional): WHY the change was made, not a restatement of the diff.
5. Commit and show the result with `git log -1 --stat`.

## Rules

- Never commit files that look like secrets (.env, credentials, keys).
- Never amend or force-push unless explicitly asked.
- If there is nothing to commit, say so and stop.

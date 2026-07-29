# PR Demo — Snyk Checks on a Pull Request

The highest-impact demo in this repo. Instead of scanning a repo that is already
broken, you watch Snyk block a developer from merging new risk.

## Why this beats a plain repo scan

Scanning a vulnerable repo produces a **backlog**. Every finding is someone
else's problem from months ago, and the honest reaction is "we know, it's on the
list."

Scanning this PR produces a **decision**. The diff is small, the author is in the
room, and every finding is new. That's the moment security tooling either works
or doesn't, and it's the one worth showing.

## Setup

Two branches, both already built and verified:

| Branch | State |
|---|---|
| `v-one` | Secure baseline — 0 findings across all four products |
| `v-two` | Same app, vulnerabilities introduced |

**Step 1 — establish the clean baseline.**

```bash
git checkout main && git merge v-one
```

```bash
git push origin main
```

`main` is now clean. Worth pausing here to run the scans and show four zeros —
it makes the contrast land later.

**Step 2 — push the vulnerable branch.**

```bash
git push origin v-two
```

**Step 3 — open the PR.**

```bash
gh pr create --base main --head v-two --title "Add sharing, backups and link previews" --body "Adds shareable note links, an export/backup endpoint, link previews for notes, and login. Also wires up the infra for attachments."
```

Note the PR title and description describe **features**, not vulnerabilities.
That's deliberate. This is what the PR would actually look like if a developer
built these features carelessly — nobody writes "adds SQL injection."

## What Snyk reports on the PR

Roughly, relative to the clean `main`:

| Product | Newly introduced |
|---|---|
| Open Source | 143 issues — 7 critical, 59 high |
| Code | 16 findings across 15 rule types |
| IaC | 38 issues — 9 high, 16 medium, 13 low |
| Container | 546 base-image vulns — 9 critical, 77 high |

Every one is attributed to this PR, because the baseline had none.

## Running the demo

**Open with the diff, not the findings.** Show the changed files first. Ask the
room to spot the problem. Most people won't find the `jwt.decode()` or the
`_.merge(todo, req.body)` — they read as ordinary code. Then let the checks
answer.

**Walk the four checks in the order a reviewer would care about:**

1. **Code** — "this PR introduces a SQL injection and an XSS." Their code, their
   PR, their name on it.
2. **Open Source** — "and it pins seven packages with known criticals."
3. **Container** — "and moves the base image back to an EOL Node."
4. **IaC** — "and makes the database public, which is what turns finding 1 into
   an incident."

**Land the chain.** The single strongest point: finding #1 (SQL injection) and
finding #4 (publicly accessible RDS) are individually arguable and jointly a
breach. One tool that sees both is worth more than two tools that each see one.

**Close on the counterfactual.** This PR would have passed a human code review.
It's well-structured, commented, and the features work. That's the argument for
automated gates — not that developers are careless, but that this class of bug
is invisible at review speed.

## The four-line diff worth highlighting

If you only show one thing, show the search handler:

```js
// main (v-one)
const sql = 'SELECT id, title, notes, done FROM todos WHERE title LIKE $1'
const result = await pool.query(sql, [`%${q}%`])

// PR (v-two)
const sql = "SELECT id, title, notes, done FROM todos WHERE title LIKE '%" + q + "%'"
const result = await pool.query(sql)
```

Two lines. Reads like a refactor. It's a critical vulnerability, and Snyk Code
traces `req.query.q` to the sink in the PR comment.

## Honest notes

- **The vulnerable code is labeled.** Every finding on `v-two` has a
  `DEMO VULN` comment. If you want the room to genuinely hunt, strip the
  comments first: `grep -rl "DEMO VULN" . | xargs sed -i '' '/DEMO VULN/d'`
- **Snyk PR checks need the repo imported** into Snyk with the GitHub (or GitLab
  / Bitbucket / Azure) integration, and PR checks enabled for the target. The
  CLI scans in this repo work standalone; the PR comments do not.
- **Two `v-one` findings needed restructuring, not just fixing.** The open
  redirect and SSRF stayed flagged even with an allow-list check, because the
  tainted value still reached the sink. They only cleared once the code selected
  a *literal* URL via `switch`. That's a genuinely useful teaching point about
  how taint analysis works — validation isn't sanitization if the tainted value
  is still what you pass through.
- **Container findings are base-image inherited**, so they'll show up as
  pre-existing if `main` also used `node:14`. It doesn't — `v-one` moves to
  `node:22-alpine` (0 vulns), which is what makes the regression visible.

# Snyk Open Source — Talk Track

**Scanned:** [package.json](../package.json) (web) and [server/package.json](../server/package.json) (API)
**Verified:** 58 unique issues in web, 85 in the API.

```bash
snyk test
```

```bash
snyk test --all-projects
```

## The story

Two manifests, one repo. That's the normal shape of a modern app, and it's the
first point worth making: the developer who wrote the React code never touched
`server/package.json`, but they ship both.

## What to show, in order

### 1. `marked@0.3.6` — the dependency that becomes a real bug

This is the one to lead with, because it connects to the XSS you'll show in the
Snyk Code section.

- **Cross-site Scripting** — fixed in 0.3.7
- **ReDoS** (CVE-2017-16114) — fixed in 0.3.9
- **ReDoS** (CVE-2018-25110) — fixed in 0.3.18

> "This isn't theoretical. In a minute I'll paste a link into the browser and
> pop an alert, and the reason it works is this line in your manifest."

### 2. `axios@0.21.1` — the transitive-risk story

Two criticals and nine highs in one package:

- **HTTP Response Splitting** (CVE-2026-42035) — critical, fixed in 0.31.1 / 1.15.1
- **Prototype Pollution** (CVE-2026-42033) — critical, fixed in 0.31.1 / 1.15.1
- **SSRF** (CVE-2026-44492) — high, fixed in 0.32.0 / 1.16.0

The point: this package was pinned once and forgotten. The CVE identifiers run
from 2021 to 2026 — the code never changed, but its risk profile did. Static
review at commit time would never have caught this.

> "Nobody introduced a bug here. The bug arrived after the fact. That's why
> this has to run continuously, not once at code review."

### 3. `lodash@4.17.15` — reachability

Five high-severity issues including **Code Injection** (CVE-2021-23337) and
three separate **Prototype Pollution** flaws.

Now open [server/routes/todos.js](../server/routes/todos.js) and look at the
`PATCH` handler:

```js
_.merge(todo, req.body)
```

Unfiltered request body merged with a vulnerable `lodash`. That's the prototype
pollution advisory with a live route attached to it. This is the moment to talk
about prioritizing by reachability rather than by CVSS alone.

### 4. `handlebars@4.7.6` — three criticals in the API

Three **Type Confusion** criticals, all fixed in 4.7.9. A patch-level bump
clears all three. Good setup for the fix-PR conversation.

## Fix path

```bash
snyk test --severity-threshold=high
```

Most of these are one-line bumps: `marked` 0.3.6 → 0.3.18, `handlebars` 4.7.6 →
4.7.9, `lodash` 4.17.15 → 4.17.21. `axios` 0.21.1 → 1.x is the one real
breaking change, which is a useful honest note — Snyk tells you which upgrades
are safe and which need work.

## Prompts to surface more

Paste these into Claude Code in this repo.

```
Run snyk test on both package.json files, then group the results by whether each vulnerable package is actually imported anywhere in src/ or server/. Tell me which ones are reachable and which are dead weight.
```

```
Add a dependency with a known critical CVE that this app would plausibly use for date handling or templating, wire it into a real code path in server/, then run snyk test and show me the new finding.
```

```
For every high or critical in snyk test, check whether the fix is a patch, minor, or major bump. Give me the subset I can upgrade with zero breaking changes, and apply those.
```

```
Are any vulnerable transitive dependencies here reachable only through devDependencies? Show me how that changes the risk assessment.
```

## Likely objections

**"We already run `npm audit`."** Run both. `npm audit` has no reachability
context, no fix prioritization, and no view of the `marked` → XSS chain you're
about to demo. Also point out that `npm audit` reports on this repo too — the
install printed 9 and 13 vulnerabilities. Snyk found 58 and 85.

**"Most of these are low severity."** Agreed, and that's the argument for
prioritization rather than for ignoring the tool. Filter to
`--severity-threshold=high` and the list becomes actionable.

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

## License compliance

Snyk Open Source is two products in one: known vulnerabilities *and* license
obligations. The second half is the one most demos skip, and it's often the one
that gets legal into the room.

```bash
snyk test
```

Two license issues on this branch, both from packages a developer would add
without a second thought:

| Severity | Package | License | Why it's flagged |
|---|---|---|---|
| **High** | `pngquant-bin@9.0.0` | GPL-3.0 | Strong copyleft — distributing linked code can oblige you to release your own source under GPL |
| **Medium** | `ical.js@1.5.0` | MPL-2.0 | Weak copyleft — source-disclosure obligations for modified files |

### How to tell the story

Open [src/calendar.js](../src/calendar.js). It's a genuinely useful feature —
export your todos as an `.ics` file — and `ical.js` is the obvious library for
it. Nothing about that decision looks like a risk.

> "Nobody involved did anything wrong. A developer needed calendar export,
> picked the standard library, and shipped it. But if your product is
> proprietary, someone in legal needs to know MPL-2.0 is now in your dependency
> tree — and they'll find out at diligence, not at code review."

Then contrast with `pngquant-bin`: added for image compression, GPL-3.0, and
scored **high**. Same casual decision, materially worse obligation.

### The severity comes from policy, not from Snyk

Worth saying out loud, because it pre-empts the obvious objection. These
severities are **your org's license policy**, not a Snyk opinion. The policy
scoring these findings has AGPL-1.0/3.0, GPL-2.0/3.0, CPOL-1.02 and SimPL-2.0 at
**high**, and Artistic, CDDL, EPL, LGPL and MPL at **medium**.

That's configurable per organization. A company that ships GPL software itself
would score these differently, and that's the correct behaviour — license risk
is a legal posture, not a technical fact.

### Two things to know before you demo this

- **License issues need a license policy configured** in the Snyk org (Settings
  → License policies). An org with no policy reports zero license issues no
  matter what's in the manifest. If your demo tenant shows nothing here, that's
  the reason — not a scanning failure.
- **`snyk test` scans production dependencies by default.** A copyleft package in
  `devDependencies` won't appear unless you pass `--dev`. That's a fair
  discussion point in its own right: build-time-only copyleft usually carries
  much weaker obligations than shipped code, so the default is arguably right.

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

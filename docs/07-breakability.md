# Breakability — Talk Track

**Scanned:** [package.json](../package.json), [server/package.json](../server/package.json),
[service/pom.xml](../service/pom.xml)

Every other talk track in this repo answers *"what's broken?"*. This one answers
the question the developer actually asks next: **"if I take the fix, what breaks?"**

## The story

Snyk tells you `lodash` has a critical. Fine. The developer's real blocker isn't
finding the CVE — it's not knowing whether the upgrade costs ten seconds or two
weeks. So the ticket ages, and the CVE ages with it.

Breakability scores the *upgrade*, not the vulnerability. Snyk reads the
changelog, release notes and API surface between your version and the fixed
version, and returns **Low / Medium / High** with the reasoning attached.

The counter-intuitive part is the part worth demoing: **semver does not predict
risk.** This repo has a major bump that's Low and a minor bump that's High.

> "You're not arguing about whether the CVE is real. You're arguing about
> whether anyone has time to fix it. This is the number that ends that
> argument."

## The five scenarios, live in this repo

Each row is a real dependency in this repo, and each rating below was produced
by running the check — not estimated.

| # | Package | Upgrade | Bump | Risk | Why |
|---|---|---|---|---|---|
| 1 | `ws` | 8.17.0 → 8.17.1 | patch | **Low** | Changelog is the security fix and nothing else |
| 2 | `y18n` | 3.2.1 → 4.0.3 | **major** | **Low** | Only breaking change is dropping Node 0.10/0.12 (EOL 2016) |
| 3 | `xmlhttprequest-ssl` | 1.5.5 → 1.6.1 | minor | **Medium** | Thin changelog + a silent behaviour change; Snyk won't vouch for it |
| 4 | `lodash` | 3.10.1 → 4.17.21 | major | **High** | `.pluck` removed — must be rewritten as `.map` |
| 5 | `spring-core` | 5.3.18 → 6.0.0 | major | **High** | Requires Java 17, dropping Java 11 (active LTS) — breaks the build itself |

Bonus row, already in the repo before this branch:

| # | Package | Upgrade | Bump | Risk | Why |
|---|---|---|---|---|---|
| 6 | `marked` | 0.3.6 → 0.3.9 | **patch** | **Medium** | The XSS fix changes how HTML entities unescape — rendered output can shift |

Rows 2, 4 and 6 are the ones that land. Two of them break the semver intuition
in opposite directions.

## What to show, in order

### 1. Start with the boring one — `ws` (Low)

```
Check the breakability of upgrading ws from 8.17.0 to 8.17.1
```

> "Patch bump, changelog is one security fix, no API change. Snyk says Low.
> This one should never have been a ticket — it should have been a merged PR."

This sets the baseline so the interesting rows have something to contrast with.

### 2. Break the semver assumption — `y18n` 3.x → 4.x (Low)

```
Check the breakability of upgrading y18n from 3.2.1 to 4.0.3
```

A **major** version bump that scores **Low**. The only breaking change in 4.0.0
is dropping Node.js 0.10 and 0.12 — EOL since 2016. The API is untouched.

> "Every change-advisory board in the world treats a major bump as a project.
> Here's a major bump that is objectively safer than some of your patches. If
> you're triaging by version number, you're guessing."

Worth noting honestly: Snyk's *minimum* fix for this CVE is 3.2.2. The 4.x path
is what you'd take if you wanted to stop revisiting this package — and
breakability is what tells you that's affordable.

### 3. The one that needs a human — `xmlhttprequest-ssl` (Medium)

```
Check the breakability of upgrading xmlhttprequest-ssl from 1.5.5 to 1.6.1
```

Minor bump, no meaningful changelog. What actually changed: the library stopped
*disabling* TLS certificate validation. Correct, and also capable of breaking
every webhook you have pointed at a self-signed cert.

> "Medium doesn't mean 'probably fine'. It means Snyk can't prove it's fine and
> is refusing to guess. That's the honest answer, and it's the one you want
> — an over-confident tool is worse than no tool."

This is the row that earns credibility with a sceptical engineer.

### 4. The one that costs real work — `lodash` 3 → 4 (High)

```
Check the breakability of upgrading lodash from 3.10.1 to 4.17.21
```

Snyk names the exact problem: `.pluck` was removed and must become `.map`.

Now open [src/stats.js](../src/stats.js) — the file is built out of the functions
lodash 4 deleted:

```js
const titles = _.pluck(todos, 'title')     // removed in v4
const hasUrgent = _.contains(tags, 'urgent') // renamed to _.includes
return _.findWhere(todos, { title })        // removed in v4
```

You can prove the break on stage in one command, because the repo has both
majors installed — lodash 3 in the web app, lodash 4 in the API:

```bash
node -e "console.log('v3:', typeof require('./node_modules/lodash').pluck, '| v4:', typeof require('./server/node_modules/lodash').pluck)"
```

Prints `v3: function | v4: undefined`. The upgrade isn't risky in theory — this
app stops running.

> "This is the one you schedule. And notice what Snyk gave you: not 'high risk,
> good luck', but the specific function and its replacement. That's the
> difference between a warning and a work item."

### 5. The one that breaks the build, not the code — `spring-core` 5 → 6 (High)

```
Check the breakability of upgrading org.springframework:spring-core from 5.3.18 to 6.0.0
```

Spring Framework 6 raises the floor to **Java 17** and moves `javax.*` to
`jakarta.*`. [service/pom.xml](../service/pom.xml) targets **Java 11** — an
active LTS that plenty of enterprise pipelines are standardised on — and
[ReportController.java](../service/src/main/java/io/snyk/demo/reporting/ReportController.java)
imports `javax.servlet.http.HttpServletRequest`.

So the fix doesn't just change code. It changes the JDK, the servlet namespace,
and the container (Tomcat 10+), all at once.

> "This is the category people mean when they say 'we can't patch'. They're not
> being lazy — the upgrade genuinely requires a platform migration. Snyk saying
> High up front is what lets you plan it instead of discovering it in a failed
> build at 4pm on a Friday."

### 6. Optional closer — `marked` patch that isn't safe (Medium)

```
Check the breakability of upgrading marked from 0.3.6 to 0.3.9
```

A **patch** bump scored **Medium**, because the XSS fix changes how HTML
character entities unescape — rendered output can change. Pair it with row 2 and
the point makes itself: the version number told you nothing in either direction.

## The payoff line

> "Snyk gave you five upgrades. Two are Low — merge them today, don't even read
> the diff. One is Medium — someone spends an hour. Two are High, and you now
> know *why* and *what to change* before you commit anyone's sprint to it.
> That's a backlog turned into a plan."

## Prompts to surface more

```
For every high and critical in this repo, run a breakability check on the recommended fix version and sort the results into "merge now", "needs review" and "needs planning".
```

```
Which upgrades in this repo are safe despite being major version bumps? Show me the changelog evidence for each.
```

```
Find every upgrade in this repo where the version bump looks small but the breakability score is medium or high, and explain what changed.
```

```
Check the breakability of upgrading lodash to 4.17.21, then show me exactly which lines in src/ would stop working and write the replacement code.
```

## Likely objections

**"We just read the changelog ourselves."** For one package, sure. This repo has
176 issues across two npm manifests. Reading changelogs for each fix path is a
day of work that produces the number Snyk already has — and half these packages
don't have a usable changelog, which is precisely what a Medium is telling you.

**"How does it know?"** It reads release notes, changelogs and the diff in the
public API surface between the two versions. When the evidence is thin it says
Medium rather than inventing confidence — see `xmlhttprequest-ssl` above, where
the honest answer was "there's a behaviour change here nobody documented".

**"Low doesn't mean zero risk."** Correct, and Snyk doesn't claim it does. Low
means no breaking change is documented or detectable in the API surface. You
still run your tests. The value is triage: you stop spending equal review effort
on all 176 findings.

**"Our policy is no major versions outside a release window."** That's the policy
this data is meant to challenge. `y18n` 3 → 4 is a major that changes nothing you
use; `marked` 0.3.6 → 0.3.9 is a patch that changes rendered output. A policy
keyed on the version number is protecting you from the wrong things.

## Caveats

- **The Maven module needs Maven installed to scan locally.** `snyk test` shells
  out to `mvn dependency:tree`, so on a machine without Maven the `service/`
  scan fails with `Child process failed`. Snyk's Git/PR integration parses
  `pom.xml` server-side and is unaffected — so the PR demo works either way.
  For local scanning: `brew install maven`.
- **Breakability is advisory, not a test suite.** It reads what maintainers
  published. A library that breaks you without documenting it is still going to
  break you — that's what the Medium rating exists to flag.
- **Ratings can move.** They're derived from published changelog data, which gets
  amended. Re-run the checks before a high-stakes demo; the commands are all in
  this doc.

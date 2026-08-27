# Pipeline Gates — Talk Track

**Files:** [.github/workflows/snyk-gate.yml](../.github/workflows/snyk-gate.yml),
[.github/workflows/snyk-delta-gate.yml](../.github/workflows/snyk-delta-gate.yml),
[.github/scripts/snyk-delta.mjs](../.github/scripts/snyk-delta.mjs)

The PR demo ([06-pr-demo.md](06-pr-demo.md)) shows Snyk *commenting* on a pull
request. This one shows Snyk *stopping a deployment*. Different audience: the PR
demo sells to developers, this sells to whoever owns the release process.

## The story

Everything else in this repo is advisory. A PR comment is a suggestion — a
developer with a deadline can merge over it. The question a security lead
actually has is: **"what physically prevents this from reaching production?"**

The answer is a job that doesn't run. Both pipelines here end in a `deploy` job
that depends on the scan jobs, so when a gate goes red the deploy is **skipped**,
not failed-and-retried. Nothing ships.

> "I can't stop someone from writing this code. I can stop it from reaching
> your customers."

## Two policies, because there are two objections

Teams reject gating for two opposite reasons, so there are two workflows.

| | **Snyk Gate** | **Snyk Delta Gate** |
|---|---|---|
| File | `snyk-gate.yml` | `snyk-delta-gate.yml` |
| Blocks on | Any critical (tunable) | Only issues the branch *adds* |
| Answers | "We need a hard floor" | "We can't fix 176 things first" |
| Baseline | None — absolute threshold | The target branch |
| Trigger | push to `main`, manual | PR (automatic), manual |

Show whichever matches the objection you actually heard. If you have time, show
both — the contrast is the point.

## Demo 1 — the absolute gate

Four products run in parallel, then `deploy`. It runs on every push to `main`,
and manually on any ref — which is how you'll drive it live.

```bash
gh workflow run "Snyk Gate" --ref main -f severity=critical
```

```bash
gh run watch
```

What the audience sees: four gates, some red, and **Deploy → skipped**. The run
summary renders a table of results and, for each product, what it found.

The severity is a `workflow_dispatch` input, which makes the most useful part of
this demo interactive. Run it at `critical`, then re-run at `high`, and more
gates turn red. That dial *is* the policy conversation:

```bash
gh workflow run "Snyk Gate" --ref main -f severity=high
```

> "This number is the only real decision here. Set it too strict on day one and
> your developers will disable the whole thing by Friday. Start at critical,
> ratchet down once the backlog is under control."

Worth calling out that the gate is per-product, so a team can be strict on
container and lenient on IaC while they clean up. Security policy is rarely one
number for everything.

## Demo 2 — the delta gate (the one that wins arguments)

This is the answer to the objection you will *always* get: *"we have a backlog of
176 issues, if you gate on that nothing ever ships again."* Correct. So don't.

The delta gate scans the branch **and** the target branch, then blocks only on
what the branch newly introduced. It runs on any PR automatically.

The [breakability PR](https://github.com/juanchavez-snyk/React-Vite-ToDo/pull/14)
is a ready-made demo, because it adds exactly five vulnerable packages on top of
`main`:

```bash
gh workflow run "Snyk Delta Gate" --ref jchavez/breakability-demo -f base_ref=main -f severity=medium
```

The summary reads roughly:

| | Count |
|---|---|
| Baseline (allowed backlog) | 176 |
| This branch | ~200 |
| **Newly introduced** | **the new packages** |

> "The 176 issues you already have did not block this build. The ones this
> developer added ten minutes ago did. Nobody has to fix history to start being
> accountable for the present."

That reframing is usually what unblocks the whole rollout.

### How the delta is computed

[snyk-delta.mjs](../.github/scripts/snyk-delta.mjs) diffs two Snyk JSON files on
a stable key per product:

- **Open Source** — advisory ID + package + manifest. Deliberately *not* the
  version, so a version bump that keeps the same advisory is still the same
  finding, not a new one.
- **Code** — rule ID + file path, with **no line number**. This matters: if line
  numbers were in the key, adding an import at the top of a file would resurface
  every finding below it as "newly introduced" and the gate would cry wolf.
- **IaC** — issue ID + target file + resource path.
- **Container** — only runs when the Dockerfile or a manifest actually changed.
  Otherwise the base image is identical and the delta is zero by definition, so
  the job skips instead of burning two image builds.

## Setup — one secret, and it has to be you

The pipelines need a `SNYK_TOKEN` repo secret. Get the value from
[app.snyk.io](https://app.snyk.io) → Account settings → Auth Token, then:

```bash
gh secret set SNYK_TOKEN
```

That command prompts for the value and doesn't echo it or leave it in shell
history. Until the secret exists, both workflows fail fast in a `preflight` job
with an explicit message rather than four confusing auth errors.

Two org-level prerequisites, worth checking before you present:

- **Snyk Code must be enabled** for the org, or the SAST jobs exit 2. The
  workflow reports that distinctly ("is Snyk Code enabled?") instead of
  reporting it as "no issues found".
- **A scan that errors never counts as a pass.** Snyk exits 0 for clean, 1 for
  issues found, and 2+ for a real failure. Both workflows treat 2+ as a broken
  build. This is the single most important line in the pipeline: a gate that
  turns green when the scanner crashes is worse than no gate, because everyone
  believes it.

## Prompts to surface more

```
Run the Snyk Gate workflow at critical, then at high, and show me which products change from pass to fail. Explain what that implies about where this team should set its initial policy.
```

```
The delta gate passed but the absolute gate failed on the same commit. Explain to a security lead why both results are correct.
```

```
Add a job to the gate workflow that posts the blocked findings as a PR comment, so the developer sees why the deploy was skipped without opening the Actions tab.
```

```
Modify the delta gate so it also fails when a dependency's fix is available and the breakability score is low — the "you had no excuse" policy.
```

## Likely objections

**"Developers will just disable it."** They will, if you gate on the whole
backlog on day one. That's what the delta gate is for: it makes the gate's
demands proportional to what the developer actually did. Also point at the
`severity` input — the policy is a dial, not a switch.

**"This slows every build down."** The four scans run in parallel, and only the
container job builds an image. The delta gate costs roughly double on the scan
step because it scans the baseline too — that's the price of not blocking on
history, and it's cheaper than the alternative of not gating.

**"We already scan in the IDE and on the PR."** Those are advisory. This is the
one a developer can't click past. Defence in depth: the IDE catches it earliest
and cheapest, the PR catches it during review, and the pipeline is what you can
show an auditor.

**"Our deploy isn't in GitHub Actions."** The gate logic is
`snyk test --severity-threshold=X` plus an exit code, which is portable to any
CI system. The delta script is plain Node reading Snyk JSON — no Actions
dependency. Only the YAML around it is GitHub-specific.

## Caveats

- **The `deploy` jobs are simulated.** They echo a `docker push` and a
  `kubectl apply` rather than deploying anything. Don't imply otherwise; the
  demo is the *gate*, not the deployment.
- **First run needs the secret.** See setup above.
- **The delta gate compares against the target branch as it is right now.** If
  `main` moves while a PR is open, the baseline moves with it. That's usually
  what you want, but it means two runs of the same PR can differ.
- **Code delta ignores line numbers by design.** The trade-off is that a genuinely
  new finding of the *same rule in the same file* won't be counted as new. Worth
  knowing before someone asks; it's the right trade for a gate, because the
  alternative is constant false positives.

# Pipeline — Talk Track

**File:** [.github/workflows/snyk.yml](../.github/workflows/snyk.yml)

The PR demo ([06-pr-demo.md](06-pr-demo.md)) shows Snyk *commenting* on a pull
request. This one shows Snyk *failing a build*. Different audience: the PR demo
sells to developers, this sells to whoever owns the release process.

## Ground rule for this demo

Everything in this workflow is Snyk's published GitHub Actions usage. No wrapper
scripts, no result parsing, no bespoke gating logic. That is deliberate: if you
demo something you built yourself, you own it, you maintain it, and the customer
reasonably expects Snyk to support it. Every step here maps to a documented
example:

- [github.com/snyk/actions](https://github.com/snyk/actions) — the Actions and their properties
- [GitHub actions for Snyk setup and checking for vulnerabilities](https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities)
- [Snyk test and snyk monitor in CI/CD integration](https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/snyk-ci-cd-integration-deployment-and-strategies/snyk-test-and-snyk-monitor-in-ci-cd-integration)

If a customer asks for behaviour that isn't in those pages, that's a scoping
conversation, not something to improvise in a demo repo.

## What the workflow runs

| Job | Action | Command |
|---|---|---|
| Snyk Open Source | `snyk/actions/node@master` | `snyk test --all-projects --severity-threshold=high` |
| Snyk Code | `snyk/actions/setup@master` + CLI | `snyk code test --severity-threshold=high` |
| Snyk IaC | `snyk/actions/iac@master` | `snyk iac test infra/ --severity-threshold=high` |
| Snyk Container | `snyk/actions/docker@master` | `snyk container test snyky --file=Dockerfile` |
| Snyk Monitor | `snyk/actions/node@master` | `snyk monitor --all-projects` (default branch only) |

Two details worth knowing before you present:

**There is no `snyk/actions/code`.** Snyk Code in GitHub Actions is documented as
the Setup action to install the CLI, then `snyk code test`. If someone asks why
that job looks different from the others, that's the answer.

**`snyk test` gates, `snyk monitor` doesn't.** `snyk test` is synchronous and
exits non-zero when it finds issues at or above the threshold — that exit code is
what fails the job. `snyk monitor` is asynchronous: it posts a snapshot to the
Snyk UI so you get alerted when a new CVE lands against code you already shipped.
It doesn't gate anything, so it runs on `main` only, not on every PR.

## The story

A PR comment is a suggestion — a developer with a deadline can merge over it. The
question a security lead actually has is: **"what physically prevents this from
reaching production?"**

Two answers, and it's worth being precise about which layer does which:

1. **The job goes red.** `snyk test --severity-threshold=high` exits non-zero.
   That's Snyk's doing.
2. **The merge is blocked.** Branch protection on `main` with these checks marked
   required. That's a GitHub setting you turn on once — not pipeline code.

> "Snyk tells you it's not safe. Your branch protection rules are what make that
> answer binding. Don't buy a scanner and then let people merge past it."

## Demo

Push a branch, or open a PR, and watch the checks. The four scan jobs run in
parallel; on this repo Open Source, Code, Container and IaC all go red, because
the app is intentionally vulnerable.

```bash
gh run watch
```

The severity threshold is the policy conversation. Change `--severity-threshold`
in the workflow from `high` to `critical` and fewer jobs turn red:

> "This threshold is the only real decision here. Set it too strict on day one
> and your developers will disable the whole thing by Friday. Start where your
> backlog lets you ship, then ratchet down."

It's per-job, so a team can be strict on container and lenient on IaC while they
clean up. Security policy is rarely one number for everything.

## "We have a backlog of 176 issues — gating means nothing ever ships"

You will get this objection every time, and it's a fair one. **Do not solve it
with CI scripting.** Snyk's answer is
[Pull Request checks](https://docs.snyk.io/scan-fix-and-prevent/prevent/pull-request-checks),
in the GitHub integration rather than in this workflow.

PR Checks run live tests of the "before and after" branch and **fail only if the
new branch has more issues**. That before/after comparison is product behaviour —
Snyk builds it, Snyk supports it, and nobody in the room has to maintain it.

> "Your existing 176 issues don't block anything. What this developer added ten
> minutes ago does. Nobody has to fix history to start being accountable for the
> present."

Configure the fail conditions in the Snyk UI — including *only fail when a fix is
available* and *only fail when the PR adds a dependency with issues*. See
[Configure Pull Request checks](https://docs.snyk.io/scan-fix-and-prevent/prevent/pull-request-checks/configure-pull-request-checks).

So the layering you're actually selling is:

| Layer | Blocks on | Owned by |
|---|---|---|
| PR Checks | Issues the PR introduces | Snyk product, configured in the UI |
| This workflow | Absolute threshold, any branch | Snyk Actions, documented |
| Branch protection | A failing required check | GitHub, one-time setting |

If a customer genuinely needs "fail only on issues since the last build" *inside
CI*, Snyk documents
[`snyk-delta`](https://github.com/snyk-tech-services/snyk-delta) for that. Flag
it as a snyk-tech-services tool, not core product, so expectations are set before
anyone builds on it.

## Setup — one secret

The workflow needs a `SNYK_TOKEN` repo secret. Get the value from
[app.snyk.io](https://app.snyk.io) → Account settings → Auth Token, then:

```bash
gh secret set SNYK_TOKEN
```

That command prompts for the value and doesn't echo it or leave it in shell
history.

Snyk Code must be enabled for the org, or the `code` job fails on an
authorization error rather than on findings.

Note that GitHub does not pass repo secrets to workflows triggered from forked
PRs, so the Snyk jobs will not run on fork contributions.

## Prompts to surface more

```
Change the severity threshold in the Snyk workflow from high to critical and tell me which jobs would flip from red to green, and what that implies about where this team should set its initial policy.
```

```
Explain the difference between what Snyk PR Checks block and what this CI workflow blocks, for a security lead who thinks they are the same control.
```

```
Show me what a Snyk Code finding in this repo looks like in the CLI output, and what the developer would do to fix it.
```

## Likely objections

**"Developers will just disable it."** They will, if you gate on the whole
backlog on day one. That's what PR Checks are for — they make the gate's demands
proportional to what the developer actually did. Also point at the severity
threshold: the policy is a dial, not a switch.

**"This slows every build down."** The scans run in parallel, and only the
container job builds an image.

**"We already scan in the IDE and on the PR."** Those are advisory. Defence in
depth: the IDE catches it earliest and cheapest, PR Checks catch it during
review, and the pipeline is what you can show an auditor.

**"Our deploy isn't in GitHub Actions."** The gate is `snyk test
--severity-threshold=X` plus an exit code, which is portable to any CI system.
Snyk publishes integrations for the common ones — see
[Snyk CI/CD integrations](https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations).
Only the YAML around it is GitHub-specific.

## Caveats

- **This workflow does not deploy anything.** It scans. Blocking a release is
  branch protection plus whatever ships your code — don't imply Snyk does the
  deploying.
- **A red job is not a blocked merge** until branch protection is switched on.
  Demo it that way or the control looks stronger than it is.
- **The actions are pinned to `@master`,** which is how Snyk documents them. If a
  customer's supply-chain policy requires pinning to a SHA, that's a reasonable
  ask and worth raising with them rather than glossing over.
- **First run needs the secret.** See setup above.

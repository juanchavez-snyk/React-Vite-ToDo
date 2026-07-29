# Demo Docs

| Doc | What's in it |
|---|---|
| [00-demo-runbook.md](00-demo-runbook.md) | Setup, verified finding counts, demo order, the 5-minute cut, caveats |
| [01-open-source.md](01-open-source.md) | SCA talk track — `marked`, `axios`, `lodash`, `handlebars` |
| [02-code.md](02-code.md) | SAST talk track — the live XSS, all 15 rule types |
| [03-iac.md](03-iac.md) | IaC talk track — Terraform, Kubernetes, CloudFormation |
| [04-container.md](04-container.md) | Container talk track — base image remediation math |
| [05-prompt-library.md](05-prompt-library.md) | Cross-product prompts for agent-driven demos |

Each product doc has the same shape: **the story** (the one-sentence framing),
**what to show** (in order, with real data), **prompts to surface more**, and
**likely objections** with answers.

## Start here

If you have 15 minutes with a customer, read [00-demo-runbook.md](00-demo-runbook.md)
and nothing else. It has the order, the numbers, and the two live exploits.

## Ground rules

Every finding count in these docs was produced by running the scan against this
repo, not estimated. Counts drift as new CVEs are published — re-run before
anything high-stakes.

The caveats sections are load-bearing. There are three things this repo can't do
(Compose isn't IaC-scannable, the Dockerfile isn't covered by `snyk iac test`, and
the stored XSS isn't a Snyk Code finding). Knowing them beats being surprised by
them in front of a customer.

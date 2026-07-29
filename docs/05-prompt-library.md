# Prompt Library

Cross-product prompts for driving this repo from Claude Code (or any agent with
the Snyk MCP server / CLI available). The per-product docs have prompts scoped to
one product; these span several, which is usually where the interesting demos are.

The Snyk MCP server exposes `snyk_code_scan`, `snyk_sca_scan`, `snyk_iac_scan`,
`snyk_container_scan`, `snyk_sbom_scan` and `snyk_aibom`, so an agent can run
these itself rather than you narrating CLI output.

## Whole-repo baseline

```
Scan this entire repo with all four Snyk products — Open Source on both package.json files, Code, IaC across infra/, and Container against the Dockerfile. Give me one prioritized table of everything that is both high severity and reachable from a real code path, and tell me what you'd fix first if you had two hours.
```

```
Produce an executive summary of this repo's security posture: one paragraph, three bullet points, no CVE numbers. Assume the reader is a VP Engineering who has 60 seconds.
```

## Cross-product correlation — the strongest demos

```
The XSS in this app has two independent root causes, one found by Snyk Open Source and one by Snyk Code. Find both, explain why fixing either one mitigates it, and then tell me why you'd fix both anyway.
```

```
The hardcoded database password appears in five different files in this repo. Find all five, tell me which Snyk product catches each one, and identify which ones would be missed if I only ran SCA.
```

```
Trace the full attack chain from the SQL injection in server/routes/todos.js to data exfiltration, using the Terraform in infra/ to establish what's actually reachable. Which single IaC fix would break the chain?
```

```
Rank every finding in this repo by real-world exploitability rather than CVSS. Justify each place your ranking disagrees with the severity Snyk assigned.
```

## Fix workflows

```
Fix every Snyk finding in this repo that can be resolved without a breaking change. Run all four scans before and after, and give me a table of the counts. Do not change any public API.
```

```
Fix the findings one product at a time, committing after each, so I can show the delta per product. Start with Open Source, then Code, then IaC, then Container.
```

```
For each Snyk Code finding, write a failing test that demonstrates the vulnerability, then the fix, then show the test passing.
```

## Adding surface area

```
Add a "share todo list" feature with a public link, an email invite, and a CSV export. Implement it the way a developer under deadline pressure would. Then scan and tell me what you introduced.
```

The last one is worth trying live. Asking for a realistically-rushed
implementation tends to produce genuine findings, which is a better demo than
planted ones — and it makes the point about AI-generated code needing the same
gates as human code.

```
Add file upload for todo attachments: store to the S3 bucket in infra/terraform, generate thumbnails by shelling out to imagemagick, and serve them back. Then scan all four products.
```

```
Add a webhook system so users get notified when a todo is due. Include retry logic and signature verification. Then scan and check whether the signature verification is actually sound.
```

```
Add SSO login with a JWT-based session and a password reset flow. Then scan — I specifically want to see what Snyk Code says about the token handling.
```

## CI/CD and policy

```
Write a GitHub Actions workflow that runs all four Snyk scans on every PR, fails on new criticals only (not the existing backlog), and posts a summary comment. Explain how you're distinguishing new from existing.
```

```
Create a .snyk policy file that ignores the low-severity IaC findings with written justifications and 30-day expiry, so my demo shows a clean-ish baseline with an audit trail.
```

```
Set up a pre-commit hook that runs snyk code test on staged files only and blocks the commit on high severity.
```

## SBOM and AI

```
Generate an SBOM for this repo in CycloneDX format, then tell me which components have known vulnerabilities and which have no upstream maintainer activity in the last year.
```

```
Run an AI BOM on this repo. If it finds nothing, add an LLM-backed "suggest subtasks" feature to the todo app using the Anthropic SDK, then run it again and show me what it detects.
```

## Prompts that make the demo honest

Worth having ready, because a skeptical audience will ask something like these.
Better to raise them yourself.

```
What security problems exist in this repo that none of the four Snyk products catch? Be specific and don't pad the list.
```

```
Which of the Snyk findings in this repo would you consider false positives or not worth fixing, and why?
```

```
Every vulnerability in this repo is deliberately planted and labeled with a DEMO VULN comment. If those comments were removed, which findings would still be obvious to a reviewer and which would realistically ship?
```

That last one makes a real point: the injection findings in
`server/routes/admin.js` are fairly visible on inspection, but the
`jwt.decode()`-instead-of-`verify()` bug in `server/routes/auth.js` and the
`_.merge(todo, req.body)` prototype pollution in `server/routes/todos.js` look
like completely normal code. Those are the ones that ship.

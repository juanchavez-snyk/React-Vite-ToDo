# Demo Runbook

A 15-minute run covering all four Snyk products, plus what to cut when you have 5.

## Before you start

```bash
npm run install:all
```

```bash
npm run dev
```

Web on http://localhost:5173, API on http://localhost:3001. Data is in-memory and
resets whenever the API restarts — handy for repeated demos.

Confirm you're authenticated:

```bash
snyk auth
```

## Verified finding counts

These are real numbers from this repo, not estimates. Counts shift as new CVEs
are published, so re-check before a high-stakes demo.

| Product | Command | Result |
|---|---|---|
| Open Source (web) | `snyk test` | 58 unique issues — 2 critical, 25 high, 30 medium, 1 low |
| Open Source (api) | `snyk test` in `server/` | 85 unique issues — 5 critical, 34 high, 43 medium, 3 low |
| Code | `snyk code test` | 16 findings across 15 rule types |
| IaC | `snyk iac test .` | 38 issues — 9 high, 16 medium, 13 low (Terraform 18, K8s 15, CloudFormation 5) |
| Container | `snyk container test node:14 --file=Dockerfile` | 546 unique vulns — 9 critical, 77 high, 76 medium, 384 low |

Counts above are **unique vulnerabilities**. The CLI's human-readable output
shows one line per dependency *path*, so it prints a bigger number — a single
`axios` flaw reached through four paths is four lines but one vulnerability. If
someone challenges your numbers, that's usually the reason.

## Suggested order

Run it in the order a developer would actually hit these, not product-by-product.

1. **Code** (2 min) — start here. It's their code, so it lands hardest.
2. **Open Source** (4 min) — the dependency they chose, with a fix version.
3. **Container** (4 min) — the base image they inherited, with an upgrade path.
4. **IaC** (4 min) — the infrastructure that would expose all of it.
5. **Close** (1 min) — one PR, four gates.

## The 5-minute cut

Do Code (the DOM XSS, live in the browser) and Container (the `node:14`
base image upgrade). Those two get the strongest reactions: one is *their* bug,
the other is a one-line fix that removes hundreds of CVEs.

## Two live exploits

Most demos only show findings. This repo has two that actually execute, which
changes the conversation from "a scanner flagged this" to "this is exploitable."

**Reflected DOM XSS** — paste into the browser with the app running:

```
http://localhost:5173/?note=%3Cimg%20src%3Dx%20onerror%3Dalert(document.domain)%3E
```

An alert fires. This is a link you could send someone. Source is
`window.location`, sink is `dangerouslySetInnerHTML`, and Snyk Code reports the
full path in [src/components/SharedNote.jsx](../src/components/SharedNote.jsx).

**Stored XSS** — add a todo, click *notes*, and paste:

```html
<img src=x onerror=alert('stored')>
```

It fires on every render for every user. Both exist because `marked` 0.3.6
doesn't sanitize by default — the same root cause shows up in Open Source *and*
Code, which is a nice way to show the products reinforcing each other.

## Honest caveats

Worth knowing before a customer asks:

- **`docker-compose.yml` returns 0 IaC findings.** Snyk IaC covers Terraform,
  CloudFormation, ARM, and Kubernetes — not Compose. The file is here for
  discussion, not for scanning. Don't promise a scan you can't run.
- **The Dockerfile isn't scanned by `snyk iac test`.** Dockerfile analysis rides
  along with `snyk container test --file=Dockerfile`, which is why the container
  command passes it explicitly.
- **Container scanning needs no local Docker.** Snyk pulls the image from the
  registry. Verified on a machine with no Docker installed.
- **The stored XSS is not flagged by Snyk Code**, only the reflected one. Snyk
  Code doesn't treat an API response as a taint source in client-side code. Show
  the stored one as a live exploit and the reflected one as the SAST finding.
- **`snyk test` needs a lockfile or `node_modules`.** Run the install first.

## Reset between demos

```bash
curl -s -X POST localhost:3001/api/backup -H 'Content-Type: application/json' -d '{"label":"reset"}' >/dev/null; kill %1 2>/dev/null; npm run dev
```

Simpler: restart the API. The in-memory store repopulates its three seed todos.

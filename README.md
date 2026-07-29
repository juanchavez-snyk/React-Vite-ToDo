# Snyk Demo — Todo App

A small React + Vite todo app with an Express API, **deliberately vulnerable** so
it exercises all four Snyk products: Open Source, Code, IaC, and Container.

> ⚠️ **Every vulnerability here is intentional.** Each one is marked with a
> `DEMO VULN` comment naming the product that finds it. All credentials are fake.
> Do not deploy this, and do not copy patterns out of it.

## Quick start

```bash
npm run install:all
```

```bash
npm run dev
```

Web on http://localhost:5173, API on http://localhost:3001. The API stores todos
in memory, so a restart resets to the seed data.

The app genuinely works: add, complete, filter and delete todos, with optional
markdown notes.

## Verified Snyk coverage

| Product | Command | Result |
|---|---|---|
| Open Source | `snyk test` (root) | 58 unique issues — 2 critical, 25 high |
| Open Source | `snyk test` (in `server/`) | 85 unique issues — 5 critical, 34 high |
| Code | `snyk code test` | 16 findings, 15 rule types |
| IaC | `snyk iac test .` | 38 issues — 9 high, 16 medium, 13 low |
| Container | `snyk container test node:14 --file=Dockerfile` | 546 unique vulns — 9 critical, 77 high |

Container scanning needs **no local Docker** — Snyk pulls from the registry.

## Two exploits that actually run

Most demo apps only produce scanner output. These two execute in the browser:

**Reflected DOM XSS** — with the app running, open:

```
http://localhost:5173/?note=%3Cimg%20src%3Dx%20onerror%3Dalert(document.domain)%3E
```

**Stored XSS** — add a todo, click *notes*, and paste `<img src=x onerror=alert('stored')>`.

Both work because `marked@0.3.6` doesn't sanitize and the output goes through
`dangerouslySetInnerHTML` — one bug with a root cause in both Snyk Open Source
*and* Snyk Code.

## Layout

```
src/                      React frontend
  api.js                  hardcoded API token
  components/
    SharedNote.jsx        DOM XSS (window.location -> dangerouslySetInnerHTML)
    TodoItem.jsx          stored XSS via markdown notes
server/                   Express API (its own package.json)
  index.js                wildcard CORS, no helmet, no rate limiting
  routes/
    todos.js              SQL injection, prototype pollution via _.merge
    admin.js              command injection, path traversal, SSRF, open redirect
    auth.js               hardcoded JWT secret, MD5 passwords, jwt.decode()
infra/
  terraform/main.tf       public S3, public RDS, 0.0.0.0/0 SG, wildcard IAM
  k8s/deployment.yaml     privileged, SYS_ADMIN, host root mount, no limits
  cloudformation/stack.yaml  public bucket, open SG, admin IAM role
Dockerfile                node:14 (EOL), runs as root, secrets in layers
docker-compose.yml        privileged, docker.sock mounted (see caveat)
.env                      committed fake secrets, for secret detection
docs/                     talk tracks + prompt library
```

## Docs

Talk tracks per product, with real numbers, objection handling, and prompts for
generating more findings: **[docs/](docs/)** — start with
[docs/00-demo-runbook.md](docs/00-demo-runbook.md).

## Known gaps

Documented so they don't surprise you mid-demo:

- `docker-compose.yml` yields **0** IaC findings — Snyk IaC covers Terraform,
  CloudFormation, ARM and Kubernetes, not Compose.
- `snyk iac test` does **not** scan the Dockerfile; that's
  `snyk container test --file=Dockerfile`.
- The **stored** XSS is not reported by Snyk Code (an API response isn't treated
  as a taint source in client code). The **reflected** one is. Show the stored
  one as a live exploit, the reflected one as the SAST finding.

## Why React/Vite plus an Express API

React/Vite alone gives you `package.json` for SCA and JSX for SAST, but the
highest-impact Snyk Code findings — SQL injection, command injection, path
traversal, SSRF — are server-side. The small Express API exists so those are
real, reachable code paths rather than contrived snippets.

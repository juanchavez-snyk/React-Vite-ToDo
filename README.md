# Snyk Demo — Todo App

A small React + Vite todo app with an Express API, used to demo all four Snyk
products: Open Source, Code, IaC, and Container.

The repo ships **the same app twice, on two branches** — once written securely,
once with realistic vulnerabilities. That pairing is the point: it lets you demo
Snyk catching vulnerabilities *in a pull request*, against a clean baseline,
instead of scanning an already-broken repo.

## The two branches

| Branch | State | Verified |
|---|---|---|
| **`v-one`** | Secure baseline | 0 Open Source, 0 Code, 0 IaC, 0 base-image vulns |
| **`v-two`** | Same app, vulnerabilities introduced | 58 + 85 Open Source, 16 Code, 38 IaC, 546 container |
| **`jchavez/breakability-demo`** | Adds the Breakability upgrade-risk scenarios | 73 + 103 Open Source, plus a Maven manifest |

The breakability branch is meant to be shown as an **open PR against `main`**,
not merged — see [docs/07-breakability.md](docs/07-breakability.md). Merging it
would make `main` vulnerable and break the clean-baseline premise below.

Open Source counts are per manifest: on `v-two`, **58** unique issues in
`package.json` and **85** in `server/package.json` (102 distinct advisories
across both, since `axios` and `lodash` appear in each). On the breakability
branch those become **73** and **103**. The CLI's text output prints one line per
dependency *path*, so it shows a larger number again — worth knowing before
someone challenges your figures.

Both branches are the same application with the same features. Only the
*implementation* differs, so the diff between them is almost entirely security.

## Demo flow

1. Merge **`v-one`** into `main`. `main` is now a clean, passing baseline.
2. Open a PR from **`v-two`** into `main`.
3. Snyk's PR checks run against the diff and report the vulnerabilities as
   **newly introduced** — because relative to `main`, they are.

That third step is what makes this worth setting up. Scanning a repo that was
already vulnerable shows a backlog. Scanning this PR shows a developer
introducing risk and getting caught before merge, which is the workflow you're
actually selling.

See [docs/06-pr-demo.md](docs/06-pr-demo.md) for the walkthrough.

## Quick start

Works on either branch:

```bash
npm run install:all
```

```bash
npm run dev
```

Web on http://localhost:5173, API on http://localhost:3001. Todos are stored in
memory, so restarting the API resets to seed data — handy between demo runs.

## What differs between the branches

| Area | `v-one` (secure) | `v-two` (vulnerable) |
|---|---|---|
| Markdown rendering | `marked` 15 + DOMPurify allow-list | `marked` 0.3.6, raw `dangerouslySetInnerHTML` |
| Todo search | Parameterized `$1` query | String-concatenated SQL |
| Todo update | Explicit field allow-list | `_.merge(todo, req.body)` |
| Export download | Keyed lookup + containment check | `path.join` on raw user input |
| Backup | `fs.copyFile` + charset validation | `child_process.exec` string |
| Link preview | Literal URL chosen by `switch` | `axios.get(req.query.url)` |
| Redirect | Literal URL chosen by `switch` | `res.redirect(req.query.to)` |
| Passwords | scrypt + salt + `timingSafeEqual` | unsalted MD5 |
| Sessions | `jwt.verify`, pinned alg, 15m expiry | `jwt.decode`, no expiry |
| Secrets | Env vars, no production fallback | Hardcoded in source |
| API hardening | helmet, rate limits, CORS allow-list | none, `origin: '*'` |
| Base image | `node:22-alpine`, non-root, healthcheck | `node:14`, root, secrets in layers |
| Terraform | Private encrypted S3/RDS, least-priv IAM | Public bucket, public RDS, `Action: "*"` |
| Kubernetes | Non-root, caps dropped, limits, probes | Privileged, SYS_ADMIN, host root mount |

## Layout

```
src/                      React frontend
  markdown.js             single sanitized markdown renderer (v-one only)
  api.js                  API client
  stats.js                lodash 3 summary helpers (breakability: API removal)
  components/
    SharedNote.jsx        ?note= URL rendering
    TodoItem.jsx          markdown notes rendering
server/                   Express API (own package.json)
  index.js                app setup, CORS, rate limiting
  sync.js                 websocket live sync, forge manifest, webhook ping
  i18n.js                 localized API error messages (y18n)
  routes/
    todos.js              CRUD + search
    admin.js              export, backup, preview, redirect, import
    auth.js               login, reset, session
service/                  Java reporting sidecar (Maven — breakability: LTS drop)
  pom.xml                 Spring 5.3.18 on Java 11
infra/
  terraform/main.tf       S3, RDS, security groups, IAM, KMS
  k8s/deployment.yaml     Deployment, Service, NetworkPolicy
  cloudformation/stack.yaml
Dockerfile                multi-stage build
docs/                     talk tracks + prompt library
```

## Docs

[docs/](docs/) has a runbook, a talk track per product with real numbers and
objection handling, a prompt library, and the PR demo walkthrough. Start with
[docs/00-demo-runbook.md](docs/00-demo-runbook.md).

> ⚠️ On `v-two`, every vulnerability is intentional and marked with a
> `DEMO VULN` comment naming the product that finds it. All credentials are fake.
> Don't deploy it, and don't copy patterns out of it.

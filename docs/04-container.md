# Snyk Container — Talk Track

**Verified:** 546 unique vulnerabilities in `node:14` — 9 critical, 77 high, 76 medium, 384 low.

```bash
snyk container test node:14 --file=Dockerfile
```

**No local Docker required.** Snyk pulls the image from the registry directly.
This was verified on a machine with Docker not installed — worth knowing, because
it means you can run this from any laptop or CI runner.

If Docker *is* available and you want to scan the real built image:

```bash
docker build -t snyk-demo/todo-api:latest . && snyk container test snyk-demo/todo-api:latest --file=Dockerfile
```

## The story

The developer wrote maybe 400 lines of JavaScript. Then they wrote `FROM node:14`
and inherited 546 vulnerabilities. That asymmetry is the whole pitch.

> "You've been auditing the code your team writes. This one line brought in more
> risk than everything else in the repo combined, and it never showed up in a
> code review."

## The headline: base image remediation

This is the most valuable output Snyk gives here, and it's a genuinely
counter-intuitive result. Snyk's own recommendation table:

| Base image | Vulns | Critical | High |
|---|---|---|---|
| **`node:14`** (current) | 546 | 9 | 77 |
| `node:24.18.0` (major upgrade) | 425 | 3 | 21 |
| `node:14.21.3-bullseye-slim` (alternative type) | **228** | 7 | 44 |

Two things to draw out:

**1. The slim variant beats the major version upgrade on total count.** 228 vs
425. Staying on Node 14 but switching to `bullseye-slim` removes more
vulnerabilities than jumping to Node 24 — because most of the count is OS
packages you never use, not the Node runtime.

**2. But the major upgrade wins where it matters.** 3 critical / 21 high vs
7 critical / 44 high. Fewer *severe* issues.

> "So which is the right fix? It depends on whether you can absorb a Node major
> version bump this quarter. Snyk isn't just telling you you're vulnerable —
> it's giving you two costed options. That's the difference between a scanner
> and something a team can actually act on."

Snyk also flags: **Debian 10 is no longer supported by the Debian maintainers.**
No more security patches — the count will only grow. Good urgency, not manufactured.

## Dockerfile configuration issues

Walk [Dockerfile](../Dockerfile) line by line. Every problem is a one-liner that
looks normal in isolation:

```dockerfile
FROM node:14
```
EOL runtime, and unpinned by digest so the build isn't reproducible.

```dockerfile
RUN apt-get update && apt-get install -y curl wget netcat vim git
```
`netcat` and `vim` in a production runtime image. Attack tooling, pre-installed.
Also no `rm -rf /var/lib/apt/lists/*`, so the package lists ship too.

```dockerfile
COPY . .
```
With the near-empty [.dockerignore](../.dockerignore), this copies `.git`,
`.env`, and local `node_modules` into the image. Tie it back: the `.env` file
contains `AWS_SECRET_ACCESS_KEY` and `JWT_SECRET`, now readable by anyone who can
pull the image.

```dockerfile
ENV DATABASE_URL="postgres://todo_admin:S3cretP4ssw0rd@db.internal:5432/todos"
```
Baked into a layer. `docker history` reveals it. Deleting it in a later layer
does not remove it.

**No `USER` instruction** — the container runs as root.
**No `HEALTHCHECK`** — no liveness signal.

## Tying the four products together

This is the closing move of the whole demo. The same hardcoded password appears in:

- **`.env`** — committed to git
- **`Dockerfile`** — baked into an image layer
- **`docker-compose.yml`** — plaintext
- **`infra/terraform/main.tf`** — in the RDS resource
- **`infra/k8s/deployment.yaml`** — as a plaintext env value

One bad decision, five places, found by three different products. No single
scanner catches all five.

## Prompts to surface more

```
Rewrite the Dockerfile as a multi-stage build on a distroless or alpine base, running as a non-root user with a healthcheck. Then run snyk container test on both the old and new versions and show me the before/after vulnerability counts.
```

```
Compare snyk container test across node:14, node:14-alpine, node:24-slim, and gcr.io/distroless/nodejs22. Build me a table of total vulns and criticals, and recommend one with reasoning about what we'd give up.
```

```
Which of the 9 critical vulnerabilities in node:14 are in packages this app actually loads at runtime? Use snyk container test --exclude-base-image-vulns to separate my risk from inherited risk.
```

```
Write a proper .dockerignore, rebuild, and prove the .env file and .git directory are no longer in the image.
```

```
Generate an SBOM for the container image and for both package.json files, then tell me what's in the image that isn't in either manifest.
```

```
Add a GitHub Actions workflow that fails the build on any critical container vulnerability, but only for vulnerabilities that are not inherited from the base image.
```

## Likely objections

**"546 vulnerabilities is noise, we'd never triage that."** Correct, and that's
the argument for `--exclude-base-image-vulns` and for base image remediation.
The answer to 546 findings isn't 546 tickets — it's one base image change.

**"Our registry already scans images."** Ask when. Registry scanning happens
after the image is built and pushed. `snyk container test --file=Dockerfile` runs
before merge and tells you *which line* to change, which registry scanners
generally can't.

**"We can't upgrade off Node 14."** Then the slim variant is the answer: 228 vs
546, no runtime change. That's a real, shippable win, and it's a good moment to
show you're solving their problem rather than selling an upgrade.

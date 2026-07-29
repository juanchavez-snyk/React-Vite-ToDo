# Snyk IaC — Talk Track

**Verified:** 38 issues — 9 high, 16 medium, 13 low, across three parsers.

```bash
snyk iac test .
```

| File | Issues |
|---|---|
| [infra/terraform/main.tf](../infra/terraform/main.tf) | 18 |
| [infra/k8s/deployment.yaml](../infra/k8s/deployment.yaml) | 15 |
| [infra/cloudformation/stack.yaml](../infra/cloudformation/stack.yaml) | 5 |

Three formats, one command, no cloud credentials and no `terraform plan`. That's
the opening point — this runs pre-merge on a laptop.

## The story

Code and Open Source are about the application. IaC is about the blast radius.
The strongest framing ties it back to what you already showed: the SQL injection
in the API is bad, but it's *survivable* if the database isn't reachable from the
internet. Here it is.

## Terraform — 18 issues

### The S3 bucket (6 issues, 5 high)

Every public-access guardrail explicitly disabled:

- **S3 Bucket is publicly readable and writable** (SNYK-CC-TF-19) — high
- **S3 block public ACLs control is disabled** (SNYK-CC-TF-95) — high
- **S3 block public policy control is disabled** (SNYK-CC-TF-96) — high
- **S3 ignore public ACLs control is disabled** (SNYK-CC-TF-97) — high
- **S3 restrict public bucket control is disabled** (SNYK-CC-TF-98) — high
- Plus versioning, logging and MFA-delete off

This is what a real breach postmortem looks like. Nobody wrote "make this
public" — they wrote four `false` values in a `public_access_block` and moved on.

### The RDS instance (5 issues)

- **Resource is publicly accessible** (SNYK-CC-TF-50) — high
- **Non-encrypted RDS instance at rest** (SNYK-CC-TF-201) — medium
- **RDS automatic backup is disabled** (SNYK-CC-AWS-408) — medium
- **RDS IAM authentication is disabled** (SNYK-CC-AWS-414) — medium

Then point at the hardcoded `password = "S3cretP4ssw0rd"` in the same resource.

> "The SQL injection I showed you needs network access to matter. This line
> gives it that. Two findings from two different products, and it's the
> combination that's the incident."

### Security group and IAM

- **Security Group allows open ingress** — flagged twice, once for SSH (22) and
  once for Postgres (5432), both `0.0.0.0/0`
- **IAM Policy grants full administrative rights** (SNYK-CC-TF-119) — `Action: "*"`
  on `Resource: "*"`
- **AWS Security Group allows open egress** — the exfiltration path

## Kubernetes — 15 issues

The container escape chain, which reads as a story on its own:

- **Privileged container** (SNYK-CC-K8S-1) — high
- **SYS_ADMIN capability** (SNYK-CC-K8S-7) — high
- **Host path mount** (SNYK-CC-K8S-37) — mounts `/` into the pod
- **Host Network / PID / IPC namespaces** — three separate findings
- **Running without root user control** (SNYK-CC-K8S-10)
- **Does not drop all default capabilities** (SNYK-CC-K8S-6)
- **Without privilege escalation control** (SNYK-CC-K8S-9)
- **Service does not restrict ingress sources** (SNYK-CC-K8S-15)

Plus the operational ones that get engineers nodding: no CPU limit, no memory
limit, no liveness probe, writable root filesystem.

> "Privileged, plus SYS_ADMIN, plus host root mounted at /host, plus the host
> PID namespace. Any RCE in that Node process is now root on the node."

That chain is the single best slide-free moment in the IaC section. Walk the four
findings in order and let the audience arrive at the conclusion.

## CloudFormation — 5 issues

Shorter, and the point is coverage rather than depth: the same public bucket,
open security group and wildcard IAM policy get caught in a completely different
syntax. Useful if the customer is multi-format, which most are.

## Prompts to surface more

```
Add a Terraform module for an EKS cluster with public endpoint access, unencrypted secrets, and no control-plane logging, then run snyk iac test and walk me through the new findings.
```

```
Write an Azure ARM template and a GCP Terraform config for this same app's storage, both misconfigured. Confirm Snyk IaC covers both and show me what it finds.
```

```
Fix every high-severity IaC issue in infra/terraform but deliberately leave the medium ones. Re-run the scan and show me the before/after counts.
```

```
Add a Kubernetes NetworkPolicy and a PodSecurityContext that would break the container-escape chain in deployment.yaml. Then re-scan and tell me which of the 15 findings are resolved and which remain.
```

```
Compare infra/terraform/main.tf against infra/cloudformation/stack.yaml. Which misconfigurations does one catch that the other doesn't, and is that a gap in my templates or in the rules?
```

```
Generate a Helm chart for this app with insecure defaults in values.yaml and scan it.
```

## Honest caveats

- **`docker-compose.yml` produces 0 findings.** Snyk IaC covers Terraform,
  CloudFormation, ARM, and Kubernetes — not Compose. The file is in the repo
  because it documents the intended deployment, and it's a fair thing to be
  asked about. Don't demo it as scannable.
- **`snyk iac test` does not scan the Dockerfile.** That's part of
  `snyk container test --file=Dockerfile`. See [04-container.md](04-container.md).
- **Nothing here is deployable.** It's scan material. If someone asks to see it
  applied, that's a different (and expensive) demo.

#!/usr/bin/env node
/**
 * Snyk delta gate.
 *
 * Compares two Snyk JSON result files (a baseline from the target branch and a
 * head from the branch under test) and fails only on issues the branch NEWLY
 * INTRODUCES. The existing backlog is reported and allowed through.
 *
 * Usage:
 *   node snyk-delta.mjs --kind=oss|code|iac --base=base.json --head=head.json \
 *                       [--severity=low|medium|high|critical] [--label="Open Source"]
 *
 * Exit codes:
 *   0 — no new issues at or above the severity threshold
 *   1 — new issues found (block the deploy)
 *
 * Snyk's CLI writes no JSON file at all when a scan finds nothing, and shapes
 * differ per product, so every read here is defensive on purpose.
 */

import { readFileSync, appendFileSync, existsSync } from 'node:fs'

const RANK = { low: 0, medium: 1, high: 2, critical: 3 }

function arg(name, fallback = undefined) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

const kind = arg('kind')
const basePath = arg('base')
const headPath = arg('head')
const threshold = (arg('severity', 'low') || 'low').toLowerCase()
const label = arg('label', kind)

if (!kind || !basePath || !headPath) {
  console.error('usage: --kind=oss|code|iac --base=<file> --head=<file> [--severity=] [--label=]')
  process.exit(2)
}

function loadJson(file) {
  // No file / empty file means "the scan found nothing", not "the scan failed".
  // A genuine scan failure is caught by the workflow step that produced it.
  if (!existsSync(file)) return null
  const raw = readFileSync(file, 'utf8').trim()
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (err) {
    console.error(`::warning::could not parse ${file} as JSON (${err.message}); treating as empty`)
    return null
  }
}

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : [])

// SARIF severity words come from `level`; Snyk also puts a real severity on the
// rule properties, which we prefer when present.
function sarifSeverity(result, rulesById) {
  const rule = rulesById.get(result.ruleId)
  const fromRule = rule?.properties?.problem?.severity || rule?.defaultConfiguration?.level
  const raw = String(result.level || fromRule || 'warning').toLowerCase()
  if (raw === 'error') return 'high'
  if (raw === 'warning') return 'medium'
  if (raw === 'note') return 'low'
  return RANK[raw] !== undefined ? raw : 'medium'
}

/** Returns Map<stableKey, {severity, title, where}>. */
function extract(kind, data) {
  const out = new Map()
  if (!data) return out

  if (kind === 'oss') {
    // `--all-projects` yields an array of project results; a single project
    // yields one object. Both carry `vulnerabilities[]`.
    for (const project of asArray(data)) {
      const where = project.displayTargetFile || project.targetFile || project.projectName || '?'
      for (const v of asArray(project.vulnerabilities)) {
        // Keyed on advisory + package, not version: a version bump that keeps
        // the same advisory is still the same finding.
        out.set(`${v.id}|${v.packageName}|${where}`, {
          severity: String(v.severity || 'medium').toLowerCase(),
          title: v.title || v.id,
          where: `${where} → ${v.packageName}@${v.version ?? '?'}`,
        })
      }
    }
    return out
  }

  if (kind === 'code') {
    // snyk code test --json emits SARIF.
    for (const run of asArray(data.runs)) {
      const rulesById = new Map(asArray(run.tool?.driver?.rules).map((r) => [r.id, r]))
      for (const result of asArray(run.results)) {
        const loc = result.locations?.[0]?.physicalLocation
        const uri = loc?.artifactLocation?.uri || '?'
        // Deliberately excludes line numbers: unrelated edits shift lines and
        // would otherwise resurface an old finding as "new".
        out.set(`${result.ruleId}|${uri}`, {
          severity: sarifSeverity(result, rulesById),
          title: result.message?.text || result.ruleId,
          where: uri,
        })
      }
    }
    return out
  }

  if (kind === 'iac') {
    for (const file of asArray(data)) {
      const where = file.targetFile || file.targetFilePath || '?'
      for (const i of asArray(file.infrastructureAsCodeIssues)) {
        const cloudPath = Array.isArray(i.path) ? i.path.join('.') : (i.path || '')
        out.set(`${i.id}|${where}|${cloudPath}`, {
          severity: String(i.severity || 'medium').toLowerCase(),
          title: i.title || i.id,
          where: `${where}${cloudPath ? ` [${cloudPath}]` : ''}`,
        })
      }
    }
    return out
  }

  console.error(`unknown kind: ${kind}`)
  process.exit(2)
}

const base = extract(kind, loadJson(basePath))
const head = extract(kind, loadJson(headPath))

const introduced = []
const fixed = []

for (const [key, issue] of head) {
  if (!base.has(key)) introduced.push({ key, ...issue })
}
for (const key of base.keys()) {
  if (!head.has(key)) fixed.push(key)
}

const min = RANK[threshold] ?? 0
const blocking = introduced.filter((i) => (RANK[i.severity] ?? 1) >= min)

const order = (i) => -(RANK[i.severity] ?? 1)
blocking.sort((a, b) => order(a) - order(b))

// ---- console output ----------------------------------------------------
console.log(`\n${label} — delta vs baseline`)
console.log(`  baseline issues : ${base.size}`)
console.log(`  branch issues   : ${head.size}`)
console.log(`  newly introduced: ${introduced.length} (${blocking.length} at or above ${threshold})`)
console.log(`  no longer present: ${fixed.length}`)

if (blocking.length) {
  console.log('\n  Newly introduced by this branch:')
  for (const i of blocking) {
    console.log(`    [${i.severity.toUpperCase()}] ${i.title}`)
    console.log(`        ${i.where}`)
  }
}

// ---- GitHub step summary ----------------------------------------------
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = []
  const verdict = blocking.length ? '❌ BLOCKED' : '✅ PASS'
  lines.push(`### ${label} — ${verdict}`)
  lines.push('')
  lines.push(`| | Count |`)
  lines.push(`|---|---|`)
  lines.push(`| Baseline (allowed backlog) | ${base.size} |`)
  lines.push(`| This branch | ${head.size} |`)
  lines.push(`| **Newly introduced** | **${introduced.length}** |`)
  lines.push(`| Blocking (≥ ${threshold}) | ${blocking.length} |`)
  lines.push(`| No longer present | ${fixed.length} |`)
  lines.push('')
  if (blocking.length) {
    lines.push(`#### Newly introduced`)
    lines.push('')
    lines.push('| Severity | Issue | Where |')
    lines.push('|---|---|---|')
    for (const i of blocking.slice(0, 40)) {
      const t = String(i.title).replace(/\|/g, '\\|').slice(0, 110)
      const w = String(i.where).replace(/\|/g, '\\|').slice(0, 90)
      lines.push(`| ${i.severity} | ${t} | \`${w}\` |`)
    }
    if (blocking.length > 40) lines.push(`| … | ${blocking.length - 40} more | |`)
    lines.push('')
    lines.push(`> The existing ${base.size} baseline issues did **not** block this build.`)
  } else {
    lines.push(`No new ${label} issues. The existing backlog of ${base.size} was reported, not blocked.`)
  }
  lines.push('')
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n')
}

if (blocking.length) {
  console.error(`\n::error::${label}: ${blocking.length} newly introduced issue(s) at or above ${threshold} — blocking deploy`)
  process.exit(1)
}
console.log(`\n${label}: no new issues at or above ${threshold}.`)

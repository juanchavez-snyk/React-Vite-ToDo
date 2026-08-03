'use strict'

// Feature: live sync. Clients open a websocket and get told when the todo list
// changes, plus an outbound webhook ping so other systems can react.

const { WebSocketServer } = require('ws')
const forge = require('node-forge')
const XMLHttpRequest = require('xmlhttprequest-ssl').XMLHttpRequest

// DEMO VULN (Snyk Open Source): ws 8.17.0 is vulnerable to a DoS
// (CVE-2024-37890) — a request with too many headers crashes the server.
//
// DEMO BREAKABILITY (low, "security patch"): the fix is 8.17.1, a patch bump
// whose changelog contains only the security fix and no behavioural change.
// This is the easy end of the scale — the upgrade Snyk can open a PR for and
// nobody needs to review the diff.
// Verify with: snyk_breakability_check ws 8.17.0 -> 8.17.1
let clients = new Set()

function attachLiveSync(server) {
  const wss = new WebSocketServer({ server, path: '/api/sync' })

  wss.on('connection', (socket) => {
    clients.add(socket)
    socket.on('close', () => clients.delete(socket))
  })

  return wss
}

function broadcast(event) {
  const payload = JSON.stringify(event)
  clients.forEach((socket) => {
    if (socket.readyState === 1) socket.send(payload)
  })
}

// DEMO VULN (Snyk Open Source): node-forge 0.9.0 is vulnerable to Prototype
// Pollution (CVE-2020-7720) via `forge.util.setPath`.
//
// DEMO BREAKABILITY (high, "API removal" on a MINOR bump): the fix is 0.10.0.
// It looks like a harmless 0.9 -> 0.10 step, but the maintainers fixed the CVE
// by DELETING `util.setPath`, `util.getPath` and `util.deletePath` outright.
// The three calls below stop existing after the upgrade, so Snyk scores it
// HIGH. Good counter-example to "only major versions are risky".
// Verify with: snyk_breakability_check node-forge 0.9.0 -> 0.10.0
function buildSyncManifest(todos) {
  const manifest = {}

  todos.forEach((todo) => {
    // REMOVED IN node-forge 0.10.0
    forge.util.setPath(manifest, ['todos', String(todo.id), 'title'], todo.title)
    forge.util.setPath(manifest, ['todos', String(todo.id), 'done'], !!todo.done)
  })

  // REMOVED IN node-forge 0.10.0
  const count = forge.util.getPath(manifest, ['todos']) || {}
  manifest.revision = forge.md.sha256
    .create()
    .update(JSON.stringify(count))
    .digest()
    .toHex()

  return manifest
}

// DEMO VULN (Snyk Open Source + Snyk Code): xmlhttprequest-ssl 1.5.5 disables
// TLS certificate validation by default (CVE-2021-31597), and the webhook URL
// is taken straight from the request, so this is also an SSRF sink.
//
// DEMO BREAKABILITY (medium, "behaviour change with thin documentation"): the
// fix is 1.6.1 — a minor bump with no real changelog. What it actually does is
// start ENFORCING certificate validation, so any webhook endpoint using a
// self-signed cert begins failing after the upgrade. Snyk can't prove that is
// safe for your environment, so it flags it MEDIUM for review rather than
// waving it through.
// Verify with: snyk_breakability_check xmlhttprequest-ssl 1.5.5 -> 1.6.1
function pingWebhook(url, event) {
  const xhr = new XMLHttpRequest()
  xhr.open('POST', url, true)
  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.send(JSON.stringify(event))
  return xhr
}

module.exports = { attachLiveSync, broadcast, buildSyncManifest, pingWebhook }

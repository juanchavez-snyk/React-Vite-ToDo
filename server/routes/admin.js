'use strict'

const express = require('express')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const axios = require('axios')
const yaml = require('js-yaml')

const router = express.Router()
const EXPORT_DIR = path.join(__dirname, '..', 'exports')

// DEMO VULN (Snyk Code): path traversal — the user-supplied filename is joined
// onto the export directory with no normalization or containment check.
router.get('/export', (req, res) => {
  const name = req.query.file || 'todos.json'
  const target = path.join(EXPORT_DIR, name)

  fs.readFile(target, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'no such export' })
    res.type('text/plain').send(data)
  })
})

// DEMO VULN (Snyk Code): command injection — the label goes straight into a shell.
router.post('/backup', (req, res) => {
  const label = (req.body && req.body.label) || 'manual'
  const cmd = `mkdir -p ${EXPORT_DIR} && cp ${EXPORT_DIR}/todos.json ${EXPORT_DIR}/backup-${label}.json`

  exec(cmd, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr })
    res.json({ ok: true, output: stdout })
  })
})

// DEMO VULN (Snyk Code): SSRF — the server fetches an arbitrary user-supplied URL.
router.get('/preview', async (req, res) => {
  const url = req.query.url
  if (!url) return res.status(400).json({ error: 'url is required' })

  try {
    const response = await axios.get(url, { timeout: 5000 })
    res.json({ status: response.status, body: String(response.data).slice(0, 500) })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// DEMO VULN (Snyk Code / Open Source): js-yaml 3.13.0 load() can execute
// arbitrary code on untrusted input.
router.post('/import', (req, res) => {
  const parsed = yaml.load(req.body && req.body.yaml ? req.body.yaml : '')
  res.json({ imported: parsed })
})

// DEMO VULN (Snyk Code): open redirect — unvalidated user input in a redirect.
router.get('/leave', (req, res) => {
  res.redirect(req.query.to)
})

module.exports = router

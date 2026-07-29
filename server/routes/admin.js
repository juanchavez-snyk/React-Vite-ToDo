'use strict'

const express = require('express')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const rateLimit = require('express-rate-limit')

const router = express.Router()
const EXPORT_DIR = path.join(__dirname, '..', 'exports')

// Expensive endpoints (disk and network work) get a tighter budget than the
// global limiter allows.
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

// Exports are addressed by a short id rather than a path, so there is no way to
// express a traversal in the first place.
const EXPORTS = {
  todos: 'todos.json',
}

router.get('/export', heavyLimiter, async (req, res) => {
  const key = typeof req.query.file === 'string' ? req.query.file : 'todos'
  const fileName = EXPORTS[key]

  if (!fileName) return res.status(400).json({ error: 'unknown export' })

  // Resolve, then verify the result is still inside EXPORT_DIR before reading.
  const target = path.resolve(EXPORT_DIR, fileName)
  if (path.relative(EXPORT_DIR, target).startsWith('..')) {
    return res.status(400).json({ error: 'invalid export path' })
  }

  try {
    const data = await fsp.readFile(target, 'utf8')
    res.type('application/json').send(data)
  } catch {
    res.status(404).json({ error: 'no such export' })
  }
})

router.post('/backup', heavyLimiter, async (req, res, next) => {
  const rawLabel = typeof req.body?.label === 'string' ? req.body.label : 'manual'

  // Labels are restricted to a safe character set, and the copy is done with
  // the fs API rather than a shell, so there is no command to inject into.
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(rawLabel)) {
    return res.status(400).json({ error: 'label must be 1-32 chars of a-z, 0-9, - or _' })
  }

  try {
    await fsp.mkdir(EXPORT_DIR, { recursive: true })
    const source = path.join(EXPORT_DIR, 'todos.json')
    const destination = path.join(EXPORT_DIR, `backup-${rawLabel}.json`)
    await fsp.copyFile(source, destination)
    res.json({ ok: true, file: path.basename(destination) })
  } catch (err) {
    next(err)
  }
})

// The request names a page by key; the URL that is actually fetched is a
// literal from this module. No user-controlled value reaches fetch(), so
// internal addresses and cloud metadata endpoints are unreachable by design.
router.get('/preview', heavyLimiter, async (req, res) => {
  const key = typeof req.query.page === 'string' ? req.query.page : ''

  let target
  switch (key) {
    case 'docs':
      target = 'https://docs.snyk.io/'
      break
    case 'home':
      target = 'https://snyk.io/'
      break
    default:
      return res.status(400).json({ error: 'unknown page' })
  }

  try {
    const response = await fetch(target, {
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    })
    const body = (await response.text()).slice(0, 500)
    res.json({ status: response.status, body })
  } catch {
    res.status(502).json({ error: 'preview failed' })
  }
})

// Same pattern for redirects: the Location value is a literal chosen by a
// switch, never a string derived from the request.
router.get('/leave', (req, res) => {
  const key = typeof req.query.to === 'string' ? req.query.to : ''

  switch (key) {
    case 'docs':
      return res.redirect('https://docs.snyk.io/')
    case 'home':
      return res.redirect('/')
    default:
      return res.status(400).json({ error: 'unknown destination' })
  }
})

// Imports accept JSON only. There is no YAML deserializer to abuse, and the
// payload is validated field by field before anything is stored.
router.post('/import', (req, res) => {
  const items = Array.isArray(req.body?.todos) ? req.body.todos : null
  if (!items) return res.status(400).json({ error: 'todos array is required' })

  const imported = items
    .filter((item) => item && typeof item.title === 'string')
    .slice(0, 100)
    .map((item) => ({
      title: item.title.trim().slice(0, 200),
      notes: typeof item.notes === 'string' ? item.notes.slice(0, 2000) : '',
      done: Boolean(item.done),
    }))

  res.json({ imported })
})

// Kept for parity with the export directory listing used by the UI.
router.get('/exports', (req, res) => {
  res.json({ available: Object.keys(EXPORTS), dir: fs.existsSync(EXPORT_DIR) })
})

module.exports = router

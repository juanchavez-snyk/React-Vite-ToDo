'use strict'

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const todos = require('./routes/todos')
const admin = require('./routes/admin')
const auth = require('./routes/auth')

const app = express()
const PORT = process.env.PORT || 3001

// Allow-list of origins read from config. No wildcard, so credentials are only
// honoured for origins we explicitly trust.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

// helmet sets security headers and removes the X-Powered-By fingerprint.
app.use(helmet())
app.disable('x-powered-by')

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
      callback(new Error('Origin not allowed'))
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '100kb' }))

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.use('/api/todos', todos)
app.use('/api/admin', admin)
app.use('/api/auth', auth)

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Errors are logged server-side; clients get a generic message and no stack.
app.use((err, req, res, next) => {
  console.error('[api] unhandled error:', err.message)
  res.status(500).json({ error: 'internal server error' })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
})

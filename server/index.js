'use strict'

const express = require('express')
const cors = require('cors')

const todos = require('./routes/todos')
const admin = require('./routes/admin')
const auth = require('./routes/auth')
const { attachLiveSync } = require('./sync')

const app = express()
const PORT = process.env.PORT || 3001

// DEMO VULN (Snyk Code): permissive CORS — any origin may call this API with credentials.
app.use(cors({ origin: '*', credentials: true }))
app.use(express.json({ limit: '10mb' }))

// No helmet, no rate limiting, no auth middleware on the admin routes.
app.use('/api/todos', todos)
app.use('/api/admin', admin)
app.use('/api/auth', auth)

app.get('/api/health', (req, res) => res.json({ ok: true }))

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] listening on http://localhost:${PORT}`)
})

// Live sync over websockets — see server/sync.js.
attachLiveSync(server)

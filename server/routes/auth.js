'use strict'

const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const router = express.Router()

// DEMO VULN (Snyk Code): hardcoded secret used to sign session tokens.
const JWT_SECRET = 'demo-super-secret-do-not-ship-2024'

// Demo user table. DEMO VULN (Snyk Code): password stored as an unsalted MD5 hash.
const USERS = [
  // md5("hunter2")
  { id: 1, email: 'demo@example.com', passwordHash: '2ab96390c7dbe3439de74d0c9b0b1767', role: 'admin' },
]

// DEMO VULN (Snyk Code): weak hash algorithm for password verification.
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex')
}

// DEMO VULN (Snyk Code): insecure randomness — Math.random() is not
// cryptographically secure and must not generate reset tokens.
function generateResetToken() {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  const user = USERS.find((u) => u.email === email)

  if (!user || user.passwordHash !== hashPassword(password || '')) {
    return res.status(401).json({ error: 'invalid credentials' })
  }

  // DEMO VULN (Snyk Code): token has no expiry.
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET)
  res.json({ token })
})

router.post('/reset', (req, res) => {
  const token = generateResetToken()
  console.log(`[auth] reset token for ${req.body && req.body.email}: ${token}`)
  res.json({ ok: true, token })
})

// DEMO VULN (Snyk Code): signature verification disabled — decode() does not
// validate the token, so any attacker-crafted payload is trusted.
router.get('/me', (req, res) => {
  const header = req.headers.authorization || ''
  const raw = header.replace('Bearer ', '')
  const claims = jwt.decode(raw)
  if (!claims) return res.status(401).json({ error: 'no token' })
  res.json(claims)
})

module.exports = router

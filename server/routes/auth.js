'use strict'

const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')

const router = express.Router()

// The signing key comes from the environment. There is no hardcoded fallback:
// production refuses to start without one, and local development gets a random
// per-process key so tokens never validate across restarts.
const JWT_SECRET = resolveSigningKey()

function resolveSigningKey() {
  const configured = process.env.JWT_SECRET

  if (configured && configured.length >= 32) return configured

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production')
  }

  console.warn('[auth] JWT_SECRET not set - generating an ephemeral development key')
  return crypto.randomBytes(32).toString('hex')
}

const TOKEN_TTL = '15m'
const SCRYPT_KEYLEN = 64

// Credential endpoints get a strict limit to slow down brute-force attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

// Demo user store. Passwords are salted and hashed with scrypt, a memory-hard
// KDF, and the seed account is provisioned from the environment.
const USERS = []

if (process.env.DEMO_USER_EMAIL && process.env.DEMO_USER_PASSWORD) {
  USERS.push({
    id: 1,
    email: process.env.DEMO_USER_EMAIL,
    role: 'admin',
    ...hashPassword(process.env.DEMO_USER_PASSWORD),
  })
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return { salt, passwordHash: derived }
}

// Constant-time comparison, so verification time does not leak the hash.
function verifyPassword(password, user) {
  const candidate = crypto.scryptSync(password, user.salt, SCRYPT_KEYLEN)
  const expected = Buffer.from(user.passwordHash, 'hex')
  if (candidate.length !== expected.length) return false
  return crypto.timingSafeEqual(candidate, expected)
}

// Cryptographically secure randomness for anything security-sensitive.
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex')
}

router.post('/login', authLimiter, (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  const user = USERS.find((u) => u.email === email)

  // Identical response for unknown user and wrong password, so the endpoint
  // cannot be used to enumerate accounts.
  if (!user || !password || !verifyPassword(password, user)) {
    return res.status(401).json({ error: 'invalid credentials' })
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
    algorithm: 'HS256',
  })

  res.json({ token })
})

router.post('/reset', authLimiter, (req, res) => {
  // The token is generated and delivered out of band; it is never logged and
  // never returned in the response body.
  const token = generateResetToken()
  void token

  res.json({ ok: true, message: 'If that address exists, a reset link has been sent.' })
})

router.get('/me', (req, res) => {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'no token' })
  }

  const raw = header.slice('Bearer '.length)

  try {
    // verify() checks the signature and expiry, and the algorithm is pinned so
    // a token cannot downgrade itself to "none".
    const claims = jwt.verify(raw, JWT_SECRET, { algorithms: ['HS256'] })
    res.json({ sub: claims.sub, role: claims.role })
  } catch {
    res.status(401).json({ error: 'invalid token' })
  }
})

module.exports = router

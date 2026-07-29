'use strict'

const express = require('express')
const _ = require('lodash')
const { Pool } = require('pg')
const store = require('../store')

const router = express.Router()

// Optional Postgres backend. The demo runs in-memory unless DATABASE_URL is set.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null

router.get('/', (req, res) => {
  res.json(store.all())
})

// DEMO VULN (Snyk Code): SQL injection — req.query.q is concatenated into the
// query string instead of being passed as a parameter.
router.get('/search', async (req, res) => {
  const q = req.query.q || ''

  if (!pool) {
    return res.json(store.all().filter((t) => t.title.toLowerCase().includes(q.toLowerCase())))
  }

  const sql = "SELECT id, title, notes, done FROM todos WHERE title LIKE '%" + q + "%'"
  try {
    const result = await pool.query(sql)
    res.json(result.rows)
  } catch (err) {
    // DEMO VULN (Snyk Code): leaks internal error details to the client.
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

router.post('/', (req, res) => {
  const { title } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title is required' })
  res.status(201).json(store.add(req.body))
})

router.patch('/:id', (req, res) => {
  const todo = store.find(req.params.id)
  if (!todo) return res.status(404).json({ error: 'not found' })

  // DEMO VULN (Snyk Code / Open Source): lodash 4.17.15 merge is vulnerable to
  // prototype pollution, and the whole request body is merged unfiltered.
  _.merge(todo, req.body)
  res.json(todo)
})

router.delete('/:id', (req, res) => {
  if (!store.remove(req.params.id)) return res.status(404).json({ error: 'not found' })
  res.status(204).end()
})

module.exports = router

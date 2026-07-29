'use strict'

const express = require('express')
const { Pool } = require('pg')
const store = require('../store')

const router = express.Router()

// Optional Postgres backend. The app runs in-memory unless DATABASE_URL is set.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null

// Only these fields may be changed through the API. Anything else in the request
// body is discarded, which also makes a __proto__ payload a no-op.
const EDITABLE_FIELDS = ['title', 'notes', 'done']

function readSearchTerm(value) {
  // Query parameters can arrive as arrays or objects, so coerce to a string
  // before calling anything that assumes string methods exist.
  return typeof value === 'string' ? value : ''
}

router.get('/', (req, res) => {
  res.json(store.all())
})

router.get('/search', async (req, res, next) => {
  const q = readSearchTerm(req.query.q)

  if (!pool) {
    const needle = q.toLowerCase()
    return res.json(store.all().filter((t) => t.title.toLowerCase().includes(needle)))
  }

  // Parameterized query - the search term is bound as a value, never
  // concatenated into the SQL string.
  const sql = 'SELECT id, title, notes, done FROM todos WHERE title LIKE $1'

  try {
    const result = await pool.query(sql, [`%${q}%`])
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

router.post('/', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  if (!title) return res.status(400).json({ error: 'title is required' })

  const notes = typeof req.body?.notes === 'string' ? req.body.notes : ''
  res.status(201).json(store.add({ title, notes }))
})

router.patch('/:id', (req, res) => {
  const todo = store.find(req.params.id)
  if (!todo) return res.status(404).json({ error: 'not found' })

  const patch = req.body || {}

  for (const field of EDITABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) continue

    if (field === 'done') {
      todo.done = Boolean(patch.done)
    } else if (typeof patch[field] === 'string') {
      todo[field] = patch[field]
    }
  }

  res.json(todo)
})

router.delete('/:id', (req, res) => {
  if (!store.remove(req.params.id)) return res.status(404).json({ error: 'not found' })
  res.status(204).end()
})

module.exports = router

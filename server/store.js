'use strict'

// In-memory store so the demo runs with zero setup. Resets on restart.
let seq = 0
const todos = [
  { id: ++seq, title: 'Scan this repo with Snyk', notes: 'Start with `snyk test`.', done: false },
  { id: ++seq, title: 'Fix the critical dependency', notes: '', done: false },
  { id: ++seq, title: 'Read the [Snyk docs](https://docs.snyk.io)', notes: '', done: true },
]

module.exports = {
  all: () => todos,
  find: (id) => todos.find((t) => t.id === Number(id)),
  add: (todo) => {
    const created = { id: ++seq, title: todo.title, notes: todo.notes || '', done: false }
    todos.push(created)
    return created
  },
  remove: (id) => {
    const i = todos.findIndex((t) => t.id === Number(id))
    if (i === -1) return false
    todos.splice(i, 1)
    return true
  },
}

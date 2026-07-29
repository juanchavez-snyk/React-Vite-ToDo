import { useState } from 'react'

export default function AddTodo({ onAdd }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [open, setOpen] = useState(false)

  function submit(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    onAdd(t, notes.trim())
    setTitle('')
    setNotes('')
    setOpen(false)
  }

  return (
    <form className="add" onSubmit={submit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing?"
        aria-label="Todo title"
      />
      <button type="button" className="notes-toggle" onClick={() => setOpen(!open)}>
        {open ? 'hide notes' : 'notes'}
      </button>
      <button type="submit">Add</button>

      {open && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Markdown notes (optional)"
          rows={3}
          aria-label="Notes"
        />
      )}
    </form>
  )
}

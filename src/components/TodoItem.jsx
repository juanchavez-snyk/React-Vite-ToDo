import marked from 'marked'

// Notes support markdown so users can add links and formatting.
// DEMO VULN (Snyk Code): user-controlled note content is rendered as raw HTML.
// marked 0.3.6 does not sanitize by default -> stored XSS.
function renderNotes(notes) {
  return { __html: marked(notes || '') }
}

export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={todo.done ? 'item done' : 'item'}>
      <label>
        <input type="checkbox" checked={!!todo.done} onChange={onToggle} />
        <span className="title">{todo.title}</span>
      </label>

      {todo.notes && (
        <div className="notes" dangerouslySetInnerHTML={renderNotes(todo.notes)} />
      )}

      <button className="del" onClick={onDelete} aria-label="Delete">
        ×
      </button>
    </li>
  )
}

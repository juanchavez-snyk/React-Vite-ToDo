import { renderMarkdown } from '../markdown.js'

// Notes support markdown so users can add links and formatting. The HTML is
// sanitized before it is inserted, so stored note content cannot execute script.
export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={todo.done ? 'item done' : 'item'}>
      <label>
        <input type="checkbox" checked={!!todo.done} onChange={onToggle} />
        <span className="title">{todo.title}</span>
      </label>

      {todo.notes && (
        <div
          className="notes"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(todo.notes) }}
        />
      )}

      <button className="del" onClick={onDelete} aria-label="Delete">
        ×
      </button>
    </li>
  )
}

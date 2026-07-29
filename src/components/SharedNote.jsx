import { renderMarkdown } from '../markdown.js'

// Feature: `/?note=...` lets someone share a draft note as a link.
// The value comes from the URL, so it is untrusted input and is sanitized
// before rendering - a ?note=<img src=x onerror=...> payload is stripped.
export default function SharedNote() {
  const params = new URLSearchParams(window.location.search)
  const shared = params.get('note')

  if (!shared) return null

  return (
    <aside className="shared">
      <h2>Shared note</h2>
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(shared) }} />
    </aside>
  )
}

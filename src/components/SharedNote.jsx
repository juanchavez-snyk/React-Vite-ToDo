import marked from 'marked'

// Feature: `/?note=...` lets someone share a draft note as a link.
//
// DEMO VULN (Snyk Code): DOM-based XSS. The value comes straight off
// window.location and is rendered as raw HTML with no sanitization, so
// ?note=<img src=x onerror=alert(1)> executes in the victim's browser.
export default function SharedNote() {
  const params = new URLSearchParams(window.location.search)
  const shared = params.get('note')

  if (!shared) return null

  return (
    <aside className="shared">
      <h2>Shared note</h2>
      <div dangerouslySetInnerHTML={{ __html: marked(shared) }} />
    </aside>
  )
}

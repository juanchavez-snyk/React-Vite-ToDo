import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Single place where markdown becomes HTML, so sanitization can't be forgotten
// at an individual call site. marked renders, DOMPurify strips anything active.
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'del', 'code', 'pre',
  'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3',
]

export function renderMarkdown(source) {
  const raw = marked.parse(String(source || ''), { async: false })

  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  })
}

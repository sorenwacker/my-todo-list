import { marked } from 'marked'
import DOMPurify from 'dompurify'

/**
 * Configure DOMPurify to allow safe HTML elements for markdown rendering
 */
const purifyConfig = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'strong', 'em', 'del', 's', 'u',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
    'div', 'span',
    'input', // for checkboxes
    'svg', 'g', 'path', 'line', 'rect', 'circle', 'text', 'polygon', 'polyline', 'marker', 'defs', 'style', 'foreignObject' // for mermaid diagrams
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel',
    'src', 'alt', 'title', 'width', 'height',
    'class', 'id',
    'type', 'checked', 'disabled',
    // SVG attributes for mermaid
    'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'transform',
    'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
    'points', 'marker-end', 'marker-start', 'font-size', 'text-anchor',
    'dominant-baseline', 'style', 'aria-roledescription', 'role'
  ],
  // Force all links to open in new tab and have secure attributes
  ADD_ATTR: ['target', 'rel'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur']
}

/**
 * Hook to modify links to be safe
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Make all links open in new tab with noopener
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

/**
 * Render markdown to sanitized HTML
 * @param {string} markdown - The markdown string to render
 * @returns {string} - Sanitized HTML string
 */
export function renderMarkdown(markdown) {
  if (!markdown) return ''
  const html = marked(markdown)
  return DOMPurify.sanitize(html, purifyConfig)
}

/**
 * Render markdown with truncation for card previews
 * @param {string} markdown - The markdown string to render
 * @param {number} maxLength - Maximum length before truncation (default 500)
 * @returns {string} - Sanitized HTML string
 */
export function renderCardMarkdown(markdown) {
  if (!markdown) return ''
  const html = marked(markdown)
  return DOMPurify.sanitize(html, purifyConfig)
}

export { marked, DOMPurify }

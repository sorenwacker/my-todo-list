import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked for better list handling
marked.setOptions({
  gfm: true,
  breaks: true
})

/**
 * Preprocess markdown to fix 2-space indented lists
 * Converts 2-space indentation to 4-space for nested lists
 */
function preprocessMarkdown(markdown) {
  if (!markdown) return ''

  // Convert 2-space indented list items to 4-space
  const lines = markdown.split('\n')
  const result = []

  for (const line of lines) {
    // Match lines starting with spaces followed by - or * or number.
    const match = line.match(/^( +)([-*]|\d+\.) (.*)$/)
    if (match) {
      const spaces = match[1]
      const bullet = match[2]
      const content = match[3]
      // Double the indentation for proper nesting
      const newSpaces = '    '.repeat(Math.ceil(spaces.length / 2))
      result.push(newSpaces + bullet + ' ' + content)
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

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
  const processed = preprocessMarkdown(markdown)
  const html = marked(processed)
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
  const processed = preprocessMarkdown(markdown)
  const html = marked(processed)
  return DOMPurify.sanitize(html, purifyConfig)
}

/**
 * Render inline markdown (no paragraph wrapper) for titles
 * @param {string} markdown - The markdown string to render
 * @returns {string} - Sanitized HTML string
 */
export function renderInlineMarkdown(markdown) {
  if (!markdown) return ''
  const html = marked.parseInline(markdown)
  return DOMPurify.sanitize(html, purifyConfig)
}

export { marked, DOMPurify }

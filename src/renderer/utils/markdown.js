import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Configure marked for better list handling
marked.setOptions({
  gfm: true,
  breaks: true
})

const FENCE_RE = /^\s*(`{3,}|~{3,})/
const INDENTED_LIST_RE = /^( +)([-*]|\d+\.) (.*)$/

/**
 * Preprocess markdown so nested lists render regardless of indent width.
 *
 * Marked requires 4-space indentation per nesting level. Notes written with
 * 2-space indents (or any consistent smaller unit) would lose their nesting,
 * so the smallest indent found on a list line is treated as one level and
 * every list line is rewritten to 4 spaces per level. Fenced code blocks are
 * passed through untouched.
 *
 * @param {string} markdown - The markdown string to preprocess.
 * @returns {string} Markdown with list indentation normalized.
 */
export function preprocessMarkdown(markdown) {
  if (!markdown) return ''

  const lines = markdown.split('\n')

  // Pass 1: find the smallest list indent outside fenced code blocks.
  let inFence = false
  let fenceChar = ''
  let unit = Infinity
  for (const line of lines) {
    const fence = line.match(FENCE_RE)
    if (fence) {
      if (!inFence) {
        inFence = true
        fenceChar = fence[1][0]
      } else if (fence[1][0] === fenceChar) {
        inFence = false
      }
      continue
    }
    if (inFence) continue
    const match = line.match(INDENTED_LIST_RE)
    if (match) unit = Math.min(unit, match[1].length)
  }
  if (!isFinite(unit) || unit === 0) return markdown

  // Pass 2: rewrite list indentation to 4 spaces per level.
  inFence = false
  fenceChar = ''
  const result = lines.map((line) => {
    const fence = line.match(FENCE_RE)
    if (fence) {
      if (!inFence) {
        inFence = true
        fenceChar = fence[1][0]
      } else if (fence[1][0] === fenceChar) {
        inFence = false
      }
      return line
    }
    if (inFence) return line
    const match = line.match(INDENTED_LIST_RE)
    if (!match) return line
    const level = Math.round(match[1].length / unit)
    return '    '.repeat(level) + match[2] + ' ' + match[3]
  })

  return result.join('\n')
}

/**
 * DOMPurify allowlist for markdown rendering.
 *
 * Only elements marked can emit (plus checkbox inputs) are allowed; anything
 * else is stripped. Mermaid diagrams never pass through this sanitizer: the
 * markdown pipeline emits an escaped `<pre class="mermaid">` block and
 * mermaid renders its SVG into the DOM afterwards, so no SVG allowances are
 * needed here.
 */
const purifyConfig = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'a',
    'strong',
    'em',
    'del',
    's',
    'u',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'img',
    'div',
    'span',
    'input' // for checkboxes
  ],
  ALLOWED_ATTR: [
    'href',
    'target',
    'rel',
    'src',
    'alt',
    'title',
    'width',
    'height',
    'class',
    'id',
    'type',
    'checked',
    'disabled'
  ]
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
 * Render markdown for card previews.
 *
 * Card previews show only the first paragraph (the text block up to the first
 * blank line) so long notes do not expand the card. The full note is shown in
 * the detail panel, which uses {@link renderMarkdown} directly.
 *
 * @param {string} markdown - The markdown string to render.
 * @returns {string} Sanitized HTML for the first paragraph.
 */
export function renderCardMarkdown(markdown) {
  if (!markdown) return ''
  const firstParagraph = markdown.split(/\n\s*\n/)[0]
  return renderMarkdown(firstParagraph)
}

/**
 * Render note markdown for card previews, replacing mermaid code blocks with
 * a `[diagram]` placeholder so cards never pay the diagram rendering cost. The
 * whole note is rendered (not just the first paragraph).
 *
 * @param {string} notes - The note markdown.
 * @returns {string} Sanitized HTML for the full note.
 */
export function renderCardNotes(notes) {
  if (!notes) return ''
  const processed = notes.replace(/`{3,}\s*mermaid\b[\s\S]*?`{3,}/gi, '[diagram]')
  // Render the whole note, not just the first paragraph, so card previews are
  // not cut off at the first blank line.
  return renderMarkdown(processed)
}

export { marked }

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
 * Configure DOMPurify to allow safe HTML elements for markdown rendering
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
    'input', // for checkboxes
    'svg',
    'g',
    'path',
    'line',
    'rect',
    'circle',
    'text',
    'polygon',
    'polyline',
    'marker',
    'defs',
    'style',
    'foreignObject' // for mermaid diagrams
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
    'disabled',
    // SVG attributes for mermaid
    'viewBox',
    'xmlns',
    'fill',
    'stroke',
    'stroke-width',
    'd',
    'transform',
    'x',
    'y',
    'x1',
    'y1',
    'x2',
    'y2',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'points',
    'marker-end',
    'marker-start',
    'font-size',
    'text-anchor',
    'dominant-baseline',
    'style',
    'aria-roledescription',
    'role'
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

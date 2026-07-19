import mermaid from 'mermaid'
import { marked } from './markdown.js'

/**
 * Initialize mermaid with the minimal startup configuration.
 *
 * @param {string} theme - The UI theme ('dark' or 'light').
 */
export function initializeMermaid(theme) {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'light' ? 'default' : 'dark',
    securityLevel: 'strict'
  })
}

/**
 * Re-initialize mermaid with the full diagram configuration for a theme.
 *
 * Used when the UI theme changes so diagrams re-render with matching colors.
 *
 * @param {string} theme - The UI theme ('dark' or 'light').
 */
export function reinitializeMermaid(theme) {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'light' ? 'default' : 'dark',
    securityLevel: 'strict',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 15,
      useMaxWidth: true
    },
    themeVariables:
      theme === 'dark'
        ? {
            primaryColor: '#0f4c75',
            primaryTextColor: '#e0e0e0',
            primaryBorderColor: '#4fc3f7',
            lineColor: '#4fc3f7',
            secondaryColor: '#0d0d0d',
            tertiaryColor: '#1a1f2e',
            background: '#1a1a1a',
            mainBkg: '#0d0d0d',
            secondBkg: '#1a1f2e',
            mainContrastColor: '#e0e0e0',
            darkMode: true,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px'
          }
        : {}
  })
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const mermaidExtension = {
  name: 'mermaid',
  renderer: {
    code(token) {
      // Mermaid decodes HTML entities before parsing, so escaping is safe here too
      if (token.lang === 'mermaid') {
        return `<pre class="mermaid">${escapeHtml(token.text)}</pre>`
      }
      return `<pre><code class="language-${escapeHtml(token.lang || '')}">${escapeHtml(token.text)}</code></pre>`
    }
  }
}
marked.use(mermaidExtension)

/**
 * Render all mermaid diagrams in note previews that are not yet processed,
 * then mark them as processed.
 */
export async function renderPendingMermaidDiagrams() {
  try {
    await mermaid.run({
      querySelector: '.notes-preview pre.mermaid:not([data-processed])'
    })
    document.querySelectorAll('.notes-preview pre.mermaid').forEach((el) => {
      el.setAttribute('data-processed', 'true')
    })
  } catch {
    // Mermaid render failed
  }
}

/**
 * Clear the processed marker from all rendered mermaid diagrams so the next
 * render pass re-renders them (e.g. after a theme change).
 */
export function resetProcessedMermaidDiagrams() {
  document.querySelectorAll('.mermaid[data-processed]').forEach((el) => {
    el.removeAttribute('data-processed')
  })
}

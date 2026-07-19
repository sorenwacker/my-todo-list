// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  preprocessMarkdown,
  renderMarkdown,
  renderCardMarkdown,
  renderCardNotes
} from '../src/renderer/utils/markdown.js'

describe('preprocessMarkdown', () => {
  it('expands 2-space list indentation to 4 spaces per level', () => {
    const input = '- parent\n  - child\n    - grandchild'
    expect(preprocessMarkdown(input)).toBe('- parent\n    - child\n        - grandchild')
  })

  it('leaves standard 4-space list indentation unchanged', () => {
    const input = '- parent\n    - child\n        - grandchild'
    expect(preprocessMarkdown(input)).toBe(input)
  })

  it('expands ordered list indentation using the same unit', () => {
    const input = '1. parent\n  2. child'
    expect(preprocessMarkdown(input)).toBe('1. parent\n    2. child')
  })

  it('leaves lines inside backtick fences untouched', () => {
    const input = '- item\n```\n  - not a list\n  indented code\n```\n  - real child'
    expect(preprocessMarkdown(input)).toBe(
      '- item\n```\n  - not a list\n  indented code\n```\n    - real child'
    )
  })

  it('leaves lines inside tilde fences untouched', () => {
    const input = '~~~\n  - not a list\n~~~\n- item\n  - child'
    expect(preprocessMarkdown(input)).toBe('~~~\n  - not a list\n~~~\n- item\n    - child')
  })

  it('returns input unchanged when no indented list lines exist', () => {
    const input = '# heading\n\nplain paragraph\n- flat item'
    expect(preprocessMarkdown(input)).toBe(input)
  })

  it('returns empty string for empty input', () => {
    expect(preprocessMarkdown('')).toBe('')
    expect(preprocessMarkdown(null)).toBe('')
  })
})

describe('renderMarkdown', () => {
  it('renders nested lists from 2-space indentation', () => {
    const html = renderMarkdown('- parent\n  - child')
    expect(html).toMatch(/<ul>[\s\S]*<ul>/)
    expect(html).toContain('child')
  })

  it('renders nested lists from 4-space indentation', () => {
    const html = renderMarkdown('- parent\n    - child')
    expect(html).toMatch(/<ul>[\s\S]*<ul>/)
  })

  it('does not corrupt list-like lines inside fenced code blocks', () => {
    const html = renderMarkdown('```\n  - keep me verbatim\n```')
    expect(html).toContain('<code>')
    expect(html).toContain('- keep me verbatim')
  })

  it('strips script tags', () => {
    const html = renderMarkdown('hello <script>alert(1)</script> world')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
  })

  it('strips event handler attributes', () => {
    const html = renderMarkdown('<img src="x.png" onerror="alert(1)" onclick="alert(2)">')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('onclick')
  })

  it('removes javascript: URLs from links', () => {
    const html = renderMarkdown('[click](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })

  it('forces links to open in a new tab with noopener', () => {
    const html = renderMarkdown('[site](https://example.com)')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})

describe('renderCardNotes', () => {
  it('replaces mermaid code blocks with a placeholder', () => {
    const html = renderCardNotes('```mermaid\ngraph TD\nA-->B\n```')
    expect(html).toContain('[diagram]')
    expect(html).not.toContain('graph TD')
  })

  it('renders regular notes as markdown', () => {
    expect(renderCardNotes('**bold**')).toContain('<strong>')
  })

  it('returns empty string for empty input', () => {
    expect(renderCardNotes('')).toBe('')
  })
})

describe('renderCardMarkdown', () => {
  it('renders only the first paragraph', () => {
    const html = renderCardMarkdown('first paragraph\n\nsecond paragraph')
    expect(html).toContain('first paragraph')
    expect(html).not.toContain('second paragraph')
  })

  it('returns empty string for empty input', () => {
    expect(renderCardMarkdown('')).toBe('')
  })
})

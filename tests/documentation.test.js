import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// The README drifts silently: pages get added under docs/ and modules under
// src/main/ without the README ever being touched, and the drift is only
// noticed long after a release has shipped it. These gates fail the moment
// the README stops describing what is actually in the repository.
const root = join(import.meta.dirname, '..')
const readme = readFileSync(join(root, 'README.md'), 'utf8')

describe('README documentation index', () => {
  it('links every page under docs/', () => {
    const pages = readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.md'))
    const unlinked = pages.filter((page) => !readme.includes(`docs/${page}`))
    expect(unlinked).toEqual([])
  })
})

describe('README project structure', () => {
  it('lists every module in src/main/', () => {
    const modules = readdirSync(join(root, 'src/main')).filter((f) => f.endsWith('.js'))
    const missing = modules.filter((module) => !readme.includes(module))
    expect(missing).toEqual([])
  })
})

describe('licensing', () => {
  it('ships the licence file the package metadata claims', () => {
    const { license } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    expect(license).toBe('Apache-2.0')
    expect(existsSync(join(root, 'LICENSE'))).toBe(true)
    expect(existsSync(join(root, 'NOTICE'))).toBe(true)
    expect(readFileSync(join(root, 'LICENSE'), 'utf8')).toContain('Apache License')
  })

  it('states that same licence in the README', () => {
    expect(readme).toMatch(/Apache License 2\.0/)
    expect(readme).not.toMatch(/MIT License/)
  })
})

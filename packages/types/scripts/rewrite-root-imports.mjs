import {
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)))
const TYPES_SRC_DIR = resolve(SCRIPT_DIR, '..', 'src')
const DEFAULT_SCAN_ROOT = resolve(SCRIPT_DIR, '..', '..', '..')

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs'])
const IGNORED_DIRS = new Set([
  '.git',
  '.jj',
  '.turbo',
  '.next',
  '.cache',
  'node_modules',
  'dist',
  'build',
  'coverage',
])

function collectExportedSymbolsByDomain() {
  const symbolToDomain = new Map()
  const domains = readdirSync(TYPES_SRC_DIR)
    .filter((name) => statSync(join(TYPES_SRC_DIR, name)).isDirectory())
    .sort((a, b) => a.localeCompare(b))

  for (const domain of domains) {
    const domainDir = join(TYPES_SRC_DIR, domain)
    const files = readdirSync(domainDir).filter(
      (file) => file.endsWith('.type.ts') || file.endsWith('.enum.ts'),
    )

    for (const file of files) {
      const source = readFileSync(join(domainDir, file), 'utf8')
      const matches = source.matchAll(
        /export\s+(?:declare\s+)?(?:interface|type|enum|const|class|function)\s+([A-Za-z_][A-Za-z0-9_]*)/g,
      )

      for (const match of matches) {
        const symbol = match[1]
        const existing = symbolToDomain.get(symbol)
        if (existing && existing !== domain) {
          symbolToDomain.set(symbol, null)
          continue
        }
        symbolToDomain.set(symbol, domain)
      }
    }
  }

  return symbolToDomain
}

function walkFiles(rootDir, out) {
  const entries = readdirSync(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name)
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walkFiles(fullPath, out)
      }
      continue
    }

    if (ALLOWED_EXTENSIONS.has(extname(entry.name))) {
      out.push(fullPath)
    }
  }
}

function parseSpecifier(raw) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  const isInlineType = trimmed.startsWith('type ')
  const withoutType = isInlineType ? trimmed.slice(5).trim() : trimmed
  const aliasParts = withoutType.split(/\s+as\s+/)
  const imported = aliasParts[0]?.trim()
  const local = aliasParts[1]?.trim() ?? imported

  if (!imported || !local) {
    return null
  }

  return {
    imported,
    local,
    isType: isInlineType,
  }
}

function formatSpec(spec) {
  const alias = spec.local === spec.imported ? spec.imported : `${spec.imported} as ${spec.local}`
  return spec.isType ? `type ${alias}` : alias
}

function formatGroupedImport(domain, specs) {
  const allTypeOnly = specs.every((spec) => spec.isType)
  const formattedSpecs = allTypeOnly
    ? specs.map((spec) => (spec.local === spec.imported ? spec.imported : `${spec.imported} as ${spec.local}`))
    : specs.map(formatSpec)

  const keyword = allTypeOnly ? 'import type' : 'import'
  return `${keyword} { ${formattedSpecs.join(', ')} } from '@librestock/types/${domain}'`
}

function rewriteRootImports(source, symbolToDomain, unresolved) {
  const pattern = /^import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]@librestock\/types['"];?$/gm

  return source.replace(pattern, (fullMatch, importTypePrefix, specifierList) => {
    const specs = specifierList
      .split(',')
      .map(parseSpecifier)
      .filter(Boolean)
      .map((spec) => ({
        ...spec,
        isType: Boolean(importTypePrefix) || spec.isType,
      }))

    if (specs.length === 0) {
      return fullMatch
    }

    const byDomain = new Map()

    for (const spec of specs) {
      const domain = symbolToDomain.get(spec.imported)
      if (!domain) {
        unresolved.add(spec.imported)
        return fullMatch
      }

      const list = byDomain.get(domain) ?? []
      list.push(spec)
      byDomain.set(domain, list)
    }

    return [...byDomain.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([domain, domainSpecs]) => formatGroupedImport(domain, domainSpecs))
      .join('\n')
  })
}

function run() {
  const scanRoots = process.argv.slice(2)
  const roots = scanRoots.length > 0 ? scanRoots.map((root) => resolve(root)) : [DEFAULT_SCAN_ROOT]
  const symbolToDomain = collectExportedSymbolsByDomain()
  const unresolved = new Set()
  const files = []

  for (const root of roots) {
    walkFiles(root, files)
  }

  let updated = 0
  for (const file of files) {
    const original = readFileSync(file, 'utf8')
    if (!original.includes("@librestock/types'") && !original.includes('@librestock/types"')) {
      continue
    }

    const rewritten = rewriteRootImports(original, symbolToDomain, unresolved)
    if (rewritten !== original) {
      writeFileSync(file, rewritten)
      updated += 1
    }
  }

  console.log(`Updated ${updated} file(s) with @librestock/types subpath imports.`)
  if (unresolved.size > 0) {
    const symbols = [...unresolved].sort((a, b) => a.localeCompare(b))
    console.warn(`Unresolved symbols (${symbols.length}): ${symbols.join(', ')}`)
    process.exitCode = 1
  }

  for (const root of roots) {
    console.log(`Scanned root: ${relative(process.cwd(), root) || '.'}`)
  }
}

run()

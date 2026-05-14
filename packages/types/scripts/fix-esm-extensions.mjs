import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const target = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist', 'esm')

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!path.endsWith('.js') && !path.endsWith('.d.ts')) continue
    const src = readFileSync(path, 'utf8')
    const fixed = src.replace(
      /(from\s+|import\s*\(\s*|import\s+)(['"])(\.\.?\/[^'"]+?)\2/g,
      (match, prefix, quote, spec) => {
        if (/\.[mc]?js$/.test(spec)) return match
        return `${prefix}${quote}${spec}.js${quote}`
      },
    )
    if (fixed !== src) writeFileSync(path, fixed)
  }
}

walk(target)

import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'src')

const isDir = (path) => statSync(path).isDirectory()
const folders = readdirSync(root)
  .map((name) => ({ name, path: join(root, name) }))
  .filter((entry) => isDir(entry.path))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b))

const isExportable = (name) =>
  (name.endsWith('.type.ts') || name.endsWith('.enum.ts') || name.endsWith('.schema.ts')) && name !== 'index.ts'

const exportLine = (file) => `export * from './${file.replace(/\.ts$/, '')}'\n`

for (const folder of folders) {
  const dir = join(root, folder)
  const entries = readdirSync(dir)
    .filter((name) => isExportable(name))
    .sort((a, b) => a.localeCompare(b))

  const lines = entries.map(exportLine).join('')
  writeFileSync(join(dir, 'index.ts'), lines)
}

const rootLines = folders.map((name) => `export * from './${name}/index'\n`).join('')
writeFileSync(join(root, 'index.ts'), rootLines)

console.log('Generated barrels for:', folders.join(', '))

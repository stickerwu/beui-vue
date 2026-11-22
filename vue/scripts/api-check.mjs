// Prints the docs API table for one install slug exactly as catalog.mjs will build it
// (upstream react-docgen rows merged with the Vue component), plus the upstream props
// the Vue port does not expose yet. Read-only; safe to run while others edit.
//
//   node scripts/api-check.mjs <slug>
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { apiDocs } from './api-docs.mjs'
import { readPorts } from './ports.mjs'

const slug = process.argv[2]
const { entries } = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'))
const entry = entries.find(item => item.slug === slug)
if (!entry) { console.error(`Unknown slug ${slug}`); process.exit(2) }
const ports = await readPorts()
const port = ports[slug]
const packageSource = fileURLToPath(new URL('../packages/ui/src/', import.meta.url))
const exports = new Map()
for (const filename of readdirSync(packageSource, { recursive: true })) {
  if (!filename.endsWith('.ts')) continue
  const file = `${packageSource}${filename.replaceAll('\\', '/')}`
  for (const match of readFileSync(file, 'utf8').matchAll(/export \{\s*default as (\w+)\s*\} from '([^']+\.vue)'/g)) {
    exports.set(match[1], fileURLToPath(new URL(match[2], `file:///${file.replaceAll('\\', '/')}`)))
  }
}
const { docs, gaps } = apiDocs(entry.source, name => exports.get(name), exports.get(port?.name))
console.log(`${slug}: upstream ${entry.source} → Vue ${port?.name} (${exports.get(port?.name) ?? 'not exported as a .vue default'})\n`)
for (const doc of docs) {
  console.log(`## ${doc.displayName || port?.name}`)
  for (const row of doc.rows) console.log(`  ${row.name}${row.required ? '' : '?'}  ${row.type}  default=${row.defaultValue ?? '—'}${row.description ? `\n      ${row.description}` : ''}`)
}
console.log(gaps.length ? `\nUpstream API missing in Vue:\n${JSON.stringify(gaps, null, 1)}` : '\nNo upstream API gaps.')
// For default/type comparison: what beui.dev documents for the same file.
const upstream = JSON.parse(readFileSync(new URL('../upstream-props.json', import.meta.url), 'utf8'))[entry.source] ?? []
console.log('\nbeui.dev (react-docgen) for comparison:')
for (const doc of upstream.filter(item => item.props.length)) {
  console.log(`## ${doc.displayName}`)
  for (const prop of doc.props) console.log(`  ${prop.name}${prop.required ? '' : '?'}  ${prop.type}  default=${prop.defaultValue ?? '—'}`)
}

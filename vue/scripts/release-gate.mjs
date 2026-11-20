import { readFile } from 'node:fs/promises'
import { readPorts } from './ports.mjs'

const load = async file => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'))
const {version} = await load('packages/ui/package.json')
if (version.split('.')[0] !== '0' && !version.includes('-')) {
  const {entries} = await load('catalog.json')
  const ports = await readPorts()
  const incomplete = entries.filter(({slug}) => !ports[slug]?.acceptance?.length)
  if (incomplete.length) throw Error(`Stable release requires evidence for ${incomplete.length} remaining entries`)
}

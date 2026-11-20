import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const revision = 'c0a936f59eb767e263c0e81b93dd323511dc9b6b'
const repository = fileURLToPath(new URL('../../', import.meta.url))
const destination = new URL('../packages/ui/src/charts/models/', import.meta.url)
const models = ['treemap', 'sankey-chart', 'liquidity-heatmap', 'volume-profile']
await mkdir(destination, { recursive: true })
for (const slug of models) {
  const source = `components/charts/${slug}/model.ts`
  const content = execFileSync('git', ['show', `${revision}:${source}`], { cwd: repository, encoding: 'utf8' })
  const output = new URL(`${slug}.ts`, destination)
  if (process.argv.includes('--check')) {
    const current = (await readFile(output, 'utf8')).replaceAll('\r\n', '\n')
    if (current !== content) throw new Error(`${slug} differs from its pinned upstream model`)
  } else {
    await writeFile(output, content)
  }
}

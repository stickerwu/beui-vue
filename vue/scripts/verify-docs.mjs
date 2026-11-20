import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { componentRoutes, siteURL } from './routes.mjs'

const root = 'docs/.vitepress/dist'
const {entries} = JSON.parse(await readFile('catalog.json', 'utf8'))
const {paths, groups} = componentRoutes(entries)
const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8')
const index = await readFile(join(root, 'llms.txt'), 'utf8')
const canonical = value => `<link rel="canonical" href="${value}"`
for (const path of new Set([...groups.keys(), ...paths.values(), '/', '/catalog', '/verification', '/install'])) {
  const address = siteURL + path.slice(1)
  const html = await readFile(join(root, (path === '/' ? 'index' : path.slice(1)) + '.html'), 'utf8')
  assert(html.includes(canonical(address)), address)
  assert(html.includes(`property="og:url" content="${address}"`), address)
  assert(sitemap.includes(`<loc>${address}</loc>`), address)
  assert(html.includes('rel="icon"'), address)
}
for (const [slug, path] of paths) {
  assert(index.includes(`(${siteURL}${path.slice(1)})`), path)
  const html = await readFile(join(root, path.slice(1) + '.html'), 'utf8')
  assert(html.includes('class="beui-demo" data-ready="false"'), path)
  const alias = await readFile(join(root, 'components', `${slug}.html`), 'utf8')
  assert(alias.includes(canonical(siteURL + path.slice(1))), path)
}
const home = await readFile(join(root, 'index.html'), 'utf8')
assert(home.includes('application/ld+json') && home.includes('starc007/ui-components'))
for (const file of ['social.png', 'favicon.png', 'beui-vue.png', 'apple-touch-icon.png']) assert((await stat(join(root, 'brand', file))).size > 100)
console.log(`${groups.size} upstream routes, ${paths.size} component previews and aliases, search and social metadata verified`)

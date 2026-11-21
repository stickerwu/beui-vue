import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { componentRoutes, siteURL } from './routes.mjs'

const root = 'docs/.vitepress/dist'
const {entries} = JSON.parse(await readFile('catalog.json', 'utf8'))
const {paths, groups} = componentRoutes(entries)
const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8')
const canonical = value => `<link rel="canonical" href="${value}"`

/** Both locales ship every page: Chinese at the root, English under /en. */
const locales = [
  {prefix: '', lang: 'zh-CN', llms: join(root, 'llms.txt')},
  {prefix: 'en/', lang: 'en', llms: join(root, 'en', 'llms.txt')},
]
for (const locale of locales) {
  const index = await readFile(locale.llms, 'utf8')
  const page = path => join(root, locale.prefix + (path === '/' ? 'index' : path.slice(1)) + '.html')
  const url = path => siteURL + locale.prefix + path.slice(1)
  for (const path of new Set([...groups.keys(), ...paths.values(), '/', '/catalog', '/verification', '/install'])) {
    const html = await readFile(page(path), 'utf8')
    assert(html.includes(`<html lang="${locale.lang}"`), `${locale.prefix}${path} lang`)
    assert(html.includes(canonical(url(path))), url(path))
    assert(html.includes(`property="og:url" content="${url(path)}"`), url(path))
    assert(sitemap.includes(`<loc>${url(path)}</loc>`), url(path))
    assert(html.includes('rel="icon"'), url(path))
  }
  for (const [slug, path] of paths) {
    assert(index.includes(`(${url(path)})`), url(path))
    const html = await readFile(page(path), 'utf8')
    assert(html.includes('class="beui-demo" data-ready="false"'), path)
    const alias = await readFile(join(root, 'components', `${slug}.html`), 'utf8')
    assert(alias.includes(canonical(siteURL + path.slice(1))), path)
  }
  assert(index.includes('beui-vue'), locale.llms)
}
const chinese = await readFile(join(root, 'index.html'), 'utf8')
const english = await readFile(join(root, 'en', 'index.html'), 'utf8')
assert(/[一-鿿]/.test(chinese), 'Chinese home copy')
// The locale switcher keeps its own label, and testimonials quote real people;
// everything else on the English home must come from the English dictionary.
const stripQuotes = html => html
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<div class="home-testimonial-wall"[\s\S]*?<\/section>/g, '')
  .replace(/简体中文/g, '')
assert(!/[一-鿿]/.test(stripQuotes(english)), 'English home copy must not fall back to Chinese')
assert(chinese.includes('application/ld+json') && chinese.includes('starc007/ui-components'))
for (const file of ['social.png', 'favicon.png', 'beui-vue.png', 'apple-touch-icon.png']) assert((await stat(join(root, 'brand', file))).size > 100)
console.log(`${groups.size} upstream routes × ${locales.length} locales, ${paths.size} component previews and aliases, search and social metadata verified`)

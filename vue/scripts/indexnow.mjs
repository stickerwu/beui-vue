// Tells IndexNow (Bing, Yandex, Seznam, Naver and others that share it) about every URL in
// the built sitemap, or only the URLs whose <lastmod> is on or after --since=YYYY-MM-DD.
// The key file lives at docs/public/<key>.txt so engines can check we own the host.
//
//   node scripts/indexnow.mjs                 # every URL
//   node scripts/indexnow.mjs --since=2026-11-25
//   node scripts/indexnow.mjs --dry-run
import { readFile } from 'node:fs/promises'
import { siteURL } from './routes.mjs'

const KEY = '724a8cb3297c12ecb7ab7ffe1cc840c0'
const sitemap = await readFile('docs/.vitepress/dist/sitemap.xml', 'utf8')
const since = process.argv.find(arg => arg.startsWith('--since='))?.slice(8)
const dryRun = process.argv.includes('--dry-run')

const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].flatMap(([, block]) => {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]
  const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]
  if (!loc) return []
  if (since && (!lastmod || lastmod.slice(0, 10) < since)) return []
  return [loc]
})

const host = new URL(siteURL).host
console.log(`${urls.length} URLs for ${host}${since ? ` changed since ${since}` : ''}`)
if (dryRun || !urls.length) process.exit(0)

// IndexNow accepts up to 10,000 URLs per request.
for (let start = 0; start < urls.length; start += 10000) {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: KEY, keyLocation: `${siteURL}${KEY}.txt`, urlList: urls.slice(start, start + 10000) }),
  })
  console.log(`IndexNow ${response.status} ${response.statusText}`)
  if (response.status >= 400) {
    console.log(await response.text())
    process.exitCode = 1
  }
}

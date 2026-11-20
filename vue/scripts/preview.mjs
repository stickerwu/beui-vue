import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../docs/.vitepress/dist/', import.meta.url))
const prefix = '/beui-vue/'
const contentTypes = {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon'}
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (!pathname.startsWith(prefix)) throw Error('Unknown path')
    const slug = pathname.slice(prefix.length)
    const name = slug.endsWith('/') || !slug ? `${slug}index.html` : extname(slug) ? slug : `${slug}.html`
    const file = resolve(dist, name)
    if (!file.startsWith(resolve(dist) + sep)) throw Error('Unknown file')
    const content = await readFile(file)
    response.writeHead(200, {'content-type':contentTypes[extname(file)] || 'application/octet-stream', 'cache-control':'no-store'})
    response.end(content)
  } catch {
    response.writeHead(404).end()
  }
}).listen(4174, '127.0.0.1', () => console.log('http://127.0.0.1:4174/beui-vue/'))

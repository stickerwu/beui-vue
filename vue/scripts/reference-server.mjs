// Serves the upstream React previews at /?original=1&slug=<category>/<slug> for side-by-side parity checks.
import { fileURLToPath } from 'node:url'

const {createServer} = await import(new URL('../../node_modules/vite/dist/node/index.js', import.meta.url))
const server = await createServer({
  configFile:fileURLToPath(new URL('../parity/vite.config.mts', import.meta.url)),
  server:{port:Number(process.env.PORT ?? 4194)},
})
await server.listen()
server.printUrls()

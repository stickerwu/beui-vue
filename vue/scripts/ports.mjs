import { readFile, readdir } from 'node:fs/promises'

export async function readPorts() {
  const root = new URL('../', import.meta.url)
  const ports = {}
  const manifests = (await readdir(root)).filter(file => /^ports(?:-[a-z-]+)?\.json$/.test(file)).sort()
  for (const file of manifests) {
    const group = JSON.parse(await readFile(new URL(file, root), 'utf8'))
    for (const [slug, port] of Object.entries(group)) {
      if (Object.hasOwn(ports, slug)) throw Error(`Port registered twice: ${slug}`)
      ports[slug] = port
    }
  }
  return ports
}

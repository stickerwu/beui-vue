// Thin typed client over the live beui-vue registry (beui.stickerwu.net/r/*). The
// MCP server owns no data: it reads the shadcn-vue registry the docs build
// publishes, so new components appear without redeploying the Worker.

export type RegistryFileRef = { path: string; type: string; target?: string };
export type RegistryFile = RegistryFileRef & { content: string };

/** One entry of `/r/index.json` (a shadcn-vue registry catalog). */
export type IndexItem = {
  name: string;
  type: string;
  title: string;
  description: string;
  categories?: string[];
  dependencies?: string[];
  meta?: { page?: string };
  files: RegistryFileRef[];
};

export type RegistryIndex = { name: string; homepage: string; items: IndexItem[] };

/** `/r/{name}.json`: the same item with every file's content and the usage note. */
export type RegistryItem = Omit<IndexItem, 'files'> & { files: RegistryFile[]; docs?: string };

export type Env = { REGISTRY_URL?: string };

const TTL_SECONDS = 300;

export function base(env: Env) {
  return (env.REGISTRY_URL ?? 'https://beui.stickerwu.net').replace(/\/$/, '');
}

async function fetchJson<T>(url: string): Promise<T> {
  const cache = (caches as unknown as { default: Cache }).default
  const key = new Request(url, { headers: { accept: 'application/json' } })
  const cached = await cache.match(key)
  if (cached) return (await cached.json()) as T
  const response = await fetch(key)
  if (!response.ok) throw new Error(`Registry responded ${response.status} for ${url}`)
  const body = await response.text()
  await cache.put(key, new Response(body, {
    headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${TTL_SECONDS}` },
  }))
  return JSON.parse(body) as T
}

export const getIndex = (env: Env) => fetchJson<RegistryIndex>(`${base(env)}/r/index.json`)

/** Install slugs are lowercase words joined by dashes; anything else never reaches the registry. */
export function validSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}

export function getItem(env: Env, slug: string) {
  if (!validSlug(slug)) return Promise.reject(new Error('A slug is lowercase letters, digits and dashes, e.g. "button-base".'))
  return fetchJson<RegistryItem>(`${base(env)}/r/${slug}.json`)
}

const PM_PREFIX = { bun: 'bunx --bun', npm: 'npx', pnpm: 'pnpm dlx', yarn: 'yarn dlx' } as const
export type PackageManager = keyof typeof PM_PREFIX
export const PACKAGE_MANAGERS = Object.keys(PM_PREFIX) as PackageManager[]

/** The shadcn-vue install command, using the `@beui-vue` namespace from the shadcn-vue registry directory. */
export function installCommand(slug: string, pm: PackageManager) {
  return `${PM_PREFIX[pm]} shadcn-vue@latest add @beui-vue/${slug}`
}

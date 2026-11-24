// Calls each tool through the official MCP client against a running server (default: wrangler dev).
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const url = new URL(process.argv[2] ?? 'http://127.0.0.1:8787/mcp')
const client = new Client({ name: 'beui-vue-smoke', version: '0.0.0' })
await client.connect(new StreamableHTTPClientTransport(url))
const { tools } = await client.listTools()
console.log('tools:', tools.map(tool => tool.name).join(', '))
const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args })
  const text = result.content[0].text
  return result.isError ? `ERROR ${text}` : JSON.parse(text)
}
const list = await call('list_components', { category: 'agents' })
console.log('list agents:', list.length, list.slice(0, 3).map(item => item.slug).join(', '))
const all = await call('list_components', {})
console.log('list all:', all.length)
const found = await call('search_components', { query: 'bottom sheet' })
console.log('search "bottom sheet":', found.slice(0, 3).map(item => item.slug).join(', '))
const toast = await call('search_components', { query: 'toast' })
console.log('search "toast":', toast.slice(0, 3).map(item => item.slug).join(', '))
const item = await call('get_component', { slug: 'button-base' })
console.log('get button-base:', item.files.length, 'files,', item.files[0].path, item.files[0].content.length, 'chars;', item.install, '|', item.usage?.split('\n')[0])
console.log('get bad slug:', String(await call('get_component', { slug: '../etc' })).slice(0, 90))
console.log('get missing:', String(await call('get_component', { slug: 'no-such-thing' })).slice(0, 90))
const cmd = await call('get_install_command', { slug: 'command-palette', packageManager: 'pnpm' })
console.log('install pnpm:', cmd.command)
await client.close()

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { Env } from './registry.js'
import { createServer } from './server.js'

const LANDING = `beui-vue MCP server

Animated Vue 3 components and blocks (the Vue port of beUI).

Connect your MCP client to:
  https://beui.stickerwu.net/mcp   (stateless Streamable HTTP, no key)

Tools: list_components, search_components, get_component, get_install_command
Docs:  https://beui.stickerwu.net/en/docs/ai-agents
`

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
  'access-control-expose-headers': 'mcp-session-id, mcp-protocol-version',
}

function withCors(response: Response) {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(CORS)) headers.set(name, value)
  headers.set('cache-control', 'no-store')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname !== '/mcp' && pathname !== '/mcp/') return new Response('Not found', { status: 404 })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    // A browser or a GET without the event-stream header gets a short description of the server.
    if (request.method === 'GET') {
      return withCors(new Response(LANDING, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }))
    }
    if (request.method !== 'POST') {
      return withCors(new Response('Use Streamable HTTP POST requests at /mcp.', { status: 405, headers: { allow: 'POST, GET, OPTIONS' } }))
    }
    // Stateless: a fresh server and transport per request, plain JSON responses, no session to keep.
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    const server = createServer(env)
    await server.connect(transport)
    try {
      return withCors(await transport.handleRequest(request))
    } finally {
      // The JSON response is already complete; release the server for this request.
      void server.close()
    }
  },
} satisfies ExportedHandler<Env>

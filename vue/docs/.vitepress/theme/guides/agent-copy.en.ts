/**
 * Copy for the Agent guide, from beui.dev's `Pages.aiAgents` (messages/en/pages.json),
 * rewritten for beui-vue's endpoints. Text between backticks renders as inline code.
 */
export const agentCopyEn = {
  header: {
    eyebrow: 'Agent guide',
    title: 'For AI agents',
    intro: 'beui-vue exposes a static, agent-friendly surface. Install the skill, connect the MCP server below, or hit the raw endpoints directly. Coding agents (Claude, Codex, Cursor, Amp) can list components, fetch source with all deps, and drop files into the user\'s project.',
  },
  agentSkill: {
    title: 'Agent skill',
    body: 'The skill teaches coding agents to fetch the live registry first, pick the closest `items[].name` install slug, inspect it, then install with shadcn-vue and compose from the generated source. Use it when you want agents to choose existing beui-vue components instead of inventing custom motion widgets.',
  },
  mcpServer: {
    title: 'MCP server',
    body: 'The fastest path: connect the beui-vue MCP server and your agent can list, search and install components directly. Hosted at `{url}`.',
    manual: 'Any other client: add it manually to your MCP config.',
    tools: 'Tools: `list_components`, `search_components`, `get_component`, `get_install_command`. The server reads the live registry, so new components show up without a redeploy.',
  },
  endpoints: {
    title: 'Endpoints',
    open: 'Open',
    llmsTxt: { label: 'llms.txt', desc: 'Markdown index in llmstxt.org format.' },
    registryIndex: { label: 'Registry index', desc: 'JSON catalogue of every installable component.' },
    shadcnItem: { label: 'shadcn-vue item', desc: 'Install item with every file\'s content, npm dependencies and the usage note.' },
  },
  agentFlow: {
    title: 'Agent flow',
    body: 'Two calls, then install. Each item carries every file it needs.',
  },
  shadcnFlow: {
    title: 'shadcn-vue flow',
    body: 'The shadcn-vue item installs source files and package dependencies. `@beui-vue` is in the shadcn-vue registry directory, so the short name works in any project with a `components.json`.',
  },
  entryShape: {
    title: 'Entry shape',
    body: 'Shared helpers (e.g. `core/motion.ts` and the shared `styles.css`) ship inline as extra files, and `docs` says which file to import.',
  },
}

export type AgentCopy = typeof agentCopyEn

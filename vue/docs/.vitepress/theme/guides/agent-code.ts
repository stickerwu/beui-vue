// Code shown on the Agent guide, adapted from beui.dev (src/routes/-pages/ai-agents.tsx)
// to beui-vue's MCP server, registry endpoints and shadcn-vue CLI.
export const SITE = 'https://beui.stickerwu.net'
export const MCP_URL = `${SITE}/mcp`

export const agentCode = {
  skill: 'npx skills add stickerwu/beui-vue --skill beui-vue',
  mcpCli: `# Claude Code
claude mcp add --transport http beui-vue ${MCP_URL}

# Codex
codex mcp add beui-vue --url ${MCP_URL}

# Amp
amp mcp add beui-vue ${MCP_URL}`,
  mcpManual: `{
  "mcpServers": {
    "beui-vue": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`,
  fetchFlow: `// 1. Discover what exists
const index = await fetch('${SITE}/r/index.json').then((r) => r.json());

// 2. Fetch a component, every file included
const item = await fetch(\`${SITE}/r/\${slug}.json\`).then((r) => r.json());

// 3. Write files into the user's project
for (const file of item.files) {
  await writeFile(\`src/\${file.target}\`, file.content);
}

// 4. Install external deps
await runShell(['npm', 'install', ...item.dependencies]);`,
  shadcn: `# Registry namespace (shadcn-vue directory)
npx shadcn-vue@latest add @beui-vue/animated-toast-stack

# Direct URL, no namespace needed
npx shadcn-vue@latest add ${SITE}/r/animated-toast-stack.json`,
  entryShape: `{
  "name": "button-base",
  "type": "registry:item",
  "title": "Button",
  "description": "Spring-pressed Button plus StatefulButton, MagneticButton, and MetallicButton variants.",
  "categories": ["motion"],
  "dependencies": ["@vueuse/core@^14.0.0", "motion-v@2.13.0"],
  "files": [
    { "path": "components/beui/ButtonBase.vue", "type": "registry:file", "content": "..." },
    { "path": "components/beui/core/motion.ts", "type": "registry:file", "content": "..." },
    { "path": "components/beui/styles.css", "type": "registry:file", "content": "..." }
  ],
  "meta": { "page": "${SITE}/components/motion/button/button-base" },
  "docs": "Use it with: import ButtonBase from '@/components/beui/ButtonBase.vue'"
}`,
}

export const ENDPOINTS = [
  { key: 'llmsTxt', url: '/llms.txt' },
  { key: 'registryIndex', url: '/r/index.json' },
  { key: 'shadcnItem', url: '/r/{slug}.json' },
] as const

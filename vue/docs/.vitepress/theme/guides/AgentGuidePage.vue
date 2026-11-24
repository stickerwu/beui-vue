<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../i18n'
import CodeBlock from '../CodeBlock.vue'
import { agentCopyEn } from './agent-copy.en'
import { agentCopyZh } from './agent-copy.zh'
import { agentCode, ENDPOINTS, MCP_URL } from './agent-code'
import GuideIcon from './GuideIcon.vue'
import GuidePage from './GuidePage.vue'
import GuideRich from './GuideRich.vue'

/** Port of beui.dev's Agent guide (src/routes/-pages/ai-agents.tsx) for beui-vue. */
const { isZh, href } = useLocale()
const copy = computed(() => (isZh.value ? agentCopyZh : agentCopyEn))

/** llms.txt is per locale; registry endpoints are shared. */
const endpointHref = (url: string) => (url === '/llms.txt' ? href(url) : url)
</script>

<template>
  <GuidePage :eyebrow="copy.header.eyebrow" :title="copy.header.title" :intro="copy.header.intro">
    <h2 id="agent-skill" class="beui-ag-h2">{{ copy.agentSkill.title }}</h2>
    <p class="beui-ag-p"><GuideRich :text="copy.agentSkill.body" /></p>
    <div class="beui-ag-block"><CodeBlock :code="agentCode.skill" lang="bash" label="terminal" /></div>

    <h2 id="mcp-server" class="beui-ag-h2">{{ copy.mcpServer.title }}</h2>
    <p class="beui-ag-p"><GuideRich :text="copy.mcpServer.body.replace('{url}', MCP_URL)" /></p>
    <div class="beui-ag-block"><CodeBlock :code="agentCode.mcpCli" lang="bash" label="terminal" /></div>
    <p class="beui-ag-p beui-ag-p-4">{{ copy.mcpServer.manual }}</p>
    <div class="beui-ag-block"><CodeBlock :code="agentCode.mcpManual" lang="json" label="mcp.json" /></div>
    <p class="beui-ag-p beui-ag-p-4 beui-ag-small"><GuideRich :text="copy.mcpServer.tools" /></p>

    <h2 id="endpoints" class="beui-ag-h2">{{ copy.endpoints.title }}</h2>
    <ul class="beui-ag-endpoints">
      <li v-for="endpoint in ENDPOINTS" :key="endpoint.url">
        <div class="beui-ag-endpoint-text">
          <div class="beui-ag-endpoint-head">
            <code class="beui-ag-endpoint-url">{{ endpoint.url }}</code>
            <span class="beui-ag-endpoint-label">{{ copy.endpoints[endpoint.key].label }}</span>
          </div>
          <p class="beui-ag-endpoint-desc">{{ copy.endpoints[endpoint.key].desc }}</p>
        </div>
        <!-- Machine endpoints are not site routes, so a plain anchor. -->
        <a v-if="!endpoint.url.includes('{')" class="beui-ag-open" :href="endpointHref(endpoint.url)" target="_blank" rel="noreferrer noopener">
          {{ copy.endpoints.open }}
          <GuideIcon name="arrow-up-right" class="beui-ag-open-icon" />
        </a>
      </li>
    </ul>

    <h2 id="agent-flow" class="beui-ag-h2">{{ copy.agentFlow.title }}</h2>
    <p class="beui-ag-p">{{ copy.agentFlow.body }}</p>
    <div class="beui-ag-block"><CodeBlock :code="agentCode.fetchFlow" lang="typescript" label="agent.ts" /></div>

    <h2 id="shadcn-flow" class="beui-ag-h2">{{ copy.shadcnFlow.title }}</h2>
    <p class="beui-ag-p"><GuideRich :text="copy.shadcnFlow.body" /></p>
    <div class="beui-ag-block"><CodeBlock :code="agentCode.shadcn" lang="bash" label="terminal" /></div>

    <h2 id="entry-shape" class="beui-ag-h2">{{ copy.entryShape.title }}</h2>
    <p class="beui-ag-p"><GuideRich :text="copy.entryShape.body" /></p>
    <div class="beui-ag-block"><CodeBlock :code="agentCode.entryShape" lang="json" label="r/button-base.json" /></div>
  </GuidePage>
</template>

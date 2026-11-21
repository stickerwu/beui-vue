<script setup lang="ts">
import { computed } from 'vue'
import AgentCodeLine from './AgentCodeLine.vue'
import type { AgentCodeLanguage } from './agent-code'
const props = withDefaults(defineProps<{ code: string, language?: AgentCodeLanguage | string, wrap?: boolean }>(), { language: 'bash' })
const lines = computed(() => props.code.split('\n'))
</script>
<template><pre class="be-ag-pre" :data-wrap="wrap || undefined"><code><template v-for="(line, index) in lines" :key="index"><AgentCodeLine :code="line" :language="language" /><template v-if="index < lines.length - 1">{{ '\n' }}</template></template></code></pre></template>
<style scoped>
.be-ag-pre { margin: 0; overflow-x: auto; white-space: pre; font-size: 0.75rem; line-height: 1.25rem; font-family: var(--font-mono, ui-monospace, monospace); color: var(--ag-code-color, color-mix(in srgb, var(--beui-foreground) 85%, transparent)); }
.be-ag-pre[data-wrap] { white-space: pre-wrap; overflow-wrap: break-word; }
</style>

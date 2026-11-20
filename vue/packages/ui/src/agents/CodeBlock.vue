<script setup lang="ts">
import { computed } from 'vue'
import { useCopy, type Labels } from './shared'
const props = withDefaults(defineProps<{ code: string, language?: string, filename?: string, status?: 'streaming' | 'complete', showLineNumbers?: boolean, highlightLines?: number[], maxHeight?: number, wrap?: boolean, copyable?: boolean, onCopy?: () => void | Promise<void>, labels?: Labels }>(), { language: 'typescript', status: 'complete', showLineNumbers: true, highlightLines: () => [], maxHeight: 280, copyable: true })
const { copied, copy } = useCopy()
const lines = computed(() => props.code.split('\n'))
function tokens(line: string) {
  return line.split(/(\/\/.*$|#[^\n]*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|function|return|export|import|from|def|class|if|else|true|false|null|async|await|type|interface|new|for)\b|\b\d+(?:\.\d+)?\b)/g).map((text, index) => ({ text, kind: index % 2 === 0 ? '' : /^\/\/|^#/.test(text) ? 'comment' : /^["']/.test(text) ? 'string' : /^\d/.test(text) ? 'number' : 'keyword' }))
}
</script>
<template>
  <div class="be-agent-box be-code" :aria-busy="status === 'streaming'">
    <div class="be-agent-header"><strong>{{ filename ?? language }}</strong><span v-if="filename" class="be-agent-muted">{{ language }}</span><button v-if="copyable" type="button" class="be-agent-button be-agent-end" :aria-label="copied ? (labels?.copied ?? 'Copied') : (labels?.copy ?? 'Copy code')" @click="copy(code, onCopy)">{{ copied ? '✓' : '⧉' }}</button></div>
    <pre class="be-agent-code" :style="{ maxHeight: `${maxHeight}px`, whiteSpace: wrap ? 'pre-wrap' : 'pre' }"><code><span v-for="(line, index) in lines" :key="index" class="be-code-line" :data-highlight="highlightLines.includes(index + 1) || undefined"><span v-if="showLineNumbers" aria-hidden="true" class="be-line-number">{{ index + 1 }}</span><span v-for="(token, piece) in tokens(line)" :key="piece" :data-token="token.kind">{{ token.text }}</span>{{ '\n' }}</span></code></pre>
  </div>
</template>
<style scoped>.be-code{overflow:hidden}.be-code pre{background:var(--beui-muted);border-radius:0 0 1rem 1rem}.be-line-number{display:inline-block;width:2em;user-select:none;color:var(--beui-muted-foreground)}.be-code-line[data-highlight]{background:color-mix(in srgb,var(--beui-primary) 10%,transparent)}[data-token=comment]{color:var(--beui-muted-foreground)}[data-token=keyword]{color:#9869bb}[data-token=number]{color:#a26736}[data-token=string]{color:#488169}</style>

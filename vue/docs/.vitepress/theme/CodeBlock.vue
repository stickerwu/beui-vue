<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useLocale } from './i18n'

const { t } = useLocale()

const props = withDefaults(defineProps<{
  code: string
  lang?: string
  label?: string
}>(), {
  lang: 'vue',
  label: '',
})

type CodeToken = {
  text: string
  type: string
}

const tokenPattern = /(?<comment><!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(?<string>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(?<tag><\/?[\w.-]+)|(?<keyword>\b(?:as|async|await|break|case|catch|class|const|continue|default|defineEmits|defineExpose|defineModel|defineProps|defineSlots|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|interface|let|new|null|of|return|satisfies|setup|static|super|switch|this|throw|true|try|type|typeof|undefined|var|void|while|withDefaults|yield)\b)|(?<number>\b\d+(?:\.\d+)?\b)|(?<attribute>[\w:@.-]+(?=\s*=))/g
const languageLabels: Record<string, string> = {
  vue: 'VUE',
  typescript: 'TS',
  ts: 'TS',
  javascript: 'JS',
  js: 'JS',
  shell: 'Shell',
  sh: 'Shell',
  bash: 'Shell',
}
const languageLabel = computed(() => languageLabels[props.lang] || props.lang.toUpperCase())
const labelParts = computed(() => {
  const lastSlash = props.label.lastIndexOf('/')
  return {
    directory: props.label.slice(0, lastSlash + 1),
    filename: props.label.slice(lastSlash + 1),
  }
})
const tokens = computed<CodeToken[]>(() => {
  const result: CodeToken[] = []
  let position = 0
  for (const match of props.code.matchAll(tokenPattern)) {
    const matchPosition = match.index ?? 0
    if (matchPosition > position) {
      result.push({ text: props.code.slice(position, matchPosition), type: 'plain' })
    }
    const groups = match.groups || {}
    const type = Object.keys(groups).find(group => groups[group] !== undefined) || 'plain'
    result.push({ text: match[0], type })
    position = matchPosition + match[0].length
  }
  if (position < props.code.length) {
    result.push({ text: props.code.slice(position), type: 'plain' })
  }
  return result
})

const contentId = useId()
const codeContent = useTemplateRef<HTMLElement>('codeContent')
const expanded = shallowRef(false)
const canExpand = shallowRef(false)
const copyState = shallowRef<'idle' | 'copied' | 'failed'>('idle')
const copyLabel = computed(() => t({
  idle: 'Copy code',
  copied: 'Copied!',
  failed: 'Copy failed',
}[copyState.value]))
let resizeObserver: ResizeObserver | undefined
let measureFrame = 0
let copyTimeout: ReturnType<typeof setTimeout> | undefined

function measureCode() {
  canExpand.value = (codeContent.value?.scrollHeight || 0) > 320
}

async function copyCode() {
  clearTimeout(copyTimeout)
  try {
    await navigator.clipboard.writeText(props.code)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
  copyTimeout = setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}

watch(() => props.code, async () => {
  expanded.value = false
  await nextTick()
  measureCode()
})

onMounted(() => {
  measureCode()
  // Collapsing the code resizes the observed element, so measuring inside the
  // callback would trip WebKit's "ResizeObserver loop" error. Measure next frame.
  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(measureFrame)
    measureFrame = requestAnimationFrame(measureCode)
  })
  if (codeContent.value) resizeObserver.observe(codeContent.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(measureFrame)
  clearTimeout(copyTimeout)
})
</script>

<template>
  <div class="beui-code-block" :class="{ 'beui-code-block-unlabelled': !props.label }">
    <div v-if="props.label" class="beui-code-header">
      <div class="beui-code-file">
        <span class="beui-code-language">{{ languageLabel }}</span>
        <svg class="beui-code-file-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm0 0v6h6" />
        </svg>
        <span class="beui-code-filename"><span>{{ labelParts.directory }}</span>{{ labelParts.filename }}</span>
      </div>
      <button
        class="beui-code-copy"
        type="button"
        :aria-label="copyLabel"
        :title="copyLabel"
        @click="copyCode"
      >
        <svg v-if="copyState === 'copied'" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span v-if="copyState !== 'idle'" class="beui-code-copy-feedback" role="status">{{ copyLabel }}</span>
      </button>
    </div>
    <button
      v-else
      class="beui-code-copy beui-code-copy-floating"
      type="button"
      :aria-label="copyLabel"
      :title="copyLabel"
      @click="copyCode"
    >
      <svg v-if="copyState === 'copied'" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      <span v-if="copyState !== 'idle'" class="beui-code-copy-feedback" role="status">{{ copyLabel }}</span>
    </button>
    <div class="beui-code-surface">
      <div
        :id="contentId"
        class="beui-code-viewport"
        :class="{ 'is-collapsible': canExpand, 'is-expanded': expanded }"
        tabindex="0"
        :aria-label="`${props.label || languageLabel} ${t('Code').toLowerCase()}`"
        role="region"
      >
        <pre ref="codeContent" class="beui-code-pre"><code :class="`language-${props.lang}`"><span v-for="(token, index) in tokens" :key="index" :class="`beui-code-token-${token.type}`">{{ token.text }}</span></code></pre>
      </div>
      <div v-if="canExpand && !expanded" class="beui-code-expand-shade">
        <button
          class="beui-code-expand"
          type="button"
          :aria-controls="contentId"
          :aria-expanded="expanded"
          @click="expanded = true"
        >
          {{ t('Expand code') }}
        </button>
      </div>
      <button
        v-if="canExpand && expanded"
        class="beui-code-collapse"
        type="button"
        :aria-controls="contentId"
        :aria-expanded="expanded"
        @click="expanded = false"
      >
        {{ t('Collapse code') }}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { StreamingResponse, type CitationItem } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

const PIECES = [
  'A streaming response can link directly to ',
  "Motion's Vue guide",
  ' while the rest of the answer continues to arrive.',
  'The same response can preserve useful structure:',
  'Links stay interactive as nearby text streams',
  'Lists keep their spacing and hierarchy',
  'Code remains readable without shifting the response',
  'Set ',
  'aria-busy',
  ' while new content is still arriving.',
  'const status = complete ? "ready" : "streaming";',
] as const
const STARTS = PIECES.map((_, index) => PIECES.slice(0, index).reduce((total, piece) => total + piece.length, 0))
const RESPONSE_LENGTH = PIECES.reduce((total, piece) => total + piece.length, 0)
const RESPONSE_MARKDOWN = `A streaming response can link directly to [Motion's Vue guide](https://motion.dev/docs/vue) while the rest of the answer continues to arrive.

The same response can preserve useful structure:

- Links stay interactive as nearby text streams
- Lists keep their spacing and hierarchy
- Code remains readable without shifting the response

Set \`aria-busy\` while new content is still arriving.

\`\`\`ts
const status = complete ? "ready" : "streaming";
\`\`\``
const CHARACTERS_PER_SECOND = 110
const SOURCES: CitationItem[] = [
  { id: 'motion-vue', title: 'Motion for Vue', domain: 'motion.dev', url: 'https://motion.dev/docs/vue' },
  { id: 'aria-busy', title: 'ARIA live regions', domain: 'developer.mozilla.org', url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy' },
  { id: 'vue-rendering', title: 'Conditional rendering', domain: 'vuejs.org', url: 'https://vuejs.org/guide/essentials/conditional.html' },
]

const run = shallowRef(0)
const cursor = shallowRef(RESPONSE_LENGTH)
const complete = shallowRef(true)
const mounted = shallowRef(false)
const reveal = (index: number) => PIECES[index].slice(0, Math.max(0, cursor.value - STARTS[index]))
const started = (index: number) => cursor.value > STARTS[index]
const status = computed(() => complete.value ? 'complete' : 'streaming')

onMounted(() => { mounted.value = true })
let frame = 0
watch([run, mounted], (_, __, cleanup) => {
  if (!mounted.value) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { cursor.value = RESPONSE_LENGTH; complete.value = true; return }
  cursor.value = 0
  complete.value = false
  const startedAt = performance.now()
  let completion: ReturnType<typeof setTimeout> | undefined
  const stream = (now: number) => {
    cursor.value = Math.min(RESPONSE_LENGTH, Math.floor(((now - startedAt) / 1000) * CHARACTERS_PER_SECOND))
    if (cursor.value < RESPONSE_LENGTH) frame = requestAnimationFrame(stream)
    else completion = setTimeout(() => { complete.value = true }, 450)
  }
  frame = requestAnimationFrame(stream)
  cleanup(() => { cancelAnimationFrame(frame); clearTimeout(completion) })
}, { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div style="position:relative;width:100%;max-width:36rem;height:500px">
    <StreamingResponse :key="run" :status="status" :copy-text="RESPONSE_MARKDOWN" :sources="SOURCES" @retry="run++">
      <p>{{ reveal(0) }}<a v-if="started(1)" href="https://motion.dev/docs/vue" target="_blank" rel="noreferrer noopener">{{ reveal(1) }}</a>{{ reveal(2) }}</p>
      <p v-if="started(3)">{{ reveal(3) }}</p>
      <ul v-if="started(4)">
        <li>{{ reveal(4) }}</li>
        <li v-if="started(5)">{{ reveal(5) }}</li>
        <li v-if="started(6)">{{ reveal(6) }}</li>
      </ul>
      <p v-if="started(7)">{{ reveal(7) }}<code v-if="started(8)">{{ reveal(8) }}</code>{{ reveal(9) }}</p>
      <pre v-if="started(10)"><code>{{ reveal(10) }}</code></pre>
    </StreamingResponse>
    <button type="button" class="be-agent-replay" @click="run++"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
  </div>
</template>

<script setup lang="ts">
import { PromptInput } from 'beui-vue'
import { AnimatePresence, motion } from 'motion-v'
import { onBeforeUnmount, reactive, shallowRef } from 'vue'

// Provider logos come from each site's favicon; a broken image falls back to a bot glyph.
const models = [
  { value: 'gpt-5.2', label: 'GPT-5.2', icon: 'https://openai.com/favicon.ico' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4', icon: 'https://www.anthropic.com/favicon.ico' },
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', icon: 'https://deepmind.google/favicon.ico' },
  { value: 'grok-4.5', label: 'Grok 4.5', icon: 'https://x.ai/favicon.ico' },
  { value: 'mistral-large-3', label: 'Mistral Large 3', icon: 'https://mistral.ai/favicon.ico' },
]
const actions = [
  { value: 'image', label: 'Attach image', description: 'Add a screenshot or visual reference.', icon: 'ImagePlus' },
  { value: 'skill', label: 'Use a skill', description: 'Give the agent a specialized workflow.', icon: 'Puzzle' },
  { value: 'context', label: 'Add context', description: 'Include a file with supporting details.', icon: 'FileText' },
]

const broken = reactive<Record<string, boolean>>({})
const loading = shallowRef(false)
const sent = shallowRef<string>()
const notice = shallowRef<string>()
const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
let timer: ReturnType<typeof setTimeout> | undefined

function submit(prompt: string) {
  sent.value = undefined
  notice.value = undefined
  loading.value = true
  timer = setTimeout(() => { loading.value = false; sent.value = prompt }, 900)
}
function stop() {
  clearTimeout(timer)
  loading.value = false
}
function choose(action: string) {
  const selected = actions.find(item => item.value === action)
  notice.value = selected ? `${selected.label} selected.` : undefined
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="prompt-input-demo">
    <PromptInput
      :models="models"
      :actions="actions"
      default-model="gpt-5.2"
      default-value="Review the current implementation and suggest the next improvement."
      :loading="loading"
      @submit="submit"
      @stop="stop"
      @action="choose"
    >
      <template #model-icon="{ model }">
        <svg v-if="broken[model.value]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2M20 14h2M15 13v2M9 13v2" /></svg>
        <img v-else :src="model.icon" alt="" width="16" height="16" referrerpolicy="no-referrer" @error="broken[model.value] = true">
      </template>
    </PromptInput>
    <div class="prompt-input-status" role="status">
      <AnimatePresence mode="wait">
        <motion.p
          v-if="sent || notice"
          :key="sent ?? notice"
          :initial="reduce ? { opacity: 1 } : { opacity: 0, y: 3 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="{ duration: reduce ? 0 : .18, ease: [.16, 1, .3, 1] }"
        >{{ sent ? 'Prompt sent to the selected model.' : notice }}</motion.p>
      </AnimatePresence>
    </div>
  </div>
</template>

<style scoped>
.prompt-input-demo { display: flex; flex-direction: column; justify-content: center; width: 100%; max-width: 36rem; height: 360px; }
.prompt-input-status { height: 2rem; padding: .5rem .5rem 0; box-sizing: border-box; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
.prompt-input-status p { margin: 0; font: inherit; line-height: inherit; color: inherit; }
</style>

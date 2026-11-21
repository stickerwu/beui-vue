<script setup lang="ts">
import { AgentIcon, Message, MessageAvatar, MessageBubble, MessageBubbleContent, MessageContent, MessageFooter, MessageGroup, MessageHeader, MessageScroller, MessageTyping, PromptInput, StreamingResponse } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

const REPLY = 'The viewport follows while you stay at the live edge. Scroll upward while this response streams and it will leave your reading position alone.'
const rows = ref<Row[]>([
  { id: 'scope-question', from: 'user', content: 'What should the first release include?', animateIn: false },
  { id: 'scope-answer', from: 'assistant', content: 'Start with the smallest workflow that still feels complete.', animateIn: false },
  { id: 'states-question', from: 'user', content: 'Include streaming and recovery states too.', animateIn: false },
  { id: 'states-answer', from: 'assistant', content: 'Yes. Those states make the first version feel dependable.', animateIn: false },
  { id: 'evidence-question', from: 'user', content: 'How should we present tool results?', animateIn: false },
  { id: 'evidence-answer', from: 'assistant', content: 'Keep results close to the action that produced them.', animateIn: false },
  { id: 'approval-question', from: 'user', content: 'What about actions that need confirmation?', animateIn: false },
  { id: 'approval-answer', from: 'assistant', content: 'Pause the run, explain the impact, and ask before continuing.', animateIn: false },
  { id: 'summary-question', from: 'user', content: 'Can the transcript stay easy to navigate?', animateIn: false },
  { id: 'summary-answer', from: 'assistant', content: 'Use the rail to jump between turns without losing your place.', animateIn: false },
])

interface Row { id: string, from: 'user' | 'assistant', content: string, animateIn: boolean, streaming?: boolean }
const CHARACTERS_PER_SECOND = 96
const STREAM_DELAY = 140
const reduce = ref(false)
const pending = shallowRef(false)
const activeReply = shallowRef<string | null>(null)
const loading = computed(() => pending.value || activeReply.value !== null)
let run = 0
let replyTimer: ReturnType<typeof setTimeout> | undefined
let frame = 0

function patch(id: string, change: Partial<Row>) {
  rows.value = rows.value.map(row => (row.id === id ? { ...row, ...change } : row))
}
function stream(id: string, content: string) {
  if (reduce.value) { patch(id, { content, streaming: false }); activeReply.value = null; return }
  const startedAt = performance.now() + STREAM_DELAY
  const tick = (now: number) => {
    const cursor = Math.min(content.length, Math.floor((Math.max(0, now - startedAt) / 1000) * CHARACTERS_PER_SECOND))
    const text = content.slice(0, cursor)
    const row = rows.value.find(item => item.id === id)
    if (row && row.content !== text) patch(id, { content: text })
    if (cursor < content.length) frame = requestAnimationFrame(tick)
    else { patch(id, { streaming: false }); activeReply.value = null }
  }
  frame = requestAnimationFrame(tick)
}
function submit(prompt: string) {
  if (loading.value) return
  const index = run++
  const assistantId = `sent-assistant-${index}`
  rows.value = [...rows.value, { id: `sent-user-${index}`, from: 'user', content: prompt, animateIn: true }]
  pending.value = true
  replyTimer = setTimeout(() => {
    rows.value = [...rows.value, { id: assistantId, from: 'assistant', content: '', animateIn: true, streaming: true }]
    pending.value = false
    activeReply.value = REPLY
    stream(assistantId, REPLY)
  }, reduce.value ? 0 : 420)
}
function stop() {
  clearTimeout(replyTimer)
  cancelAnimationFrame(frame)
  pending.value = false
  rows.value = rows.value.map(row => (row.streaming ? { ...row, streaming: false } : row))
  activeReply.value = null
}
onMounted(() => { reduce.value = matchMedia('(prefers-reduced-motion: reduce)').matches })
onBeforeUnmount(() => { clearTimeout(replyTimer); cancelAnimationFrame(frame) })
</script>

<template>
  <div class="chat-demo">
    <MessageScroller :busy="loading" navigation="rail" class="chat-demo-scroller" viewport-class-name="chat-demo-viewport" content-class-name="chat-demo-content">
      <MessageGroup spacing="default">
        <Message v-for="row in rows" :id="row.id" :key="row.id" :from="row.from" :animate-in="row.from === 'user' && row.animateIn">
          <MessageContent>
            <MessageBubble :variant="row.from === 'user' ? 'solid' : 'soft'" :animate-in="false">
              <MessageBubbleContent>
                <StreamingResponse v-if="row.from === 'assistant'" :status="row.streaming ? 'streaming' : 'complete'" :show-actions="false" :announce="false">
                  <template v-if="row.content">{{ row.content }}</template><MessageTyping v-else />
                </StreamingResponse>
                <template v-else>{{ row.content }}</template>
              </MessageBubbleContent>
            </MessageBubble>
          </MessageContent>
        </Message>
        <Message v-if="pending" id="pending-assistant" from="assistant">
          <MessageContent><MessageTyping label="Preparing response" /></MessageContent>
        </Message>
      </MessageGroup>
    </MessageScroller>
    <div class="chat-demo-footer">
      <PromptInput :min-rows="1" :max-rows="1" :loading="loading" placeholder="Send another message…" class="chat-demo-prompt" @submit="submit" @stop="stop" />
    </div>
  </div>
</template>

<style scoped>
.chat-demo { display: flex; flex-direction: column; width: 100%; max-width: 36rem; height: 440px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--beui-border) 70%, transparent); border-radius: 1rem; background: var(--beui-background); }
.chat-demo :deep(.chat-demo-scroller) { min-height: 0; flex: 1; }
.chat-demo :deep(.chat-demo-viewport) { padding: 1rem .75rem; }
.chat-demo :deep(.chat-demo-content) { min-height: 100%; }
.chat-demo-name { color: color-mix(in srgb, var(--beui-foreground) 70%, transparent); font-weight: 500; }
.chat-demo-footer { flex: none; padding: .5rem; border-top: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); }
.chat-demo-footer :deep(.chat-demo-prompt) { border-width: 0; background: var(--beui-muted); box-shadow: none; }
.chat-demo-footer :deep(.chat-demo-prompt:focus-within) { border-color: transparent; }
</style>

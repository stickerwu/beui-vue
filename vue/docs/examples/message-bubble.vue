<script setup lang="ts">
import { AgentIcon, Message, MessageAvatar, MessageBubble, MessageBubbleCollapsible, MessageBubbleContent, MessageContent, MessageFooter, MessageGroup, MessageHeader, MessageScroller, MessageTyping, PromptInput, StreamingResponse } from 'beui-vue'
import { AnimatePresence } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useAgentVariant } from '../.vitepress/use-agent-variant'

const props = defineProps<{ variant?: string }>()
const { variant, choose, options, fixed } = useAgentVariant(() => props.variant, {
  surfaces: 'agents/message-bubble', avatars: 'agents/message-bubble-avatars', 'show-more': 'agents/message-bubble-collapsible',
})

/* ---------- surfaces: a chat that mounts each bubble once with a spring pop ---------- */
interface Row { id: string, from: 'user' | 'assistant', content: string, animateIn: boolean, streaming?: boolean }
const REPLY = 'That message mounted once with a spring pop. Streaming updates only change its content, so the entrance does not replay.'
const CHARACTERS_PER_SECOND = 96
const STREAM_DELAY = 140
const reduce = ref(false)
const rows = ref<Row[]>([
  { id: 'welcome-question', from: 'user', content: 'What should we include in the first release?', animateIn: false },
  { id: 'welcome-answer', from: 'assistant', content: 'Start with the smallest workflow that still feels complete.', animateIn: false },
])
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

/* ---------- avatars: a scripted conversation with a replay button ---------- */
const step = shallowRef(0)
const replays = shallowRef(0)
let stepTimer: ReturnType<typeof setTimeout> | undefined
function advance() {
  clearTimeout(stepTimer)
  if (step.value >= 2) return
  stepTimer = setTimeout(() => { step.value += 1; advance() }, step.value === 0 ? 650 : 900)
}
function replay() {
  clearTimeout(stepTimer)
  step.value = 0
  replays.value += 1
  advance()
}

onMounted(() => {
  reduce.value = matchMedia('(prefers-reduced-motion: reduce)').matches
  advance()
})
onBeforeUnmount(() => { clearTimeout(replyTimer); clearTimeout(stepTimer); cancelAnimationFrame(frame) })
</script>

<template>
  <div class="bubble-demo" :data-example-variant="variant">
    <label v-if="!fixed" class="bubble-demo-picker">Example
      <select :value="variant" @change="choose(($event.target as HTMLSelectElement).value)"><option v-for="option in options" :key="option">{{ option }}</option></select>
    </label>

    <div v-if="variant === 'surfaces'" class="bubble-chat">
      <MessageScroller :busy="loading" class="bubble-chat-scroller" viewport-class-name="bubble-chat-viewport" content-class-name="bubble-chat-content">
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
      <div class="bubble-chat-footer">
        <PromptInput :min-rows="1" :max-rows="1" :loading="loading" placeholder="Send a bubble…" class="bubble-chat-prompt" @submit="submit" @stop="stop" />
      </div>
    </div>

    <div v-else-if="variant === 'avatars'" class="bubble-avatars">
      <MessageGroup :key="replays" spacing="default">
        <Message from="user">
          <MessageAvatar class="bubble-user-avatar"><AgentIcon name="User" /></MessageAvatar>
          <MessageContent>
            <MessageHeader><span class="bubble-name">You</span><span>Now</span></MessageHeader>
            <MessageBubble variant="solid"><MessageBubbleContent>Can you turn these notes into a launch update?</MessageBubbleContent></MessageBubble>
            <MessageFooter>Delivered</MessageFooter>
          </MessageContent>
        </Message>
        <AnimatePresence mode="popLayout">
          <Message v-if="step >= 1" key="draft" from="assistant">
            <MessageAvatar><AgentIcon name="Bot" /></MessageAvatar>
            <MessageContent>
              <MessageHeader><span class="bubble-name">Assistant</span><span>Just now</span></MessageHeader>
              <MessageBubble variant="soft">
                <MessageBubbleContent><StreamingResponse status="complete" :show-actions="false">Absolutely. I’ll keep it concise and lead with what changed.</StreamingResponse></MessageBubbleContent>
              </MessageBubble>
            </MessageContent>
          </Message>
          <Message v-if="step >= 2" key="follow-up" from="assistant">
            <MessageAvatar placeholder />
            <MessageContent>
              <MessageBubble variant="soft">
                <MessageBubbleContent><StreamingResponse status="complete" :show-actions="false">Do you want the tone to feel more technical or more customer-facing?</StreamingResponse></MessageBubbleContent>
              </MessageBubble>
            </MessageContent>
          </Message>
        </AnimatePresence>
      </MessageGroup>
      <div class="bubble-replay-row">
        <button type="button" class="bubble-replay" @click="replay"><AgentIcon name="RotateCcw" :size="14" />Replay</button>
      </div>
    </div>

    <div v-else class="bubble-more">
      <Message from="assistant">
        <MessageAvatar><AgentIcon name="Bot" /></MessageAvatar>
        <MessageContent>
          <MessageHeader><span class="bubble-name">Assistant</span><span>Summary</span></MessageHeader>
          <MessageBubble variant="soft" :animate-in="false">
            <MessageBubbleContent class="bubble-more-content">
              <StreamingResponse status="complete" :show-actions="false">
                <MessageBubbleCollapsible :collapsed-lines="4">
                  <p>The release is ready for a focused rollout. The main conversation flow, keyboard navigation, error recovery, and reduced-motion behavior are all covered.</p>
                  <p>I would keep advanced workflow controls out of this version. They add configuration without improving the first-run experience, and the usage data from this release will give us a better basis for those decisions.</p>
                  <p>Before publishing, run the accessibility suite once more and verify the streaming behavior with a long response on a smaller viewport.</p>
                </MessageBubbleCollapsible>
              </StreamingResponse>
            </MessageBubbleContent>
          </MessageBubble>
        </MessageContent>
      </Message>
    </div>
  </div>
</template>

<style scoped>
.bubble-demo { position: relative; display: flex; justify-content: center; width: 100%; }
.bubble-demo-picker { position: absolute; top: -2.25rem; right: 0; z-index: 1; color: var(--beui-muted-foreground); font-size: .75rem; }
.bubble-demo-picker select { margin-inline-start: .25rem; padding: .125rem .25rem; border: 1px solid var(--beui-border); border-radius: .375rem; background: var(--beui-background); color: var(--beui-foreground); font: inherit; }

.bubble-chat { display: flex; flex-direction: column; width: 100%; max-width: 36rem; height: 440px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--beui-border) 70%, transparent); border-radius: 1rem; background: var(--beui-background); }
.bubble-chat :deep(.bubble-chat-scroller) { min-height: 0; flex: 1; }
.bubble-chat :deep(.bubble-chat-viewport) { padding: 1rem .75rem; }
.bubble-chat :deep(.bubble-chat-content) { min-height: 100%; }
.bubble-chat-footer { flex: none; padding: .5rem; border-top: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); }
.bubble-chat-footer :deep(.bubble-chat-prompt) { border-width: 0; background: var(--beui-muted); box-shadow: none; }
.bubble-chat-footer :deep(.bubble-chat-prompt:focus-within) { border-color: transparent; }

.bubble-name { color: color-mix(in srgb, var(--beui-foreground) 70%, transparent); font-weight: 500; }
.bubble-avatars { display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; width: 100%; max-width: 36rem; height: 410px; padding-inline: .75rem; }
.bubble-user-avatar { background: var(--beui-foreground); color: var(--beui-background); }
.bubble-replay-row { display: flex; align-items: flex-end; justify-content: center; height: 2.75rem; }
.bubble-replay { display: inline-flex; align-items: center; gap: .375rem; height: 2rem; padding: 0 .75rem; border: 1px solid var(--beui-border); border-radius: 999px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; font-weight: 500; line-height: 1rem; cursor: pointer; outline: none; transition: color .15s; }
.bubble-replay:hover { color: var(--beui-foreground); }
.bubble-replay:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }

.bubble-more { display: flex; align-items: flex-start; box-sizing: border-box; width: 100%; max-width: 36rem; height: 410px; padding: 3.5rem .75rem 0; }
.bubble-more :deep(.bubble-more-content) { max-width: 90%; }
</style>

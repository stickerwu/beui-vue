<script setup lang="ts">
import {
  AgentActivity,
  AgentIcon,
  AISidebar,
  AnimatedSidebarContent,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarPanel,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
  ApprovalCard,
  ChatApp,
  CodeBlock,
  FileDiff,
  ImageGeneration,
  Message,
  MessageAvatar,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
  MessageScroller,
  PromptInput,
  StreamingResponse,
  ThinkingShimmer,
  TodoList,
  ToolApproval,
  ToolApprovalCode,
  ToolResult,
  ToolResultOutput,
  type ApprovalCardStatus,
  type ApprovalQuestion,
  type SidebarResource,
  type TodoItem,
  type ToolApprovalStatus, useReducedMotion
} from 'beui-vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'

interface AddedMessage { id: string, from: 'user' | 'assistant', content: string, streaming?: boolean }

const REPLY = 'I’ll keep the patch focused, preserve the current checkout layout, and run the same validation path before preparing the release.'
const SWAP_SPRING = { type: 'spring', stiffness: 460, damping: 30, mass: 0.55 } as const
const resources = shallowRef<SidebarResource[]>([
  {
    id: 'release', label: 'Release workspace', kind: 'project',
    children: [
      { id: 'checkout', label: 'Checkout audit', kind: 'file' },
      { id: 'release-notes', label: 'Release notes', kind: 'file' },
      { id: 'references', label: 'Research sources', kind: 'bookmark' },
    ],
  },
  {
    id: 'design', label: 'Design system', kind: 'folder',
    children: [
      { id: 'tokens', label: 'Motion tokens', kind: 'file' },
      { id: 'components', label: 'Component inventory', kind: 'file' },
    ],
  },
  { id: 'archive', label: 'Archived runs', kind: 'folder' },
])
const navItems = [
  { label: 'New task', icon: 'MessageSquarePlus' },
  { label: 'Search', icon: 'Search' },
  { label: 'Runs', icon: 'Clock3' },
] as const
const diffLines = [
  { id: 'context-1', type: 'context' as const, oldLine: 41, newLine: 41, content: '  const total = subtotal + shipping;' },
  { id: 'removed-1', type: 'removed' as const, oldLine: 42, content: '  return submitOrder(total);' },
  { id: 'added-1', type: 'added' as const, newLine: 42, content: '  const result = validateOrder({ total, items });' },
  { id: 'added-2', type: 'added' as const, newLine: 43, content: '  return result.ok ? submitOrder(total) : result;' },
]
const approvalQuestions: ApprovalQuestion[] = [{
  id: 'release', title: 'How should the patch be released?',
  options: [{ value: 'focused', label: 'Ship the focused checkout fix' }, { value: 'bundle', label: 'Bundle it with the next release' }],
  allowCustom: true, customPlaceholder: 'Add another release instruction…',
}]
const activityItems = [
  { id: 'reason', type: 'text' as const, content: 'Tracing the checkout submission path and validation boundary.' },
  { id: 'read', type: 'tool' as const, action: 'read', target: 'checkout/submit.ts' },
  { id: 'search', type: 'search' as const, query: 'order validation failures', results: [{ id: 'result-1', title: 'Agent interface guide', domain: 'beui.dev', url: '/docs/ai-agents' }] },
]
const sources = [
  { id: 'message', title: 'Message composition', domain: 'beui.dev', url: '/components/agents/message' },
  { id: 'diff', title: 'File Diff', domain: 'beui.dev', url: '/components/agents/file-diff' },
  { id: 'approval', title: 'Tool Approval', domain: 'beui.dev', url: '/components/agents/tool-approval' },
]
const models = [{ value: 'balanced', label: 'Balanced' }, { value: 'fast', label: 'Fast' }, { value: 'deep', label: 'Deep reasoning' }]
const actions = [
  { value: 'attach', label: 'Attach file', icon: 'Paperclip' },
  { value: 'project', label: 'Add project context', icon: 'FolderKanban' },
  { value: 'skill', label: 'Use a skill', icon: 'WandSparkles' },
]
const codeSample = 'export function validateOrder(order: Order) {\n  return schema.safeParse(order);\n}'

const reduce = useReducedMotion()
const items = resources
const activeResource = shallowRef('checkout')
const input = shallowRef('')
const pending = shallowRef(false)
const activeReply = shallowRef<string | null>(null)
const messages = shallowRef<AddedMessage[]>([])
const toolStatus = shallowRef<ToolApprovalStatus>('pending')
const approvalStatus = shallowRef<ApprovalCardStatus>('pending')
const busy = computed(() => pending.value || activeReply.value !== null)
let toolTimers: ReturnType<typeof setTimeout>[] = []
let chatTimers: ReturnType<typeof setTimeout>[] = []
let approvalTimers: ReturnType<typeof setTimeout>[] = []
let run = 0
let frame = 0

const plan = computed<TodoItem[]>(() => {
  const checks = toolStatus.value === 'complete' ? 'completed'
    : toolStatus.value === 'running' ? 'in-progress'
      : toolStatus.value === 'denied' || toolStatus.value === 'error' ? 'cancelled' : 'pending'
  return [
    { id: 'inspect', title: 'Inspect the checkout flow', status: 'completed' },
    { id: 'patch', title: 'Prepare the validation patch', status: 'completed' },
    { id: 'checks', title: 'Run focused checks', status: checks },
    { id: 'review', title: 'Collect release approval', status: toolStatus.value === 'complete' ? 'in-progress' : 'pending' },
  ]
})

function clearTimers(list: ReturnType<typeof setTimeout>[]) { list.forEach(clearTimeout) }
function patch(id: string, change: Partial<AddedMessage>) {
  messages.value = messages.value.map(message => (message.id === id ? { ...message, ...change } : message))
}
function stream(id: string) {
  if (reduce.value) { patch(id, { content: REPLY, streaming: false }); activeReply.value = null; return }
  const startedAt = performance.now()
  const tick = (now: number) => {
    const cursor = Math.min(REPLY.length, Math.floor(((now - startedAt) / 1000) * 92))
    const content = REPLY.slice(0, cursor)
    const current = messages.value.find(message => message.id === id)
    if (current && current.content !== content) patch(id, { content })
    if (cursor < REPLY.length) frame = requestAnimationFrame(tick)
    else { patch(id, { streaming: false }); activeReply.value = null }
  }
  frame = requestAnimationFrame(tick)
}
function approveTool() {
  clearTimers(toolTimers)
  toolStatus.value = 'approving'
  toolTimers = [setTimeout(() => { toolStatus.value = 'approved' }, 450), setTimeout(() => { toolStatus.value = 'running' }, 850), setTimeout(() => { toolStatus.value = 'complete' }, 1650)]
}
function denyTool() { clearTimers(toolTimers); toolStatus.value = 'denied' }
function submit(value: string) {
  if (!value.trim() || pending.value || activeReply.value) return
  const id = run++
  const assistantId = `assistant-${id}`
  messages.value = [...messages.value, { id: `user-${id}`, from: 'user', content: value }]
  input.value = ''
  pending.value = true
  chatTimers.push(setTimeout(() => {
    messages.value = [...messages.value, { id: assistantId, from: 'assistant', content: '', streaming: true }]
    pending.value = false
    activeReply.value = assistantId
    stream(assistantId)
  }, reduce.value ? 0 : 420))
}
function stop() {
  clearTimers(chatTimers)
  cancelAnimationFrame(frame)
  pending.value = false
  messages.value = messages.value.map(message => (message.streaming ? { ...message, streaming: false } : message))
  activeReply.value = null
}
function submitApproval() {
  approvalStatus.value = 'submitting'
  clearTimers(approvalTimers)
  approvalTimers.push(setTimeout(() => { approvalStatus.value = 'answered' }, 650))
}

// Expanded preview: the demo takes over the viewport as a modal dialog.
const expanded = shallowRef(false)
const container = shallowRef<HTMLElement | null>(null)
const toggle = shallowRef<HTMLButtonElement | null>(null)
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
let release: (() => void) | undefined
watch(expanded, async (open, _, cleanup) => {
  await nextTick()
  const dialog = container.value
  if (!open || !dialog) { requestAnimationFrame(() => toggle.value?.focus({ preventScroll: true })); return }
  const previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  const isolated: { element: HTMLElement, inert: boolean, hidden: string | null }[] = []
  let branch: HTMLElement = dialog
  while (branch.parentElement) {
    const parent = branch.parentElement
    for (const sibling of Array.from(parent.children)) {
      if (sibling === branch || !(sibling instanceof HTMLElement)) continue
      isolated.push({ element: sibling, inert: sibling.inert, hidden: sibling.getAttribute('aria-hidden') })
      sibling.inert = true
      sibling.setAttribute('aria-hidden', 'true')
    }
    if (parent === document.body) break
    branch = parent
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); expanded.value = false; return }
    if (event.key !== 'Tab') return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => !element.inert && element.offsetParent !== null)
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) { event.preventDefault(); dialog.focus() }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  window.addEventListener('keydown', onKey)
  requestAnimationFrame(() => toggle.value?.focus({ preventScroll: true }))
  release = () => {
    document.body.style.overflow = previousOverflow
    window.removeEventListener('keydown', onKey)
    for (const { element, inert, hidden } of isolated) {
      element.inert = inert
      if (hidden === null) element.removeAttribute('aria-hidden')
      else element.setAttribute('aria-hidden', hidden)
    }
  }
  cleanup(() => { release?.(); release = undefined })
})
onBeforeUnmount(() => {
  clearTimers(toolTimers); clearTimers(chatTimers); clearTimers(approvalTimers)
  cancelAnimationFrame(frame)
  release?.()
})
</script>

<template>
  <div
    ref="container" role="dialog" :aria-modal="expanded || undefined" aria-label="Chat app preview" :tabindex="expanded ? -1 : undefined"
    class="chat-preview" :class="{ 'chat-preview-expanded': expanded }"
  >
    <button
      ref="toggle" type="button" class="chat-expand" :aria-label="expanded ? 'Exit expanded preview' : 'Expand preview'"
      :title="expanded ? 'Exit expanded preview' : 'Expand preview'" @click="expanded = !expanded"
    >
      <span class="chat-expand-swap">
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.span
            :key="expanded ? 'minimize' : 'maximize'" class="chat-expand-icon"
            :initial="reduce ? false : { opacity: 0, scale: 0.6, filter: 'blur(4px)' }" :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: reduce ? { duration: 0 } : SWAP_SPRING }"
            :exit="reduce ? undefined : { opacity: 0, scale: 0.6, filter: 'blur(4px)', transition: { duration: 0.14 } }"
          ><AgentIcon :name="expanded ? 'Minimize2' : 'Maximize2'" :size="16" /></motion.span>
        </AnimatePresence>
      </span>
    </button>

    <ChatApp sidebar-width="17rem" class="chat-shell" :class="{ 'chat-shell-full': expanded }">
      <AnimatedSidebarPanel aria-label="Agent workspace" collapsible="offcanvas" class="chat-panel" panel-class="chat-surface">
        <AnimatedSidebarContent class="chat-nav">
          <AnimatedSidebarGroup class="chat-nav-top">
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu class="chat-menu">
                <AnimatedSidebarMenuItem v-for="item in navItems" :key="item.label">
                  <AnimatedSidebarMenuButton class="chat-nav-button" @select="() => {}">
                    <template #icon><AgentIcon :name="item.icon" :size="16" /></template>
                    {{ item.label }}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>

          <AnimatedSidebarGroup class="chat-nav-projects">
            <AnimatedSidebarGroupLabel class="chat-nav-label">Projects</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent class="chat-nav-tree">
              <div class="chat-nav-scroll">
                <AISidebar v-model:items="items" v-model:active-id="activeResource" :default-expanded-ids="['release', 'design']" />
              </div>
              <div aria-hidden="true" class="chat-nav-fade" />
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>
        <AnimatedSidebarRail />
      </AnimatedSidebarPanel>

      <AnimatedSidebarInset class="chat-inset">
        <header class="chat-header">
          <div class="chat-heading">
            <AnimatedSidebarTrigger class="chat-trigger"><AgentIcon name="PanelLeft" :size="16" /></AnimatedSidebarTrigger>
            <div class="chat-title">
              <p class="chat-name">Checkout release</p>
              <p class="chat-sub">Agent workspace · focused patch</p>
            </div>
          </div>
          <span class="chat-status">Connected</span>
        </header>

        <MessageScroller :busy="busy" navigation="rail" class="chat-scroller" viewport-class-name="chat-viewport" content-class-name="chat-content">
          <MessageGroup spacing="default">
            <Message from="user">
              <MessageAvatar><AgentIcon name="User" /></MessageAvatar>
              <MessageContent>
                <MessageHeader><span>You</span><span>10:24</span></MessageHeader>
                <MessageBubble variant="solid">
                  <MessageBubbleContent>Audit the checkout flow, fix the validation gap, and prepare a release-ready patch.</MessageBubbleContent>
                </MessageBubble>
              </MessageContent>
            </Message>

            <Message from="assistant">
              <MessageAvatar><AgentIcon name="Bot" /></MessageAvatar>
              <MessageContent class="chat-gap">
                <MessageHeader><span>beUI Agent</span><span>10:24</span></MessageHeader>
                <AgentActivity status="complete" :duration="6" default-open :collapse-on-complete="false" :items="activityItems" />
                <TodoList :items="plan" title="Release plan" :collapse-on-complete="false" />
              </MessageContent>
            </Message>

            <Message from="assistant">
              <MessageAvatar placeholder />
              <MessageContent>
                <ToolApproval
                  tool="terminal.run" title="Run focused checkout checks?" description="The agent needs permission to run the validation and accessibility suites."
                  :status="toolStatus" default-open
                  :parameters="[{ id: 'command', label: 'Command', value: 'bun test checkout --coverage' }, { id: 'scope', label: 'Scope', value: 'Current workspace' }]"
                  :on-always-allow="approveTool" @approve="approveTool" @deny="denyTool"
                >
                  <template #parameter="{ parameter }"><ToolApprovalCode v-if="parameter.id === 'command'" :code="parameter.value" language="bash" /><template v-else>{{ parameter.value }}</template></template>
                </ToolApproval>
              </MessageContent>
            </Message>

            <Message v-if="toolStatus === 'running' || toolStatus === 'complete'" from="assistant" animate-in>
              <MessageAvatar placeholder />
              <MessageContent class="chat-gap">
                <ToolResult
                  tool="terminal.run" :title="toolStatus === 'running' ? 'Running checkout checks' : 'Checkout checks passed'" :status="toolStatus === 'running' ? 'running' : 'success'"
                  kind="terminal" :meta="toolStatus === 'running' ? 'Live' : '2.8s'" default-open :collapse-on-complete="false"
                >
                  <ToolResultOutput>{{ toolStatus === 'running' ? '✓ validation contract\n… checkout keyboard flow' : '✓ validation contract\n✓ checkout keyboard flow\n✓ order submission recovery' }}</ToolResultOutput>
                </ToolResult>
                <template v-if="toolStatus === 'complete'">
                  <FileDiff file="checkout/submit.ts" :lines="diffLines" status="complete" default-open :collapse-on-complete="false" />
                  <CodeBlock filename="validation.ts" language="typescript" status="complete" :code="codeSample" show-line-numbers />
                </template>
              </MessageContent>
            </Message>
            <Message v-else-if="toolStatus === 'denied' || toolStatus === 'error'" from="assistant" animate-in>
              <MessageAvatar placeholder />
              <MessageContent>
                <ToolResult tool="terminal.run" title="Checkout checks were not run" :status="toolStatus === 'denied' ? 'cancelled' : 'error'" kind="terminal" default-open :collapse-on-complete="false">
                  <ToolResultOutput>{{ toolStatus === 'denied' ? 'Permission was not granted. No command was run.' : 'The command could not be completed.' }}</ToolResultOutput>
                </ToolResult>
              </MessageContent>
            </Message>

            <Message v-if="toolStatus === 'complete'" from="assistant" animate-in>
              <MessageAvatar placeholder />
              <MessageContent class="chat-gap">
                <ImageGeneration status="complete" prompt="a clear checkout confirmation screen" resolution="1280 × 840" size="compact">
                  <svg viewBox="0 0 640 420" aria-hidden="true" class="chat-art">
                    <rect width="640" height="420" fill="var(--beui-muted)" />
                    <rect x="64" y="52" width="512" height="316" rx="28" fill="var(--beui-background)" />
                    <circle cx="320" cy="144" r="38" fill="#10b981" />
                    <path d="m301 144 13 13 26-29" fill="none" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
                    <rect x="204" y="210" width="232" height="18" rx="9" fill="color-mix(in srgb, var(--beui-foreground) 85%, transparent)" />
                    <rect x="238" y="246" width="164" height="12" rx="6" fill="color-mix(in srgb, var(--beui-muted-foreground) 35%, transparent)" />
                    <rect x="248" y="298" width="144" height="34" rx="17" fill="var(--beui-foreground)" />
                  </svg>
                </ImageGeneration>
                <MessageBubble variant="ghost" class="chat-full">
                  <MessageBubbleContent>
                    <StreamingResponse status="complete" copy-text="The checkout patch is ready for review." :sources="sources">
                      <p>The checkout patch is ready for review.</p>
                      <ul>
                        <li>Validation now runs before submission.</li>
                        <li>Failure output stays inside the current flow.</li>
                        <li>Focused checks pass without changing the layout.</li>
                      </ul>
                    </StreamingResponse>
                  </MessageBubbleContent>
                </MessageBubble>
              </MessageContent>
            </Message>

            <Message v-if="toolStatus === 'complete'" from="assistant" animate-in>
              <MessageAvatar placeholder />
              <MessageContent>
                <ApprovalCard :questions="approvalQuestions" :status="approvalStatus" result="Release direction sent to the agent." @submit="submitApproval" />
              </MessageContent>
            </Message>

            <Message v-for="message in messages" :key="message.id" :from="message.from" animate-in>
              <MessageAvatar><AgentIcon :name="message.from === 'assistant' ? 'Bot' : 'User'" /></MessageAvatar>
              <MessageContent>
                <MessageHeader v-if="message.from === 'assistant'"><span>beUI Agent</span><span>Now</span></MessageHeader>
                <MessageBubble :variant="message.from === 'user' ? 'solid' : 'soft'">
                  <MessageBubbleContent>
                    <StreamingResponse v-if="message.from === 'assistant'" :status="message.streaming ? 'streaming' : 'complete'" :show-actions="!message.streaming" :copy-text="message.content">{{ message.content }}</StreamingResponse>
                    <template v-else>{{ message.content }}</template>
                  </MessageBubbleContent>
                </MessageBubble>
                <MessageFooter v-if="message.from === 'user'">Sent</MessageFooter>
              </MessageContent>
            </Message>

            <Message v-if="pending" from="assistant" animate-in>
              <MessageAvatar><AgentIcon name="Bot" /></MessageAvatar>
              <MessageContent><ThinkingShimmer>Reviewing your direction</ThinkingShimmer></MessageContent>
            </Message>
          </MessageGroup>
        </MessageScroller>

        <div class="chat-footer">
          <div class="chat-footer-inner">
            <PromptInput
              v-model="input" :loading="busy" :min-rows="1" :max-rows="4" placeholder="Ask the agent to continue…" :models="models" default-model="balanced" :actions="actions"
              @submit="submit" @stop="stop"
            />
          </div>
        </div>
      </AnimatedSidebarInset>
    </ChatApp>
  </div>
</template>

<style>
.chat-preview { position: relative; box-sizing: border-box; width: 100%; padding: .5rem 0; background: var(--beui-background); }
@media (min-width: 640px) { .chat-preview { padding: .75rem; } }
.chat-preview.chat-preview-expanded { position: fixed; inset: 0; z-index: 100; height: 100dvh; overscroll-behavior: contain; padding: .75rem; }
@media (min-width: 640px) { .chat-preview.chat-preview-expanded { padding: 1rem; } }
.chat-preview .chat-expand {
  position: absolute; top: 1.25rem; right: 6rem; z-index: 50; display: grid; width: 2.5rem; height: 2.5rem; padding: 0; place-items: center; border: 1px solid color-mix(in srgb, var(--beui-border) 80%, transparent);
  border-radius: 9999px; background: color-mix(in srgb, var(--beui-background) 90%, transparent); color: var(--beui-muted-foreground); backdrop-filter: blur(4px); cursor: pointer; outline: none; transition: color .15s, background-color .15s;
}
.chat-preview .chat-expand:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.chat-preview .chat-expand:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.chat-preview .chat-expand-swap { position: relative; display: grid; width: 1rem; height: 1rem; place-items: center; }
.chat-preview .chat-expand-icon { display: grid; place-items: center; }
.chat-preview .chat-shell { height: 760px; }
.chat-preview .chat-shell.chat-shell-full { height: 100%; }
.chat-preview .chat-panel { min-height: 0; }
.chat-preview .chat-surface { height: 100%; }
.chat-preview .chat-nav { gap: 1rem; overflow: hidden; padding: 1rem .5rem; }
.chat-preview .chat-nav-top { flex-shrink: 0; padding: 0 .25rem; }
.chat-preview .chat-menu { gap: .25rem; }
.chat-preview .chat-nav-button { font-weight: 400; }
.chat-preview .chat-nav-projects { min-height: 0; flex: 1 1 0%; padding: 0 .25rem; }
.chat-preview .chat-nav-label { height: 2rem; margin-bottom: .25rem; padding: 0 .5rem; font-size: .75rem; line-height: 1rem; font-weight: 500; text-transform: none; letter-spacing: normal; }
.chat-preview .chat-nav-tree { position: relative; min-height: 0; flex: 1 1 0%; overflow: hidden; }
.chat-preview .chat-nav-scroll { height: 100%; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 2rem; overflow-anchor: none; scrollbar-width: none; }
.chat-preview .chat-nav-scroll::-webkit-scrollbar { display: none; }
.chat-preview .chat-nav-fade { pointer-events: none; position: absolute; left: 0; right: 0; bottom: 0; height: 2rem; background: linear-gradient(to top, var(--beui-background), transparent); }
.chat-preview .chat-inset { position: relative; display: flex; min-width: 0; min-height: 0; flex: 1 1 0%; flex-direction: column; background: var(--beui-background); }
.chat-preview .chat-header { display: flex; height: 3.5rem; flex-shrink: 0; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--beui-border); padding: 0 1rem; }
.chat-preview .chat-heading { display: flex; min-width: 0; align-items: center; gap: .625rem; }
.chat-preview .chat-trigger { color: var(--beui-muted-foreground); transition: color .15s, background-color .15s; }
.chat-preview .chat-trigger:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.chat-preview .chat-title { min-width: 0; }
.chat-preview .chat-title p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-preview .chat-name { font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.chat-preview .chat-sub { font-size: 11px; line-height: 1.5; color: var(--beui-muted-foreground); }
.chat-preview .chat-status { border-radius: 9999px; background: rgb(16 185 129 / .1); padding: .25rem .625rem; font-size: 10px; line-height: 1.5; font-weight: 500; color: #059669; }
.dark .chat-preview .chat-status { color: #34d399; }
.chat-preview .chat-scroller { min-height: 0; flex: 1 1 0%; }
.chat-preview .chat-viewport { padding: 1.25rem .75rem; }
/* `sm:px-5` outranks the rail's `pr-10` upstream, so the rail never widens the right padding from 640px up. */
@media (min-width: 640px) { .chat-preview .be-message-scroller .be-ms-viewport.chat-viewport { padding: 1.25rem; } }
.chat-preview .chat-content { width: 100%; max-width: 48rem; min-height: 100%; margin: 0 auto; }
.chat-preview .chat-gap { gap: .75rem; }
.chat-preview .chat-full { width: 100%; }
.chat-preview .chat-art { width: 100%; height: 100%; }
.chat-preview .chat-footer { flex-shrink: 0; border-top: 1px solid var(--beui-border); background: var(--beui-background); padding: .75rem; }
.chat-preview .chat-footer-inner { max-width: 48rem; margin: 0 auto; }
</style>

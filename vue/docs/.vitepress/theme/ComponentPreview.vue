<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef } from 'vue'
import CodeBlock from './CodeBlock.vue'
import { useLocale } from './i18n'

const props = defineProps<{
  slug: string
  usage: string
  source: string
  title?: string
}>()

defineSlots<{
  default(): unknown
}>()

type PreviewTab = 'preview' | 'usage' | 'source'

const { t } = useLocale()
const tabs = computed(() => [
  { value: 'preview' as const, label: t('Preview') },
  { value: 'usage' as const, label: t('Usage') },
  { value: 'source' as const, label: t('Code') },
])

const instanceId = useId()
const selectedTab = shallowRef<PreviewTab>('preview')
const replayKey = shallowRef(0)
const expanded = shallowRef(false)
const mounted = shallowRef(false)
const tabList = useTemplateRef<HTMLDivElement>('tabList')
const fullscreenContent = useTemplateRef<HTMLDivElement>('fullscreenContent')
const fullscreenClose = useTemplateRef<HTMLButtonElement>('fullscreenClose')
let restoreDocument: (() => void) | undefined
let invoker: HTMLElement | null = null

function selectTab(tab: PreviewTab) {
  selectedTab.value = tab
}

function onTabKeydown(event: KeyboardEvent) {
  const currentIndex = tabs.value.findIndex(tab => tab.value === selectedTab.value)
  const count = tabs.value.length
  const destinations: Record<string, number> = {
    ArrowLeft: (currentIndex + count - 1) % count,
    ArrowRight: (currentIndex + 1) % count,
    Home: 0,
    End: count - 1,
  }
  const nextIndex = destinations[event.key]
  if (nextIndex === undefined) return
  event.preventDefault()
  selectedTab.value = tabs.value[nextIndex].value
  tabList.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
}

function replay() {
  selectedTab.value = 'preview'
  replayKey.value += 1
}

async function openFullscreen() {
  selectedTab.value = 'preview'
  if (expanded.value) return
  invoker = document.activeElement instanceof HTMLElement ? document.activeElement : null
  expanded.value = true
  const root = document.documentElement
  const body = document.body
  const app = document.getElementById('app')
  const rootOverflow = root.style.overflow
  const bodyOverflow = body.style.overflow
  const appWasInert = app?.inert || false
  root.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  if (app) app.inert = true
  window.addEventListener('keydown', onFullscreenKeydown)
  restoreDocument = () => {
    root.style.overflow = rootOverflow
    body.style.overflow = bodyOverflow
    if (app) app.inert = appWasInert
    window.removeEventListener('keydown', onFullscreenKeydown)
  }
  await nextTick()
  if (mounted.value && expanded.value) fullscreenClose.value?.focus({ preventScroll: true })
}

async function closeFullscreen() {
  expanded.value = false
  restoreDocument?.()
  restoreDocument = undefined
  await nextTick()
  if (mounted.value && invoker?.isConnected) invoker.focus({ preventScroll: true })
}

function onFullscreenKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog:modal')) return
  event.preventDefault()
  closeFullscreen()
}

onMounted(() => {
  mounted.value = true
})

onBeforeUnmount(() => {
  mounted.value = false
  restoreDocument?.()
  restoreDocument = undefined
})
</script>

<template>
  <div class="beui-component-preview" :data-component="props.slug">
    <div class="beui-preview-toolbar">
      <div
        ref="tabList"
        class="beui-preview-tabs"
        role="tablist"
        :aria-label="`${props.title || props.slug} example`"
        @keydown="onTabKeydown"
      >
        <button
          v-for="tab in tabs"
          :id="`${instanceId}-tab-${tab.value}`"
          :key="tab.value"
          class="beui-preview-tab"
          type="button"
          role="tab"
          :aria-selected="selectedTab === tab.value"
          :aria-controls="`${instanceId}-panel-${tab.value}`"
          :tabindex="selectedTab === tab.value ? 0 : -1"
          @click="selectTab(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="beui-preview-actions">
        <button
          class="beui-preview-icon-button"
          type="button"
          :aria-label="t('Replay animation')"
          :title="t('Replay animation')"
          @click="replay"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11a9 9 0 1 1 2.4 7.1M3 4v7h7" />
          </svg>
        </button>
        <button
          class="beui-preview-icon-button"
          type="button"
          :aria-label="t('Expand preview')"
          :title="t('Expand preview')"
          :aria-expanded="expanded"
          :aria-controls="`${instanceId}-fullscreen`"
          @click="openFullscreen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 3h6v6m-7 1 7-7M9 21H3v-6m7-1-7 7" />
          </svg>
        </button>
      </div>
    </div>
    <div
      v-show="selectedTab === 'preview'"
      :id="`${instanceId}-panel-preview`"
      class="beui-preview-panel"
      role="tabpanel"
      :aria-labelledby="`${instanceId}-tab-preview`"
      tabindex="0"
    >
      <Teleport :to="fullscreenContent || 'body'" :disabled="!expanded">
        <div :key="replayKey" class="beui-preview-stage" :data-expanded="expanded || undefined">
          <slot />
        </div>
      </Teleport>
    </div>
    <div
      v-show="selectedTab === 'usage'"
      :id="`${instanceId}-panel-usage`"
      class="beui-preview-panel"
      role="tabpanel"
      :aria-labelledby="`${instanceId}-tab-usage`"
      tabindex="0"
    >
      <CodeBlock :code="props.usage" lang="vue" label="Usage.vue" />
    </div>
    <div
      v-show="selectedTab === 'source'"
      :id="`${instanceId}-panel-source`"
      class="beui-preview-panel"
      role="tabpanel"
      :aria-labelledby="`${instanceId}-tab-source`"
      tabindex="0"
    >
      <CodeBlock :code="props.source" lang="vue" :label="`${props.slug}.vue`" />
    </div>
    <Teleport v-if="mounted" to="body">
      <div
        v-show="expanded"
        :id="`${instanceId}-fullscreen`"
        class="beui-preview-dialog"
        role="dialog"
        :aria-label="`${props.title || props.slug} ${t('Preview').toLowerCase()}`"
        :inert="!expanded"
      >
        <div class="beui-preview-dialog-actions">
          <button
            class="beui-preview-icon-button"
            type="button"
            :aria-label="t('Replay animation')"
            :title="t('Replay animation')"
            @click="replay"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 11a9 9 0 1 1 2.4 7.1M3 4v7h7" />
            </svg>
          </button>
          <button
            ref="fullscreenClose"
            class="beui-preview-icon-button"
            type="button"
            :aria-label="t('Exit expanded preview')"
            :title="t('Exit expanded preview')"
            @click="closeFullscreen"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 14h6v6m4-16v6h6m-6 0 7-7m-11 11-7 7" />
            </svg>
          </button>
        </div>
        <div ref="fullscreenContent" class="beui-preview-dialog-content" />
      </div>
    </Teleport>
  </div>
</template>

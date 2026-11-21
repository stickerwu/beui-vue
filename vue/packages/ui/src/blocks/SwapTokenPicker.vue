<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut, panelSpring } from '../core/motion'
import SwapChainDot from './SwapChainDot.vue'
import SwapIcon from './SwapIcon.vue'
import SwapTokenDot from './SwapTokenDot.vue'
import { formatAmount, type SwapChain, type SwapToken, type SwapTokenSide } from './swap-assets'
import type { swapMessages } from './messages'

const props = defineProps<{
  open: boolean
  side: SwapTokenSide | null
  chains: readonly SwapChain[]
  tokens: readonly SwapToken[]
  selectedId: string
  reduce: boolean
  text: typeof swapMessages
}>()
const emit = defineEmits<{ pick: [id: string]; close: [] }>()

const chainFilter = shallowRef('all')
const query = shallowRef('')
const input = useTemplateRef<HTMLInputElement>('input')
const root = useTemplateRef<HTMLElement>('root')

const popular = computed(() => props.tokens.filter(token => token.popular).slice(0, 6))
const chainById = computed(() => new Map(props.chains.map(chain => [chain.id, chain])))
const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return props.tokens.filter(token => {
    if (chainFilter.value !== 'all' && token.chainId !== chainFilter.value) return false
    if (!needle) return true
    const chain = chainById.value.get(token.chainId)
    return [token.symbol, token.name, chain?.name, token.address].some(haystack => haystack?.toLowerCase().includes(needle))
  })
})
const heading = computed(() => (query.value ? props.text.results : chainFilter.value === 'all' ? props.text.trending : props.text.tokens))

// A fresh session each time the sheet opens: an empty query and a focused field.
watch(() => props.open, (open, _previous, onCleanup) => {
  if (!open) return
  query.value = ''
  const frame = requestAnimationFrame(() => input.value?.focus({ preventScroll: true }))
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') emit('close') }
  window.addEventListener('keydown', onKey)
  onCleanup(() => { cancelAnimationFrame(frame); window.removeEventListener('keydown', onKey) })
}, { immediate: true })

// `AnimatePresence` keeps the leaving subtree frozen, so release pointer events and
// accessibility exposure on it in the commit that starts the exit (and give them
// back if the sheet re-opens mid-exit).
watch(() => props.open, async open => {
  await nextTick()
  for (const element of Array.from(root.value?.querySelectorAll<HTMLElement>('[data-swap-gate]') ?? [])) {
    element.inert = !open
    if (open) element.style.removeProperty('pointer-events')
    else element.style.pointerEvents = 'none'
  }
})

const label = computed(() => (props.side === 'from' ? props.text.selectFromToken : props.text.selectToToken))
const sheetHidden = computed(() => (props.reduce ? { opacity: 0 } : { opacity: 0, y: '100%' }))
const sheetShown = computed(() => (props.reduce ? { opacity: 1 } : { opacity: 1, y: 0 }))
const sheetTransition = computed(() => (props.reduce ? { duration: 0.18, ease: easeOut } : panelSpring))
</script>

<template>
  <div ref="root" class="be-swap-picker-root">
    <AnimatePresence>
      <template v-if="open">
        <motion.button key="backdrop" data-swap-gate type="button" :aria-label="text.close" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
          :transition="{ duration: 0.2, ease: easeOut }" class="be-swap-backdrop" @click="emit('close')" />

        <motion.div key="sheet" data-swap-gate :initial="sheetHidden" :animate="sheetShown" :exit="sheetHidden" :transition="sheetTransition" class="be-swap-sheet"
          role="dialog" aria-modal="true" :aria-label="label">
          <div class="be-swap-handle"><span /></div>

          <div class="be-swap-search">
            <SwapIcon name="search" class="be-swap-search-icon" />
            <input ref="input" v-model="query" class="be-swap-search-input" :placeholder="text.searchPlaceholder" :aria-label="text.searchPlaceholder">
            <button type="button" class="be-swap-close" :aria-label="text.close" @click="emit('close')"><SwapIcon name="x" /></button>
          </div>

          <div class="be-swap-chains">
            <button type="button" class="be-swap-chip is-wide" :class="{ 'is-active': chainFilter === 'all' }" :aria-pressed="chainFilter === 'all'" :title="text.allChains" @click="chainFilter = 'all'">
              <span class="be-swap-chip-label">{{ text.allChains }}</span>
            </button>
            <button v-for="chain in chains" :key="chain.id" type="button" class="be-swap-chip" :class="{ 'is-active': chainFilter === chain.id }" :aria-pressed="chainFilter === chain.id" :title="chain.name"
              :aria-label="chain.name" @click="chainFilter = chain.id">
              <SwapChainDot :chain="chain" :size="20" />
            </button>
          </div>

          <div class="be-swap-results">
            <template v-if="!query && chainFilter === 'all'">
              <p class="be-swap-heading is-popular">{{ text.popular }}</p>
              <div class="be-swap-popular">
                <template v-for="token in popular" :key="token.id">
                  <button v-if="chainById.get(token.chainId)" type="button" class="be-swap-pill" @click="emit('pick', token.id)">
                    <SwapTokenDot :token="token" :chain="chainById.get(token.chainId)!" :size="22" />
                    {{ token.symbol }}
                  </button>
                </template>
              </div>
            </template>

            <p class="be-swap-heading">{{ heading }}</p>
            <ul class="be-swap-list">
              <li v-if="filtered.length === 0" class="be-swap-empty">{{ text.empty }}</li>
              <template v-for="token in filtered" :key="token.id">
                <li v-if="chainById.get(token.chainId)">
                  <button type="button" class="be-swap-row" :class="{ 'is-active': token.id === selectedId }" @click="emit('pick', token.id)">
                    <span class="be-swap-row-main">
                      <SwapTokenDot :token="token" :chain="chainById.get(token.chainId)!" :size="32" />
                      <span class="be-swap-row-text">
                        <span class="be-swap-row-name">{{ token.name }}</span>
                        <span class="be-swap-row-symbol">{{ token.symbol }}</span>
                      </span>
                    </span>
                    <span class="be-swap-row-meta">{{ token.address ?? (token.balance ? formatAmount(token.balance) : '') }}</span>
                  </button>
                </li>
              </template>
            </ul>
          </div>
        </motion.div>
      </template>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.be-swap-picker-root { display: contents; }
.be-swap-backdrop { position: absolute; inset: 0; z-index: 10; display: block; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; cursor: default; background: color-mix(in srgb, var(--beui-background) 40%, transparent); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
.be-swap-sheet { position: absolute; inset: auto 0 0; z-index: 20; display: flex; box-sizing: border-box; max-height: 92%; flex-direction: column; border-top: 1px solid var(--beui-border); border-radius: 1.5rem 1.5rem 0 0; background: var(--beui-card); box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); }
.be-swap-handle { display: flex; justify-content: center; padding: .625rem 0 .25rem; }
.be-swap-handle span { width: 2.25rem; height: .25rem; border-radius: 9999px; background: var(--beui-muted); }
.be-swap-search { display: flex; align-items: center; gap: .5rem; padding: 0 1rem .75rem; border-bottom: 1px solid var(--beui-border); }
.be-swap-search-icon { width: 1rem; height: 1rem; color: var(--beui-muted-foreground); }
.be-swap-search-input { width: 100%; min-width: 0; margin: 0; padding: 0; border: 0; outline: none; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; }
.be-swap-search-input::placeholder { color: color-mix(in srgb, var(--beui-muted-foreground) 70%, transparent); opacity: 1; }
.be-swap-close { display: inline-flex; width: 1.75rem; height: 1.75rem; flex: none; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; transition: color .15s, background-color .15s; }
.be-swap-close :deep(.be-swap-icon) { width: .875rem; height: .875rem; }
.be-swap-close:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-swap-chains { display: flex; align-items: center; gap: .375rem; overflow-x: auto; padding: 1.25rem .75rem; border-bottom: 1px solid var(--beui-border); scrollbar-width: none; }
.be-swap-chains::-webkit-scrollbar, .be-swap-popular::-webkit-scrollbar { display: none; }
.be-swap-chip { display: inline-flex; box-sizing: border-box; width: 2.25rem; height: 2.25rem; flex: none; align-items: center; justify-content: center; margin: 0; padding: 0; border: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); border-radius: .75rem; background: color-mix(in srgb, var(--beui-background) 40%, transparent); color: var(--beui-foreground); font: inherit; cursor: pointer; transition: color .15s, background-color .15s, border-color .15s, transform .15s; }
.be-swap-chip.is-wide { width: auto; padding: 0 .75rem; }
.be-swap-chip:active { transform: scale(.97); }
.be-swap-chip:hover { border-color: var(--beui-border); }
.be-swap-chip.is-active { border-color: color-mix(in srgb, var(--beui-primary) 20%, transparent); background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
.be-swap-chip-label { font-size: .75rem; line-height: 1rem; font-weight: 600; }
.be-swap-results { flex: 1 1 0%; min-height: 0; overflow-y: auto; padding: .75rem .75rem 1rem; }
.be-swap-heading { margin: 0; padding: 0 .25rem .375rem; font-size: 11px; line-height: 1.5; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--beui-muted-foreground); }
.be-swap-heading.is-popular { padding-bottom: .5rem; }
.be-swap-popular { display: flex; align-items: center; gap: .375rem; overflow-x: auto; padding-bottom: .75rem; scrollbar-width: none; }
.be-swap-pill { display: inline-flex; flex: none; align-items: center; gap: .5rem; margin: 0; padding: .25rem .75rem .25rem .25rem; border: 1px solid var(--beui-border); border-radius: 9999px; background: color-mix(in srgb, var(--beui-background) 50%, transparent); color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 600; cursor: pointer; transition: transform .15s; }
.be-swap-pill:active { transform: scale(.97); }
.be-swap-list { display: flex; flex-direction: column; gap: .125rem; margin: 0; padding: 0; list-style: none; }
.be-swap-empty { padding: 2rem 0; text-align: center; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-swap-row { display: flex; box-sizing: border-box; width: 100%; align-items: center; justify-content: space-between; margin: 0; padding: .5rem; border: 0; border-radius: .75rem; background: transparent; color: var(--beui-foreground); font: inherit; text-align: left; cursor: pointer; transition: color .15s, background-color .15s, transform .15s; }
.be-swap-row:hover, .be-swap-row.is-active { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
.be-swap-row:active { transform: scale(.97); }
.be-swap-row-main { display: flex; min-width: 0; align-items: center; gap: .625rem; }
.be-swap-row-text { display: flex; min-width: 0; flex-direction: column; }
.be-swap-row-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; font-weight: 600; color: var(--beui-foreground); }
.be-swap-row-symbol { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; line-height: 1.5; color: var(--beui-muted-foreground); }
.be-swap-row-meta { flex: none; text-align: right; font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.be-swap-pill:focus-visible, .be-swap-row:focus-visible, .be-swap-chip:focus-visible, .be-swap-close:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
</style>

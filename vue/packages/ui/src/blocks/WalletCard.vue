<script setup lang="ts">
import { AnimatePresence, LayoutGroup, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, h, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import ButtonBase from '../ButtonBase.vue'
import { useValue } from '../agents/shared'
import { easeOut, pressSpring, swapSpring } from '../core/motion'
import { walletCardMessages } from './messages'
import WalletSwapText from './WalletSwapText.vue'

export interface WalletAccount { id: string, name: string, address: string }

const props = withDefaults(defineProps<{
  accounts: WalletAccount[]
  accountId?: string
  defaultAccountId?: string
  balance: number
  balancePrefix?: string
  /** Initial balance change shown in the pill before any live change. */
  defaultChange?: number
  /** Start with the balance hidden behind dots. */
  defaultBalanceHidden?: boolean
  searchPlaceholder?: string
  /** Recent searches shown in the expanded search panel. */
  searchRecent?: string[]
  /** Show an unread pulse on the notifications bell. */
  hasNotifications?: boolean
  labels?: Partial<typeof walletCardMessages>
  className?: string
}>(), { balancePrefix: '$', hasNotifications: false, defaultBalanceHidden: false })
const emit = defineEmits<{
  'update:accountId': [id: string]
  accountChange: [id: string]
  send: []
  deposit: []
  swap: []
  buy: []
  searchChange: [query: string]
  searchSubmit: [query: string]
  notifications: []
}>()
defineSlots<{ avatar?(props: { account: WalletAccount }): unknown }>()

const t = computed(() => ({ ...walletCardMessages, ...props.labels }))
const reduce = useReducedMotion()

// Lucide glyphs (the original imports `lucide-react`).
const PATHS: Record<string, string> = {
  bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  up: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  down: '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
  send: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  deposit: '<path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/>',
  swap: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  buy: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
}
const Glyph = (glyph: { name: string, size?: number }) => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: glyph.size ?? 16, height: glyph.size ?? 16, fill: 'none', stroke: 'currentColor',
  'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'be-wallet-glyph', innerHTML: PATHS[glyph.name],
})

// Springs of the original `wallet-card/constants.ts`.
const MORPH = { type: 'spring', duration: 0.5, bounce: 0.22 } as const
const GLIDE = { type: 'spring', duration: 0.5, bounce: 0 } as const
const morph = computed(() => reduce.value ? { duration: 0 } : MORPH)
const glide = computed(() => reduce.value ? { duration: 0 } : GLIDE)
const LIST = { hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.12 } } }
const ITEM = { hidden: { opacity: 0, y: -6, filter: 'blur(3px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } }
const listVariants = computed(() => reduce.value ? undefined : LIST)
const itemVariants = computed(() => reduce.value ? undefined : ITEM)

const uid = useId()
const { value: selected, set: setSelected } = useValue(() => props.accountId, props.defaultAccountId ?? props.accounts[0]?.id ?? '', id => {
  emit('update:accountId', id)
  emit('accountChange', id)
})
const activeAccount = computed(() => props.accounts.find(item => item.id === selected.value) ?? props.accounts[0])
const hidden = shallowRef(props.defaultBalanceHidden)

const shownBalance = computed(() => `${props.balancePrefix}${props.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const maskedBalance = '*'.repeat(7)
const money = (value: number) => Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function addressLabel(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
const avatarUrl = (account: WalletAccount) => `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(account.id || account.address)}`

// The last balance change persists until the balance moves again.
const delta = shallowRef<{ id: number, amount: number } | null>(props.defaultChange ? { id: 0, amount: props.defaultChange } : null)
let previous = props.balance
watch(() => props.balance, balance => {
  const diff = balance - previous
  previous = balance
  if (diff !== 0) delta.value = { id: Date.now(), amount: diff }
})
const deltaUp = computed(() => (delta.value?.amount ?? 0) > 0)

// Dismissal: a press outside the control, or Escape, closes it.
function useDismiss(open: () => boolean, close: () => void, root: () => HTMLElement | null | undefined) {
  const onPointer = (event: PointerEvent) => { if (open() && !root()?.contains(event.target as Node)) close() }
  const onKey = (event: KeyboardEvent) => { if (open() && event.key === 'Escape') close() }
  onMounted(() => { document.addEventListener('pointerdown', onPointer, true); document.addEventListener('keydown', onKey) })
  onBeforeUnmount(() => { document.removeEventListener('pointerdown', onPointer, true); document.removeEventListener('keydown', onKey) })
}

// Account switcher. Hover only arms after the morph settles, so the panel expanding under the
// cursor does not flash a phantom hover on whatever row it lands on.
const accountRoot = useTemplateRef<HTMLElement>('accountRoot')
const accountOpen = shallowRef(false)
const accountArmed = shallowRef(false)
let accountTimer: ReturnType<typeof setTimeout> | undefined
watch(accountOpen, open => {
  clearTimeout(accountTimer)
  accountArmed.value = false
  if (open) accountTimer = setTimeout(() => { accountArmed.value = true }, reduce.value ? 0 : 280)
})
useDismiss(() => accountOpen.value, () => { accountOpen.value = false }, () => accountRoot.value)
const copiedId = shallowRef<string | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copyAddress(account: WalletAccount) {
  try { await navigator.clipboard.writeText(account.address) } catch { /* clipboard may be unavailable; swap anyway */ }
  copiedId.value = account.id
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copiedId.value = null }, 1400)
}
function pick(id: string) { setSelected(id); accountOpen.value = false }
const iconRoll = {
  initial: { opacity: 0, y: 12, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: swapSpring },
  exit: { opacity: 0, y: -12, filter: 'blur(3px)', transition: { duration: 0.14, ease: easeOut } },
}
const iconSettled = { opacity: 1, filter: 'blur(0px)', y: 0 }

// Search: the icon morphs into a bar whose recent searches live in the same connected panel.
const searchRoot = useTemplateRef<HTMLElement>('searchRoot')
// `motion.input` renders a component, so the ref is its instance and `$el` is the DOM node.
const searchInput = useTemplateRef<{ $el?: HTMLInputElement }>('searchInput')
const searchOpen = shallowRef(false)
const searchArmed = shallowRef(false)
const query = shallowRef('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchOpen, open => {
  clearTimeout(searchTimer)
  searchArmed.value = false
  if (open) {
    nextTick(() => searchInput.value?.$el?.focus())
    searchTimer = setTimeout(() => { searchArmed.value = true }, reduce.value ? 0 : 260)
  }
})
useDismiss(() => searchOpen.value, () => { searchOpen.value = false }, () => searchRoot.value)
const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const recent = props.searchRecent ?? []
  return needle ? recent.filter(term => term.toLowerCase().includes(needle)) : recent
})
function submitSearch(value: string) { emit('searchSubmit', value); searchOpen.value = false }
function onSearchInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  emit('searchChange', query.value)
}
function pickRecent(term: string) { query.value = term; emit('searchChange', term); submitSearch(term) }
onBeforeUnmount(() => { clearTimeout(accountTimer); clearTimeout(searchTimer); clearTimeout(copyTimer) })

const actions = computed(() => [
  { key: 'send', label: t.value.send, run: () => emit('send') },
  { key: 'deposit', label: t.value.deposit, run: () => emit('deposit') },
  { key: 'swap', label: t.value.swap, run: () => emit('swap') },
  { key: 'buy', label: t.value.buy, run: () => emit('buy') },
])
</script>

<template>
  <div class="be-wallet" :class="className">
    <!-- relative anchor so the switcher and search panels span the whole row -->
    <LayoutGroup :id="uid">
      <div class="be-wallet-header">
        <div ref="accountRoot" class="be-wallet-switcher">
          <!-- In-flow sizer: reserves the widest trigger footprint so the row never changes width. -->
          <div aria-hidden="true" class="be-wallet-head is-sizer">
            <span v-if="activeAccount" class="be-wallet-avatar-slot"><slot name="avatar" :account="activeAccount"><img :src="avatarUrl(activeAccount)" alt="" class="be-wallet-avatar"></slot></span>
            <span class="be-wallet-sizer-names"><span v-for="account in accounts" :key="account.id" class="be-wallet-sizer-name">{{ account.name }}</span></span>
            <Glyph name="chevron" />
          </div>

          <AnimatePresence :initial="false" mode="popLayout">
            <motion.button
              v-if="!accountOpen" key="trigger" :layout-id="`${uid}-account`" type="button" aria-haspopup="listbox" :aria-expanded="false"
              class="be-wallet-head be-wallet-trigger" :transition="morph" :style="{ borderRadius: '16px' }" @click="accountOpen = true"
            >
              <template v-if="activeAccount">
                <slot name="avatar" :account="activeAccount"><img :src="avatarUrl(activeAccount)" :alt="activeAccount.name" class="be-wallet-avatar"></slot>
                <motion.span layout="position" class="be-wallet-trigger-name">{{ activeAccount.name }}</motion.span>
                <motion.span layout="position" class="be-wallet-muted"><Glyph name="chevron" /></motion.span>
              </template>
            </motion.button>
          </AnimatePresence>

          <AnimatePresence :initial="false" mode="popLayout">
            <motion.div v-if="accountOpen" key="panel" :layout-id="`${uid}-account`" role="listbox" class="be-wallet-panel is-account" :transition="morph" :style="{ borderRadius: '16px' }">
              <button type="button" class="be-wallet-head is-panel-head" @click="accountOpen = false">
                <slot v-if="activeAccount" name="avatar" :account="activeAccount"><img :src="avatarUrl(activeAccount)" :alt="activeAccount.name" class="be-wallet-avatar"></slot>
                <motion.span layout="position" class="be-wallet-panel-name">{{ activeAccount?.name ?? t.selectAccount }}</motion.span>
                <motion.span layout="position" :animate="{ rotate: 180 }" :transition="morph" class="be-wallet-muted"><Glyph name="chevron" /></motion.span>
              </button>

              <motion.ul initial="hidden" animate="show" :variants="listVariants" class="be-wallet-list is-accounts" :class="{ 'is-unarmed': !accountArmed }">
                <motion.li
                  v-for="account in accounts" :key="account.id" :variants="itemVariants" class="be-wallet-item"
                  :class="{ 'is-selected': account.id === activeAccount?.id, 'is-armed': accountArmed }"
                >
                  <button type="button" role="option" :aria-selected="account.id === activeAccount?.id" class="be-wallet-option" @click="pick(account.id)">
                    <slot name="avatar" :account="account"><img :src="avatarUrl(account)" :alt="account.name" class="be-wallet-avatar"></slot>
                    <span class="be-wallet-option-text">
                      <span class="be-wallet-option-name">{{ account.name }}</span>
                      <span class="be-wallet-option-address">{{ addressLabel(account.address) }}</span>
                    </span>
                    <Glyph v-if="account.id === activeAccount?.id" name="check" class="be-wallet-check" />
                  </button>
                  <button type="button" class="be-wallet-copy" :aria-label="copiedId === account.id ? t.copied : t.copyAddress" @click.stop="copyAddress(account)">
                    <span class="be-wallet-copy-icon">
                      <AnimatePresence mode="popLayout" :initial="false">
                        <motion.span
                          :key="copiedId === account.id ? 'check' : 'copy'" aria-hidden="true" class="be-wallet-copy-glyph"
                          :initial="reduce ? false : iconRoll.initial" :animate="reduce ? iconSettled : iconRoll.animate" :exit="reduce ? undefined : iconRoll.exit"
                        ><Glyph :name="copiedId === account.id ? 'check' : 'copy'" :size="14" :class="{ 'is-copied': copiedId === account.id }" /></motion.span>
                      </AnimatePresence>
                    </span>
                  </button>
                </motion.li>
              </motion.ul>
            </motion.div>
          </AnimatePresence>
        </div>

        <div class="be-wallet-tools">
          <div ref="searchRoot" class="be-wallet-search">
            <!-- reserve the icon's width while open (the icon has left the flow) -->
            <div v-if="searchOpen" aria-hidden="true" class="be-wallet-search-slot" />

            <AnimatePresence :initial="false" mode="popLayout">
              <motion.button
                v-if="!searchOpen" key="icon" :layout-id="`${uid}-search`" type="button" :aria-label="t.search" class="be-wallet-search-icon"
                :transition="morph" :style="{ borderRadius: '12px' }" @click="searchOpen = true"
              ><Glyph name="search" /></motion.button>
            </AnimatePresence>

            <AnimatePresence :initial="false" mode="popLayout">
              <motion.div v-if="searchOpen" key="panel" :layout-id="`${uid}-search`" class="be-wallet-panel is-search" :transition="morph" :style="{ borderRadius: '16px' }">
                <div class="be-wallet-search-row">
                  <motion.span layout="position" :transition="glide" class="be-wallet-search-glyph"><Glyph name="search" /></motion.span>
                  <motion.input
                    ref="searchInput" layout="position" class="be-wallet-search-input" :initial="reduce ? false : { opacity: 0 }" :animate="{ opacity: 1 }"
                    :transition="{ opacity: { duration: 0.15, delay: 0.12, ease: easeOut }, layout: glide }" :value="query" :placeholder="searchPlaceholder ?? t.searchPlaceholder"
                    @input="onSearchInput" @keydown.enter="query.trim() && submitSearch(query.trim())" @keydown.escape="searchOpen = false"
                  />
                </div>
                <div class="be-wallet-rule" />
                <motion.ul v-if="filtered.length > 0" initial="hidden" animate="show" :variants="listVariants" class="be-wallet-list is-search" :class="{ 'is-unarmed': !searchArmed }">
                  <motion.li v-for="term in filtered" :key="term" layout="position" :variants="itemVariants">
                    <button type="button" class="be-wallet-recent" :class="{ 'is-armed': searchArmed }" @click="pickRecent(term)">
                      <Glyph name="history" class="be-wallet-recent-glyph" />
                      <span class="be-wallet-recent-text">{{ term }}</span>
                    </button>
                  </motion.li>
                </motion.ul>
                <motion.div v-else layout="position" class="be-wallet-empty">
                  <Glyph name="search" :size="20" class="be-wallet-empty-glyph" />
                  <p>{{ query.trim() ? t.noMatches : t.noRecent }}</p>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          <ButtonBase variant="ghost" size="icon" :aria-label="t.notifications" class="be-wallet-bell" @click="emit('notifications')">
            <Glyph name="bell" />
            <span v-if="hasNotifications" class="be-wallet-dot"><span class="be-wallet-ping" /><span class="be-wallet-dot-core" /></span>
          </ButtonBase>
        </div>
      </div>
    </LayoutGroup>

    <div class="be-wallet-balance">
      <div class="be-wallet-balance-label">
        <p>{{ t.balance }}</p>
        <button type="button" class="be-wallet-eye" :aria-label="hidden ? t.showBalance : t.hideBalance" :aria-pressed="hidden" @click="hidden = !hidden">
          <Glyph :name="hidden ? 'eyeOff' : 'eye'" :size="14" />
        </button>
      </div>
      <!-- One swap text trades the number and the asterisk mask with a per-letter cascade. -->
      <div class="be-wallet-amount"><WalletSwapText :value="hidden ? 'hidden' : shownBalance" :text="hidden ? maskedBalance : shownBalance" /></div>
      <div v-if="hidden" class="be-wallet-delta-slot"><span class="be-wallet-mask">*****</span></div>
      <div v-else class="be-wallet-delta-slot">
        <AnimatePresence mode="wait">
          <motion.span
            v-if="delta" :key="delta.id" class="be-wallet-delta" :class="deltaUp ? 'is-up' : 'is-down'"
            :initial="{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.9 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: reduce ? 0 : -6, scale: reduce ? 1 : 0.9 }" :transition="{ duration: 0.2, ease: easeOut }"
          >
            <Glyph :name="deltaUp ? 'up' : 'down'" :size="14" />{{ deltaUp ? '+' : '-' }}{{ balancePrefix }}{{ money(delta.amount) }}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>

    <div class="be-wallet-actions-wrap">
      <div class="be-wallet-actions">
        <motion.button
          v-for="action in actions" :key="action.key" type="button" class="be-wallet-action" :while-press="reduce ? undefined : { scale: 0.94 }" :transition="pressSpring" @click="action.run"
        >
          <span class="be-wallet-action-icon"><Glyph :name="action.key" :size="20" /></span>
          <span class="be-wallet-action-label">{{ action.label }}</span>
        </motion.button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.be-wallet { position: relative; box-sizing: border-box; width: 100%; max-width: 20rem; overflow: hidden; padding: 1.5rem; border: 1px solid var(--beui-border); border-radius: 2rem; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; }
.be-wallet button { font-family: inherit; }
.be-wallet-glyph { flex: none; }
.be-wallet-header { position: relative; display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.be-wallet-switcher { min-width: 0; }
.be-wallet-head { display: flex; align-items: center; gap: .5rem; padding: .375rem .5rem; text-align: left; }
.be-wallet-head.is-sizer { pointer-events: none; opacity: 0; }
.be-wallet-avatar { display: block; flex: none; width: 1.75rem; height: 1.75rem; border-radius: 9999px; background: var(--beui-muted); }
.be-wallet-avatar-slot { display: contents; }
.be-wallet-sizer-names { display: grid; }
.be-wallet-sizer-name { grid-column-start: 1; grid-row-start: 1; font-size: .875rem; line-height: 1.25rem; font-weight: 500; white-space: nowrap; }
.be-wallet-trigger { position: absolute; top: 0; left: -.5rem; z-index: 20; box-sizing: border-box; max-width: 100%; margin: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; outline: none; transition: background-color .15s; }
@media (hover: hover) { .be-wallet-trigger:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); } }
.be-wallet-trigger:focus-visible, .be-wallet-search-icon:focus-visible, .be-wallet-option:focus-visible, .be-wallet-action:focus-visible, .be-wallet-copy:focus-visible, .be-wallet-recent:focus-visible, .be-wallet-eye:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-wallet-trigger-name, .be-wallet-panel-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.be-wallet-panel-name { min-width: 0; flex: 1; }
.be-wallet-muted { display: inline-flex; color: var(--beui-muted-foreground); }

.be-wallet-panel { position: absolute; top: 0; right: -.5rem; left: -.5rem; box-sizing: border-box; overflow: hidden; border: 1px solid color-mix(in srgb, var(--beui-border) 30%, transparent); background: var(--beui-background); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.be-wallet-panel.is-account { z-index: 30; }
.be-wallet-panel.is-search { z-index: 40; }
.be-wallet-head.is-panel-head { box-sizing: border-box; width: 100%; margin: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; outline: none; }
.be-wallet-list { box-sizing: border-box; margin: 0; padding: .375rem; list-style: none; overflow-y: auto; }
.be-wallet-list.is-accounts { max-height: 16rem; }
.be-wallet-list.is-search { max-height: 14rem; }
.be-wallet-list.is-unarmed { pointer-events: none; }
.be-wallet-item { display: flex; align-items: center; padding-right: .25rem; border-radius: .75rem; color: var(--beui-muted-foreground); font-size: .875rem; line-height: 1.25rem; transition: background-color .15s, color .15s; }
.be-wallet-item.is-selected { background: var(--beui-muted); color: var(--beui-foreground); }
@media (hover: hover) { .be-wallet-item.is-armed:not(.is-selected):hover { background: var(--beui-muted); color: var(--beui-foreground); } }
.be-wallet-option { display: flex; min-width: 0; flex: 1; align-items: center; gap: .625rem; padding: .5rem; border: 0; border-radius: .75rem; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; outline: none; }
.be-wallet-option-text { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.be-wallet-option-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.be-wallet-option-address { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-wallet-check { color: var(--beui-foreground); }
.be-wallet-copy { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; padding: 0; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: background-color .15s, color .15s; }
@media (hover: hover) { .be-wallet-copy:hover { background: var(--beui-muted); color: var(--beui-foreground); } }
.be-wallet-copy-icon { position: relative; display: inline-grid; flex: none; place-items: center; width: .875rem; height: .875rem; overflow: hidden; }
.be-wallet-copy-glyph { display: inline-flex; }
.is-copied { color: oklch(69.6% .17 162.48); }

.be-wallet-tools { display: flex; flex: none; align-items: center; gap: .25rem; }
.be-wallet-search { flex: none; }
.be-wallet-search-slot { width: 2rem; height: 2rem; }
.be-wallet-search-icon { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; padding: 0; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: background-color .15s, color .15s; }
@media (hover: hover) { .be-wallet-search-icon:hover { background: var(--beui-muted); color: var(--beui-foreground); } }
.be-wallet-search-row { display: flex; align-items: center; gap: .5rem; height: 2.25rem; padding: 0 .75rem; }
.be-wallet-search-glyph { display: inline-flex; flex: none; color: var(--beui-muted-foreground); }
.be-wallet-search-input { min-width: 0; flex: 1; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-size: .875rem; line-height: 1.25rem; outline: none; }
.be-wallet-search-input::placeholder { color: var(--beui-muted-foreground); }
.be-wallet-rule { height: 1px; background: color-mix(in srgb, var(--beui-border) 40%, transparent); }
.be-wallet-recent { display: flex; box-sizing: border-box; width: 100%; align-items: center; gap: .625rem; padding: .5rem .625rem; border: 0; border-radius: .75rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; text-align: left; cursor: pointer; outline: none; transition: background-color .15s, color .15s; }
@media (hover: hover) { .be-wallet-recent.is-armed:hover { background: var(--beui-muted); color: var(--beui-foreground); } }
.be-wallet-recent-text { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-wallet-empty { display: flex; flex-direction: column; align-items: center; gap: .25rem; padding: 2rem 1rem; text-align: center; }
.be-wallet-empty p { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-wallet-empty-glyph { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
.be-wallet-bell { position: relative; }
.be-wallet-dot { position: absolute; top: .375rem; right: .375rem; display: flex; width: .5rem; height: .5rem; }
.be-wallet-ping { position: absolute; display: inline-flex; width: 100%; height: 100%; border-radius: 9999px; background: var(--beui-primary); opacity: .6; animation: be-wallet-ping 1s cubic-bezier(0, 0, .2, 1) infinite; }
.be-wallet-dot-core { position: relative; display: inline-flex; width: .5rem; height: .5rem; border-radius: 9999px; background: var(--beui-primary); }
@keyframes be-wallet-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .be-wallet-ping { animation: none; } }

.be-wallet-balance { display: flex; flex-direction: column; align-items: center; margin-top: 2rem; text-align: center; }
.be-wallet-balance-label { display: flex; align-items: center; gap: .375rem; }
.be-wallet-balance-label p { margin: 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-wallet-eye { display: inline-flex; padding: 0; border: 0; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s; }
@media (hover: hover) { .be-wallet-eye:hover { color: var(--beui-foreground); } }
.be-wallet-amount { display: flex; max-width: 100%; font-size: 1.875rem; line-height: 2.25rem; font-weight: 600; color: var(--beui-foreground); }
.be-wallet-delta-slot { display: flex; align-items: center; justify-content: center; height: 1.75rem; margin-top: .5rem; }
.be-wallet-mask { transform: translateY(3px); font-size: .875rem; font-weight: 600; line-height: 1; letter-spacing: .3em; color: var(--beui-muted-foreground); }
.be-wallet-delta { display: inline-flex; align-items: center; gap: .25rem; padding: .25rem .625rem; border-radius: 9999px; font-size: .75rem; line-height: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.be-wallet-delta.is-up { background: oklch(69.6% .17 162.48 / .15); color: oklch(59.6% .145 163.225); }
.be-wallet-delta.is-down { background: oklch(63.7% .237 25.331 / .15); color: oklch(57.7% .245 27.325); }
:global(:is(.dark, [data-beui-theme='dark']) .be-wallet-delta.is-up) { color: oklch(76.5% .177 163.223); }
:global(:is(.dark, [data-beui-theme='dark']) .be-wallet-delta.is-down) { color: oklch(70.4% .191 22.216); }

.be-wallet-actions-wrap { margin-top: 2rem; }
.be-wallet-actions { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; }
.be-wallet-action { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: center; gap: .5rem; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; outline: none; }
.be-wallet-action-icon { display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; border-radius: 9999px; background: var(--beui-muted); color: var(--beui-foreground); }
.be-wallet-action-label { font-size: .75rem; line-height: 1rem; font-weight: 500; color: var(--beui-muted-foreground); }
</style>

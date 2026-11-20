<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import { useOpenState } from '../primitives/state'
export type SearchItem = { id: string, label?: string, title?: string, group?: string, hint?: string, description?: string, keywords?: string[], badge?: string, disabled?:boolean, onSelect?: () => void }
const props = withDefaults(defineProps<{ items: SearchItem[], open?: boolean, defaultOpen?: boolean, shortcut?: string, placeholder?: string, emptyMessage?: string, morph?: boolean, iconOnly?:boolean }>(), { open:undefined, defaultOpen:false, shortcut:'k' })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean], queryChange: [value: string], select: [item: SearchItem] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open',next); emit('openChange',next) })
const query = shallowRef('')
const index = shallowRef(0)
const dialog = shallowRef<HTMLDialogElement | null>(null)
const input = shallowRef<HTMLInputElement | null>(null)
const trigger = shallowRef<HTMLButtonElement | null>(null)
const id = useId()
const items = computed(() => {
  const terms = query.value.trim().toLowerCase().split(/\s+/)
  return props.items.filter(item => terms.every(term => [item.label,item.title,item.description,item.group,...item.keywords ?? []].join(' ').toLowerCase().includes(term)))
})
watch(query, next => { index.value = 0; emit('queryChange',next) })
async function visible(next: boolean) {
  const node = dialog.value
  if (!node) return
  if (next && !node.open) {
    query.value = ''; node.showModal(); await nextTick(); input.value?.focus()
  } else if (!next && node.open) { node.close(); trigger.value?.focus() }
}
function keyboard(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === props.shortcut.toLowerCase()) { event.preventDefault(); setOpen(!open.value) }
}
function select(item?: SearchItem) {
  if (!item || item.disabled) return
  setOpen(false); item.onSelect?.(); emit('select',item)
}
function move(delta:number) {
  if (!items.value.length) return
  let target = index.value
  for (let step=0;step<items.value.length;step++) {
    target = (target+delta+items.value.length)%items.value.length
    if (!items.value[target].disabled) { index.value=target; break }
  }
  document.getElementById(`${id}-${index.value}`)?.scrollIntoView({block:'nearest'})
}
watch(open, visible, {flush:'post'})
onMounted(() => { window.addEventListener('keydown',keyboard); visible(open.value) })
onBeforeUnmount(() => window.removeEventListener('keydown',keyboard))
</script>
<template>
  <div class="be-block"><button ref="trigger" type="button" class="be-block-button" :aria-label="morph ? 'Open search' : 'Open command palette'" aria-haspopup="dialog" @click="setOpen(true)"><slot name="trigger">⌕ <span v-if="!iconOnly">{{ morph ? 'Search' : 'Open command palette' }}</span> <kbd v-if="!iconOnly">⌘ {{ shortcut.toUpperCase() }}</kbd></slot></button>
    <dialog ref="dialog" class="be-block-dialog be-search-dialog" :aria-label="morph ? 'Search' : 'Command palette'" @cancel.prevent="setOpen(false)" @click="($event.target === dialog) && setOpen(false)">
      <div class="be-block-stack"><input ref="input" v-model="query" class="be-block-field" type="search" role="combobox" :aria-label="morph ? 'Search' : 'Search commands'" aria-expanded="true" :aria-controls="id" :aria-activedescendant="items[index] ? `${id}-${index}` : undefined" :placeholder="placeholder ?? (morph ? 'Search' : 'Type a command or search…')" @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter.prevent="select(items[index])" />
        <ul :id="id" class="be-block-list" role="listbox" aria-label="Results"><li v-for="(item,position) in items" :id="`${id}-${position}`" :key="item.id" role="option" :aria-selected="position === index" :aria-disabled="item.disabled" @pointermove="index=position" @click="select(item)"><slot name="item" :item="item"><span>{{ item.label ?? item.title }}</span><small>{{ item.hint ?? item.description ?? item.group }}</small></slot></li></ul>
        <span v-if="!items.length" role="status">{{ emptyMessage ?? 'No results found.' }}</span><button type="button" class="be-block-button" @click="setOpen(false)">Close</button>
      </div>
    </dialog>
  </div>
</template>
<style scoped>.be-search-dialog{padding:.75rem}.be-search-dialog ul{max-height:18rem;overflow:auto}.be-search-dialog li{display:flex;justify-content:space-between;gap:1rem;padding:.55rem .75rem;border-radius:.5rem;cursor:pointer}.be-search-dialog li[aria-selected=true]{background:var(--beui-muted)}.be-search-dialog small,kbd{color:var(--beui-muted-foreground)}.be-search-dialog [aria-disabled=true]{opacity:.45}</style>

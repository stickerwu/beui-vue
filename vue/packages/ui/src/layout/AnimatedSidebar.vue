<script setup lang="ts">
import { useMountedMedia } from '../core/mounted-media'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId } from 'vue'
import DialogSurface from './DialogSurface.vue'

interface Destination { id: string; label: string; icon?: string; children?: readonly { id: string; label: string }[] }
const { items, label = 'Workspace', shortcut = true, collapsible = 'icon' } = defineProps<{ items: readonly Destination[]; label?: string; shortcut?: boolean; collapsible?: 'icon'|'offcanvas'|'none' }>()
const active = defineModel<string>()
const open = defineModel<boolean>('open', { default: true })
const small = useMountedMedia('(max-width: 767px)')
const mobileOpen = shallowRef(false)
const expanded = shallowRef('')
const uid = useId()
const wide = computed(() => small.value || open.value || collapsible === 'none')
function toggle() { if (small.value) mobileOpen.value = !mobileOpen.value; else open.value = !open.value }
function choose(item: Destination) {
  if (item.children?.length) {
    if (!wide.value) open.value = true
    expanded.value = expanded.value === item.id ? '' : item.id
  } else mobileOpen.value = false
  active.value = item.id
}
function keyboard(event: KeyboardEvent) {
  if (!shortcut || collapsible === 'none' || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'b') return
  if ((event.target as HTMLElement)?.closest('input,textarea,[contenteditable=true]')) return
  event.preventDefault()
  toggle()
}
onMounted(() => window.addEventListener('keydown', keyboard))
onBeforeUnmount(() => window.removeEventListener('keydown', keyboard))
</script>
<template>
  <div class="workspace">
    <component :is="small ? DialogSurface : 'aside'" v-bind="small ? { open:mobileOpen, label, kind:'left' as const } : {}" :data-wide="wide" :data-hidden="!small && !wide && collapsible === 'offcanvas'" class="panel" @close="mobileOpen=false">
      <header><slot name="header" :expanded="wide"><b>{{ wide ? label : label[0] }}</b></slot><button v-if="small" type="button" aria-label="Close sidebar" @click="mobileOpen=false">×</button></header>
      <nav :aria-label="label">
        <div v-for="item in items" :key="item.id">
          <button type="button" :aria-label="item.label" :aria-current="active===item.id ? 'page' : undefined" :aria-expanded="item.children ? expanded===item.id && wide : undefined" :aria-controls="item.children ? `${uid}-${item.id}` : undefined" @click="choose(item)">
            <span class="icon" aria-hidden="true"><slot name="icon" :item="item">{{ item.icon ?? item.label[0] }}</slot></span><span v-if="wide">{{ item.label }}</span><i v-if="wide && item.children" aria-hidden="true">{{ expanded===item.id ? '⌄' : '›' }}</i>
          </button>
          <div v-if="item.children" :id="`${uid}-${item.id}`" v-show="wide && expanded===item.id" class="children"><button v-for="child in item.children" :key="child.id" type="button" :aria-current="active===child.id ? 'page' : undefined" @click="active=child.id; mobileOpen=false">{{ child.label }}</button></div>
        </div>
      </nav>
      <footer v-if="$slots.footer"><slot name="footer" :expanded="wide" /></footer>
    </component>
    <div class="main"><button v-if="collapsible!=='none' || small" type="button" class="trigger" aria-label="Toggle sidebar" :aria-expanded="small ? mobileOpen : open" @click="toggle">◧</button><slot :active="active" :toggle="toggle" /></div>
  </div>
</template>
<style scoped>.workspace { width:100%; display:flex; min-height:22rem; border:1px solid var(--beui-border); border-radius:1rem; overflow:hidden; text-align:start; } .panel { display:flex; box-sizing:border-box; flex-shrink:0; flex-direction:column; gap:1rem; width:min(14rem,45%); padding:.75rem; border-right:1px solid var(--beui-border); background:var(--beui-card); color:var(--beui-foreground); transition:width .26s; } dialog.panel:not([open]) {display:none} .panel[data-wide=false] {width:3.75rem;} .panel[data-hidden=true] {display:none;} header {display:flex; align-items:center; justify-content:space-between; min-height:2rem;} nav {display:grid; gap:.15rem;} .panel button,.trigger {display:flex; align-items:center; gap:.6rem; border:0; background:transparent; color:inherit; border-radius:.45rem; cursor:pointer; font:inherit; font-size:.84rem; padding:.45rem .5rem;} nav button {width:100%; text-align:left;} nav button:hover,nav [aria-current] {background:var(--beui-muted);} .icon {min-width:1rem; text-align:center;} i {margin-left:auto;} .children {margin-left:1.15rem; border-left:1px solid var(--beui-border); padding-left:.4rem;} footer {margin-top:auto;} .main {flex:1; min-width:0; padding:.75rem;} .trigger {font-size:1.2rem;} @media(prefers-reduced-motion:reduce){.panel {transition:none;}}</style>

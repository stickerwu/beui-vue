<script setup lang="ts">
import { Tooltip } from 'beui-vue'
import { ref, useTemplateRef } from 'vue'
import { usePreviewVariant } from './use-preview-variant'
const {variant, select} = usePreviewVariant('toolbar')
const actions = [
  {id:'bold',label:'Bold',symbol:'B',shortcut:'⌘B',keys:'Meta+B'},
  {id:'italic',label:'Italic',symbol:'I',shortcut:'⌘I',keys:'Meta+I'},
  {id:'underline',label:'Underline',symbol:'U',shortcut:'⌘U',keys:'Meta+U'},
  {id:'strike',label:'Strikethrough',symbol:'S',shortcut:'⌘⇧X',keys:'Meta+Shift+X'},
]
const active = ref(['bold'])
const toolbar = useTemplateRef('toolbar')
let lastShown = 0
const delay = ref(300)
function toggle(id: string) {
  active.value = active.value.includes(id) ? active.value.filter(current=>current!==id) : [...active.value,id]
}
function keyboard(event: KeyboardEvent) {
  const buttons = [...toolbar.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []]
  const index = buttons.indexOf(event.target as HTMLButtonElement)
  if (index<0) return
  const next = { ArrowLeft: (index+buttons.length-1)%buttons.length, ArrowRight: (index+1)%buttons.length, Home: 0, End: buttons.length-1 }[event.key]
  if (next === undefined) return
  event.preventDefault()
  buttons[next]?.focus()
}
const placements = [
  { side: 'top', text: 'Top', icon: '↑', area: '1 / 2' },
  { side: 'left', text: 'Left', icon: '←', area: '2 / 1' },
  { side: 'right', text: 'Right', icon: '→', area: '2 / 3' },
  { side: 'bottom', text: 'Bottom', icon: '↓', area: '3 / 2' },
] as const
</script>
<template>
  <div class="tips">
    <label>Example <select :value="variant" @change="select(($event.target as HTMLSelectElement).value)"><option value="default">Default</option><option value="toolbar">Toolbar</option></select></label>
    <div v-if="variant==='toolbar'" ref="toolbar" role="toolbar" aria-label="Text formatting" class="format" @keydown="keyboard" @pointerover.capture="delay=Date.now()-lastShown < 400 ? 0 : 300">
      <Tooltip v-for="action in actions" :key="action.id" toolbar side="bottom" arrow :content="`${action.label}　${action.shortcut}`" :label="action.label" :shortcut="action.keys" :pressed="active.includes(action.id)" :delay="delay" @activate="toggle(action.id)" @show="lastShown=Date.now()" @hide="lastShown=Date.now()">
        <span aria-hidden="true" :class="action.id">{{ action.symbol }}</span>
      </Tooltip>
      <i aria-hidden="true" /><Tooltip toolbar side="bottom" align="end" arrow content="Insert link" label="Insert link" :pressed="null" :disabled="active.length===0"><span aria-hidden="true">↗</span></Tooltip>
    </div>
    <div v-else class="grid"><Tooltip v-for="item in placements" :key="item.side" :side="item.side" content="More context" arrow :style="{ gridArea: item.area }"><span aria-hidden="true">{{ item.icon }}</span> {{ item.text }}</Tooltip></div>
    <small>Hover or focus. Press Esc to dismiss.</small>
  </div>
</template>
<style scoped>.format {display:flex; align-items:center; padding:.25rem; border:1px solid var(--beui-border); border-radius:.75rem; gap:.25rem;} .format i {width:1px; height:1.2rem; background:var(--beui-border);} .bold {font-weight:700;} .italic {font-style:italic;} .underline {text-decoration:underline;} .strike {text-decoration:line-through;}</style>
<style scoped>.tips { display: grid; justify-items: center; gap: 2rem; } .grid { display: grid; grid-template-columns: repeat(3, auto); gap: 1rem .5rem; } small { color: var(--beui-muted-foreground); }</style>

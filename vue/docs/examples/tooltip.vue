<script setup lang="ts">
import { Tooltip, TooltipProvider } from 'beui-vue'
import { ref } from 'vue'
import { PopIcon } from './popovers-icons'
import { usePreviewVariant } from './use-preview-variant'

const { variant, select, fixed } = usePreviewVariant('toolbar')

const placements = [
  { side: 'top', label: 'Top', icon: 'ArrowUp', area: '1 / 2' },
  { side: 'left', label: 'Left', icon: 'ArrowLeft', area: '2 / 1' },
  { side: 'right', label: 'Right', icon: 'ArrowRight', area: '2 / 3' },
  { side: 'bottom', label: 'Bottom', icon: 'ArrowDown', area: '3 / 2' },
] as const

const actions = [
  { id: 'bold', label: 'Bold', shortcut: '⌘B', keys: 'Meta+B', icon: 'Bold' },
  { id: 'italic', label: 'Italic', shortcut: '⌘I', keys: 'Meta+I', icon: 'Italic' },
  { id: 'underline', label: 'Underline', shortcut: '⌘U', keys: 'Meta+U', icon: 'Underline' },
  { id: 'strike', label: 'Strikethrough', shortcut: '⌘⇧X', keys: 'Meta+Shift+X', icon: 'Strikethrough' },
] as const
const active = ref<string[]>(['bold'])
function toggle(id: string) {
  active.value = active.value.includes(id) ? active.value.filter(value => value !== id) : [...active.value, id]
}
</script>

<template>
  <div class="demo">
    <label v-if="!fixed" class="variant">Example <select :value="variant" @change="select(($event.target as HTMLSelectElement).value)"><option value="default">Default</option><option value="toolbar">Toolbar</option></select></label>

    <TooltipProvider v-if="variant === 'toolbar'" :delay="300" :skip-delay="400">
      <div class="stack">
        <div class="toolbar">
          <Tooltip v-for="action in actions" :key="action.id" as-label side="bottom" arrow>
            <button type="button" class="tool" :class="{ on: active.includes(action.id) }" :aria-pressed="active.includes(action.id)" :aria-keyshortcuts="action.keys" @click="toggle(action.id)">
              <PopIcon :name="action.icon" />
            </button>
            <template #content>
              <span class="label">{{ action.label }}<!-- The shortcut is announced through aria-keyshortcuts, not as part of the name. --><span class="keys" aria-hidden="true">{{ action.shortcut }}</span></span>
            </template>
          </Tooltip>
          <span class="rule" aria-hidden="true" />
          <Tooltip as-label side="bottom" align="end" arrow :disabled="active.length === 0" content="Insert link">
            <button type="button" class="tool" :disabled="active.length === 0"><PopIcon name="Link2" /></button>
          </Tooltip>
        </div>
        <p class="note narrow">The first label waits, the next ones open instantly. Click hides it until the pointer leaves.</p>
      </div>
    </TooltipProvider>

    <div v-else class="stack wide">
      <div class="grid">
        <Tooltip v-for="item in placements" :key="item.side" content="More context" :side="item.side" arrow>
          <button type="button" class="place" :style="{ gridArea: item.area }">
            <PopIcon :name="item.icon" :size="14" class="icon" />
            {{ item.label }}
          </button>
        </Tooltip>
      </div>
      <p class="note">Hover or focus. Press Esc to dismiss.</p>
    </div>
  </div>
</template>

<style scoped>
.demo { display: grid; justify-items: center; }
.variant { margin-bottom: .5rem; }
.stack { display: flex; width: 100%; flex-direction: column; align-items: center; gap: 2rem; padding: 1.5rem 0; }
.grid { display: grid; grid-template-columns: repeat(3, auto); column-gap: .75rem; row-gap: 1.25rem; }
.place { display: inline-flex; height: 2.5rem; width: 5rem; align-items: center; justify-content: center; gap: .375rem; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-card); font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500; color: var(--beui-foreground); cursor: pointer; transition: background-color .15s; }
.place:hover { background: var(--beui-muted); }
.place:focus-visible { outline: 2px solid color-mix(in srgb, var(--beui-foreground) 12%, transparent); outline-offset: 4px; }
.icon { color: var(--beui-muted-foreground); }
.note { margin: 0; text-align: center; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.note.narrow { max-width: 20rem; }
.toolbar { display: flex; align-items: center; gap: .25rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-card); padding: .25rem; }
.tool { display: grid; width: 2rem; height: 2rem; place-items: center; border: 0; border-radius: .5rem; background: transparent; padding: 0; color: var(--beui-muted-foreground); outline: none; cursor: pointer; transition: background-color .15s, color .15s; }
.tool:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.tool.on { background: var(--beui-muted); color: var(--beui-foreground); }
.tool:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 12%, transparent); }
.tool:disabled { opacity: .4; cursor: default; }
.rule { margin: 0 .25rem; width: 1px; height: 1.25rem; background: var(--beui-border); }
.label { display: flex; align-items: center; gap: .5rem; }
.keys { font-size: 10px; color: var(--beui-muted-foreground); }
</style>

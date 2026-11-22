<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, provide, useTemplateRef } from 'vue'
import { morphActiveKey, useMorphSelectContext } from './select-context'
import MorphRegistrar from './MorphRegistrar.vue'
import { useChoiceListbox } from './use-listbox'

// Shared-layout morph: trigger box grows into the panel and back, one surface.
const MORPH = { type: 'spring', duration: 0.5, bounce: 0.22 } as const
const INSTANT = { duration: 0 } as const
const LIST = { hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } } }

defineSlots<{ default?: () => unknown }>()

const ctx = useMorphSelectContext('MorphSelectContent')
const label = computed(() => ctx.labelFor(ctx.value.value))
const list = useTemplateRef<{ $el: HTMLElement }>('list')
const listEl = computed(() => list.value?.$el ?? null)
const { activeId, onKeyDown } = useChoiceListbox({ open: ctx.open, rows: ctx.rows, selected: ctx.value, list: listEl })
provide(morphActiveKey, activeId)

function onListKey(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault()
    ctx.close()
  } else onKeyDown(event)
}
</script>

<template>
  <!-- always-mounted, hidden — keeps item label registrations alive while closed so the trigger shows the selected value before first open -->
  <MorphRegistrar><div hidden><slot /></div></MorphRegistrar>

  <AnimatePresence :initial="false" mode="popLayout">
    <motion.div
      v-if="ctx.open.value" key="panel" :layout-id="ctx.layoutId" :transition="ctx.reduce.value ? INSTANT : MORPH" :style="{ borderRadius: 12 }"
      class="be-smorph-panel"
    >
      <!-- header mirrors the trigger (continuous morph) and collapses the panel back into the trigger when clicked -->
      <motion.button
        :id="ctx.headerId" type="button" layout="position" class="be-smorph-row be-smorph-header" aria-haspopup="listbox" aria-expanded="true"
        :aria-controls="ctx.listId" @click="ctx.close"
      >
        <span class="be-smorph-text" :data-placeholder="label ? undefined : ''">{{ label ?? ctx.placeholder.value }}</span>
        <motion.span aria-hidden="true" class="be-smorph-chevron" :animate="{ rotate: 180 }" :transition="ctx.reduce.value ? INSTANT : MORPH">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </motion.span>
      </motion.button>

      <div class="be-smorph-rule" />

      <motion.ul
        :id="ctx.listId" ref="list" role="listbox" class="be-smorph-list" :aria-label="ctx.label.value"
        :aria-labelledby="ctx.label.value ? undefined : ctx.headerId" initial="hidden" animate="show"
        :variants="ctx.reduce.value ? undefined : LIST" @keydown="onListKey"
      >
        <slot />
      </motion.ul>
    </motion.div>
  </AnimatePresence>
</template>

<style scoped>
.be-smorph-panel { position: absolute; inset-inline: 0; top: 0; z-index: 30; box-sizing: border-box; overflow: hidden; border: 1px solid var(--beui-border); background: var(--beui-background); box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
.be-smorph-row { box-sizing: border-box; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .625rem .875rem; font: inherit; font-size: .875rem; line-height: 1.25rem; }
.be-smorph-header { border: 0; background: transparent; color: var(--beui-foreground); outline: none; cursor: pointer; }
.be-smorph-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-foreground); }
.be-smorph-text[data-placeholder] { color: var(--beui-muted-foreground); }
.be-smorph-chevron { color: var(--beui-muted-foreground); }
.be-smorph-chevron svg { display: block; }
.be-smorph-rule { height: 1px; background: var(--beui-border); }
.be-smorph-list { box-sizing: border-box; margin: 0; padding: .25rem; list-style: none; }
</style>

<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { useId } from 'vue'
interface Item { id: string; label: string; icon?: string; separatorBefore?: boolean; href?: string }
const { items, size = 44, label = 'Dock' } = defineProps<{ items: readonly Item[]; size?: number; label?: string }>()
const selected = defineModel<string>()
const uid = useId()
const reduce = useReducedMotion()
</script>
<template>
  <nav class="dock" :aria-label="label">
    <template v-for="item in items" :key="item.id"><i v-if="item.separatorBefore" aria-hidden="true" />
      <component :is="item.href ? 'a' : 'button'" :type="item.href ? undefined : 'button'" :href="item.href" :aria-label="item.label" :aria-pressed="item.href ? undefined : selected === item.id" :aria-current="item.href && selected === item.id ? 'page' : undefined" :style="{ width: `${size}px`, height: `${size}px` }" @click="selected = item.id">
        <motion.span v-if="selected === item.id" class="pill" :layout-id="`${uid}-pill`" :transition="reduce ? {duration:0} : {type:'spring',stiffness:420,damping:38}" />
        <slot name="icon" :item="item"><span aria-hidden="true">{{ item.icon ?? item.label[0] }}</span></slot>
      </component>
    </template>
  </nav>
</template>
<style scoped>.dock { display: inline-flex; align-items: center; gap: .375rem; padding: .25rem .5rem; border: 1px solid var(--beui-border); background: color-mix(in srgb,var(--beui-card) 80%,transparent); border-radius: 1rem; box-shadow: 0 12px 30px #0002; backdrop-filter: blur(18px); } button,a { position: relative; isolation: isolate; display: grid; place-items: center; background: none; border: 0; color: var(--beui-foreground); font: 1.25rem/1 system-ui; border-radius: .75rem; cursor: pointer; text-decoration: none; } .pill { position: absolute; z-index: -1; inset: 2px; border-radius: .75rem; background: var(--beui-muted); } i { height: 1.5rem; width: 1px; margin-inline: .25rem; background: var(--beui-border); }</style>

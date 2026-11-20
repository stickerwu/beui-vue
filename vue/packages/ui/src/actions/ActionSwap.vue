<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { AnimatePresence, motion, useReducedMotion } from 'motion-v'
import ButtonBase from '../ButtonBase.vue'

export type ActionSwapItem = {id:string; label:string; ariaLabel?:string}
const {items, modelValue, defaultValue, animation = 'blur', variant, size, cycle = true, iconOnly} = defineProps<{
  items:readonly ActionSwapItem[]; modelValue?:string; defaultValue?:string; animation?:'blur'|'roll'|'cascade';
  variant?:'primary'|'secondary'|'ghost'|'outline'; size?:'sm'|'md'|'lg'|'icon'; cycle?:boolean; iconOnly?:boolean
}>()
const emit = defineEmits<{'update:modelValue':[value:string]; valueChange:[value:string, item:ActionSwapItem]}>()
const internal = shallowRef(defaultValue)
const current = computed(() => items.find(item => item.id === (modelValue ?? internal.value)) ?? items[0])
const reduced = useReducedMotion()
const spring = {type:'spring', stiffness:460, damping:30, mass:.55} as const
function next() {
  if (!cycle || !current.value || items.length < 2) return
  const item = items[(items.indexOf(current.value) + 1) % items.length]
  internal.value = item.id
  emit('update:modelValue', item.id)
  emit('valueChange', item.id, item)
}
</script>
<template>
  <ButtonBase v-if="current" :variant="variant" :size="size" :aria-label="current.ariaLabel ?? current.label" @click="next">
    <span class="swap" aria-hidden="true"><AnimatePresence :initial="false">
      <motion.span :key="current.id" class="layer" :initial="reduced ? false : {opacity:0,y:animation==='roll' ? '85%' : 0,scale:animation==='blur' ? .9 : 1,filter:'blur(2px)'}" :animate="{opacity:1,y:0,scale:1,filter:'blur(0px)'}" :exit="{opacity:0,y:!reduced && animation==='roll' ? '-85%' : 0,transition:{duration:reduced ? 0 : .14}}" :transition="reduced ? {duration:0} : spring">
        <slot name="icon" :item="current" /><template v-if="!iconOnly"><template v-if="animation === 'cascade' && !reduced"><motion.span v-for="(letter,index) in Array.from(current.label)" :key="index" class="letter" :initial="{opacity:0,y:'105%'}" :animate="{opacity:1,y:0}" :transition="{...spring,delay:index*.025}">{{ letter }}</motion.span></template><slot v-else :item="current">{{ current.label }}</slot></template>
      </motion.span>
    </AnimatePresence></span>
  </ButtonBase>
</template>
<style scoped>.swap { display:inline-grid; position:relative; place-items:center; overflow:hidden; }.layer { grid-area:1/1; display:inline-flex; align-items:center; white-space:pre; }.letter { display:inline-block; }</style>

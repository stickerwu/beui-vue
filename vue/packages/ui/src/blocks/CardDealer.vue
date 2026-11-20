<script setup lang="ts" generic="Card extends { id:string, zone:'deck'|'hand'|'pile', label:string }">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
const props = withDefaults(defineProps<{
  cards:Card[], cardWidth?:number, cardHeight?:number, spread?:number, angle?:number, ariaLabel?:string,
}>(), {cardWidth:84,cardHeight:120,spread:46,angle:5,ariaLabel:'Card table'})
const emit = defineEmits<{cardSelect:[id:string]}>()
const table = ref<HTMLElement>()
const width = ref(480)
const focused = ref('')
let observer:ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(entries => { width.value = entries[0].contentRect.width })
  if (table.value) observer.observe(table.value)
})
onBeforeUnmount(() => observer?.disconnect())
const poses = computed(() => {
  const available = Math.max(0,width.value - props.cardWidth - 20)
  const hand = props.cards.filter(card => card.zone === 'hand')
  const gap = Math.min(props.spread,available / Math.max(1,hand.length - 1))
  const angles = Math.min(props.angle,80 / Math.max(1,hand.length - 1))
  const counts = {deck:0,hand:0,pile:0}
  return props.cards.map(card => {
    const index = counts[card.zone]++
    const position = index - (hand.length - 1) / 2
    const hash = [...card.id].reduce((sum,char) => (sum * 31 + char.charCodeAt(0))|0,0)
    const horizontal = card.zone === 'hand' ? available/2 + position * gap : card.zone === 'deck' ? 0 : available
    const vertical = card.zone === 'hand' ? props.cardHeight + Math.min(26,Math.abs(position) * 2.2) : -Math.min(index,6)
    const rotation = card.zone === 'hand' ? position * angles : card.zone === 'pile' ? ((Math.abs(hash)%17)-8)*1.1 : 0
    const active = focused.value === card.id && card.zone === 'hand'
    return {card, style:{width:`${props.cardWidth}px`,height:`${props.cardHeight}px`,zIndex:active ? 1000 : index+1,transform:`translate(${horizontal + 10}px, ${vertical + 12 - (active ? 18 : 0)}px) rotate(${rotation}deg)`}}
  })
})
</script>

<template>
  <div ref="table" class="be-block dealer" role="group" :aria-label="ariaLabel" :style="{height:`${cardHeight*2+55}px`}">
    <component :is="card.zone === 'hand' ? 'button':'div'" v-for="{card,style} in poses" :key="card.id" :type="card.zone === 'hand' ? 'button' : undefined"
      class="playing-card" :data-zone="card.zone" :aria-label="card.zone === 'hand' ? card.label : undefined" :style="style"
      @focus="focused=card.id" @blur="focused=''" @pointerenter="focused=card.id" @pointerleave="focused=''" @click="card.zone === 'hand' && emit('cardSelect',card.id)">
      <slot v-if="card.zone === 'deck'" name="back" :card="card"><span aria-hidden="true">✦</span></slot>
      <slot v-else name="face" :card="card">{{ card.label }}</slot>
    </component>
  </div>
</template>

<style scoped>
.dealer { position:relative; isolation:isolate; }
.playing-card { position:absolute; top:0; left:0; display:grid; place-items:center; overflow:hidden; border:1px solid var(--beui-border); border-radius:.65rem; background:var(--beui-background); color:inherit; box-shadow:0 2px 5px #0002; font:inherit; transform-origin:center; }
.playing-card[data-zone=deck] { color:white; background:repeating-linear-gradient(45deg,#27334b 0 3px,#3c4a68 3px 6px); border:4px double white; }
button.playing-card { cursor:pointer; }
@media (prefers-reduced-motion:no-preference) { .playing-card { transition:transform .5s cubic-bezier(.2,.8,.2,1.15); } }
</style>

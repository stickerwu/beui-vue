<script setup lang="ts">
import { ref } from 'vue'
import { CardDealer } from 'beui-vue'
type Card = {id:string,label:string,zone:'deck'|'hand'|'pile'}
const cards = ref<Card[]>(['A♠','K♥','Q♣','J♦','10♠'].map((label,index) => ({id:String(index),label,zone:index<2?'hand':'deck'})))
function deal() {
  const top = cards.value.find(card => card.zone === 'deck')
  if (top) top.zone='hand'
}
function discard(id:string) {
  const card = cards.value.find(card => card.id === id)
  if (card) card.zone='pile'
}
</script>
<template><div class="be-block be-block-stack"><CardDealer :cards="cards" @card-select="discard"><template #face="{card}"><b>{{ card.label }}</b></template></CardDealer><button class="be-block-button" :disabled="!cards.some(card=>card.zone==='deck')" @click="deal">Deal a card</button></div></template>

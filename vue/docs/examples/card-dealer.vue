<script setup lang="ts">
import { ButtonBase, CardDealer, type CardDealerCard } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

const SUITS = [
  { key: 'spades', symbol: '♠', red: false },
  { key: 'hearts', symbol: '♥', red: true },
  { key: 'clubs', symbol: '♣', red: false },
  { key: 'diamonds', symbol: '♦', red: true },
] as const
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const RANK_NAMES: Record<string, string> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' }
const HAND_LIMIT = 13

type PlayingCard = CardDealerCard & { rank: number, suit: number }

// Seeded, so the first render and any server render agree on the deck order.
function shuffle<T>(items: T[], seed: number) {
  const out = [...items]
  let state = seed
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) % 2147483648
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function createDeck(): PlayingCard[] {
  const cards = SUITS.flatMap((suit, s) => RANKS.map((rank, r) => ({
    id: `${rank}-${suit.key}`, zone: 'deck' as const, label: `${RANK_NAMES[rank] ?? rank} of ${suit.key}`, rank: r, suit: s,
  })))
  return shuffle(cards, 7)
}

/** Moves cards to the end of the list so they land on top of their new zone. */
function moveTo(cards: PlayingCard[], ids: string[], zone: PlayingCard['zone']) {
  const moving = new Set(ids)
  const picked = ids
    .map(id => cards.find(card => card.id === id))
    .filter((card): card is PlayingCard => Boolean(card))
    .map(card => ({ ...card, zone }))
  return [...cards.filter(card => !moving.has(card.id)), ...picked]
}

const cards = shallowRef(createDeck())
const deck = computed(() => cards.value.filter(card => card.zone === 'deck'))
const hand = computed(() => cards.value.filter(card => card.zone === 'hand'))
const suitOf = (card: PlayingCard) => SUITS[card.suit]
const rankOf = (card: PlayingCard) => RANKS[card.rank]

// Open with a dealt hand, after the table has measured itself.
let opening: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  opening = setTimeout(() => {
    const top = cards.value.filter(card => card.zone === 'deck').slice(-5).reverse()
    cards.value = moveTo(cards.value, top.map(card => card.id), 'hand')
  }, 400)
})
onBeforeUnmount(() => clearTimeout(opening))

// Deals from the top of the deck, never past the hand limit.
function deal(count: number) {
  const room = HAND_LIMIT - hand.value.length
  const top = deck.value.slice(-Math.max(0, Math.min(count, room))).reverse()
  if (top.length) cards.value = moveTo(cards.value, top.map(card => card.id), 'hand')
}
function sort() {
  cards.value = moveTo(cards.value, [...hand.value].sort((a, b) => a.suit - b.suit || a.rank - b.rank).map(card => card.id), 'hand')
}
function shuffleHand() {
  cards.value = moveTo(cards.value, shuffle(hand.value.map(card => card.id), Date.now() % 2147483647), 'hand')
}
function collect() {
  cards.value = moveTo(cards.value, shuffle(cards.value.filter(card => card.zone !== 'deck').map(card => card.id), Date.now() % 2147483647), 'deck')
}
</script>

<template>
  <div class="dealer-demo">
    <CardDealer :cards="cards" aria-label="Card table. Select a card in your hand to play it." @card-select="id => cards = moveTo(cards, [id], 'pile')">
      <template #face="{ card }">
        <span class="dealer-face" :class="{ 'is-red': suitOf(card).red }">
          <span class="dealer-corner">{{ rankOf(card) }}<span class="dealer-pip">{{ suitOf(card).symbol }}</span></span>
          <span class="dealer-center">{{ suitOf(card).symbol }}</span>
          <span class="dealer-corner is-flipped">{{ rankOf(card) }}<span class="dealer-pip">{{ suitOf(card).symbol }}</span></span>
        </span>
      </template>
      <template #back><span class="dealer-back"><span class="dealer-back-inner" /></span></template>
    </CardDealer>
    <div class="dealer-actions">
      <ButtonBase size="sm" :disabled="!deck.length || hand.length >= HAND_LIMIT" @click="deal(1)">Deal</ButtonBase>
      <ButtonBase size="sm" :disabled="!deck.length || hand.length >= HAND_LIMIT" @click="deal(3)">Deal 3</ButtonBase>
      <ButtonBase size="sm" variant="secondary" :disabled="hand.length < 2" @click="sort">Sort</ButtonBase>
      <ButtonBase size="sm" variant="secondary" :disabled="hand.length < 2" @click="shuffleHand">Shuffle</ButtonBase>
      <ButtonBase size="sm" variant="secondary" :disabled="deck.length === cards.length" @click="collect">Collect</ButtonBase>
    </div>
  </div>
</template>

<style scoped>
.dealer-demo { display: flex; box-sizing: border-box; width: 100%; max-width: 36rem; flex-direction: column; gap: 1rem; }
.dealer-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem; }
.dealer-face { display: flex; box-sizing: border-box; width: 100%; height: 100%; flex-direction: column; justify-content: space-between; padding: .5rem; border: 1px solid rgb(0 0 0 / .1); border-radius: .75rem; background: #fff; box-shadow: 0 6px 16px -6px rgb(0 0 0 / .35); color: #171717; }
.dealer-face.is-red { color: oklch(64.5% .246 16.439); }
.dealer-corner { display: flex; flex-direction: column; align-items: flex-start; font-size: .875rem; line-height: 1; font-weight: 600; }
.dealer-corner.is-flipped { transform: rotate(180deg); }
.dealer-pip { font-size: .75rem; line-height: 1rem; }
.dealer-center { align-self: center; font-size: 1.875rem; line-height: 1; }
.dealer-back { display: block; box-sizing: border-box; width: 100%; height: 100%; padding: .375rem; border: 1px solid rgb(255 255 255 / .2); border-radius: .75rem; background: #262626; box-shadow: 0 6px 16px -6px rgb(0 0 0 / .35); }
.dealer-back-inner { display: block; box-sizing: border-box; width: 100%; height: 100%; border: 1px solid rgb(255 255 255 / .25); border-radius: .5rem; background: repeating-linear-gradient(45deg, rgb(255 255 255 / .12) 0 5px, transparent 5px 10px); }
</style>

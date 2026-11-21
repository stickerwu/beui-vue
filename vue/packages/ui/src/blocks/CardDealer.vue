<script lang="ts">
export type CardDealerZone = 'deck' | 'hand' | 'pile'

export interface CardDealerCard {
  id: string
  zone: CardDealerZone
  /** Accessible name for a card in the hand. */
  label: string
}
</script>

<script setup lang="ts" generic="Card extends CardDealerCard">
import { arc, motion, type $Transition } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useMountedMedia } from '../core/mounted-media'
import CardFrame from './CardFrame.vue'
import { cardDealerMessages } from './messages'

const props = withDefaults(defineProps<{
  /** Every card on the table. Order within each zone is the stacking and fan order. */
  cards: Card[]
  /** Card size in px. Default 84 by 120. */
  cardWidth?: number
  cardHeight?: number
  /** Most horizontal space between neighbouring hand cards, in px. Default 46. */
  spread?: number
  /** Rotation between neighbouring hand cards, in degrees. Default 5. */
  angle?: number
  /** Accessible name for the table. */
  ariaLabel?: string
  /** Override any built-in string. */
  labels?: Partial<typeof cardDealerMessages>
  className?: string
}>(), { cardWidth: 84, cardHeight: 120, spread: 46, angle: 5 })

const emit = defineEmits<{ cardSelect: [id: string] }>()
defineSlots<{
  face?(props: { card: Card }): unknown
  back?(props: { card: Card }): unknown
}>()

// A card crossing the table arcs high and lands with a small settle; a card
// changing slots inside the hand only hops. Both are tuned here rather than
// borrowed from core/motion because the arc length is the whole effect.
const FLIGHT: $Transition = { type: 'spring', visualDuration: .55, bounce: .18 }
const HOP: $Transition = { type: 'spring', visualDuration: .4, bounce: .2 }
// arc() bends relative to the distance travelled. A negative strength puts
// horizontal moves above the line in both directions.
const FLIGHT_STRENGTH = -.35
const HOP_STRENGTH = -.3
// Cards in a multi-card move leave one after another, not as a single slab.
// A big move shares a fixed window, so dealing the whole deck still flows.
const STAGGER = .045
const MAX_STAGGER_WINDOW = .6
const EDGE = 16
const HOVER_LIFT = 18
const HOVER_PUSH = 14
// The fan's outermost tilt and drop, whatever the hand size. Small hands sit
// well inside both; a whole deck spread into the hand becomes one shallow
// ribbon instead of cards tipping past vertical.
const MAX_FAN_ANGLE = 40
const MAX_FAN_DROP = 26
const FAN_DROP = 2.2

type Pose = { x: number, y: number, rotate: number, faceDown: boolean, z: number }
type Entry = { card: Card, slot: number, pose: Pose, transition: $Transition }

const reduce = useReducedMotion()
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const stage = useTemplateRef<HTMLElement>('stage')
const size = shallowRef<{ width: number, height: number } | null>(null)
const hovered = shallowRef<string | null>(null)

// Where each card was last rendered, read during render to tell a flight from a
// hop from a card that stayed put. Written after every commit; deliberately not
// reactive, so recording a commit does not itself trigger another render.
let previous = new Map<string, { zone: CardDealerZone, slot: number }>()
let resized = false

const text = computed(() => ({ ...cardDealerMessages, ...props.labels }))
// Upstream makes hand cards buttons when `onCardSelect` is supplied. With a
// declared emit the listener lives on the vnode, not in `attrs`.
const instance = getCurrentInstance()
const selectable = computed(() => {
  const attrs = instance?.vnode.props
  return Boolean(attrs?.onCardSelect ?? attrs?.['onCard-select'])
})

/** Stable per-card tilt for the pile, so a card keeps its angle once it lands. */
function pileTilt(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return ((Math.abs(hash) % 17) - 8) * 1.1
}

const deck = computed(() => props.cards.filter(card => card.zone === 'deck'))
const hand = computed(() => props.cards.filter(card => card.zone === 'hand'))
const pile = computed(() => props.cards.filter(card => card.zone === 'pile'))

// Pose and move are computed together, in stacking order, so a multi-card move
// can stagger its departures. Both read the render-time record of where each
// card was before this change.
const entries = computed<Entry[]>(() => {
  const measured = size.value
  if (!measured) return []
  const { width, height } = measured
  const handCards = hand.value
  const hoveredSlot = hovered.value ? handCards.findIndex(item => item.id === hovered.value) : -1

  function poseFor(card: Card, slot: number): Pose {
    if (card.zone === 'deck') {
      // A thin visible edge for the first few cards, then the stack stops growing.
      const depth = Math.min(slot, 6) * .6
      return { x: EDGE - depth, y: EDGE - depth, rotate: 0, faceDown: true, z: slot }
    }
    if (card.zone === 'pile') {
      return { x: width - props.cardWidth - EDGE, y: EDGE, rotate: pileTilt(card.id), faceDown: false, z: 400 + slot }
    }
    const count = handCards.length
    const offset = slot - (count - 1) / 2
    const edge = Math.max((count - 1) / 2, 1)
    const reach = offset / edge
    const tilt = Math.min(props.angle * edge, MAX_FAN_ANGLE)
    const drop = Math.min(FAN_DROP * edge * edge, MAX_FAN_DROP)
    const room = width - props.cardWidth - EDGE * 2
    const step = count > 1 ? Math.min(props.spread, room / (count - 1)) : 0
    const push = hoveredSlot < 0 || slot === hoveredSlot ? 0 : Math.sign(slot - hoveredSlot) * HOVER_PUSH
    return {
      x: width / 2 - props.cardWidth / 2 + offset * step + push,
      // Outer cards sit lower so the fan reads as held, not laid flat.
      y: height - props.cardHeight - EDGE + reach * reach * drop - (slot === hoveredSlot ? HOVER_LIFT : 0),
      rotate: reach * tilt,
      faceDown: false,
      z: slot === hoveredSlot ? 300 : 100 + slot,
    }
  }

  const movers = props.cards.filter(card => {
    const was = previous.get(card.id)
    return was !== undefined && was.zone !== card.zone
  }).length
  const stagger = movers > 1 ? Math.min(STAGGER, MAX_STAGGER_WINDOW / (movers - 1)) : 0
  let moving = 0

  function transitionFor(card: Card, slot: number): $Transition {
    if (reduce.value || resized) return { duration: 0 }
    const was = previous.get(card.id)
    if (!was) return { duration: 0 }
    if (was.zone !== card.zone) {
      const delay = moving * stagger
      moving += 1
      return { ...FLIGHT, delay, path: arc({ strength: FLIGHT_STRENGTH }) }
    }
    if (card.zone === 'hand' && was.slot !== slot) return { ...HOP, path: arc({ strength: HOP_STRENGTH }) }
    return HOP
  }

  const out: Entry[] = []
  for (const list of [deck.value, hand.value, pile.value]) {
    list.forEach((card, slot) => out.push({ card, slot, pose: poseFor(card, slot), transition: transitionFor(card, slot) }))
  }
  return out
})

// Every commit rewrites the record of where each card now lives; the next
// render reads it to tell a flight from a hop from a card that stayed put.
watch(entries, () => {
  const next = new Map<string, { zone: CardDealerZone, slot: number }>()
  for (const list of [deck.value, hand.value, pile.value]) {
    list.forEach((card, slot) => { next.set(card.id, { zone: card.zone, slot }) })
  }
  previous = next
  resized = false
}, { flush: 'post' })

let observer: ResizeObserver | undefined
function measure() {
  const element = stage.value
  if (!element) return
  resized = true
  size.value = { width: element.clientWidth, height: element.clientHeight }
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (stage.value) observer.observe(stage.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section ref="stage" :aria-label="ariaLabel ?? text.label" class="be-dealer" :class="className">
    <CardFrame
      v-for="entry in entries"
      :key="entry.card.id"
      :data-zone="entry.card.zone"
      :x="entry.pose.x"
      :y="entry.pose.y"
      :rotate="entry.pose.rotate"
      :z="entry.pose.z"
      :width="cardWidth"
      :height="cardHeight"
      :transition="entry.transition"
    >
      <div class="be-dealer-perspective">
        <!-- The faces never change element, so a card flips in flight instead
             of remounting face up; the hit area lies over them only in the hand. -->
        <motion.span
          aria-hidden="true"
          class="be-dealer-faces"
          :initial="false"
          :animate="{ rotateY: entry.pose.faceDown ? 180 : 0 }"
          :transition="reduce ? { duration: 0 } : FLIGHT"
        >
          <span class="be-dealer-face">
            <slot name="face" :card="entry.card">{{ entry.card.label }}</slot>
          </span>
          <span class="be-dealer-face be-dealer-back">
            <slot name="back" :card="entry.card">
              <span class="be-dealer-default-back" />
            </slot>
          </span>
        </motion.span>
      </div>
      <button
        v-if="entry.card.zone === 'hand' && selectable"
        type="button"
        class="be-dealer-hit"
        :aria-label="entry.card.label"
        @click="emit('cardSelect', entry.card.id)"
        @pointerenter="event => { if (canHover && event.pointerType === 'mouse') hovered = entry.card.id }"
        @pointerleave="hovered = hovered === entry.card.id ? null : hovered"
        @focus="hovered = entry.card.id"
        @blur="hovered = hovered === entry.card.id ? null : hovered"
      />
    </CardFrame>
  </section>
</template>

<style scoped>
.be-dealer {
  position: relative; isolation: isolate; width: 100%; height: 20rem;
  touch-action: manipulation; user-select: none; -webkit-user-select: none;
}
/* Card z-indices only order cards against each other, so the table never draws
   over sticky page chrome such as a header. */
.be-dealer-perspective { width: 100%; height: 100%; perspective: 800px; }
.be-dealer-faces { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; }
.be-dealer-face {
  position: absolute; inset: 0; overflow: hidden; border-radius: .75rem;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}
.be-dealer-back { transform: rotateY(180deg); }
.be-dealer-default-back {
  display: block; width: 100%; height: 100%; border-radius: .75rem; border: 1px solid var(--beui-border);
  background: repeating-linear-gradient(45deg, var(--beui-muted) 0 6px, var(--beui-background) 6px 12px);
}
.be-dealer-hit {
  position: absolute; inset: 0; border: 0; padding: 0; border-radius: .75rem;
  background: transparent; cursor: pointer; outline: none;
}
.be-dealer-hit:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring), 0 0 0 4px var(--beui-background); }
</style>

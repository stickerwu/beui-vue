<script setup lang="ts">
import { motion, useInView } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, reactive, shallowRef, useId, useTemplateRef, watch } from 'vue'
import FloatingPanel from '../controls/FloatingPanel.vue'
import { useMountedMedia } from '../core/mounted-media'
import { panelSpring } from '../core/motion'
import {
  crestSrc,
  initials,
  keepTogether,
  knockoutWheelMessages,
  mergeTournamentMessages,
  tournamentTranslate,
  type KnockoutWheelMessages,
  type TournamentMatch,
  type TournamentRound,
  type TournamentSide,
  type TournamentTeam,
  type TournamentTranslate,
} from './tournament'

const props = withDefaults(defineProps<{
  /**
   * The whole draw, ordered widest round first — the same array the knockout
   * bracket takes. Any single-elimination tournament fits: each round holds half
   * the matches of the one before it (16 → 8 → 4 → 2 → 1) and `rounds[r].matches[k]`
   * is fed by matches `2k` and `2k + 1` of the round before it. Two rounds are
   * enough; the wheel grows a ring per round and sizes itself to the rim.
   */
  rounds: TournamentRound[]
  /**
   * Index of the outermost round to draw. Earlier rounds are dropped and the
   * kept round's own teams become the rim, so `1` on a 32-team draw opens at the
   * Round of 16. Defaults to 0 (the whole tree); clamped to the valid range.
   */
  initialRound?: number
  className?: string
  /** Override any built-in string. */
  labels?: Partial<KnockoutWheelMessages>
}>(), { initialRound: 0 })

const text = computed(() => mergeTournamentMessages(knockoutWheelMessages, props.labels))
const t = computed(() => tournamentTranslate(text.value))

// Stable animate targets: a fresh object per render is fine for motion, but a
// stable one keeps 63 marks from churning on every pointer move.
const ENTER_VISIBLE = { opacity: 1, scale: 1 } as const
const LINK_VISIBLE = { opacity: 1 } as const

const SIZE = 760
const CENTER = SIZE / 2
// Solid trophy glyph drawn in a 24-unit box.
const TROPHY_SIZE = 24
const TROPHY_PATH =
  'M5 1h12v3h3a2 2 0 0 1 2 2c0 3.3-2.2 5.6-5.2 6A6 6 0 0 1 12 15a6 6 0 0 1-4.8-2.9C4.2 11.6 2 9.3 2 6a2 2 0 0 1 2-2h1V1Zm0 5H4c0 1.9 1.1 3.2 2.6 3.7A12 12 0 0 1 5 6Zm14 0h-1a12 12 0 0 1-1.6 3.7C17.9 9.2 19 7.9 19 6ZM9 16.5h6V19h2.5v2h-11v-2H9v-2.5Z'
// The lucide shield, in its 24-unit box. Same slot mark the bracket uses for a
// TBD team, so an undecided place reads identically across both fixture styles.
const SHIELD_PATH =
  'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'
// Clears the hub's top edge. The hub's two feeders sit on the horizontal, so
// the space directly above it is always free.
const TROPHY_GAP = 6
// Outermost ring. The remaining 62px of the box absorbs the largest node plus
// its ring stroke, so nothing clips at the viewBox edge.
const OUTER_R = 318
const HUB_R = 34
// Nodes grow outward so the crowded outer ring still reads at small sizes.
const NODE_MIN = 14.2
const NODE_STEP = 2.2
// Initials floor, in viewBox units. The stage never goes below 32rem against a
// 760-unit box (scale ~0.674), so 15 units is ~10px on screen — under that, two
// letters are a smudge. `node.r * 0.8` alone puts the inner ring at 7.6px.
const INITIALS_MIN = 15
// Siblings pull slightly toward their parent, opening a lane between subtrees.
const SIBLING_GAP = 0.9
// Puts the hub's two feeders on the horizontal, where there's room for them.
const HUB_ANGLE = 90

// Component-specific timing, kept local: a hover dim and the tap label run
// quicker than any shared token, and the match must stay byte-identical.
const DIM_TRANSITION = { duration: 0.18 } as const
const NO_TRANSITION = { duration: 0 } as const

// Math.sin/cos are implementation-defined down in the last digits, so the SSR
// engine and the browser disagree on every coordinate. Quantizing well below
// sub-pixel makes both agree exactly.
const quantize = (n: number) => Math.round(n * 1e3) / 1e3

const polar = (radius: number, deg: number) => {
  const rad = (deg * Math.PI) / 180
  return {
    x: quantize(CENTER + radius * Math.cos(rad)),
    y: quantize(CENTER + radius * Math.sin(rad)),
  }
}

const point = (radius: number, deg: number) => {
  const { x, y } = polar(radius, deg)
  return `${x.toFixed(2)} ${y.toFixed(2)}`
}

// Fixed precision so the server and client render byte-identical style strings.
const pct = (value: number) => `${((value / SIZE) * 100).toFixed(4)}%`

type WheelNode = {
  id: string
  parentId: string | null
  depth: number
  /** Position around the wheel, in degrees. Orders arrow-key navigation. */
  angle: number
  x: number
  y: number
  r: number
  team: TournamentTeam | null
  label: string
  /** Round the node's match belongs to; null on the rim, which holds teams. */
  round: string | null
}

type WheelLink = {
  id: string
  d: string
  depth: number
}

const teamName = (side: TournamentSide, translate: TournamentTranslate<KnockoutWheelMessages>) =>
  keepTogether(side.team?.name ?? translate('tbd'))

/** Teams · score, in the order they were played. The round is prepended by the
 * caller that has it, so the round list can reuse this without repeating it. */
function matchLabel(match: TournamentMatch, translate: TournamentTranslate<KnockoutWheelMessages>) {
  const teams = translate('versus', {
    home: teamName(match.home, translate),
    away: teamName(match.away, translate),
  })
  if (match.home.score == null || match.away.score == null) return teams
  const score = { teams, home: match.home.score, away: match.away.score }
  return match.home.penalties != null && match.away.penalties != null
    ? translate('resultPenalties', {
        ...score,
        homePenalties: match.home.penalties,
        awayPenalties: match.away.penalties,
      })
    : translate('result', score)
}

/** Walks the match tree from the final outward, laying every node on a ring and
 * splitting each parent's wedge between its two feeders. */
function buildWheel(rounds: TournamentRound[], translate: TournamentTranslate<KnockoutWheelMessages>) {
  const nodes: WheelNode[] = []
  const links: WheelLink[] = []
  const layers = rounds.length
  const ringR = (depth: number) => (depth / layers) * OUTER_R
  const nodeR = (depth: number) => NODE_MIN + (depth - 1) * NODE_STEP

  // An empty or malformed catalog renders nothing rather than throwing on the
  // way to the hub.
  const final = rounds[layers - 1]?.matches[0]
  if (!final) return { nodes, links, champion: null }

  const champion = final.winner ? final[final.winner].team : null
  nodes.push({
    id: final.id,
    parentId: null,
    depth: 0,
    angle: HUB_ANGLE,
    x: CENTER,
    y: CENTER,
    r: HUB_R,
    team: champion,
    label: matchLabel(final, translate),
    round: rounds[layers - 1]!.name,
  })

  // `roundIndex` is the round `match` belongs to; its two feeders live one round
  // out, or, past the first round, are the two teams that played it.
  const walk = (match: TournamentMatch, roundIndex: number, index: number, parent: WheelNode, angle: number, wedge: number) => {
    const depth = parent.depth + 1
    const radius = ringR(depth)
    const r = nodeR(depth)
    // The hub's two feeders sit opposite each other, so they get plain radial
    // lines; an arc between them would be a half circle.
    const offset = (wedge / 4) * (parent.depth === 0 ? 1 : SIBLING_GAP)
    const angles = [angle - offset, angle + offset]
    const sides = ['home', 'away'] as const

    const children = angles.map((childAngle, side) => {
      const { x, y } = polar(radius, childAngle)
      const feeder = roundIndex > 0 ? rounds[roundIndex - 1]!.matches[2 * index + side] : undefined
      const sideMatch = match[sides[side]]
      const node: WheelNode = feeder
        ? {
            id: feeder.id,
            parentId: parent.id,
            depth,
            angle: childAngle,
            x,
            y,
            r,
            team: feeder.winner ? feeder[feeder.winner].team : null,
            label: matchLabel(feeder, translate),
            round: rounds[roundIndex - 1]!.name,
          }
        : {
            id: `${match.id}-${sides[side]}`,
            parentId: parent.id,
            depth,
            angle: childAngle,
            x,
            y,
            r,
            team: sideMatch.team,
            label: sideMatch.team?.name ?? translate('tbd'),
            round: null,
          }
      nodes.push(node)
      return { node, angle: childAngle, feeder }
    })

    if (parent.depth === 0) {
      for (const child of children) {
        links.push({
          id: `${parent.id}-${child.node.id}`,
          d: `M ${point(radius, child.angle)} L ${CENTER} ${CENTER}`,
          depth,
        })
      }
    } else {
      const midR = (ringR(parent.depth) + radius) / 2
      links.push({
        id: `${parent.id}-arc`,
        d: `M ${point(radius, angles[0]!)} L ${point(midR, angles[0]!)} A ${midR} ${midR} 0 0 1 ${point(midR, angles[1]!)} L ${point(radius, angles[1]!)}`,
        depth,
      })
      links.push({
        id: `${parent.id}-stem`,
        d: `M ${point(midR, angle)} L ${point(ringR(parent.depth), angle)}`,
        depth,
      })
    }

    children.forEach((child, side) => {
      if (child.feeder) {
        walk(child.feeder, roundIndex - 1, 2 * index + side, child.node, child.angle, wedge / 2)
      }
    })
  }

  walk(final, layers - 1, 0, nodes[0]!, HUB_ANGLE, 360)
  return { nodes, links, champion }
}

/** Match ids from the hub down to the champion's first-round win. */
function championPath(rounds: TournamentRound[]) {
  const path = new Set<string>()
  let index = 0
  for (let r = rounds.length - 1; r >= 0; r--) {
    const match = rounds[r]!.matches[index]
    if (!match?.winner) return path
    path.add(match.id)
    if (r === 0) path.add(`${match.id}-${match.winner}`)
    index = 2 * index + (match.winner === 'home' ? 0 : 1)
  }
  return path
}

/* ---- state --------------------------------------------------------------- */

const reduce = useReducedMotion()
// Touch devices fire a phantom sticky `:hover` on tap, so hover labels only
// exist where a real pointer can leave.
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const uid = useId().replace(/:/g, '')
const wheelSvg = useTemplateRef<SVGSVGElement>('wheelSvg')
const stage = useTemplateRef<HTMLElement>('wheelStage')
// 63 flags for a 32-team draw, and SVG <image> has no lazy attribute — so the
// requests wait until the wheel is nearly on screen.
const inView = useInView(wheelSvg, { once: true, margin: '300px' })
// Hover, tap and focus are tracked apart. Sharing one slot let a stray mouse
// move clear the isolation while a node still held focus, and a tap has to
// outlive the pointerleave that a finger fires the moment it lifts.
const hovered = shallowRef<string | null>(null)
const pinned = shallowRef<string | null>(null)
const focused = shallowRef<string | null>(null)
const active = computed(() => hovered.value ?? pinned.value ?? focused.value)

/* ---- drawing ------------------------------------------------------------- */

// Everything downstream reads the trimmed catalog, so the kept round's own
// teams become the rim and the sr-only list matches what's drawn.
const visible = computed(() => {
  const from = Math.min(Math.max(props.initialRound, 0), Math.max(props.rounds.length - 1, 0))
  return from > 0 ? props.rounds.slice(from) : props.rounds
})

const drawing = computed(() => buildWheel(visible.value, t.value))
const nodes = computed(() => drawing.value.nodes)
const links = computed(() => drawing.value.links)
const champion = computed(() => drawing.value.champion)
const winners = computed(() => championPath(visible.value))
const activeNode = computed(() => nodes.value.find(node => node.id === active.value))
// Pointing at one flag isolates that flag. Only at rest does the wheel fall
// back to lighting the champion's whole run.
const lit = computed(() => (activeNode.value ? new Set([activeNode.value.id]) : winners.value))

// Stable identity, or every mark re-runs its entrance on each pointer move.
const enter = computed(() =>
  reduce.value
    ? { duration: 0, opacity: { duration: 0 } }
    : { ...panelSpring, opacity: { duration: 0.24 } },
)

// One transition object per ring, cached, so the ring-by-ring entrance delay
// survives re-renders instead of allocating one object per mark.
const enterFor = computed(() => {
  const cache = new Map<number, object>()
  const base = enter.value
  const reduceMotion = reduce.value
  return (depth: number) => {
    const hit = cache.get(depth)
    if (hit) return hit
    const value = { ...base, delay: reduceMotion ? 0 : depth * 0.06 }
    cache.set(depth, value)
    return value
  }
})

// Tooltip is hover-only by design, so touch gets the same label anchored to the
// tapped flag. It flips to the far side near the rim so it stays on stage.
const tapped = computed(() => (canHover.value ? undefined : activeNode.value))
const tapAbove = computed(() => (tapped.value ? tapped.value.y > CENTER : false))

// Links draw outward ring by ring, half a beat behind the marks they lead to.
const linkCache = new Map<number, object>()
function linkTransition(depth: number) {
  const hit = linkCache.get(depth)
  if (hit) return hit
  const value = { duration: 0.3, delay: depth * 0.06 }
  linkCache.set(depth, value)
  return value
}

// Arrow keys follow the geometry: up walks toward the hub, down walks out to a
// feeder, left/right go round the ring.
const rings = computed(() => {
  const byDepth = new Map<number, WheelNode[]>()
  const child = new Map<string, WheelNode>()
  for (const node of nodes.value) {
    const peers = byDepth.get(node.depth) ?? []
    peers.push(node)
    byDepth.set(node.depth, peers)
    if (node.parentId && !child.has(node.parentId)) child.set(node.parentId, node)
  }
  for (const peers of byDepth.values()) peers.sort((a, b) => a.angle - b.angle)
  return { ring: byDepth, firstChild: child }
})

const tabStop = computed(() => activeNode.value?.id ?? nodes.value[0]?.id)

function moveFocus(node: WheelNode, key: string) {
  if (!key.startsWith('Arrow')) return
  let target: WheelNode | undefined
  if (key === 'ArrowUp') target = nodes.value.find(peer => peer.id === node.parentId)
  else if (key === 'ArrowDown') target = rings.value.firstChild.get(node.id)
  else {
    const peers = rings.value.ring.get(node.depth) ?? []
    if (peers.length < 2) target = undefined
    else {
      const at = peers.indexOf(node)
      const next = key === 'ArrowRight' ? at + 1 : at - 1
      target = peers[(next + peers.length) % peers.length]
    }
  }
  if (!target) return
  // Focus moves; the focus handler lights the node it lands on.
  document.getElementById(`${uid}-${target.id}`)?.focus()
}

/* ---- tap-to-pin and dismissal -------------------------------------------- */

// A finger never leaves the flag it lit, so the isolation would hold for good —
// and bare stage reports no pointer event of its own to end it. The next
// pointerdown that isn't on a flag stands in for the pointer leaving; it is
// consumed, since a wheel spanning the viewport makes tapping past it the
// natural way out and there is no reason for that tap to do anything else.
// Only a pinned flag arms this: a mouse ends its own hover, and the browser
// drops focus on its own.
function unpin() {
  pinned.value = null
  const focus = document.activeElement
  if (focus instanceof HTMLElement && stage.value?.contains(focus)) focus.blur()
}

/** True when the target is a flag inside this wheel. */
const onFlag = (target: Element) => Boolean(stage.value?.contains(target) && target.closest('button'))

// What every currently open dismiss scope counts as inside itself, so a stray
// gesture from behind another overlay is not answered twice.
const openScopes = new Set<(target: Element) => boolean>()

function consumeActivation(source: Event) {
  const swallow = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    release()
  }
  const restart = (event: Event) => {
    if (event !== source) release()
  }
  const release = () => {
    window.removeEventListener('click', swallow, true)
    window.removeEventListener('pointerdown', restart, true)
    window.removeEventListener('pointercancel', restart, true)
    window.removeEventListener('keydown', release, true)
  }
  window.addEventListener('click', swallow, true)
  window.addEventListener('pointerdown', restart, true)
  window.addEventListener('pointercancel', restart, true)
  window.addEventListener('keydown', release, true)
}

let detachDismiss: (() => void) | undefined

watch(() => pinned.value !== null, pinnedOpen => {
  detachDismiss?.()
  detachDismiss = undefined
  if (!pinnedOpen) return
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') unpin()
  }
  const onPointer = (event: PointerEvent) => {
    const target = event.target as Element | null
    if (!target || onFlag(target)) return
    let claimed = false
    for (const scope of openScopes) if (scope !== onFlag && scope(target)) claimed = true
    if (!claimed) consumeActivation(event)
    unpin()
  }
  openScopes.add(onFlag)
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer, true)
  detachDismiss = () => {
    openScopes.delete(onFlag)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('pointerdown', onPointer, true)
  }
}, { immediate: true })

// Round · teams · score for a decided match; a rim node is just a team. A slot
// whose team isn't known yet reads TBD, matching the shield drawn in its place.
const captions = computed(() => new Map(nodes.value.map(node => [
  node.id,
  node.team == null
    ? t.value('tbd')
    : node.round
      ? t.value('caption', { round: keepTogether(node.round), match: node.label })
      : node.team.name,
])))

/* ---- per-mark artwork ---------------------------------------------------- */

// The failed URL, not a boolean: a corrected logo on the same node should be
// tried again rather than stay initials for the life of the wheel.
const failedSrc = reactive(new Map<string, string>())

function markSrc(node: WheelNode) {
  const resolved = crestSrc(node.team)
  return resolved === failedSrc.get(node.id) ? null : resolved
}

// A square logo is fitted whole; a 4:3 flag is cropped to fill the disc.
function markBox(node: WheelNode) {
  return node.team?.logo
    ? { w: node.r * 1.44, h: node.r * 1.44, fit: 'xMidYMid meet' }
    : { w: node.r * 2.68, h: node.r * 2, fit: 'xMidYMid slice' }
}

// Dimming rides on the mark itself rather than a scrim tinted with the page
// background, so the wheel recedes correctly on any surface it's dropped on.
const fade = (node: WheelNode) => ({ opacity: lit.value.has(node.id) || lit.value.size === 0 ? 1 : 0.38 })

const markTransition = computed(() => (reduce.value ? NO_TRANSITION : DIM_TRANSITION))

/* ---- hover label --------------------------------------------------------- */

// Mirrors the shared tooltip: 120 ms before a resting pointer opens a label,
// instant open for a keyboard focus or right after another label closed
// (skipDelay), and no tail on close.
const TIP_DELAY = 120
const TIP_SKIP_DELAY = 300
const tipId = `${uid}-tip`
const tipTarget = shallowRef<WheelNode | null>(null)
const tipAnchor = shallowRef<HTMLElement | null>(null)
const tipOpen = shallowRef(false)
let tipTimer: number | undefined
let tipClosedAt = 0
let graceStop: (() => void) | undefined

function clearTipTimer() {
  window.clearTimeout(tipTimer)
  tipTimer = undefined
}

function closeTip(wait = 0) {
  clearTipTimer()
  stopGrace()
  const hide = () => {
    if (!tipOpen.value) return
    tipOpen.value = false
    tipClosedAt = Date.now()
  }
  if (wait > 0) tipTimer = window.setTimeout(hide, wait)
  else hide()
}

function openTip(node: WheelNode, anchor: HTMLElement | null, delay: number) {
  clearTipTimer()
  if (tipOpen.value && tipTarget.value?.id === node.id) return
  tipTarget.value = node
  tipAnchor.value = anchor
  const warm = Date.now() - tipClosedAt < TIP_SKIP_DELAY
  if (warm || delay <= 0) {
    tipOpen.value = true
    return
  }
  tipTimer = window.setTimeout(() => {
    tipOpen.value = true
  }, delay)
}

// Hold the label open while the pointer crosses the few pixels between the
// flag and the surface it opened: the pointer is inside their union either way.
function stopGrace() {
  graceStop?.()
  graceStop = undefined
}

function startGrace(from: HTMLElement) {
  stopGrace()
  const panel = document.querySelector<HTMLElement>(`.be-wheel-tip`)
  if (!panel) {
    closeTip(0)
    return
  }
  const boxes = [from.getBoundingClientRect(), panel.getBoundingClientRect()]
  const onMove = (event: PointerEvent) => {
    const inside = boxes.some(box =>
      event.clientX >= box.left - 6 && event.clientX <= box.right + 6 &&
      event.clientY >= box.top - 6 && event.clientY <= box.bottom + 6)
    if (!inside) closeTip(0)
  }
  document.addEventListener('pointermove', onMove)
  graceStop = () => document.removeEventListener('pointermove', onMove)
}

/* ---- pointer and keyboard per flag --------------------------------------- */

// Enter and leave are paired per pointer: a pen that arrives in contact taps
// rather than hovers, and a mouse that pressed and dragged off still leaves.
const hoverContact = new Set<number>()
// Focus that came from the keyboard holds the label open on its own.
let keyboardFocus = false

function hoverEnter(node: WheelNode, event: PointerEvent) {
  const hovering = event.pointerType !== 'touch' && event.buttons === 0
  if (hovering) hoverContact.delete(event.pointerId)
  else hoverContact.add(event.pointerId)
  if (!hovering) return
  stopGrace()
  hovered.value = node.id
  openTip(node, event.currentTarget as HTMLElement, TIP_DELAY)
}

function hoverLeave(event: PointerEvent) {
  const arrivedInContact = hoverContact.delete(event.pointerId)
  if (arrivedInContact || event.pointerType === 'touch') return
  hovered.value = null
  if (keyboardFocus) return
  if (tipOpen.value) startGrace(event.currentTarget as HTMLElement)
  else closeTip(0)
}

// A `click` carries no `pointerType`, so the `pointerdown` before it is the only
// thing that says which input activated the flag — and whether one did at all.
type TapRecord = { pointerType: string, state: string | null }
let tapRecord: TapRecord | null = null

function tapDrop() {
  tapRecord = null
}

function flagClick(node: WheelNode, event: MouseEvent) {
  const gesture = tapRecord
  tapRecord = null
  // A hovering pointer lit the flag on its way in and puts it out on the way
  // past; only a gesture without a hover pins one.
  if (!gesture || gesture.pointerType === 'mouse') return
  pinned.value = pinned.value === node.id ? null : node.id
  // Click, not pointerdown: a tap focuses the flag first, and unpinning has to
  // also drop that focus or the flag stays lit.
  if (gesture.state) (event.currentTarget as HTMLElement | null)?.blur()
}

function flagKey(node: WheelNode, event: KeyboardEvent) {
  // A key press starts a keyboard activation, which never had a pointer behind
  // it: a gesture the platform took away must not be read as the tap behind the
  // click this press synthesizes.
  tapDrop()
  if (!event.key.startsWith('Arrow')) return
  // Arrows drive the wheel here, so they must not also scroll the page.
  event.preventDefault()
  moveFocus(node, event.key)
}

function flagFocus(node: WheelNode, event: FocusEvent) {
  focused.value = node.id
  const element = event.currentTarget as HTMLElement
  if (!element.matches(':focus-visible')) return
  keyboardFocus = true
  openTip(node, element, 0)
}

function flagBlur(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && (event.currentTarget as HTMLElement).contains(next)) return
  focused.value = null
  keyboardFocus = false
  closeTip(0)
}
</script>

<template>
  <div class="be-wheel" :class="className">
    <!-- Below the min width the rim's marks collapse too small to tell apart or
         tap, so the wheel holds its size and pans instead. The floor is fixed,
         not rim-derived: node radius grows with depth, so a shallower draw has
         *smaller* marks and needs the width more, not less. -->
    <div ref="wheelStage" class="be-wheel-stage">
      <svg
        ref="wheelSvg"
        :viewBox="`0 0 ${SIZE} ${SIZE}`"
        role="img"
        :aria-label="champion ? t('labelWithChampion', { team: champion.name }) : t('label')"
        class="be-wheel-svg"
      >
        <defs>
          <!-- Warm halo marking the champion. Kept faint: the warning colour is
               saturated enough that anything stronger drowns the connectors. -->
          <radialGradient :id="`${uid}-glow`">
            <stop offset="0%" class="be-wheel-glow" stop-opacity="0.14" />
            <stop offset="45%" class="be-wheel-glow" stop-opacity="0.04" />
            <stop offset="100%" class="be-wheel-glow" stop-opacity="0" />
          </radialGradient>
        </defs>

        <circle
          v-if="champion"
          :cx="CENTER"
          :cy="CENTER"
          :r="OUTER_R * 0.62"
          :fill="`url(#${uid}-glow)`"
        />

        <!-- role="img" on the svg prunes descendants from the accessibility tree,
             so the structure needs no aria-hidden of its own. -->
        <!-- tabindex="-1" on every motion'd SVG child: motion-v mounts a focus
             listener on each motion element unconditionally, and Chrome makes an
             SVG graphics element tabbable once anything listens for its focus —
             which put the connectors and marks in the Tab order ahead of the
             flags. React's framer-motion only loads that feature when the element
             uses whileFocus, so the original never had the listeners; the
             attribute restores the original's tab order. -->
        <g>
          <motion.path
            v-for="link in links"
            :key="link.id"
            :d="link.d"
            fill="none"
            :initial="reduce ? false : { opacity: 0 }"
            :animate="LINK_VISIBLE"
            :transition="linkTransition(link.depth)"
            tabindex="-1"
            class="be-wheel-link"
          />
        </g>

        <motion.g
          v-for="node in nodes"
          :key="node.id"
          :initial="reduce ? false : { opacity: 0, scale: 0.6 }"
          :animate="ENTER_VISIBLE"
          :transition="enterFor(node.depth)"
          :style="{ transformOrigin: `${node.x}px ${node.y}px` }"
          tabindex="-1"
        >
          <g v-if="node.depth === 0 && champion" :transform="`translate(${CENTER - TROPHY_SIZE / 2}, ${CENTER - HUB_R - TROPHY_GAP - TROPHY_SIZE})`">
            <path :d="TROPHY_PATH" class="be-wheel-trophy" />
          </g>

          <!-- Stays opaque at every state: links are routed underneath and would
               otherwise read straight through the flag. -->
          <circle :cx="node.x" :cy="node.y" :r="node.r" class="be-wheel-disc" />

          <motion.g
            :initial="false"
            :animate="fade(node)"
            :transition="markTransition"
            tabindex="-1"
          >
            <template v-if="markSrc(node) && inView">
              <clipPath :id="`${uid}-clip-${node.id}`">
                <circle :cx="node.x" :cy="node.y" :r="node.r" />
              </clipPath>
              <!-- Plain <image> — flags from flagcdn.com, logos from wherever you
                   host them. A 4:3 flag is cropped to fill the disc; a logo is
                   fitted whole inside it, since a crest cropped to a circle loses
                   its shape. -->
              <image
                :href="markSrc(node)!"
                :x="node.x - markBox(node).w / 2"
                :y="node.y - markBox(node).h / 2"
                :width="markBox(node).w"
                :height="markBox(node).h"
                :clip-path="`url(#${uid}-clip-${node.id})`"
                :preserveAspectRatio="markBox(node).fit"
                @error="failedSrc.set(node.id, markSrc(node)!)"
              />
            </template>
            <!-- No artwork on this team — initials keep the ring readable. -->
            <text
              v-else-if="node.team"
              :x="node.x"
              :y="node.y"
              text-anchor="middle"
              dominant-baseline="central"
              :font-size="Math.max(node.r * 0.8, INITIALS_MIN)"
              class="be-wheel-initials"
            >{{ initials(node.team.name) }}</text>
            <!-- Same shield the bracket uses for a TBD slot, so an undecided
                 place reads identically across both fixture styles. -->
            <svg
              v-else
              :x="node.x - node.r * 0.7"
              :y="node.y - node.r * 0.7"
              :width="node.r * 1.4"
              :height="node.r * 1.4"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="be-wheel-shield"
            ><path :d="SHIELD_PATH" /></svg>
          </motion.g>

          <circle
            :cx="node.x"
            :cy="node.y"
            :r="node.r"
            fill="none"
            :stroke-width="lit.has(node.id) ? 2 : 1"
            :class="lit.has(node.id) ? 'be-wheel-ring-lit' : 'be-wheel-ring'"
          />
        </motion.g>
      </svg>

      <!-- An SVG <g> can't anchor a tooltip, so each flag gets an invisible HTML
           hit area laid over it in percentage units, which track the wheel as it
           scales. Both interaction paths are always attached: iPadOS answers the
           hover query with true for a finger, so hanging the tap path off "cannot
           hover" left it unreachable on the very device it was written for. The
           event says which input arrived. -->
      <div
        v-for="node in nodes"
        :key="`hit-${node.id}`"
        class="be-wheel-anchor"
        :style="{
          left: pct(node.x - node.r),
          top: pct(node.y - node.r),
          width: pct(node.r * 2),
          height: pct(node.r * 2),
        }"
      >
        <button
          :id="`${uid}-${node.id}`"
          type="button"
          :tabindex="node.id === tabStop ? 0 : -1"
          :aria-label="captions.get(node.id) ?? ''"
          :aria-describedby="tipOpen && tipTarget?.id === node.id ? tipId : undefined"
          class="be-wheel-hit"
          @keydown="flagKey(node, $event)"
          @focusin="flagFocus(node, $event)"
          @focusout="flagBlur"
          @pointerenter="hoverEnter(node, $event)"
          @pointerleave="hoverLeave"
          @pointerdown="tapRecord = { pointerType: $event.pointerType, state: pinned }"
          @pointercancel="tapDrop"
          @click="flagClick(node, $event)"
        />
      </div>

      <motion.p
        v-if="tapped"
        :initial="reduce ? false : { opacity: 0, scale: 0.94 }"
        :animate="{ opacity: 1, scale: 1 }"
        :transition="markTransition"
        class="be-wheel-tap"
        :class="tapAbove ? 'is-above' : 'is-below'"
        :style="{ left: pct(tapped.x), top: pct(tapped.y + (tapAbove ? -tapped.r : tapped.r)) }"
      >{{ captions.get(tapped.id) }}</motion.p>

      <!-- One hover label for the whole wheel: it follows the flag under the
           pointer instead of mounting 63 teleported panels. -->
      <FloatingPanel
        v-if="canHover"
        :id="tipId"
        role="tooltip"
        :open="tipOpen && Boolean(tipTarget)"
        :anchor="tipAnchor"
        side="top"
        align="center"
        :gap="5"
        variant="tip"
        class="be-wheel-tip"
        @dismiss="closeTip(0)"
        @pointerenter="clearTipTimer"
        @pointerleave="closeTip(0)"
      >{{ tipTarget ? captions.get(tipTarget.id) : '' }}</FloatingPanel>
    </div>

    <!-- role="img" prunes the svg's descendants, so every result is restated
         here for screen readers. Named lists, not named sections — a named
         section is a landmark, and five of those would crowd real page
         landmarks. -->
    <div class="be-wheel-sr">
      <ul v-for="round in visible.slice().reverse()" :key="round.name" :aria-label="round.name">
        <li v-for="match in round.matches" :key="match.id">{{ matchLabel(match, t) }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.be-wheel {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  color: var(--beui-foreground);
}
.be-wheel-stage { position: relative; margin-inline: auto; width: 100%; min-width: 32rem; max-width: 34rem; }
.be-wheel-svg { display: block; width: 100%; height: auto; touch-action: manipulation; }

.be-wheel-link { stroke: var(--beui-border-strong, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); }
.be-wheel-disc { fill: var(--beui-card); }
.be-wheel-initials { fill: var(--beui-muted-foreground); font-weight: 600; }
.be-wheel-ring { stroke: var(--beui-border); }
.be-wheel-ring-lit { stroke: var(--beui-foreground); }
.be-wheel-trophy { fill: var(--beui-warning, oklch(78% 0.18 75)); }
.be-wheel-glow { stop-color: var(--beui-warning, oklch(78% 0.18 75)); }
.be-wheel-shield { color: color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent); }

.be-wheel-anchor { position: absolute; }
.be-wheel-hit {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  outline: none;
}
/* ring-foreground, not the ring token: --ring is a 10% hairline that disappears
   over a flag. Focus has to be obvious. */
.be-wheel-hit:focus-visible { outline: 2px solid var(--beui-foreground); outline-offset: 2px; }

.be-wheel-tap {
  position: absolute;
  z-index: 10;
  width: max-content;
  max-width: min(18rem, 80vw);
  margin: 0;
  padding: .25rem .625rem;
  pointer-events: none;
  border: 1px solid var(--beui-border);
  border-radius: .5rem;
  background: var(--beui-background);
  color: var(--beui-foreground);
  font-size: .75rem;
  font-weight: 500;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: break-word;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);
}
.be-wheel-tap { translate: -50% 0; }
.be-wheel-tap.is-above { translate: -50% calc(-100% - 8px); }
.be-wheel-tap.is-below { translate: -50% .5rem; }

.be-wheel-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>

<style>
/* The label is teleported to the body, so its chrome has to be global. */
.be-wheel-tip {
  max-width: min(20rem, calc(100vw - 16px));
  padding: .25rem .625rem;
  border: 1px solid var(--beui-border);
  border-radius: .5rem;
  background: var(--beui-background);
  color: var(--beui-foreground);
  font-size: .75rem;
  font-weight: 500;
  white-space: normal;
  text-align: center;
  text-wrap: balance;
  overflow-wrap: break-word;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);
}
</style>

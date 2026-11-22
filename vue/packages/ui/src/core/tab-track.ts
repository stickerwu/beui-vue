import { useSpring, useTransform } from 'motion-v'
import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue'
import { tabsSpring } from './motion'

export function useTabTrack(viewport: Ref<HTMLElement | null>, list: Ref<HTMLElement | null>, current: Readonly<Ref<string>>, reduce: Ref<boolean>) {
  const edges = shallowRef({ left: false, right: false })
  const placed = shallowRef(false)
  const left = useSpring(0, tabsSpring)
  const width = useSpring(0, tabsSpring)
  const leftPx = useTransform(left, value => `${value}px`)
  const rightPx = useTransform(() => `${left.get() + width.get()}px`)
  const trackStyles = { '--pill-left': leftPx, '--pill-right': rightPx }
  let observer: ResizeObserver | undefined

  function measureEdges() {
    const host = viewport.value
    if (!host) return
    const maximum = host.scrollWidth - host.clientWidth
    const physical = getComputedStyle(host).direction === 'rtl' ? maximum + host.scrollLeft : host.scrollLeft
    const next = { left: physical > 1, right: physical < maximum - 1 }
    if (next.left !== edges.value.left || next.right !== edges.value.right) edges.value = next
  }

  function reveal(tab: HTMLElement) {
    const host = viewport.value
    if (!host) return
    const bounds = host.getBoundingClientRect()
    const item = tab.getBoundingClientRect()
    const min = bounds.left + (edges.value.left ? 36 : 0)
    const max = bounds.right - (edges.value.right ? 36 : 0)
    const delta = item.left < min ? item.left - min : Math.max(0, item.right - max)
    if (delta) host.scrollBy({ left: delta, behavior: reduce.value ? 'instant' : 'smooth' })
  }

  function place() {
    measureEdges()
    const buttons = list.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    if (!buttons) return
    // Client rects include ancestor transforms (a scaled preview card); divide
    // the scale back out so the pill stays in the list's own space.
    const boxes = Array.from(buttons, tab => {
      const width = tab.getBoundingClientRect().width
      const scale = tab.offsetWidth ? width / tab.offsetWidth || 1 : 1
      return { tab, start: tab.offsetLeft, width: width / scale }
    })
    const target = boxes.find(({ tab }) => tab.dataset.value === current.value)
    for (const box of boxes) box.tab.style.setProperty('--tab-left', `${box.start}px`)
    if (!target?.width) { placed.value = false; return }
    if (!placed.value || reduce.value) { left.jump(target.start); width.jump(target.width) }
    else { left.set(target.start); width.set(target.width) }
    placed.value = true
  }

  function refresh() {
    observer?.disconnect()
    if (!list.value || !viewport.value) return
    observer?.observe(viewport.value)
    observer?.observe(list.value)
    for (const tab of list.value.querySelectorAll<HTMLElement>('[role="tab"]')) observer?.observe(tab)
    place()
    const active = list.value.querySelector<HTMLElement>('[aria-selected="true"]')
    if (active) reveal(active)
  }

  function scroll(direction: number) {
    const host = viewport.value
    if (host) host.scrollBy({ left: host.clientWidth * 0.8 * direction, behavior: reduce.value ? 'instant' : 'smooth' })
  }

  watch([current, reduce], refresh, { flush: 'post' })
  onMounted(() => {
    observer = new ResizeObserver(place)
    refresh()
  })
  onBeforeUnmount(() => observer?.disconnect())
  return { edges, placed, trackStyles, left, width, measureEdges, refresh, reveal, scroll }
}

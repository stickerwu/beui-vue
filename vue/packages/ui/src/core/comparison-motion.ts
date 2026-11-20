import { animate, useMotionValue, useMotionValueEvent, useSpring, useTransform, useVelocity } from 'motion-v'
import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue'
import { glideSpring } from './motion'

export function useComparisonMotion(frame: Ref<HTMLElement | null>, current: Readonly<Ref<number>>, reduce: Ref<boolean>, canHint: () => boolean) {
  const position = useMotionValue(current.value)
  const width = useMotionValue(0)
  const height = useMotionValue(0)
  const pull = useTransform(useVelocity(position), [-250, 250], [-1, 1])
  const bend = useSpring(pull, { stiffness: 200, damping: 15, mass: 0.3 })
  const motionAllowed = useMotionValue(reduce.value ? 0 : 1)
  const trail = useTransform(() => motionAllowed.get() * bend.get() * .12 * height.get())
  const clipPath = useTransform(() => {
    const center = position.get() * width.get() / 100
    const end = center - trail.get()
    const depth = height.get()
    if (!width.get() || !depth) return `inset(0 ${100 - position.get()}% 0 0)`
    return `path("M0 0 L${end} 0 Q${center + trail.get()} ${depth / 2} ${end} ${depth} L0 ${depth} Z")`
  })
  const curve = useTransform(() => {
    const lag = width.get() ? trail.get() / width.get() * 100 : 0
    const center = position.get()
    return `M${center - lag} 0 Q${center + lag} 50 ${center - lag} 100`
  })
  const line = shallowRef(curve.get())
  useMotionValueEvent(curve, 'change', value => { line.value = value })
  const dividerX = useTransform(position, value => `${value}%`)
  const beforeOpacity = useTransform(position, [8, 22], [0, 1])
  const afterOpacity = useTransform(position, [78, 92], [1, 0])
  let resize: ResizeObserver | undefined
  let visibility: IntersectionObserver | undefined
  let hintPlayed = false
  let hintRunning = false
  let inView = false
  let smooth = false
  let pendingGlide: number | undefined

  function cancelPendingGlide() {
    if (pendingGlide !== undefined) cancelAnimationFrame(pendingGlide)
    pendingGlide = undefined
  }

  function stopHint() {
    hintPlayed = true
    if (hintRunning) { hintRunning = false; position.stop(); position.jump(current.value) }
  }

  function playHint() {
    if (!inView || !canHint() || reduce.value || hintPlayed) return
    hintPlayed = true
    hintRunning = true
    const from = current.value
    animate(position, [from, Math.min(100, from + 10), Math.max(0, from - 10), from], {
      delay: .25, duration: 1.6, times: [0, .3, .7, 1], ease: [.77, 0, .175, 1], onComplete: () => { hintRunning = false },
    })
  }

  watch(current, value => {
    stopHint()
    cancelPendingGlide()
    position.stop()
    if (reduce.value) position.jump(value)
    else if (smooth) pendingGlide = requestAnimationFrame(() => {
      pendingGlide = undefined
      animate(position, value, glideSpring)
    })
    else position.set(value)
    smooth = false
  }, { flush: 'sync' })
  watch([reduce, canHint], () => {
    motionAllowed.set(reduce.value ? 0 : 1)
    if (reduce.value || !canHint()) { cancelPendingGlide(); stopHint(); position.jump(current.value) }
    else playHint()
  })
  onMounted(() => {
    if (!frame.value) return
    function measure() {
      const bounds = frame.value?.getBoundingClientRect()
      if (bounds) { width.set(bounds.width); height.set(bounds.height) }
    }
    measure()
    resize = new ResizeObserver(measure)
    resize.observe(frame.value)
    visibility = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.intersectionRatio >= .6)) { inView = true; visibility?.disconnect(); playHint() }
    }, { threshold: .6 })
    visibility.observe(frame.value)
  })
  onBeforeUnmount(() => { cancelPendingGlide(); resize?.disconnect(); visibility?.disconnect(); position.stop() })
  return { clipPath, line, position, dividerX, beforeOpacity, afterOpacity, stopHint, glide: (next: boolean) => { smooth = next } }
}

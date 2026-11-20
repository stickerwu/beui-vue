import { inject, type InjectionKey, type Ref } from 'vue'
import type { MotionValue } from 'motion-v'

export interface SmoothScrollApi {
  container: Readonly<Ref<HTMLElement | undefined>>
  progress: MotionValue<number>
  scrollY: MotionValue<number>
  velocity: MotionValue<number>
  scrollTo: (target: number | string | HTMLElement, options?: { offset?: number; duration?: number; immediate?: boolean }) => void
}

export const scrollKey: InjectionKey<SmoothScrollApi> = Symbol('beui-scroll')
export const useSmoothScroll = () => inject(scrollKey, null)

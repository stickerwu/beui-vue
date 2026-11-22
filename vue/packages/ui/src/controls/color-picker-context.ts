import { useMotionValue, useSpring, useTransform } from 'motion-v'
import { inject, watch, type ComputedRef, type InjectionKey, type ShallowRef, type WritableComputedRef } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { parseColor, type Hsva } from './colors'

/** English defaults. Override per instance with `labels`. */
export const colorPickerMessages = {
  dialog: 'Color picker',
  area: 'Saturation and brightness',
  areaRole: '2D slider',
  areaValue: 'Saturation {saturation}%, brightness {brightness}%',
  hue: 'Hue',
  hueValue: '{value} degrees',
  opacity: 'Opacity',
  opacityValue: '{value}%',
  hex: 'Hex color',
  saturation: 'Saturation',
  lightness: 'Lightness',
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
  opacityPercent: 'Opacity percent',
  eyeDropper: 'Pick a color from the screen',
  format: 'Switch color format',
  presets: 'Presets',
}
export type ColorPickerMessages = typeof colorPickerMessages
export interface ColorPickerPresetValue { value: string; label: string }

export interface ColorPickerContext {
  id: string
  t: ComputedRef<ColorPickerMessages>
  channels: ShallowRef<Hsva>
  hex: ComputedRef<string>
  rgb: ComputedRef<number[]>
  alpha: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  /** Applies new channels (clamped); emits `update:modelValue` when the hex changed. */
  update: (next: Hsva) => void
  /** Fires `commit` once an interaction settles. */
  commit: () => void
  /** Parses any hex form and applies it. False when the input is not a color. */
  applyHex: (input: string) => boolean
  open: WritableComputedRef<boolean>
  triggerEl: ShallowRef<HTMLButtonElement | null>
}

export const colorPickerKey: InjectionKey<ColorPickerContext> = Symbol('beui-color-picker')
/** Provided as true inside `ColorPickerContent`, where the area morphs out of the trigger chip. */
export const colorPickerMorphKey: InjectionKey<boolean> = Symbol('beui-color-picker-morph')

export function useColorPickerContext(part: string) {
  const context = inject(colorPickerKey, null)
  if (!context) throw new Error(`${part} must be used within ColorPicker`)
  return context
}

/** Current color and a setter, for custom parts inside a ColorPicker. */
export function useColorPicker() {
  const { hex, rgb, channels, alpha, disabled, update, commit, applyHex } = useColorPickerContext('useColorPicker')
  return {
    hex,
    rgb,
    hsva: channels,
    alpha,
    disabled,
    /** Accepts any hex form. Invalid input is ignored. */
    setColor: (value: string) => {
      if (parseColor(value, channels.value) === undefined) return
      applyHex(value)
      commit()
    },
    update,
    commit,
  }
}

/** Fills `{name}` placeholders. */
export function fillTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

/** Dragged handles ride a critically damped spring, so they follow the pointer smoothly and never rebound off an end. */
export function useGlide(source: () => number) {
  const reduce = useReducedMotion()
  const target = useMotionValue(source())
  const spring = useSpring(target, { stiffness: 700, damping: 50, mass: 0.5 })
  watch(source, next => {
    if (reduce.value) spring.jump(next)
    else target.set(next)
  })
  const offset = useTransform(spring, value => `${value}%`)
  return { spring, offset }
}

/** Arrow, Page and Home/End stepping. Returns the delta, or null when unhandled. */
export function keyStep(event: KeyboardEvent, big: number): { axis: 'x' | 'y'; delta: number } | 'min' | 'max' | null {
  const step = event.shiftKey ? big : 1
  switch (event.key) {
    case 'ArrowRight': return { axis: 'x', delta: step }
    case 'ArrowLeft': return { axis: 'x', delta: -step }
    case 'ArrowUp': return { axis: 'y', delta: step }
    case 'ArrowDown': return { axis: 'y', delta: -step }
    case 'PageUp': return { axis: 'y', delta: big }
    case 'PageDown': return { axis: 'y', delta: -big }
    case 'Home': return 'min'
    case 'End': return 'max'
    default: return null
  }
}

/** One surface: the trigger chip grows into the area and shrinks back into it. */
export const MORPH = { type: 'spring', duration: 0.5, bounce: 0.2 } as const

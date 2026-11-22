import { computed, inject, provide, shallowRef, useId, watchEffect, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { buildVolumeProfile, type VolumeProfileBin, type VolumeProfileRow } from './models/volume-profile'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const volumeProfileMessages = {
  label: 'Volume profile', unit: 'units', empty: 'No volume data', inspect: '{label}: inspect price level', caption: '{label} data',
  priceRange: 'Price range', volume: 'Volume ({unit})', share: 'Share', level: 'Level', range: '{low} to {high}', amount: '{volume} {unit}',
  shareOfTotal: '{share} of total volume', poc: 'Point of control', pocBadge: 'POC', inside: 'Inside value area', outside: 'Outside value area',
  totalVolume: 'Total volume', valueArea: 'Value area · {target}% target', shareOfVolume: '{share} of volume',
}
export type VolumeProfileMessages = typeof volumeProfileMessages
export type { VolumeProfileBin, VolumeProfileRow }

export interface VolumeProfileProps {
  /** Price bins with non-overlapping ranges. */
  data: readonly VolumeProfileBin[]
  label?: string
  /** Unit shown after volumes, such as "BTC". */
  unit?: string
  formatPrice?: (price: number) => string
  formatVolume?: (size: number) => string
  /** Fraction of volume the value area covers, or `false` to hide it. Defaults to 0.7. */
  valueArea?: number | false
  color?: string
  pocColor?: string
  activeId?: string | null
  defaultActiveId?: string | null
  /** Override any built-in string. */
  labels?: Partial<VolumeProfileMessages>
}

export type VolumeProfileEmit = {
  (event: 'update:activeId', id: string | null): void
  (event: 'activeChange', id: string | null): void
}

const format = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })

export function useVolumeProfileModel(props: VolumeProfileProps, emit: VolumeProfileEmit) {
  const t = (key: keyof VolumeProfileMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? volumeProfileMessages[key], values)
  const label = computed(() => props.label ?? t('label'))
  const unit = computed(() => props.unit ?? t('unit'))
  const formatPrice = (price: number) => (props.formatPrice ?? format)(price)
  const formatVolume = (size: number) => (props.formatVolume ?? format)(size)
  const color = computed(() => props.color ?? '#6366f1')
  const pocColor = computed(() => props.pocColor ?? '#f59e0b')
  const model = computed(() => buildVolumeProfile(props.data, props.valueArea ?? 0.7))
  const rows = computed(() => model.value.rows)
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  /** The plot the tooltip hangs from; registered by `VolumeProfilePlot`. */
  const plot = shallowRef<HTMLElement | null>(null)
  const tooltipId = useId()

  const local = shallowRef(props.defaultActiveId ?? null)
  const tooltipOpen = shallowRef(false)
  const requested = computed(() => props.activeId === undefined ? local.value : props.activeId)
  const activeIndex = computed(() => rows.value.findIndex(row => row.id === requested.value))
  const active = computed(() => rows.value[activeIndex.value] ?? null)
  watchEffect(() => { if (local.value !== null && !rows.value.some(item => item.id === local.value)) local.value = null })
  function setActive(id: string | null) {
    if (requested.value === id) return
    if (props.activeId === undefined) local.value = id
    emit('update:activeId', id)
    emit('activeChange', id)
  }

  const setPlot = (value: typeof plot.value) => { plot.value = value }
  const setTooltipOpen = (value: typeof tooltipOpen.value) => { tooltipOpen.value = value }
  return { t, label, unit, formatPrice, formatVolume, color, pocColor, model, rows, reduce, canHover, plot: readonlyView(plot), setPlot, tooltipId, tooltipOpen: readonlyView(tooltipOpen), setTooltipOpen, activeIndex, active, setActive }
}

export type VolumeProfileModel = ReturnType<typeof useVolumeProfileModel>
const VOLUME_PROFILE: InjectionKey<VolumeProfileModel> = Symbol('volume-profile')

export function provideVolumeProfile(model: VolumeProfileModel) { provide(VOLUME_PROFILE, model) }

/** The state of the enclosing `VolumeProfile`; its parts must be rendered inside it. */
export function useVolumeProfile() {
  const model = inject(VOLUME_PROFILE, null)
  if (!model) throw new Error('Volume profile parts must be rendered inside VolumeProfile.')
  return model
}

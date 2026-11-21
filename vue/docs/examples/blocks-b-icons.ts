import { defineComponent, h, type PropType } from 'vue'

/**
 * Inline Lucide glyphs for the demos (the upstream previews import `lucide-react`). Each value is the
 * list of SVG children of a 24x24 stroked icon.
 */
type Node = [tag: string, attrs: Record<string, string>]
const ICONS: Record<string, Node[]> = {
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  clock: [['circle', { cx: '12', cy: '12', r: '10' }], ['path', { d: 'M12 6v6h4' }]],
  fileText: [['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }], ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }], ['path', { d: 'M10 9H8' }], ['path', { d: 'M16 13H8' }], ['path', { d: 'M16 17H8' }]],
  flag: [['path', { d: 'M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528' }]],
  mail: [['path', { d: 'm22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7' }], ['rect', { x: '2', y: '4', width: '20', height: '16', rx: '2' }]],
  pin: [['path', { d: 'M12 17v5' }], ['path', { d: 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z' }]],
  rotateCcw: [['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }], ['path', { d: 'M3 3v5h5' }]],
  trash: [['path', { d: 'M3 6h18' }], ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }], ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }], ['line', { x1: '10', x2: '10', y1: '11', y2: '17' }], ['line', { x1: '14', x2: '14', y1: '11', y2: '17' }]],
  user: [['circle', { cx: '12', cy: '8', r: '5' }], ['path', { d: 'M20 21a8 8 0 0 0-16 0' }]],
}

export type IconName = keyof typeof ICONS

export const Icon = defineComponent({
  name: 'DemoIcon',
  props: { name: { type: String as PropType<IconName>, required: true }, size: { type: Number, default: 16 }, strokeWidth: { type: Number, default: 2 } },
  setup: props => () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg', width: props.size, height: props.size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': props.strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, ICONS[props.name].map(([tag, attrs]) => h(tag, attrs))),
})

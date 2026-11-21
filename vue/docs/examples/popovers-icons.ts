import { defineComponent, h, type PropType } from 'vue'

/** Inline Lucide glyphs for the popover and tooltip demos (generated from lucide-react, ISC). */
const ICONS: Record<string, string> = {
 "ArrowDown": "<path d=\"M12 5v14\"></path><path d=\"m19 12-7 7-7-7\"></path>",
 "ArrowLeft": "<path d=\"m12 19-7-7 7-7\"></path><path d=\"M19 12H5\"></path>",
 "ArrowRight": "<path d=\"M5 12h14\"></path><path d=\"m12 5 7 7-7 7\"></path>",
 "ArrowUp": "<path d=\"m5 12 7-7 7 7\"></path><path d=\"M12 19V5\"></path>",
 "Bold": "<path d=\"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8\"></path>",
 "ChevronDown": "<path d=\"m6 9 6 6 6-6\"></path>",
 "Copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"></rect><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"></path>",
 "Italic": "<line x1=\"19\" x2=\"10\" y1=\"4\" y2=\"4\"></line><line x1=\"14\" x2=\"5\" y1=\"20\" y2=\"20\"></line><line x1=\"15\" x2=\"9\" y1=\"4\" y2=\"20\"></line>",
 "Link2": "<path d=\"M9 17H7A5 5 0 0 1 7 7h2\"></path><path d=\"M15 7h2a5 5 0 1 1 0 10h-2\"></path><line x1=\"8\" x2=\"16\" y1=\"12\" y2=\"12\"></line>",
 "Pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"></path><path d=\"m15 5 4 4\"></path>",
 "Share2": "<circle cx=\"18\" cy=\"5\" r=\"3\"></circle><circle cx=\"6\" cy=\"12\" r=\"3\"></circle><circle cx=\"18\" cy=\"19\" r=\"3\"></circle><line x1=\"8.59\" x2=\"15.42\" y1=\"13.51\" y2=\"17.49\"></line><line x1=\"15.41\" x2=\"8.59\" y1=\"6.51\" y2=\"10.49\"></line>",
 "Strikethrough": "<path d=\"M16 4H9a3 3 0 0 0-2.83 4\"></path><path d=\"M14 12a4 4 0 0 1 0 8H6\"></path><line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\"></line>",
 "Trash2": "<path d=\"M10 11v6\"></path><path d=\"M14 11v6\"></path><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"></path><path d=\"M3 6h18\"></path><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path>",
 "Underline": "<path d=\"M6 4v6a6 6 0 0 0 12 0V4\"></path><line x1=\"4\" x2=\"20\" y1=\"20\" y2=\"20\"></line>"
}

export const PopIcon = defineComponent({
  name: 'PopIcon',
  props: { name: { type: String as PropType<keyof typeof ICONS>, required: true }, size: { type: Number, default: 16 } },
  setup: props => () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg', width: props.size, height: props.size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', innerHTML: ICONS[props.name] ?? '',
  }),
})

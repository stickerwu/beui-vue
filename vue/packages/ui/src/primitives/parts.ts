import { defineComponent, h, type PropType } from 'vue'

function part(name: string, slot: string, tag = 'div') {
  return defineComponent({ name, setup(_, { slots }) { return () => h(tag, { class: `be-${slot}`, 'data-slot': slot }, slots.default?.()) } })
}

export const AlertContent = part('AlertContent', 'alert-content')
export const AlertTitle = part('AlertTitle', 'alert-title')
export const AlertDescription = part('AlertDescription', 'alert-description')
export const AlertAction = part('AlertAction', 'alert-action')
export const CardHeader = part('CardHeader', 'card-header')
export const CardDescription = part('CardDescription', 'card-description', 'p')
export const CardAction = part('CardAction', 'card-action')
export const CardContent = part('CardContent', 'card-content')
export const CardFooter = part('CardFooter', 'card-footer')
export const CardTitle = defineComponent({
  name: 'CardTitle', props: { as: { type: String as PropType<'div' | 'h2' | 'h3' | 'h4'>, default: 'div' } },
  setup(props, { slots }) { return () => h(props.as, { class: 'be-card-title', 'data-slot': 'card-title' }, slots.default?.()) },
})
export const CARD_TARGET_CLASS = 'be-card-target'

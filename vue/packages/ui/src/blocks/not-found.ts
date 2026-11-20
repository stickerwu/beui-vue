import { defineComponent, h } from 'vue'
import NotFound, { type NotFoundProps, type NotFoundVariant } from './NotFound.vue'

function variant(name: string, variant: NotFoundVariant) {
  return defineComponent((props: NotFoundProps) => () => h(NotFound, { ...props, variant }), {
    name, props:['code','title','description','homeHref','homeLabel','browseHref','browseLabel','labels'],
  })
}
export const NotFoundGlitch = variant('NotFoundGlitch','glitch')
export const NotFoundMagnetic = variant('NotFoundMagnetic','magnetic')
export const NotFoundSpotlight = variant('NotFoundSpotlight','spotlight')
export const NotFoundStacked = variant('NotFoundStacked','stacked')
export const NotFoundTerminal = variant('NotFoundTerminal','terminal')

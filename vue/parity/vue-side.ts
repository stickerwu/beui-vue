import { createApp, h, onMounted, shallowRef } from 'vue'
import { ButtonBase, Tabs, BeforeAfterSlider, AnimatedToastStack, LineChart, ShaderBackground } from 'beui-vue'
import 'beui-vue/style.css'
import { categories, series, tabs, toasts } from './data'

function createScenes() {
  const changed = shallowRef(false)
  const trigger = (label:string) => h('button', {class:'scene-action', onClick:() => { changed.value = true }}, label)
  return {
  'button-base': () => h(ButtonBase, {}, () => 'Continue'),
  tabs: () => h(Tabs, { defaultValue:'Overview', items:tabs.map(value => ({value, label:value})) }),
  'before-after-slider': () => h('div', {class:'sample'}, [h(BeforeAfterSlider, {hint:false}, {before:() => h('div', {class:'parity-before'}), after:() => h('div', {class:'parity-after'})})]),
  'animated-toast-stack': () => h('div', {class:'sample'}, [trigger('Notify'), h(AnimatedToastStack, {toasts:changed.value ? [...toasts,{id:'two', title:'Export ready', status:'success',duration:0}] : toasts, placement:'static'})]),
  'line-chart': () => h('div', {class:'sample'}, [h(LineChart, {categories, series})]),
  'shader-background': () => h('div', [trigger('Advance shader'), h(ShaderBackground, {variant:'mesh-gradient', speed:0, frame:changed.value ? 800 : 0, width:480, height:280})]),
  }
}
export function mount(slug:keyof ReturnType<typeof createScenes>) {
  createApp({setup() {
    const scenes = createScenes()
    onMounted(() => { document.body.dataset.ready = 'true' })
    return scenes[slug]
  }}).mount('#stage')
}

import { createApp, h, onMounted } from 'vue'
import { ButtonBase, Tabs, BeforeAfterSlider, AnimatedToastStack, LineChart, ShaderBackground } from 'beui-vue'
import 'beui-vue/style.css'
import { categories, series, tabs, toasts } from './data'

const scenes = {
  'button-base': () => h(ButtonBase, {}, () => 'Continue'),
  tabs: () => h(Tabs, { defaultValue:'Overview', items:tabs.map(value => ({value, label:value})) }),
  'before-after-slider': () => h('div', {class:'sample'}, [h(BeforeAfterSlider, {hint:false}, {before:() => h('div', {class:'parity-before'}), after:() => h('div', {class:'parity-after'})})]),
  'animated-toast-stack': () => h('div', {class:'sample'}, [h(AnimatedToastStack, {toasts, placement:'static'})]),
  'line-chart': () => h('div', {class:'sample'}, [h(LineChart, {categories, series})]),
  'shader-background': () => h(ShaderBackground, {variant:'mesh-gradient', speed:0, frame:0, width:480, height:280}),
}
export function mount(slug:keyof typeof scenes) {
  createApp({setup() {
    onMounted(() => { document.body.dataset.ready = 'true' })
    return scenes[slug]
  }}).mount('#stage')
}

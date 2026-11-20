import {defineComponent,h,inject,type InjectionKey,type Ref} from 'vue'
export const viewKey:InjectionKey<Readonly<Ref<string|null>>>=Symbol('DynamicIsland')
export const DynamicIslandView=defineComponent({name:'DynamicIslandView',props:{id:{type:String,required:true}},setup(props,{slots}){const active=inject(viewKey);return()=>active?.value===props.id?h('div',{'data-island-view':props.id},slots.default?.()):null}})

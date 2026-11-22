import { type InjectionKey, type Ref } from 'vue'

/** The active view id, provided by `DynamicIsland` to its `DynamicIslandView` children. */
export const viewKey: InjectionKey<Readonly<Ref<string | null>>> = Symbol('DynamicIsland')

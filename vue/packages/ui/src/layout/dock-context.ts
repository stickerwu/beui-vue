import type { ComputedRef, InjectionKey } from 'vue'

export interface DockContext { size: number; pillLayoutId: string }
export const dockKey: InjectionKey<ComputedRef<DockContext>> = Symbol('beui-dock')

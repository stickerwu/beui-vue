import { inject, type ComputedRef, type InjectionKey } from 'vue'

/** English defaults. Override per instance with `labels`. */
export const breadcrumbMessages = {
  label: 'Breadcrumb',
  showHidden: 'Show hidden paths',
}
export type BreadcrumbMessages = typeof breadcrumbMessages

export interface BreadcrumbContext {
  t: ComputedRef<BreadcrumbMessages>
}

export const breadcrumbKey: InjectionKey<BreadcrumbContext> = Symbol('beui-breadcrumb')
/** Provided by `BreadcrumbEllipsis` to the hidden items it renders in its panel. */
export const breadcrumbOverflowKey: InjectionKey<true> = Symbol('beui-breadcrumb-overflow')

export function useBreadcrumbMessages(): ComputedRef<BreadcrumbMessages> | undefined {
  return inject(breadcrumbKey, null)?.t
}


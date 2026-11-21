import type { InjectionKey } from 'vue'

/** The example a DemoFrame pins its demo to, when the page shows each example separately. */
export const previewVariantKey: InjectionKey<string | undefined> = Symbol('beui-preview-variant')

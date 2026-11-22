import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import dictionary from './zh.json'

export type Locale = 'zh' | 'en'

/** Files served from `public/` at the site root, never under a locale. */
const assetRoots = ['/brand/', '/fonts/']
const isPage = (path: string) => !assetRoots.some(root => path.startsWith(root)) && !/\.[a-z0-9]+$/i.test(path)

/**
 * The site ships two VitePress locales: Chinese at `/` (the root locale) and
 * English at `/en`. Each locale gets its own prerendered Markdown, so page
 * prose is already in the right language; this module covers the copy the theme
 * components own, plus locale-aware internal links.
 */
export function useLocale() {
  const { localeIndex } = useData()
  const isZh = computed(() => localeIndex.value !== 'en')

  /** Translate a theme string written in English into the current locale. */
  function t(text: string): string {
    return isZh.value ? (dictionary as Record<string, string>)[text] ?? text : text
  }

  /** Internal path for the current locale, with the site base applied. */
  function href(path: string): string {
    if (/^https?:|^mailto:|^#/.test(path)) return path
    if (!isPage(path)) return withBase(path)
    const localized = isZh.value || path.startsWith('/en/') ? path : path === '/' ? '/en/' : `/en${path}`
    return withBase(localized)
  }

  return { isZh, t, href }
}

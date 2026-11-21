import data from '../catalog-data.json'
import pagesZh from './i18n/pages.zh.json'
import sectionsZh from './i18n/sections.zh.json'

export interface CatalogEntry {
  slug: string
  title: string
  description: string
  category: string
  path: string
  pagePath: string
}

export interface CatalogPage {
  slug: string
  title: string
  description: string
  category: string
  path: string
  isNew: boolean
  launchedAt: string | null
  relatedSlugs: string[]
  entries: CatalogEntry[]
}

export interface CatalogSection {
  slug: string
  name: string
  path: string
  heading: string
  description: string
  entries: CatalogPage[]
}

export type Locale = 'zh' | 'en'

type PageCopy = Record<string, { title?: string; description?: string }>
type SectionCopy = Record<string, { name?: string; heading?: string; description?: string }>

const pageCopy = pagesZh as PageCopy
const sectionCopy = sectionsZh as SectionCopy

/**
 * The catalog itself is written in English — it is the upstream beUI copy with
 * React replaced by Vue. Chinese descriptions and section names are a
 * translation layer, so the English locale renders the data untouched.
 */
export const pages: CatalogPage[] = data.pages
export const sections: CatalogSection[] = data.sections
export const entries = pages.flatMap(page => page.entries)

export function localizePage(page: CatalogPage, locale: Locale): CatalogPage {
  if (locale === 'en') return page
  const copy = pageCopy[page.slug]
  if (!copy) return page
  return { ...page, title: copy.title ?? page.title, description: copy.description ?? page.description }
}

export function localizeSection(section: CatalogSection, locale: Locale): CatalogSection {
  if (locale === 'en') return section
  const copy = sectionCopy[section.slug]
  if (!copy) return section
  return {
    ...section,
    name: copy.name ?? section.name,
    heading: copy.heading ?? section.heading,
    description: copy.description ?? section.description,
    entries: section.entries.map(page => localizePage(page, locale)),
  }
}

export function findPage(path: string) {
  const clean = stripLocale(decodeURI(path)).replace(/\.html$/, '').replace(/\/$/, '') || '/'
  return pages.find(page => page.path === clean || page.entries.some(entry => entry.path === clean))
}

/** Strip the `/en` locale segment so a route can be matched against the catalog. */
export function stripLocale(path: string) {
  return path === '/en' || path === '/en/' ? '/' : path.replace(/^\/en(?=\/)/, '') || '/'
}

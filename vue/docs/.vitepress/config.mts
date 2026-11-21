import { defineConfig, type HeadConfig } from 'vitepress'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { siteURL as site, componentRoutes } from '../../scripts/routes.mjs'

const base = '/'
const repository = 'https://github.com/stickerwu/beui-vue'

const shared = {
  base,
  cleanUrls: true,
  appearance: 'dark' as const,
  sitemap: { hostname: site },
  head: [
    ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: `${base}brand/favicon.png` }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: `${base}brand/apple-touch-icon.png` }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ] as HeadConfig[],
  // BEUI_SRC=1 serves the components from source so edits hot-reload during parity work.
  vite: process.env.BEUI_SRC ? {
    resolve: {
      alias: [
        { find: /^beui-vue\/style\.css$/, replacement: fileURLToPath(new URL('../../packages/ui/src/theme.css', import.meta.url)) },
        { find: /^beui-vue$/, replacement: fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)) },
      ],
    },
  } : {},
}

const zhThemeConfig = {
  logo: { src: '/brand/favicon.png', alt: '' },
  nav: [
    { text: '安装', link: '/install' },
    { text: '组件目录', link: '/catalog' },
    { text: '效果验收', link: '/verification' },
  ],
  socialLinks: [{ icon: 'github', link: repository }],
  outlineTitle: '本页内容',
  docFooter: { prev: '上一页', next: '下一页' },
  footer: { message: '基于 beUI 的独立 Vue 移植，依 MIT 许可证分发。' },
  langMenuLabel: '切换语言',
  returnToTopLabel: '回到顶部',
  sidebarMenuLabel: '菜单',
  darkModeSwitchLabel: '外观',
  lightModeSwitchTitle: '切换到浅色模式',
  darkModeSwitchTitle: '切换到深色模式',
  skipToContentLabel: '跳到正文',
}

const enThemeConfig = {
  logo: { src: '/brand/favicon.png', alt: '' },
  nav: [
    { text: 'Installation', link: '/en/install' },
    { text: 'Components', link: '/en/catalog' },
    { text: 'Verification', link: '/en/verification' },
  ],
  socialLinks: [{ icon: 'github', link: repository }],
  outlineTitle: 'On this page',
  docFooter: { prev: 'Previous', next: 'Next' },
  footer: { message: 'An independent Vue port of beUI, distributed under the MIT license.' },
  langMenuLabel: 'Change language',
  returnToTopLabel: 'Return to top',
  sidebarMenuLabel: 'Menu',
  darkModeSwitchLabel: 'Appearance',
  lightModeSwitchTitle: 'Switch to light theme',
  darkModeSwitchTitle: 'Switch to dark theme',
  skipToContentLabel: 'Skip to content',
}

async function localizeHead(page: { relativePath: string; title: string; description: string; isNotFound?: boolean; frontmatter: Record<string, unknown> }, description: (lang: 'zh' | 'en') => string) {
  if (page.isNotFound || page.relativePath === '404.md' || page.relativePath === 'en/404.md') return
  const path = page.relativePath
    .replace(/^en\//, '')
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '')
  const lang = page.relativePath.startsWith('en/') ? 'en' : 'zh'
  const zhUrl = new URL(path, site).href
  const enUrl = new URL(path === '' ? 'en/' : `en/${path}`, site).href
  const url = lang === 'en' ? enUrl : zhUrl
  const home = path === ''
  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: url }],
    ['link', { rel: 'alternate', hreflang: 'zh-CN', href: zhUrl }],
    ['link', { rel: 'alternate', hreflang: 'en', href: enUrl }],
    ['link', { rel: 'alternate', hreflang: 'x-default', href: zhUrl }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:type', content: home ? 'website' : 'article' }],
    ['meta', { property: 'og:locale', content: lang === 'en' ? 'en_US' : 'zh_CN' }],
    ['meta', { property: 'og:title', content: home ? page.title : `${page.title} | beui-vue` }],
    ['meta', { property: 'og:description', content: page.description || description(lang) }],
  ]
  if (home) {
    head.push(['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: 'beui-vue',
      description: page.description,
      url: site,
      image: `${site}brand/beui-vue.png`,
      codeRepository: repository,
      programmingLanguage: 'TypeScript',
      runtimePlatform: 'Vue 3.5',
      license: `${repository}/blob/main/LICENSE`,
      isBasedOn: 'https://github.com/starc007/ui-components',
      maintainer: { '@type': 'Person', name: 'stickerwu', url: 'https://github.com/stickerwu' },
    })])
  }
  page.frontmatter.head = [...(page.frontmatter.head as HeadConfig[] || []), ...head]
}

export default defineConfig({
  ...shared,
  title: 'beui-vue',
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'beui-vue',
      titleTemplate: ':title · beui-vue',
      description: 'beUI 动效组件与界面区块的 Vue 3 实现，提供 TypeScript 类型、在线示例和中文文档，支持 Vite 与 Nuxt SSR。',
      themeConfig: zhThemeConfig,
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      title: 'beui-vue',
      titleTemplate: ':title · beui-vue',
      description: 'beUI animated components and interface blocks rebuilt for Vue 3, with TypeScript types, live examples, Vite and Nuxt SSR support.',
      themeConfig: enThemeConfig,
    },
  },
  async buildEnd({ outDir }) {
    const { entries } = JSON.parse(await readFile(new URL('../../catalog.json', import.meta.url), 'utf8'))
    const { paths } = componentRoutes(entries)
    await mkdir(join(outDir, 'components'), { recursive: true })
    for (const [slug, path] of paths) {
      const target = `${base}${path.slice(1)}`
      await writeFile(join(outDir, 'components', `${slug}.html`), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${new URL(path.slice(1), site)}"><title>beui-vue</title><a href="${target}">查看组件</a></html>`)
    }
    // Like beui.dev, /components lands on the Components (motion) section.
    for (const prefix of ['', 'en/']) {
      const target = `${base}${prefix}components/motion`
      await mkdir(join(outDir, prefix), { recursive: true })
      await writeFile(join(outDir, `${prefix}components.html`), `<!doctype html><html lang="${prefix ? 'en' : 'zh-CN'}"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${new URL(`${prefix}components/motion`, site)}"><title>beui-vue</title><a href="${target}">${prefix ? 'Components' : '组件'}</a></html>`)
    }
    const zh = [
      '# beui-vue', '',
      '> beUI 动效组件与界面区块的 Vue 3 实现，由 stickerwu 独立维护。', '',
      `- [安装与使用](${site}install)`,
      `- [组件目录](${site}catalog)`,
      `- [效果验收](${site}verification)`,
      `- [English documentation](${site}en/)`,
      `- [Vue 源码](${repository})`,
      '- [上游 beUI](https://github.com/starc007/ui-components)', '',
      '## 组件与区块', '',
      ...entries.map(entry => `- [${entry.title}](${site}${paths.get(entry.slug).slice(1)})`),
    ]
    const en = [
      '# beui-vue', '',
      '> beUI animated components and interface blocks, rebuilt for Vue 3 and maintained independently by stickerwu.', '',
      `- [Installation](${site}en/install)`,
      `- [Component catalog](${site}en/catalog)`,
      `- [Verification](${site}en/verification)`,
      `- [中文文档](${site})`,
      `- [Vue source](${repository})`,
      '- [Upstream beUI](https://github.com/starc007/ui-components)', '',
      '## Components and blocks', '',
      ...entries.map(entry => `- [${entry.title}](${site}en/${paths.get(entry.slug).slice(1)})`),
    ]
    await writeFile(join(outDir, 'llms.txt'), zh.join('\n') + '\n')
    await mkdir(join(outDir, 'en'), { recursive: true })
    await writeFile(join(outDir, 'en', 'llms.txt'), en.join('\n') + '\n')
  },
  transformPageData(page) {
    return localizeHead(page as never, lang => lang === 'en'
      ? 'beUI animated components and interface blocks rebuilt for Vue 3, with TypeScript types, live examples, Vite and Nuxt SSR support.'
      : 'beUI 动效组件与界面区块的 Vue 3 实现，提供 TypeScript 类型、在线示例和中文文档，支持 Vite 与 Nuxt SSR。')
  },
})

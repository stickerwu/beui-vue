export const siteURL = 'https://beui.stickerwu.net/'

export function componentRoutes(entries) {
  const groups = Map.groupBy(entries, entry => new URL(entry.page).pathname)
  const paths = new Map()
  for (const [path, group] of groups) {
    for (const entry of group) {
      paths.set(entry.slug, group.length === 1 ? path : `${path}/${entry.slug}`)
    }
  }
  return {groups, paths}
}

export type SidebarResource = { id: string, label: string, kind: 'folder' | 'project' | 'file' | 'bookmark', children?: SidebarResource[], disabled?: boolean }
export type ResourceMove = { itemId: string, targetId: string | null, position: 'before' | 'inside' | 'after' }
export type ResourceRow = { item: SidebarResource, depth: number, parentId: string | null, siblings: SidebarResource[] }
export const containsItems = (item: SidebarResource) => item.kind === 'folder' || item.kind === 'project'

export function flatten(items: SidebarResource[], expanded?: Set<string>, depth = 0, parentId: string | null = null): ResourceRow[] {
  return items.flatMap(item => {
    const row = { item, depth, parentId, siblings: items }
    if (!item.children || (expanded && !expanded.has(item.id))) return [row]
    return [row, ...flatten(item.children, expanded, depth + 1, item.id)]
  })
}

export function renameItem(items: SidebarResource[], id: string, label: string): SidebarResource[] {
  return items.map(item => {
    if (item.id === id) return { ...item, label }
    return item.children?.length ? { ...item, children: renameItem(item.children, id, label) } : item
  })
}

export function moveItem(items: SidebarResource[], move: ResourceMove): SidebarResource[] | undefined {
  const all = flatten(items)
  const origin = all.find(row => row.item.id === move.itemId)?.item
  const target = all.find(row => row.item.id === move.targetId)?.item
  if (!origin || origin.disabled || target?.disabled || origin.id === move.targetId) return
  if (move.targetId && (!target || flatten(origin.children ?? []).some(row => row.item.id === move.targetId))) return
  if (move.position === 'inside' && target && !containsItems(target)) return
  function rearrange(nodes: SidebarResource[]): SidebarResource[] {
    return nodes.flatMap(item => {
      if (item.id === origin!.id) return []
      const next = item.children ? { ...item, children: rearrange(item.children) } : item
      if (item.id !== move.targetId) return [next]
      if (move.position === 'inside') return [{ ...next, children: [...(next.children ?? []), origin!] }]
      return move.position === 'before' ? [origin!, next] : [next, origin!]
    })
  }
  const next = rearrange(items)
  return move.targetId === null ? [...next, origin] : next
}

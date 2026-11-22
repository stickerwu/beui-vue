import { Comment, Fragment, isVNode, type VNode } from 'vue'

/** The element vnodes of a slot result, with fragments (`v-for`, `v-if`) unwrapped and comments dropped. */
export function flattenSlot(nodes: unknown, out: VNode[] = []): VNode[] {
  if (!Array.isArray(nodes)) return out
  for (const node of nodes) {
    if (Array.isArray(node)) flattenSlot(node, out)
    else if (isVNode(node)) {
      if (node.type === Fragment) flattenSlot(node.children, out)
      else if (node.type !== Comment) out.push(node)
    }
  }
  return out
}

/**
 * Lane packing and windowing for `InfiniteMasonry`. This is the algorithm of
 * `@tanstack/virtual-core` (the library the React version uses) with `lanes > 1`
 * and the default `laneAssignmentMode: "estimate"`, so both ports pack the same
 * columns: an item keeps the lane it was first given, and a new item goes to the
 * lane that currently ends first, using measured heights where they are known.
 */
export type MasonryCell = { index: number; key: string | number | bigint; start: number; size: number; end: number; lane: number }

/** `laneCache` maps an item index to its lane; it is mutated, and outlives a single call. */
export function packLanes(
  count: number,
  lanes: number,
  gap: number,
  keyAt: (index: number) => string | number | bigint,
  sizeAt: (index: number, key: string | number | bigint) => number,
  laneCache: Map<number, number>,
): MasonryCell[] {
  // Entries past the end belong to rows that are gone (a finished load's skeletons).
  if (laneCache.size > count) for (const index of [...laneCache.keys()]) if (index >= count) laneCache.delete(index)
  const cells: MasonryCell[] = []
  const laneEnds = new Float64Array(lanes)
  const laneLast: Array<number | undefined> = new Array(lanes).fill(undefined)
  let filled = 0
  for (let i = 0; i < count; i++) {
    const key = keyAt(i)
    const cached = laneCache.get(i)
    let lane: number
    let start: number
    if (cached !== undefined && lanes > 1) {
      lane = cached
      const previous = laneLast[lane]
      start = previous !== undefined ? cells[previous]!.end + gap : 0
    } else if (filled === lanes) {
      // Every lane is seeded: the one that ends first wins, ties go to the lane whose last item is older.
      let best = 0
      let bestEnd = laneEnds[0]!
      let bestLast = laneLast[0]!
      for (let l = 1; l < lanes; l++) {
        const end = laneEnds[l]!
        if (end < bestEnd || (end === bestEnd && laneLast[l]! < bestLast)) { best = l; bestEnd = end; bestLast = laneLast[l]! }
      }
      lane = best
      start = bestEnd + gap
      laneCache.set(i, lane)
    } else {
      lane = i % lanes
      start = 0
      laneCache.set(i, lane)
    }
    const size = sizeAt(i, key)
    const end = start + size
    cells.push({ index: i, key, start, size, end, lane })
    if (laneLast[lane] === undefined) filled++
    laneLast[lane] = i
    laneEnds[lane] = end
  }
  return cells
}

export function totalSize(cells: MasonryCell[], lanes: number): number {
  if (!cells.length) return 0
  const ends: Array<number | null> = new Array(lanes).fill(null)
  for (let i = cells.length - 1; i >= 0 && ends.some(end => end === null); i--) {
    const cell = cells[i]!
    if (ends[cell.lane] === null) ends[cell.lane] = cell.end
  }
  return Math.max(0, Math.max(...ends.filter((end): end is number => end !== null)))
}

function nearestByStart(cells: MasonryCell[], high: number, value: number) {
  let low = 0
  while (low <= high) {
    const middle = ((low + high) / 2) | 0
    const current = cells[middle]!.start
    if (current < value) low = middle + 1
    else if (current > value) high = middle - 1
    else return middle
  }
  return low > 0 ? low - 1 : 0
}

/** Indexes to render: the visible range across all lanes, widened by `overscan` items. */
export function visibleIndexes(cells: MasonryCell[], lanes: number, outerSize: number, scrollOffset: number, overscan: number): number[] {
  if (!cells.length || outerSize === 0) return []
  const lastIndex = cells.length - 1
  let startIndex = 0
  let endIndex = lastIndex
  if (cells.length > lanes) {
    startIndex = nearestByStart(cells, lastIndex, scrollOffset)
    endIndex = startIndex
    const limit = scrollOffset + outerSize
    // Walk forward until every lane reaches past the viewport, then back until every lane reaches above it.
    const endPerLane: number[] = new Array(lanes).fill(0)
    while (endIndex < lastIndex && endPerLane.some(position => position < limit)) {
      const cell = cells[endIndex]!
      endPerLane[cell.lane] = cell.end
      endIndex++
    }
    const startPerLane: number[] = new Array(lanes).fill(limit)
    while (startIndex >= 0 && startPerLane.some(position => position >= scrollOffset)) {
      const cell = cells[startIndex]!
      startPerLane[cell.lane] = cell.start
      startIndex--
    }
    startIndex = Math.max(0, startIndex - (startIndex % lanes))
    endIndex = Math.min(lastIndex, endIndex + (lanes - 1 - (endIndex % lanes)))
  }
  const from = Math.max(startIndex - overscan, 0)
  const to = Math.min(endIndex + overscan, cells.length - 1)
  const out: number[] = []
  for (let i = from; i <= to; i++) out.push(i)
  return out
}

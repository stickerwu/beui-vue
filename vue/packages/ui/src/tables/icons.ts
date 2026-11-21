/** Lucide glyphs the table draws, as path data (and circles) in a 24x24 box. */
export type TableIconName = 'grip' | 'chevron' | 'more-horizontal' | 'more-vertical' | 'column-before' | 'column-after' | 'row-before' | 'row-after' | 'trash'
type Shape = { d: string } | { c: [number, number, number] }

export const tableIcons: Record<TableIconName, Shape[]> = {
  grip: [[9, 12], [9, 5], [9, 19], [15, 12], [15, 5], [15, 19]].map(([x, y]) => ({ c: [x, y, 1] as [number, number, number] })),
  chevron: [{ d: 'm18 15-6-6-6 6' }],
  'more-horizontal': [{ c: [12, 12, 1] }, { c: [19, 12, 1] }, { c: [5, 12, 1] }],
  'more-vertical': [{ c: [12, 12, 1] }, { c: [12, 5, 1] }, { c: [12, 19, 1] }],
  'column-before': [{ d: 'M3 19V5' }, { d: 'm13 6-6 6 6 6' }, { d: 'M7 12h14' }],
  'column-after': [{ d: 'M17 12H3' }, { d: 'm11 18 6-6-6-6' }, { d: 'M21 5v14' }],
  'row-before': [{ d: 'M5 3h14' }, { d: 'm18 13-6-6-6 6' }, { d: 'M12 7v14' }],
  'row-after': [{ d: 'M12 17V3' }, { d: 'm6 11 6 6 6-6' }, { d: 'M19 21H5' }],
  trash: [{ d: 'M3 6h18' }, { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }, { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }, { d: 'M10 11v6' }, { d: 'M14 11v6' }],
}

/** English defaults. Override per instance with `labels`. */
export const minesMessages = {
  label: 'Mines',
  mineCount: 'Mine count',
  mineOne: '{count} mine',
  mineMany: '{count} mines',
  multiplier: 'Multiplier',
  multiplierLost: 'Multiplier lost',
  oddsNext: '{percent}% safe · next {multiplier}',
  oddsFirst: 'First pick {percent}% safe',
  tiles: 'Tiles',
  tile: 'Row {row}, column {column}, {state}',
  tileHidden: 'hidden',
  tileGemNotPicked: 'gem, not picked',
  tileMineNotPicked: 'mine, not picked',
  tileGemPicked: 'gem, pick {pick}',
  tileMineHit: 'mine, hit',
  start: 'Start',
  cashOut: 'Cash out {multiplier}',
  playAgain: 'Play again',
  sound: 'Sound',
  roundStarted: 'Round started with {mines}.',
  gemFound: 'Gem. {multiplier}.',
  mineFound: 'Mine. The round is over.',
  cashedOutAt: 'Cashed out at {multiplier}.',
  hideResult: 'Hide result and show the board',
  roundResult: 'Round result',
  cashedOut: 'Cashed out',
  mineHit: 'Mine hit',
  gems: 'Gems',
  gemsOf: '{gems} of {total}',
  mines: 'Mines',
  oddsBeaten: 'Odds beaten',
  oddsBeatenValue: '1 in {odds}',
  lostOnPick: 'Lost on pick',
}
export type MinesMessages = typeof minesMessages
export type MinesTranslate = (key: keyof MinesMessages, values?: Record<string, string | number>) => string

/** Fills `{name}` placeholders. */
export function fillMessage(template: string, values?: Record<string, string | number>) {
  return values ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)) : template
}

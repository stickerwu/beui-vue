/**
 * Shared fixture model for the knockout wheel and bracket, plus the helpers
 * both fixture styles draw with. One dataset feeds either component.
 */

export interface TournamentTeam {
  name: string
  /**
   * Any square image URL — club crest, org mark, player photo. Wins over `code`.
   * Drawn as-is on the surface it sits on, so a transparent-background mark
   * inked for one theme disappears in the other: ship artwork that reads on
   * both, or pick the URL yourself from your theme state.
   */
  logo?: string
  /** ISO 3166-1 alpha-2 code, loaded from flagcdn.com (England is gb-eng). Used when `logo` is absent. */
  code?: string
}

export interface TournamentSide {
  /** null renders a TBD slot with a shield icon. */
  team: TournamentTeam | null
  score: number | null
  /** Present on both sides to render Google-style shootout scores — 1 (3). */
  penalties?: number | null
}

export interface TournamentMatch {
  id: string
  /** Kick-off day, already formatted. Omit it and the bracket card drops the row. */
  date?: string
  time?: string
  /** Omit it and a match with a `winner` counts as finished. */
  status?: 'finished' | 'upcoming'
  home: TournamentSide
  away: TournamentSide
  /** Decides the marker and which side dims. */
  winner?: 'home' | 'away'
  /** Replaces the derived result chip ("FT", "FT (P)") — e.g. "AET", "BO5", "Forfeit". */
  badge?: string
}

export interface TournamentRound {
  /** Read out with the match in tooltips and the screen-reader list. */
  name: string
  matches: TournamentMatch[]
}

/** English defaults for the wheel. Override per instance with `labels`. */
export const knockoutWheelMessages = {
  label: 'Tournament wheel',
  labelWithChampion: 'Tournament wheel, won by {team}',
  tbd: 'TBD',
  versus: '{home} v {away}',
  result: '{teams} · {home}–{away}',
  resultPenalties: '{teams} · {home}–{away} ({homePenalties}–{awayPenalties} pens)',
  caption: '{round} · {match}',
}

export type KnockoutWheelMessages = typeof knockoutWheelMessages

/** English defaults for the bracket. Override per instance with `labels`. */
export const knockoutBracketMessages = {
  label: 'Tournament bracket',
  previousRound: 'Previous round',
  nextRound: 'Next round',
  showing: 'Showing {rounds}',
  thirdPlace: 'Third place play-off',
  tbd: 'TBD',
  fullTime: 'FT',
  fullTimePenalties: 'FT (P)',
  sideScore: '{team} {score}',
  sideScorePenalties: '{team} {score} ({penalties} on penalties)',
  matchResult: '{round}: {home}, {away}',
  matchVersus: '{round}: {home} versus {away}',
  winner: '{team} won',
}

export type KnockoutBracketMessages = typeof knockoutBracketMessages

export type TournamentTranslate<Messages> = (
  key: keyof Messages,
  values?: Record<string, string | number>,
) => string

/** The English defaults with every string the caller overrode. */
export function mergeTournamentMessages<Messages extends Record<string, string>>(
  defaults: Messages,
  labels?: Partial<Messages>,
): Messages {
  const merged = { ...defaults }
  if (!labels) return merged
  for (const key of Object.keys(labels) as (keyof Messages)[]) {
    const value = labels[key]
    if (typeof value === 'string') merged[key] = value as Messages[keyof Messages]
  }
  return merged
}

/** Fill a message's `{name}` placeholders; a missing value leaves the token. */
export function tournamentTranslate<Messages extends Record<string, string>>(
  messages: Messages,
): TournamentTranslate<Messages> {
  return (key, values) => {
    const template = messages[key] ?? String(key)
    if (!values) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in values ? String(values[name]) : match,
    )
  }
}

// Card geometry drives the bracket layout: every later match sits at the exact
// vertical midpoint of its two feeders, so pairs line up with connectors.
// Keep these in sync with the card's internal spacing.
export const MATCH_CARD_WIDTH = 250
export const MATCH_CARD_HEIGHT = 124

/** `status` is optional, so a decided match reads as finished without it. */
export const isTournamentFinished = (match: TournamentMatch) =>
  match.status ? match.status === 'finished' : match.winner != null

/** A `logo` is used as given; a country `code` loads a flag from flagcdn.com. */
export function crestSrc(team: TournamentTeam | null | undefined): string | null {
  if (!team) return null
  return team.logo ?? (team.code ? `https://flagcdn.com/w80/${team.code}.png` : null)
}

/**
 * Two-letter stand-in when a team has no artwork — "Real Madrid" → RM.
 * Spread, not `word[0]`: an emoji or astral first character is a surrogate pair
 * and indexing it renders a replacement glyph.
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(word => [...word][0] ?? '')
    .join('')
    .toUpperCase()
}

/**
 * Names and round labels are single ideas, so they wrap as a unit. Without this
 * "Round of 16" strands a lone "16" on the next line. A non-breaking space, not
 * a visible one — the rendered text is unchanged.
 */
export const keepTogether = (text: string) => text.replace(/ /g, ' ')

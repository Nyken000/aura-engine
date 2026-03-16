export type DiceRollRequired = {
  needed: boolean
  die: string
  stat: string
  skill: string | null
  dc: number
  flavor: string
}

export type DiceRollOutcome = {
  rawRoll: number
  modifier: number
  total: number
  dc: number
  success: boolean
  critical: 'critical_success' | 'critical_failure' | null
  die: string
  stat: string
  skill: string | null
  flavor: string
}

export type DiceRequestPayload = {
  sender_name?: string
  channel?: string
  dice_request?: DiceRollRequired
}

export type DiceResultPayload = {
  sender_name?: string
  channel?: string
  dice_result?: DiceRollOutcome
}

export type GmReactionPayload = {
  sender_name?: string
  channel?: string
  source?: 'dice_result'
  dice_result?: DiceRollOutcome
}

export const DICE_RESULT_MARKER = '[SISTEMA_DADO_RESULTADO]'

export function buildDiceResultFeedbackMessage(outcome: DiceRollOutcome): string {
  const skillLabel = outcome.skill || outcome.stat.toUpperCase()
  const outcomeLabel = outcome.success ? 'ÉXITO' : 'FALLO'
  const criticalLabel =
    outcome.critical === 'critical_success'
      ? ' — CRÍTICO'
      : outcome.critical === 'critical_failure'
        ? ' — PIFIA'
        : ''

  const modText = outcome.modifier >= 0 ? `+${outcome.modifier}` : `${outcome.modifier}`

  return `[TIRADA: ${skillLabel} ${outcome.die}${modText} = ${outcome.total} vs CD ${outcome.dc} — ${outcomeLabel}${criticalLabel}]`
}

export function serializeDiceResultMarker(outcome: DiceRollOutcome): string {
  return `${DICE_RESULT_MARKER}${JSON.stringify(outcome)}`
}

export function parseDiceResultMarker(content: string): DiceRollOutcome | null {
  if (!content.startsWith(DICE_RESULT_MARKER)) return null

  const rawPayload = content.slice(DICE_RESULT_MARKER.length).trim()
  if (!rawPayload) return null

  try {
    const parsed = JSON.parse(rawPayload) as Partial<DiceRollOutcome>

    if (
      typeof parsed.rawRoll !== 'number' ||
      typeof parsed.modifier !== 'number' ||
      typeof parsed.total !== 'number' ||
      typeof parsed.dc !== 'number' ||
      typeof parsed.success !== 'boolean' ||
      typeof parsed.die !== 'string' ||
      typeof parsed.stat !== 'string' ||
      typeof parsed.flavor !== 'string'
    ) {
      return null
    }

    return {
      rawRoll: parsed.rawRoll,
      modifier: parsed.modifier,
      total: parsed.total,
      dc: parsed.dc,
      success: parsed.success,
      critical:
        parsed.critical === 'critical_success' || parsed.critical === 'critical_failure'
          ? parsed.critical
          : null,
      die: parsed.die,
      stat: parsed.stat,
      skill: typeof parsed.skill === 'string' || parsed.skill === null ? parsed.skill : null,
      flavor: parsed.flavor,
    }
  } catch {
    return null
  }
}

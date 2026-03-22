export type CharacterStats = {
  class?: string
  race?: string
  [key: string]: unknown
}

export type SessionPlayerCharacterSource = {
  character_id?: string | null
  selected_character_name?: string | null
  selected_character_stats?: CharacterStats | null
  selected_character_hp_current?: number | null
  selected_character_hp_max?: number | null
  characters?: {
    id: string
    name: string
    stats?: CharacterStats | null
    hp_current?: number | null
    hp_max?: number | null
  } | null
}

export type ResolvedSessionCharacter = {
  id: string
  name: string
  stats: CharacterStats | null
  hp_current: number | null
  hp_max: number | null
}

export function resolveSessionPlayerCharacter(
  player: SessionPlayerCharacterSource,
): ResolvedSessionCharacter | null {
  if (player.character_id && player.selected_character_name) {
    return {
      id: player.character_id,
      name: player.selected_character_name,
      stats: player.selected_character_stats ?? null,
      hp_current: player.selected_character_hp_current ?? null,
      hp_max: player.selected_character_hp_max ?? null,
    }
  }

  if (!player.characters) {
    return null
  }

  return {
    id: player.characters.id,
    name: player.characters.name,
    stats: player.characters.stats ?? null,
    hp_current: player.characters.hp_current ?? null,
    hp_max: player.characters.hp_max ?? null,
  }
}

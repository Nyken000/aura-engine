export type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

export type JsonObject = { [key: string]: JsonValue }

export type InventoryItem = {
  name: string
  type?: string
  description?: string
}

export type CharacterStats = {
  race?: string
  class?: string
  str?: number
  dex?: number
  con?: number
  int?: number
  wis?: number
  cha?: number
  [key: string]: unknown
}

export type CombatParticipant = {
  name: string
  hp: number
  max_hp: number
  ac: number
  initiative?: number | null
  is_player?: boolean
  is_defeated?: boolean
}

export type CombatState = {
  in_combat: boolean
  round: number
  turn: number
  participants: CombatParticipant[]
}

export type SessionCombatStatus = 'idle' | 'initiative' | 'active' | 'ended'

export type SessionCombatCondition = {
  id: string
  name: string
  source?: string | null
  duration_rounds?: number | null
  applied_by_participant_id?: string | null
  applied_at_round?: number | null
  summary?: string | null
}


export type SessionCombatParticipant = {
  id: string
  user_id?: string | null
  character_id?: string | null
  name: string
  hp: number
  max_hp: number
  ac: number
  initiative?: number | null
  is_player?: boolean
  is_defeated?: boolean
  conditions?: SessionCombatCondition[]
}

export type SessionCombatStateRecord = {
  session_id: string
  status: SessionCombatStatus
  round: number
  turn_index: number
  participants: SessionCombatParticipant[]
}

export type SessionPlayerRow = {
  user_id: string
  joined_at?: string
  profiles?: {
    username?: string | null
  } | null
  characters?: {
    id: string
    name: string
    stats?: CharacterStats | null
    hp_current: number
    hp_max: number
    inventory?: InventoryItem[] | null
  } | null
}

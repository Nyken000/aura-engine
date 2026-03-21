import type { DiceRollRequired } from '@/types/dice'

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

export type InventoryItem = {
    name: string
    type?: string
    description?: string
}

export type CombatParticipant = {
    name: string
    hp: number
    max_hp: number
    ac: number
    initiative?: number
    is_player?: boolean
}

export type CombatState = {
    in_combat: boolean
    turn: number
    participants: CombatParticipant[]
}

export type NarrativeEvent = {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    created_at: string
    event_index?: number | null
    client_event_id?: string | null
    event_type?: string | null
    payload?: {
        sender_name?: string
        channel?: 'adventure' | 'group'
        combat?: {
            in_combat?: boolean
            initiative_requested?: boolean
        } | null
        [key: string]: unknown
    } | null
    characters?: { name: string } | null
    dice_roll_required?: DiceRollRequired | null
    combat?: {
        in_combat: boolean
        initiative_requested: boolean
    } | null
    character_id?: string | null
}

export type CharacterSheet = {
    id: string
    name: string
    hp_current: number
    hp_max: number
    stats?: CharacterStats | null
    inventory?: InventoryItem[] | null
    skills?: string[] | null
    combat_state?: CombatState | null
}

export type WorldData = {
    id: string
    name: string
    description: string
    genre?: string | null
}

export type CurrentUser = {
    id: string
}

export type SessionData = {
    id: string
    turn_player_id: string | null
}

export type SessionCombatParticipant = {
    id?: string
    user_id?: string | null
    character_id?: string | null
    name: string
    hp: number
    max_hp: number
    ac: number
    initiative?: number | null
    is_player?: boolean
    is_defeated?: boolean
    conditions?: Array<{
        id?: string
        name: string
        duration_rounds?: number | null
        applied_at_round?: number | null
        applied_by_participant_id?: string | null
        source?: string | null
        summary?: string | null
    }>
}

export type SessionCombatState = {
    session_id: string
    status: 'idle' | 'initiative' | 'active' | 'ended'
    round: number
    turn_index: number
    participants: SessionCombatParticipant[]
}

export type SessionPlayer = {
    user_id: string
    profiles?: {
        username?: string | null
    } | null
    characters?: {
        id: string
        name: string
        hp_current: number
        hp_max: number
        stats?: CharacterStats | null
        inventory?: InventoryItem[] | null
    } | null
}

export type RealtimeInsertPayload<T> = {
    new: T
}

export type RealtimeUpdatePayload<T> = {
    new: T
}
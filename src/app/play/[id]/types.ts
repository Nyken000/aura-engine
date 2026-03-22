import type { DiceRollRequired } from '@/types/dice'

export type GameChatTab = 'adventure' | 'group'

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

export type SemanticEntityKind = 'npc' | 'location' | 'objective' | 'item' | 'faction'

export type SemanticEntityAnnotation = {
  kind: SemanticEntityKind
  key: string
  label: string
  aliases?: string[]
}

export type SessionQuestStatus =
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'active'
  | 'completed'
  | 'failed'

export type SessionQuest = {
  id: string
  session_id: string
  world_id?: string | null
  source_event_id?: string | null
  slug: string
  title: string
  description: string
  status: SessionQuestStatus
  offered_by_npc_key?: string | null
  assigned_character_id?: string | null
  objective_summary?: string | null
  reward_summary?: string | null
  failure_consequence?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type SessionQuestUpdate = {
  id: string
  quest_id: string
  session_id: string
  source_event_id?: string | null
  update_type:
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'activated'
  | 'progressed'
  | 'completed'
  | 'failed'
  | 'note'
  title: string
  description: string
  payload?: Record<string, unknown> | null
  created_at: string
}

export type NpcRelationship = {
  id: string
  session_id: string
  world_id?: string | null
  character_id: string
  npc_key: string
  npc_name: string
  affinity: number
  trust: number
  favor_debt: number
  hostility: number
  last_change_reason?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type NpcRelationshipEvent = {
  id: string
  relationship_id: string
  session_id: string
  character_id: string
  source_event_id?: string | null
  event_type:
  | 'affinity_changed'
  | 'trust_changed'
  | 'favor_changed'
  | 'hostility_changed'
  | 'relationship_note'
  reason: string
  affinity_delta: number
  trust_delta: number
  favor_debt_delta: number
  hostility_delta: number
  payload?: Record<string, unknown> | null
  created_at: string
}

export type SessionCompanion = {
  id: string
  session_id: string
  world_id?: string | null
  source_event_id?: string | null
  npc_key: string
  npc_name: string
  status: 'joined' | 'available' | 'left'
  joined_by_character_id?: string | null
  last_change_reason?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type NarrativeEventQuestSemantic = {
  upserts?: Array<{
    slug: string
    title: string
    description: string
    status: SessionQuestStatus
    objectiveSummary?: string | null
    rewardSummary?: string | null
    failureConsequence?: string | null
    offeredByNpcKey?: string | null
  }>
  updates?: Array<{
    slug: string
    updateType:
    | 'offered'
    | 'accepted'
    | 'declined'
    | 'activated'
    | 'progressed'
    | 'completed'
    | 'failed'
    | 'note'
    title: string
    description: string
  }>
}

export type NarrativeEventRelationshipSemantic = {
  npcKey: string
  npcName: string
  affinityDelta?: number
  trustDelta?: number
  favorDebtDelta?: number
  hostilityDelta?: number
  reason: string
}

export type NarrativeEventCompanionSemantic = {
  npcKey: string
  npcName: string
  action: 'joined' | 'left' | 'available'
  reason?: string | null
  metadata?: Record<string, unknown> | null
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
    channel?: GameChatTab
    combat?: {
      in_combat?: boolean
      initiative_requested?: boolean
    } | null
    semantic?: {
      entities?: SemanticEntityAnnotation[]
      quests?: NarrativeEventQuestSemantic | null
      relationships?: NarrativeEventRelationshipSemantic[] | null
      companions?: NarrativeEventCompanionSemantic[] | null
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
    character_id?: string | null
    selected_character_name?: string | null
    selected_character_stats?: CharacterStats | null
    selected_character_hp_current?: number | null
    selected_character_hp_max?: number | null
    profiles?: {
        username?: string | null
    } | {
        username?: string | null
    }[] | null
    characters?: {
        id: string
        name: string
        hp_current: number
        hp_max: number
        stats?: CharacterStats | null
        inventory?: InventoryItem[] | null
    } | {
        id: string
        name: string
        hp_current: number
        hp_max: number
        stats?: CharacterStats | null
        inventory?: InventoryItem[] | null
    }[] | null
}

export type SidebarCompanion = {
  npcKey: string
  npcName: string
  status: 'joined' | 'available'
  reason?: string | null
}

export type SidebarSelection =
  | { type: 'quest'; questSlug: string }
  | { type: 'relationship'; npcKey: string }
  | { type: 'entity'; entity: SemanticEntityAnnotation }
  | null

export type RealtimeInsertPayload<T> = {
  new: T
}

export type RealtimeUpdatePayload<T> = {
  new: T
}
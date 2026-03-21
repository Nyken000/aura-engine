import type {
  CharacterStats,
  CombatParticipant,
  CombatState,
  SessionCombatCondition,
  SessionCombatParticipant,
  SessionCombatStateRecord,
  SessionPlayerRow,
} from './session-combat'

export type {
  CharacterStats,
  CombatParticipant,
  CombatState,
  SessionCombatCondition,
  SessionCombatParticipant,
  SessionCombatStateRecord,
  SessionPlayerRow,
} from './session-combat'

export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export function statModifier(value?: number | null): number {
  return Math.floor(((value ?? 10) - 10) / 2)
}

export function armorClassFromStats(stats?: CharacterStats | null): number {
  return 10 + statModifier(stats?.dex as number | undefined)
}

export function currentCombatToPromptState(
  sessionCombatState: SessionCombatStateRecord | null,
  characterCombatState: CombatState | null | undefined,
): CombatState {
  if (sessionCombatState && sessionCombatState.status !== 'idle' && sessionCombatState.status !== 'ended') {
    return {
      in_combat: true,
      round: sessionCombatState.round,
      turn: sessionCombatState.turn_index,
      participants: safeArray(sessionCombatState.participants),
    }
  }

  return characterCombatState ?? {
    in_combat: false,
    round: 1,
    turn: 0,
    participants: [],
  }
}

export function resolveTurnPlayerIdFromParticipant(participant: SessionCombatParticipant | null): string | null {
  if (!participant?.is_player) return null
  return participant.user_id ?? null
}

function cloneConditions(conditions: SessionCombatCondition[] | null | undefined): SessionCombatCondition[] {
  return safeArray(conditions).map((condition) => ({ ...condition }))
}

export function buildSessionPlayerParticipant(player: SessionPlayerRow): SessionCombatParticipant | null {
  if (!player.characters) return null

  return {
    id: `player:${player.user_id}`,
    user_id: player.user_id,
    character_id: player.characters.id,
    name: player.characters.name,
    hp: player.characters.hp_current,
    max_hp: player.characters.hp_max,
    ac: armorClassFromStats(player.characters.stats),
    initiative: null,
    is_player: true,
    is_defeated: player.characters.hp_current <= 0,
    conditions: [],
  }
}

export function createEmptySessionCombatState(sessionId: string): SessionCombatStateRecord {
  return {
    session_id: sessionId,
    status: 'idle',
    round: 1,
    turn_index: 0,
    participants: [],
  }
}

export function cloneSessionCombatParticipants(
  participants: SessionCombatParticipant[] | null | undefined,
): SessionCombatParticipant[] {
  return safeArray(participants).map((participant) => ({
    ...participant,
    conditions: cloneConditions(participant.conditions),
  }))
}

function normalizeTurnIndex(participants: SessionCombatParticipant[], turnIndex: number): number {
  if (participants.length === 0) return 0
  if (turnIndex < 0) return 0
  if (turnIndex >= participants.length) return participants.length - 1
  return turnIndex
}

function rollEnemyInitiative(participant: SessionCombatParticipant): number {
  return Math.floor(Math.random() * 20) + 1 + Math.floor((participant.ac - 10) / 2)
}

export function upsertSessionCombatParticipants(params: {
  currentParticipants: SessionCombatParticipant[] | null | undefined
  sessionPlayers: SessionPlayerRow[]
  enemies?: CombatParticipant[] | null
  characterId?: string | null
  hp?: number
  maxHp?: number
}): SessionCombatParticipant[] {
  const { currentParticipants, sessionPlayers, enemies, characterId, hp, maxHp } = params
  const participants = cloneSessionCombatParticipants(currentParticipants)
  const existingIds = new Set(participants.map((participant) => participant.id))

  sessionPlayers.forEach((player) => {
    const playerParticipant = buildSessionPlayerParticipant(player)
    if (!playerParticipant) return

    if (!existingIds.has(playerParticipant.id)) {
      participants.push(playerParticipant)
      existingIds.add(playerParticipant.id)
      return
    }

    const existingIndex = participants.findIndex((participant) => participant.id === playerParticipant.id)
    if (existingIndex > -1) {
      const existing = participants[existingIndex]
      const resolvedHp =
        typeof hp === 'number' && existing.character_id === characterId ? hp : existing.hp
      const resolvedMaxHp =
        typeof maxHp === 'number' && existing.character_id === characterId ? maxHp : existing.max_hp

      participants[existingIndex] = {
        ...existing,
        name: playerParticipant.name,
        user_id: playerParticipant.user_id,
        character_id: playerParticipant.character_id,
        ac: playerParticipant.ac,
        hp: resolvedHp,
        max_hp: resolvedMaxHp,
        is_player: true,
        is_defeated: resolvedHp <= 0,
        conditions: cloneConditions(existing.conditions),
      }
    }
  })

  safeArray(enemies).forEach((enemy, index) => {
    const enemyId = `enemy:${enemy.name}:${index}`
    const enemyRecord: SessionCombatParticipant = {
      id: enemyId,
      name: enemy.name,
      hp: enemy.hp,
      max_hp: enemy.max_hp,
      ac: enemy.ac,
      initiative: enemy.initiative ?? null,
      is_player: false,
      is_defeated: enemy.hp <= 0,
      conditions: [],
    }

    const existingIndex = participants.findIndex((participant) => participant.id === enemyId)
    if (existingIndex > -1) {
      participants[existingIndex] = {
        ...participants[existingIndex],
        ...enemyRecord,
        initiative: participants[existingIndex].initiative ?? enemyRecord.initiative,
        conditions: cloneConditions(participants[existingIndex].conditions),
      }
      return
    }

    participants.push(enemyRecord)
  })

  return participants.map((participant) =>
    characterId && typeof hp === 'number' && typeof maxHp === 'number' && participant.character_id === characterId
      ? {
        ...participant,
        hp,
        max_hp: maxHp,
        is_defeated: hp <= 0,
        conditions: cloneConditions(participant.conditions),
      }
      : participant,
  )
}

function ensureEnemyInitiatives(participants: SessionCombatParticipant[]): SessionCombatParticipant[] {
  return participants.map((participant) => {
    if (participant.is_player) return participant
    if (participant.initiative && participant.initiative > 0) return participant

    return {
      ...participant,
      initiative: rollEnemyInitiative(participant),
    }
  })
}

function allPlayerInitiativesReady(participants: SessionCombatParticipant[]): boolean {
  const livePlayers = participants.filter((participant) => participant.is_player && !participant.is_defeated)
  if (livePlayers.length === 0) return false
  return livePlayers.every((participant) => typeof participant.initiative === 'number' && participant.initiative > 0)
}

function sortParticipantsForInitiative(participants: SessionCombatParticipant[]): SessionCombatParticipant[] {
  return cloneSessionCombatParticipants(participants).sort((a, b) => {
    const initiativeDiff = (b.initiative ?? 0) - (a.initiative ?? 0)
    if (initiativeDiff !== 0) return initiativeDiff
    if ((a.is_player ?? false) !== (b.is_player ?? false)) return a.is_player ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function startSessionCombat(params: {
  sessionId: string
  currentState: SessionCombatStateRecord | null
  sessionPlayers: SessionPlayerRow[]
  enemies?: CombatParticipant[] | null
  actingCharacterId: string
  actingCharacterHp: number
  actingCharacterMaxHp: number
}): { combatState: SessionCombatStateRecord; turnPlayerId: string | null } {
  const {
    sessionId,
    currentState,
    sessionPlayers,
    enemies,
    actingCharacterId,
    actingCharacterHp,
    actingCharacterMaxHp,
  } = params

  const baseState = currentState ?? createEmptySessionCombatState(sessionId)
  let participants = upsertSessionCombatParticipants({
    currentParticipants: baseState.participants,
    sessionPlayers,
    enemies,
    characterId: actingCharacterId,
    hp: actingCharacterHp,
    maxHp: actingCharacterMaxHp,
  })

  participants = ensureEnemyInitiatives(participants)

  return {
    combatState: {
      session_id: sessionId,
      status: 'initiative',
      round: 1,
      turn_index: 0,
      participants,
    },
    turnPlayerId: null,
  }
}

export function applyCharacterHpToSessionCombat(params: {
  currentState: SessionCombatStateRecord
  characterId: string
  hp: number
  maxHp: number
}): SessionCombatStateRecord {
  const { currentState, characterId, hp, maxHp } = params

  return {
    ...currentState,
    participants: currentState.participants.map((participant) =>
      participant.character_id === characterId
        ? {
          ...participant,
          hp,
          max_hp: maxHp,
          is_defeated: hp <= 0,
          conditions: cloneConditions(participant.conditions),
        }
        : {
          ...participant,
          conditions: cloneConditions(participant.conditions),
        },
    ),
  }
}

export function registerSessionInitiative(params: {
  currentState: SessionCombatStateRecord
  userId: string
  rolledInitiative: number
}): { combatState: SessionCombatStateRecord; turnPlayerId: string | null; awaitingMoreInitiatives: boolean } {
  const { currentState, userId, rolledInitiative } = params
  let participants = cloneSessionCombatParticipants(currentState.participants)
  const playerIndex = participants.findIndex((participant) => participant.is_player && participant.user_id === userId)

  if (playerIndex > -1) {
    participants[playerIndex].initiative = rolledInitiative
  }

  participants = ensureEnemyInitiatives(participants)

  if (!allPlayerInitiativesReady(participants)) {
    return {
      combatState: {
        ...currentState,
        status: 'initiative',
        participants,
        turn_index: 0,
        round: 1,
      },
      turnPlayerId: null,
      awaitingMoreInitiatives: true,
    }
  }

  const orderedParticipants = sortParticipantsForInitiative(participants)
  const firstActiveIndex = normalizeTurnIndex(orderedParticipants, 0)
  const activeParticipant = orderedParticipants[firstActiveIndex] ?? null

  return {
    combatState: {
      ...currentState,
      status: 'active',
      participants: orderedParticipants,
      turn_index: firstActiveIndex,
      round: 1,
    },
    turnPlayerId: resolveTurnPlayerIdFromParticipant(activeParticipant),
    awaitingMoreInitiatives: false,
  }
}

export function advanceSessionCombatTurn(currentState: SessionCombatStateRecord): {
  combatState: SessionCombatStateRecord
  activeParticipant: SessionCombatParticipant | null
} {
  const activeParticipants = cloneSessionCombatParticipants(currentState.participants).filter(
    (participant) => !participant.is_defeated,
  )

  if (activeParticipants.length === 0) {
    return {
      combatState: {
        ...currentState,
        turn_index: 0,
      },
      activeParticipant: null,
    }
  }

  const nextTurnIndex = (currentState.turn_index + 1) % activeParticipants.length
  const nextRound =
    nextTurnIndex === 0 ? Math.max(1, currentState.round) + 1 : Math.max(1, currentState.round)
  const activeParticipant = activeParticipants[nextTurnIndex] ?? null

  return {
    combatState: {
      ...currentState,
      status: 'active',
      round: nextRound,
      turn_index: nextTurnIndex,
      participants: activeParticipants,
    },
    activeParticipant,
  }
}

export function endSessionCombat(currentState: SessionCombatStateRecord): SessionCombatStateRecord {
  return {
    ...currentState,
    status: 'ended',
    turn_index: 0,
    participants: cloneSessionCombatParticipants(currentState.participants),
  }
}

export function computeCombatRoundTurnLabel(state: SessionCombatStateRecord): string {
  const active = state.participants[state.turn_index]
  if (!active) return `Ronda ${state.round}`
  return `Ronda ${state.round}, turno de ${active.name}`
}

export function updateSessionCombatStateFromModel(params: {
  currentState: SessionCombatStateRecord
  update: Omit<Partial<SessionCombatStateRecord>, 'participants'> & {
    participants?: CombatParticipant[]
  }
  sessionPlayers: SessionPlayerRow[]
}): SessionCombatStateRecord {
  const { currentState, update, sessionPlayers } = params
  const nextState = { ...currentState }

  if (typeof update.round === 'number') {
    nextState.round = update.round
  }
  if (typeof update.turn_index === 'number') {
    nextState.turn_index = update.turn_index
  }

  if (Array.isArray(update.participants)) {
    nextState.participants = upsertSessionCombatParticipants({
      currentParticipants: nextState.participants,
      sessionPlayers,
      enemies: update.participants,
    })
  }

  return nextState
}
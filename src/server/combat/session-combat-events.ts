import type { SupabaseClient } from '@supabase/supabase-js'
import type {
    JsonObject,
    SessionCombatCondition,
    SessionCombatParticipant,
    SessionCombatStateRecord,
} from './session-combat'

export type CombatEventType =
    | 'attack_declared'
    | 'damage_applied'
    | 'healing_applied'
    | 'condition_applied'
    | 'combat_ended'

export type CombatParticipantReference = {
    participant_id?: string | null
    character_id?: string | null
    name?: string | null
}

export type AttackDeclaredResolution = {
    actor?: CombatParticipantReference | null
    target?: CombatParticipantReference | null
    action_name: string
    summary?: string | null
}

export type DamageAppliedResolution = {
    actor?: CombatParticipantReference | null
    target: CombatParticipantReference
    amount: number
    damage_type?: string | null
    summary?: string | null
}

export type HealingAppliedResolution = {
    actor?: CombatParticipantReference | null
    target: CombatParticipantReference
    amount: number
    summary?: string | null
}

export type ConditionAppliedResolution = {
    actor?: CombatParticipantReference | null
    target: CombatParticipantReference
    condition_name: string
    duration_rounds?: number | null
    source?: string | null
    summary?: string | null
}

export type CombatEndedResolution = {
    summary?: string | null
    winner_side?: 'players' | 'enemies' | 'none' | 'unknown' | null
}

export type CombatEventResolution = {
    attack_declared?: AttackDeclaredResolution | null
    damage_applied?: DamageAppliedResolution | null
    healing_applied?: HealingAppliedResolution | null
    condition_applied?: ConditionAppliedResolution | null
    combat_ended?: CombatEndedResolution | null
} | null

type ResolvedParticipant = SessionCombatParticipant & {
    index: number
}

type PersistCombatEventParams = {
    supabase: SupabaseClient
    worldId?: string | null
    characterId?: string | null
    sessionId: string
    resolution: CombatEventResolution
    currentState: SessionCombatStateRecord
    actingParticipant?: CombatParticipantReference | null
}

type ParticipantHpUpdate = {
    characterId: string
    hp: number
}

type PersistCombatEventResult = {
    combatState: SessionCombatStateRecord
    touchedCharacterHp: ParticipantHpUpdate[]
    combatEnded: boolean
}

function normalizeText(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
}

function clampHp(value: number, maxHp: number): number {
    return Math.max(0, Math.min(maxHp, value))
}

function slugifyCondition(name: string): string {
    return normalizeText(name)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function cloneConditions(conditions: SessionCombatCondition[] | null | undefined): SessionCombatCondition[] {
    return Array.isArray(conditions) ? conditions.map((condition) => ({ ...condition })) : []
}

function toCombatEventContent(params: {
    type: CombatEventType
    actorName?: string | null
    targetName?: string | null
    actionName?: string | null
    amount?: number | null
    detail?: string | null
    damageType?: string | null
    conditionName?: string | null
    winnerSide?: string | null
}): string {
    const { type, actorName, targetName, actionName, amount, detail, damageType, conditionName, winnerSide } = params

    if (type === 'attack_declared') {
        const summary =
            detail?.trim() ||
            `${actorName ?? 'Alguien'} declara ${actionName ?? 'una acción'} sobre ${targetName ?? 'un objetivo'}.`
        return `[COMBATE_ATAQUE] ${summary}`
    }

    if (type === 'damage_applied') {
        const suffix = damageType ? ` (${damageType})` : ''
        const summary =
            detail?.trim() ||
            `${targetName ?? 'Objetivo'} recibe ${amount ?? 0} de daño${suffix} por ${actorName ?? 'una fuente desconocida'}.`
        return `[COMBATE_DAÑO] ${summary}`
    }

    if (type === 'healing_applied') {
        const summary =
            detail?.trim() ||
            `${targetName ?? 'Objetivo'} recupera ${amount ?? 0} HP gracias a ${actorName ?? 'una fuente desconocida'}.`
        return `[COMBATE_CURACION] ${summary}`
    }

    if (type === 'condition_applied') {
        const summary =
            detail?.trim() ||
            `${targetName ?? 'Objetivo'} queda afectado por ${conditionName ?? 'una condición'}${actorName ? ` por ${actorName}` : ''
            }.`
        return `[COMBATE_CONDICION] ${summary}`
    }

    const summary =
        detail?.trim() ||
        `El combate termina${winnerSide && winnerSide !== 'unknown' ? ` con victoria de ${winnerSide}` : ''}.`
    return `[COMBATE_FIN] ${summary}`
}

function toEventPayload(params: {
    type: CombatEventType
    actor?: ResolvedParticipant | null
    target?: ResolvedParticipant | null
    actionName?: string | null
    amount?: number | null
    detail?: string | null
    damageType?: string | null
    condition?: SessionCombatCondition | null
    winnerSide?: string | null
}): JsonObject {
    const { type, actor, target, actionName, amount, detail, damageType, condition, winnerSide } = params

    return {
        sender_name: 'Sistema',
        channel: 'combat',
        combat_event: {
            type,
            actor: actor
                ? {
                    participant_id: actor.id,
                    character_id: actor.character_id ?? null,
                    user_id: actor.user_id ?? null,
                    name: actor.name,
                    is_player: Boolean(actor.is_player),
                }
                : null,
            target: target
                ? {
                    participant_id: target.id,
                    character_id: target.character_id ?? null,
                    user_id: target.user_id ?? null,
                    name: target.name,
                    is_player: Boolean(target.is_player),
                }
                : null,
            action_name: actionName ?? null,
            amount: typeof amount === 'number' ? amount : null,
            damage_type: damageType ?? null,
            condition: condition
                ? {
                    id: condition.id,
                    name: condition.name,
                    source: condition.source ?? null,
                    duration_rounds: condition.duration_rounds ?? null,
                    applied_by_participant_id: condition.applied_by_participant_id ?? null,
                    applied_at_round: condition.applied_at_round ?? null,
                    summary: condition.summary ?? null,
                }
                : null,
            winner_side: winnerSide ?? null,
            summary: detail ?? null,
        } satisfies JsonObject,
    }
}

function resolveParticipant(
    currentState: SessionCombatStateRecord,
    reference?: CombatParticipantReference | null,
    fallback?: CombatParticipantReference | null,
): ResolvedParticipant | null {
    const candidates = [reference, fallback].filter(Boolean) as CombatParticipantReference[]

    for (const candidate of candidates) {
        if (candidate.participant_id) {
            const byId = currentState.participants.findIndex((participant) => participant.id === candidate.participant_id)
            if (byId > -1) return { ...currentState.participants[byId], index: byId }
        }

        if (candidate.character_id) {
            const byCharacter = currentState.participants.findIndex(
                (participant) => participant.character_id === candidate.character_id,
            )
            if (byCharacter > -1) return { ...currentState.participants[byCharacter], index: byCharacter }
        }

        const normalizedName = normalizeText(candidate.name)
        if (normalizedName) {
            const byName = currentState.participants.findIndex(
                (participant) => normalizeText(participant.name) === normalizedName,
            )
            if (byName > -1) return { ...currentState.participants[byName], index: byName }
        }
    }

    return null
}

function applyHpDelta(params: {
    combatState: SessionCombatStateRecord
    target: ResolvedParticipant
    delta: number
}): {
    combatState: SessionCombatStateRecord
    hpUpdate: ParticipantHpUpdate | null
} {
    const { combatState, target, delta } = params
    const nextParticipants = combatState.participants.map((participant, index) => {
        if (index !== target.index) return participant

        const nextHp = clampHp(participant.hp + delta, participant.max_hp)
        return {
            ...participant,
            hp: nextHp,
            is_defeated: nextHp <= 0,
            conditions: cloneConditions(participant.conditions),
        }
    })

    const updatedTarget = nextParticipants[target.index]

    return {
        combatState: {
            ...combatState,
            participants: nextParticipants,
        },
        hpUpdate:
            updatedTarget?.character_id && typeof updatedTarget.hp === 'number'
                ? {
                    characterId: updatedTarget.character_id,
                    hp: updatedTarget.hp,
                }
                : null,
    }
}

function applyCondition(params: {
    combatState: SessionCombatStateRecord
    target: ResolvedParticipant
    actor?: ResolvedParticipant | null
    conditionName: string
    durationRounds?: number | null
    source?: string | null
    summary?: string | null
}): {
    combatState: SessionCombatStateRecord
    condition: SessionCombatCondition
} {
    const { combatState, target, actor, conditionName, durationRounds, source, summary } = params
    const conditionId = slugifyCondition(conditionName) || crypto.randomUUID()

    const nextCondition: SessionCombatCondition = {
        id: conditionId,
        name: conditionName.trim(),
        source: source?.trim() || null,
        duration_rounds: typeof durationRounds === 'number' ? durationRounds : null,
        applied_by_participant_id: actor?.id ?? null,
        applied_at_round: Math.max(1, combatState.round),
        summary: summary?.trim() || null,
    }

    const nextParticipants = combatState.participants.map((participant, index) => {
        if (index !== target.index) return participant

        const existingConditions = cloneConditions(participant.conditions)
        const existingIndex = existingConditions.findIndex(
            (condition) => normalizeText(condition.name) === normalizeText(conditionName),
        )

        if (existingIndex > -1) {
            existingConditions[existingIndex] = nextCondition
        } else {
            existingConditions.push(nextCondition)
        }

        return {
            ...participant,
            conditions: existingConditions,
        }
    })

    return {
        combatState: {
            ...combatState,
            participants: nextParticipants,
        },
        condition: nextCondition,
    }
}

function isMeaningfulAmount(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export async function persistSessionCombatEvents(
    params: PersistCombatEventParams,
): Promise<PersistCombatEventResult> {
    const { supabase, worldId, characterId, sessionId, resolution, currentState, actingParticipant } = params

    if (!resolution) {
        return {
            combatState: currentState,
            touchedCharacterHp: [],
            combatEnded: false,
        }
    }

    let nextState: SessionCombatStateRecord = {
        ...currentState,
        participants: currentState.participants.map((participant) => ({
            ...participant,
            conditions: cloneConditions(participant.conditions),
        })),
    }

    const touchedCharacterHp = new Map<string, number>()
    const insertRows: Array<{
        world_id: string | null
        character_id: string | null
        session_id: string
        role: 'system'
        content: string
        event_type: CombatEventType
        payload: JsonObject
    }> = []

    const resolvedActor = resolveParticipant(nextState, resolution.attack_declared?.actor, actingParticipant)

    if (resolution.attack_declared && resolution.attack_declared.action_name.trim()) {
        const attackTarget = resolveParticipant(nextState, resolution.attack_declared.target)
        insertRows.push({
            world_id: worldId ?? null,
            character_id: characterId ?? null,
            session_id: sessionId,
            role: 'system',
            content: toCombatEventContent({
                type: 'attack_declared',
                actorName: resolvedActor?.name ?? actingParticipant?.name ?? null,
                targetName: attackTarget?.name ?? resolution.attack_declared.target?.name ?? null,
                actionName: resolution.attack_declared.action_name,
                detail: resolution.attack_declared.summary ?? null,
            }),
            event_type: 'attack_declared',
            payload: toEventPayload({
                type: 'attack_declared',
                actor: resolvedActor,
                target: attackTarget,
                actionName: resolution.attack_declared.action_name,
                detail: resolution.attack_declared.summary ?? null,
            }),
        })
    }

    if (resolution.damage_applied && isMeaningfulAmount(resolution.damage_applied.amount)) {
        const damageActor = resolveParticipant(nextState, resolution.damage_applied.actor, actingParticipant)
        const damageTarget = resolveParticipant(nextState, resolution.damage_applied.target)

        if (damageTarget) {
            const applied = applyHpDelta({
                combatState: nextState,
                target: damageTarget,
                delta: -resolution.damage_applied.amount,
            })
            nextState = applied.combatState

            if (applied.hpUpdate) {
                touchedCharacterHp.set(applied.hpUpdate.characterId, applied.hpUpdate.hp)
            }

            insertRows.push({
                world_id: worldId ?? null,
                character_id: characterId ?? null,
                session_id: sessionId,
                role: 'system',
                content: toCombatEventContent({
                    type: 'damage_applied',
                    actorName: damageActor?.name ?? actingParticipant?.name ?? null,
                    targetName: damageTarget.name,
                    amount: resolution.damage_applied.amount,
                    detail: resolution.damage_applied.summary ?? null,
                    damageType: resolution.damage_applied.damage_type ?? null,
                }),
                event_type: 'damage_applied',
                payload: toEventPayload({
                    type: 'damage_applied',
                    actor: damageActor,
                    target: damageTarget,
                    amount: resolution.damage_applied.amount,
                    detail: resolution.damage_applied.summary ?? null,
                    damageType: resolution.damage_applied.damage_type ?? null,
                }),
            })
        }
    }

    if (resolution.healing_applied && isMeaningfulAmount(resolution.healing_applied.amount)) {
        const healingActor = resolveParticipant(nextState, resolution.healing_applied.actor, actingParticipant)
        const healingTarget = resolveParticipant(nextState, resolution.healing_applied.target)

        if (healingTarget) {
            const applied = applyHpDelta({
                combatState: nextState,
                target: healingTarget,
                delta: resolution.healing_applied.amount,
            })
            nextState = applied.combatState

            if (applied.hpUpdate) {
                touchedCharacterHp.set(applied.hpUpdate.characterId, applied.hpUpdate.hp)
            }

            insertRows.push({
                world_id: worldId ?? null,
                character_id: characterId ?? null,
                session_id: sessionId,
                role: 'system',
                content: toCombatEventContent({
                    type: 'healing_applied',
                    actorName: healingActor?.name ?? actingParticipant?.name ?? null,
                    targetName: healingTarget.name,
                    amount: resolution.healing_applied.amount,
                    detail: resolution.healing_applied.summary ?? null,
                }),
                event_type: 'healing_applied',
                payload: toEventPayload({
                    type: 'healing_applied',
                    actor: healingActor,
                    target: healingTarget,
                    amount: resolution.healing_applied.amount,
                    detail: resolution.healing_applied.summary ?? null,
                }),
            })
        }
    }

    if (resolution.condition_applied && resolution.condition_applied.condition_name.trim()) {
        const conditionActor = resolveParticipant(nextState, resolution.condition_applied.actor, actingParticipant)
        const conditionTarget = resolveParticipant(nextState, resolution.condition_applied.target)

        if (conditionTarget) {
            const applied = applyCondition({
                combatState: nextState,
                target: conditionTarget,
                actor: conditionActor,
                conditionName: resolution.condition_applied.condition_name,
                durationRounds: resolution.condition_applied.duration_rounds ?? null,
                source: resolution.condition_applied.source ?? null,
                summary: resolution.condition_applied.summary ?? null,
            })

            nextState = applied.combatState

            insertRows.push({
                world_id: worldId ?? null,
                character_id: characterId ?? null,
                session_id: sessionId,
                role: 'system',
                content: toCombatEventContent({
                    type: 'condition_applied',
                    actorName: conditionActor?.name ?? actingParticipant?.name ?? null,
                    targetName: conditionTarget.name,
                    conditionName: applied.condition.name,
                    detail: resolution.condition_applied.summary ?? null,
                }),
                event_type: 'condition_applied',
                payload: toEventPayload({
                    type: 'condition_applied',
                    actor: conditionActor,
                    target: conditionTarget,
                    detail: resolution.condition_applied.summary ?? null,
                    condition: applied.condition,
                }),
            })
        }
    }

    let combatEnded = false

    if (resolution.combat_ended) {
        combatEnded = true

        insertRows.push({
            world_id: worldId ?? null,
            character_id: characterId ?? null,
            session_id: sessionId,
            role: 'system',
            content: toCombatEventContent({
                type: 'combat_ended',
                detail: resolution.combat_ended.summary ?? null,
                winnerSide: resolution.combat_ended.winner_side ?? null,
            }),
            event_type: 'combat_ended',
            payload: toEventPayload({
                type: 'combat_ended',
                detail: resolution.combat_ended.summary ?? null,
                winnerSide: resolution.combat_ended.winner_side ?? null,
            }),
        })
    }

    if (insertRows.length > 0) {
        const { error } = await supabase.from('narrative_events').insert(insertRows)
        if (error) {
            throw new Error(`Error al persistir eventos tácticos de combate: ${error.message}`)
        }
    }

    return {
        combatState: nextState,
        touchedCharacterHp: Array.from(touchedCharacterHp.entries()).map(([resolvedCharacterId, hp]) => ({
            characterId: resolvedCharacterId,
            hp,
        })),
        combatEnded,
    }
}

export function normalizeCombatEventResolution(value: unknown): CombatEventResolution {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const candidate = value as Record<string, unknown>

    const readParticipant = (participantValue: unknown): CombatParticipantReference | null => {
        if (!participantValue || typeof participantValue !== 'object' || Array.isArray(participantValue)) return null
        const participant = participantValue as Record<string, unknown>

        return {
            participant_id: typeof participant.participant_id === 'string' ? participant.participant_id : null,
            character_id: typeof participant.character_id === 'string' ? participant.character_id : null,
            name: typeof participant.name === 'string' ? participant.name : null,
        }
    }

    const readString = (field: unknown): string | null =>
        typeof field === 'string' && field.trim() ? field.trim() : null

    const readNumber = (field: unknown): number | null =>
        typeof field === 'number' && Number.isFinite(field) ? field : null

    const attackRaw = candidate.attack_declared
    const damageRaw = candidate.damage_applied
    const healingRaw = candidate.healing_applied
    const conditionRaw = candidate.condition_applied
    const combatEndedRaw = candidate.combat_ended

    const normalized: NonNullable<CombatEventResolution> = {}

    if (attackRaw && typeof attackRaw === 'object' && !Array.isArray(attackRaw)) {
        const attack = attackRaw as Record<string, unknown>
        const actionName = readString(attack.action_name)

        if (actionName) {
            normalized.attack_declared = {
                actor: readParticipant(attack.actor),
                target: readParticipant(attack.target),
                action_name: actionName,
                summary: readString(attack.summary),
            }
        }
    }

    if (damageRaw && typeof damageRaw === 'object' && !Array.isArray(damageRaw)) {
        const damage = damageRaw as Record<string, unknown>
        const amount = readNumber(damage.amount)
        const target = readParticipant(damage.target)

        if (target && isMeaningfulAmount(amount)) {
            normalized.damage_applied = {
                actor: readParticipant(damage.actor),
                target,
                amount,
                damage_type: readString(damage.damage_type),
                summary: readString(damage.summary),
            }
        }
    }

    if (healingRaw && typeof healingRaw === 'object' && !Array.isArray(healingRaw)) {
        const healing = healingRaw as Record<string, unknown>
        const amount = readNumber(healing.amount)
        const target = readParticipant(healing.target)

        if (target && isMeaningfulAmount(amount)) {
            normalized.healing_applied = {
                actor: readParticipant(healing.actor),
                target,
                amount,
                summary: readString(healing.summary),
            }
        }
    }

    if (conditionRaw && typeof conditionRaw === 'object' && !Array.isArray(conditionRaw)) {
        const condition = conditionRaw as Record<string, unknown>
        const target = readParticipant(condition.target)
        const conditionName = readString(condition.condition_name)

        if (target && conditionName) {
            normalized.condition_applied = {
                actor: readParticipant(condition.actor),
                target,
                condition_name: conditionName,
                duration_rounds: readNumber(condition.duration_rounds),
                source: readString(condition.source),
                summary: readString(condition.summary),
            }
        }
    }

    if (combatEndedRaw && typeof combatEndedRaw === 'object' && !Array.isArray(combatEndedRaw)) {
        const combatEnded = combatEndedRaw as Record<string, unknown>
        normalized.combat_ended = {
            summary: readString(combatEnded.summary),
            winner_side:
                combatEnded.winner_side === 'players' ||
                    combatEnded.winner_side === 'enemies' ||
                    combatEnded.winner_side === 'none' ||
                    combatEnded.winner_side === 'unknown'
                    ? combatEnded.winner_side
                    : null,
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : null
}
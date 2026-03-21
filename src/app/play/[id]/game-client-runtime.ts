import {
    mergeTimelineEvent,
    reconcileTimelineSnapshot,
    shouldRefreshTimelineGap,
    sortTimelineEvents,
} from './event-convergence'
import type { NarrativeEvent } from './types'
import type { DiceRollRequired } from '@/types/dice'

export type GameClientRuntimeState = {
    events: NarrativeEvent[]
    typewriterText: string
    isTyping: boolean
    pendingDiceRoll: DiceRollRequired | null
    pendingAssistantClientEventId: string | null
}

export type StreamChunkPayload = {
    text?: string
    done?: boolean
    fullText?: string
    dice_roll_required?: DiceRollRequired | null
    assistant_client_event_id?: string | null
    system_only?: boolean
}

export type StreamConsumeResult = {
    state: GameClientRuntimeState
    remainingBuffer: string
    refreshRequested: boolean
    systemOnly: boolean
}

export function createGameClientRuntimeState(
    initialEvents: NarrativeEvent[] = [],
): GameClientRuntimeState {
    return {
        events: sortTimelineEvents(initialEvents),
        typewriterText: '',
        isTyping: false,
        pendingDiceRoll: null,
        pendingAssistantClientEventId: null,
    }
}

export function appendOptimisticNarrativeEvent(
    state: GameClientRuntimeState,
    optimisticEvent: NarrativeEvent,
): GameClientRuntimeState {
    return {
        ...state,
        events: mergeTimelineEvent(state.events, optimisticEvent),
    }
}

export function applyIncomingNarrativeEvent(
    state: GameClientRuntimeState,
    incoming: NarrativeEvent,
): { state: GameClientRuntimeState; refreshRequested: boolean } {
    return {
        state: {
            ...state,
            events: mergeTimelineEvent(state.events, incoming),
        },
        refreshRequested: shouldRefreshTimelineGap(state.events, incoming),
    }
}

export function reconcileRuntimeSnapshot(
    state: GameClientRuntimeState,
    snapshot: NarrativeEvent[],
): GameClientRuntimeState {
    return {
        ...state,
        events: reconcileTimelineSnapshot(state.events, snapshot),
    }
}

export function beginAssistantStream(state: GameClientRuntimeState): GameClientRuntimeState {
    return {
        ...state,
        isTyping: true,
        typewriterText: '',
        pendingDiceRoll: null,
        pendingAssistantClientEventId: null,
    }
}

export function consumeAssistantStreamChunk(
    state: GameClientRuntimeState,
    incomingText: string,
    currentBuffer = '',
): StreamConsumeResult {
    let nextState = state
    let refreshRequested = false
    let systemOnly = false

    const accumulated = `${currentBuffer}${incomingText}`
    const lines = accumulated.split('\n')
    const remainingBuffer = lines.pop() ?? ''

    for (const line of lines) {
        if (!line.trim()) continue

        let parsed: StreamChunkPayload

        try {
            parsed = JSON.parse(line) as StreamChunkPayload
        } catch {
            continue
        }

        if (parsed.system_only) {
            nextState = {
                ...nextState,
                isTyping: false,
                typewriterText: '',
            }
            refreshRequested = true
            systemOnly = true
            continue
        }

        if (parsed.text) {
            nextState = {
                ...nextState,
                isTyping: true,
                typewriterText: `${nextState.typewriterText}${parsed.text}`,
            }
        }

        if (parsed.dice_roll_required !== undefined) {
            nextState = {
                ...nextState,
                pendingDiceRoll: parsed.dice_roll_required,
            }
        }

        if (parsed.assistant_client_event_id) {
            nextState = {
                ...nextState,
                pendingAssistantClientEventId: parsed.assistant_client_event_id,
            }
        }

        if (parsed.done) {
            nextState = {
                ...nextState,
                isTyping: false,
                typewriterText: '',
            }
            refreshRequested = true
        }
    }

    return {
        state: nextState,
        remainingBuffer,
        refreshRequested,
        systemOnly,
    }
}
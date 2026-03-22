import test from 'node:test'
import assert from 'node:assert/strict'

import {
    appendOptimisticNarrativeEvent,
    applyIncomingNarrativeEvent,
    prepareAssistantStream,
    consumeAssistantStreamChunk,
    createGameClientRuntimeState,
    reconcileRuntimeSnapshot,
} from './game-client-runtime'
import type { NarrativeEvent } from './types'

type BuildEventOverrides = Partial<NarrativeEvent>

function buildEvent(overrides: BuildEventOverrides = {}): NarrativeEvent {
    return {
        id: overrides.id ?? 'event-default',
        role: overrides.role ?? 'assistant',
        content: overrides.content ?? 'Evento',
        created_at: overrides.created_at ?? '2026-03-17T12:00:00.000Z',
        event_index: overrides.event_index ?? null,
        client_event_id: overrides.client_event_id ?? null,
        event_type: overrides.event_type ?? null,
        payload: overrides.payload ?? null,
        characters: overrides.characters ?? null,
        dice_roll_required: overrides.dice_roll_required ?? null,
        combat: overrides.combat ?? null,
        character_id: overrides.character_id ?? null,
    }
}

test('clients converge across optimistic submit, stream completion, realtime gap and reconnect snapshot', () => {
    const persistedGreeting = buildEvent({
        id: 'db-100',
        role: 'assistant',
        content: 'La niebla cubre el puente antiguo.',
        created_at: '2026-03-17T12:00:00.000Z',
        event_index: 100,
    })

    const optimisticUser = buildEvent({
        id: 'optimistic:client-101',
        role: 'user',
        content: 'Corro hacia el puente con la espada en alto.',
        created_at: '2026-03-17T12:00:01.000Z',
        client_event_id: 'client-101',
        event_type: 'player_message',
        payload: { sender_name: 'Aria', channel: 'adventure' },
        character_id: 'character-1',
    })

    const persistedUser = buildEvent({
        id: 'db-101',
        role: 'user',
        content: optimisticUser.content,
        created_at: '2026-03-17T12:00:02.000Z',
        event_index: 101,
        client_event_id: 'client-101',
        event_type: 'player_message',
        payload: { sender_name: 'Aria', channel: 'adventure' },
        character_id: 'character-1',
    })

    const gmPersistedReply = buildEvent({
        id: 'db-103',
        role: 'assistant',
        content: 'El puente tiembla bajo tus botas mientras una sombra emerge frente a ti.',
        created_at: '2026-03-17T12:00:04.000Z',
        event_index: 103,
        client_event_id: 'assistant-103',
        event_type: 'gm_response',
    })

    let clientA = createGameClientRuntimeState([persistedGreeting])
    let clientB = createGameClientRuntimeState([persistedGreeting])

    clientA = appendOptimisticNarrativeEvent(clientA, optimisticUser)
    assert.deepEqual(clientA.events.map((event) => event.id), ['db-100', 'optimistic:client-101'])

    const persistedOnA = applyIncomingNarrativeEvent(clientA, persistedUser)
    clientA = persistedOnA.state
    const persistedOnB = applyIncomingNarrativeEvent(clientB, persistedUser)
    clientB = persistedOnB.state

    assert.equal(persistedOnA.refreshRequested, false)
    assert.equal(persistedOnB.refreshRequested, false)
    assert.deepEqual(clientA.events, clientB.events)
    assert.deepEqual(clientA.events.map((event) => event.id), ['db-100', 'db-101'])

    let streamState = prepareAssistantStream(clientA)
    let streamBuffer = ''

    const firstStreamPass = consumeAssistantStreamChunk(
        streamState,
        '{"text":"El puente tiembla ","assistant_client_event_id":"assistant-103"}\n',
        streamBuffer,
    )

    streamState = firstStreamPass.state
    streamBuffer = firstStreamPass.remainingBuffer

    assert.equal(streamState.isTyping, true)
    assert.equal(streamState.typewriterText, 'El puente tiembla ')
    assert.equal(streamState.pendingAssistantClientEventId, 'assistant-103')
    assert.equal(firstStreamPass.refreshRequested, false)

    const secondStreamPass = consumeAssistantStreamChunk(
        streamState,
        '{"text":"bajo tus botas.","done":true}\n',
        streamBuffer,
    )

    clientA = secondStreamPass.state
    assert.equal(secondStreamPass.refreshRequested, true)
    assert.equal(clientA.isTyping, false)
    assert.equal(clientA.typewriterText, '')
    assert.equal(clientA.pendingAssistantClientEventId, 'assistant-103')

    const gmOnA = applyIncomingNarrativeEvent(clientA, gmPersistedReply)
    clientA = gmOnA.state
    assert.equal(gmOnA.refreshRequested, true)

    const staleSnapshotOnB = reconcileRuntimeSnapshot(clientB, [persistedGreeting, persistedUser])
    const refreshedSnapshotOnB = reconcileRuntimeSnapshot(staleSnapshotOnB, [
        persistedGreeting,
        persistedUser,
        gmPersistedReply,
    ])

    clientB = refreshedSnapshotOnB

    assert.deepEqual(clientA.events, clientB.events)
    assert.deepEqual(clientA.events.map((event) => event.id), ['db-100', 'db-101', 'db-103'])
})

test('stream runtime preserves partial JSONL buffers and exposes dice resolution state on completion', () => {
    const initial = prepareAssistantStream(createGameClientRuntimeState())

    const partial = consumeAssistantStreamChunk(
        initial,
        '{"text":"Prep',
    )

    assert.equal(partial.remainingBuffer, '{"text":"Prep')
    assert.equal(partial.state.typewriterText, '')
    assert.equal(partial.refreshRequested, false)

    const completed = consumeAssistantStreamChunk(
        partial.state,
        'ara los dados","dice_roll_required":{"kind":"skill_check","skill":"stealth","dc":15},"assistant_client_event_id":"assistant-dice-1","done":true}\n',
        partial.remainingBuffer,
    )

    assert.equal(completed.remainingBuffer, '')
    assert.equal(completed.refreshRequested, true)
    assert.equal(completed.state.isTyping, false)
    assert.equal(completed.state.typewriterText, '')
    assert.equal(completed.state.pendingAssistantClientEventId, 'assistant-dice-1')
    assert.deepEqual(completed.state.pendingDiceRoll, {
        kind: 'skill_check',
        skill: 'stealth',
        dc: 15,
    })
})
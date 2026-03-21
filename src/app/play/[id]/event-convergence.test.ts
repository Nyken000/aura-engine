import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import {
  getHighestTimelineEventIndex,
  mergeTimelineEvent,
  reconcileTimelineSnapshot,
  shouldRefreshTimelineGap,
  sortTimelineEvents,
  type TimelineEvent,
} from './event-convergence'

type NarrativeTimelineEvent = TimelineEvent & {
  role: 'user' | 'assistant' | 'system'
  content: string
  event_type?: string | null
}

function buildEvent(overrides: Partial<NarrativeTimelineEvent> = {}): NarrativeTimelineEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    role: overrides.role ?? 'assistant',
    content: overrides.content ?? 'Evento',
    created_at: overrides.created_at ?? '2026-03-16T12:00:00.000Z',
    event_index: overrides.event_index ?? null,
    client_event_id: overrides.client_event_id ?? null,
    event_type: overrides.event_type ?? null,
  }
}

test('sortTimelineEvents prioritizes indexed events before non-indexed events', () => {
  const events = [
    buildEvent({
      id: 'late-no-index',
      created_at: '2026-03-16T12:00:03.000Z',
      event_index: null,
    }),
    buildEvent({
      id: 'indexed-11',
      created_at: '2026-03-16T12:00:02.000Z',
      event_index: 11,
    }),
    buildEvent({
      id: 'indexed-10',
      created_at: '2026-03-16T12:00:01.000Z',
      event_index: 10,
    }),
  ]

  const sorted = sortTimelineEvents(events)

  assert.deepEqual(
    sorted.map((event) => event.id),
    ['indexed-10', 'indexed-11', 'late-no-index'],
  )
})

test('sortTimelineEvents uses created_at and id as deterministic tie-breakers', () => {
  const events = [
    buildEvent({
      id: 'b-event',
      created_at: '2026-03-16T12:00:01.000Z',
      event_index: 10,
    }),
    buildEvent({
      id: 'a-event',
      created_at: '2026-03-16T12:00:01.000Z',
      event_index: 10,
    }),
    buildEvent({
      id: 'older-event',
      created_at: '2026-03-16T12:00:00.000Z',
      event_index: 10,
    }),
  ]

  const sorted = sortTimelineEvents(events)

  assert.deepEqual(sorted.map((event) => event.id), ['older-event', 'a-event', 'b-event'])
})

test('mergeTimelineEvent replaces optimistic event with persisted event sharing client_event_id', () => {
  const optimisticUserEvent = buildEvent({
    id: 'temp-user-1',
    role: 'user',
    content: 'Ataco al capitán goblin.',
    created_at: '2026-03-16T12:00:00.000Z',
    client_event_id: 'client-event-1',
    event_index: null,
  })

  const persistedUserEvent = buildEvent({
    id: 'db-user-1',
    role: 'user',
    content: 'Ataco al capitán goblin.',
    created_at: '2026-03-16T12:00:01.000Z',
    client_event_id: 'client-event-1',
    event_index: 41,
  })

  const merged = mergeTimelineEvent([optimisticUserEvent], persistedUserEvent)

  assert.equal(merged.length, 1)
  assert.equal(merged[0].id, 'db-user-1')
  assert.equal(merged[0].client_event_id, 'client-event-1')
  assert.equal(merged[0].event_index, 41)
})

test('mergeTimelineEvent merges updates by persisted id without duplicating the event', () => {
  const originalEvent = buildEvent({
    id: 'db-event-1',
    created_at: '2026-03-16T12:00:00.000Z',
    event_index: 12,
    content: 'El GM prepara la emboscada.',
  })

  const updatedEvent = buildEvent({
    id: 'db-event-1',
    created_at: '2026-03-16T12:00:00.000Z',
    event_index: 12,
    content: 'El GM prepara la emboscada y describe el bosque en silencio.',
  })

  const merged = mergeTimelineEvent([originalEvent], updatedEvent)

  assert.equal(merged.length, 1)
  assert.equal(merged[0].content, 'El GM prepara la emboscada y describe el bosque en silencio.')
})

test('two clients converge to the same timeline after optimistic replace and gm follow-up', () => {
  const optimisticUserEvent = buildEvent({
    id: 'temp-user-1',
    role: 'user',
    content: 'Ataco al capitán goblin.',
    created_at: '2026-03-16T12:00:00.000Z',
    client_event_id: 'client-event-1',
    event_index: null,
  })

  const persistedUserEvent = buildEvent({
    id: 'db-user-1',
    role: 'user',
    content: 'Ataco al capitán goblin.',
    created_at: '2026-03-16T12:00:01.000Z',
    client_event_id: 'client-event-1',
    event_index: 41,
  })

  const gmReply = buildEvent({
    id: 'db-gm-1',
    role: 'assistant',
    content: 'El capitán goblin alza su escudo y responde.',
    created_at: '2026-03-16T12:00:02.000Z',
    event_index: 42,
  })

  const finalClientA = mergeTimelineEvent(
    mergeTimelineEvent(mergeTimelineEvent([], optimisticUserEvent), persistedUserEvent),
    gmReply,
  )

  const finalClientB = mergeTimelineEvent(mergeTimelineEvent([], persistedUserEvent), gmReply)

  assert.deepEqual(finalClientA, finalClientB)
})

test('reconcileTimelineSnapshot converges a stale client after reconnect with server snapshot', () => {
  const optimisticUserEvent = buildEvent({
    id: 'temp-user-1',
    role: 'user',
    content: 'Lanzo una flecha al centinela.',
    created_at: '2026-03-16T12:00:00.000Z',
    client_event_id: 'client-event-99',
    event_index: null,
  })

  const persistedUserEvent = buildEvent({
    id: 'db-user-99',
    role: 'user',
    content: 'Lanzo una flecha al centinela.',
    created_at: '2026-03-16T12:00:01.000Z',
    client_event_id: 'client-event-99',
    event_index: 70,
  })

  const gmReply = buildEvent({
    id: 'db-gm-99',
    role: 'assistant',
    content: 'La flecha impacta el hombro del centinela.',
    created_at: '2026-03-16T12:00:02.000Z',
    event_index: 71,
  })

  const staleClientTimeline = [optimisticUserEvent]
  const refreshedSnapshot = [persistedUserEvent, gmReply]

  const reconciled = reconcileTimelineSnapshot(staleClientTimeline, refreshedSnapshot)

  assert.deepEqual(
    reconciled.map((event) => event.id),
    ['db-user-99', 'db-gm-99'],
  )
  assert.equal(reconciled[0].client_event_id, 'client-event-99')
  assert.equal(reconciled[0].event_index, 70)
})

test('reconcileTimelineSnapshot makes two clients converge even if one reconnects from an older snapshot', () => {
  const persisted41 = buildEvent({
    id: 'db-user-41',
    role: 'user',
    content: 'Abro la puerta con sigilo.',
    created_at: '2026-03-16T12:00:01.000Z',
    event_index: 41,
    client_event_id: 'client-event-41',
  })

  const gm42 = buildEvent({
    id: 'db-gm-42',
    role: 'assistant',
    content: 'La puerta cede con un leve crujido.',
    created_at: '2026-03-16T12:00:02.000Z',
    event_index: 42,
  })

  const gm43 = buildEvent({
    id: 'db-gm-43',
    role: 'assistant',
    content: 'Del otro lado escuchas pasos apresurados.',
    created_at: '2026-03-16T12:00:03.000Z',
    event_index: 43,
  })

  const clientA = reconcileTimelineSnapshot([], [persisted41, gm42, gm43])
  const clientBStale = reconcileTimelineSnapshot([], [persisted41])
  const clientBAfterReconnect = reconcileTimelineSnapshot(clientBStale, [persisted41, gm42, gm43])

  assert.deepEqual(clientA, clientBAfterReconnect)
})

test('reconcileTimelineSnapshot is idempotent when the same snapshot is applied more than once', () => {
  const snapshot = [
    buildEvent({ id: 'db-80', event_index: 80, created_at: '2026-03-16T12:00:01.000Z' }),
    buildEvent({ id: 'db-81', event_index: 81, created_at: '2026-03-16T12:00:02.000Z' }),
  ]

  const once = reconcileTimelineSnapshot([], snapshot)
  const twice = reconcileTimelineSnapshot(once, snapshot)

  assert.deepEqual(twice, once)
})

test('getHighestTimelineEventIndex returns the highest persisted index only', () => {
  const highest = getHighestTimelineEventIndex([
    buildEvent({ id: 'no-index', event_index: null }),
    buildEvent({ id: 'event-40', event_index: 40 }),
    buildEvent({ id: 'event-41', event_index: 41 }),
  ])

  assert.equal(highest, 41)
})

test('shouldRefreshTimelineGap returns true when an indexed event arrives with a gap', () => {
  const prev = [
    buildEvent({ id: 'event-40', event_index: 40 }),
    buildEvent({ id: 'event-41', event_index: 41 }),
  ]

  const incoming = buildEvent({
    id: 'event-44',
    event_index: 44,
  })

  assert.equal(shouldRefreshTimelineGap(prev, incoming), true)
})

test('shouldRefreshTimelineGap returns false for contiguous indexed events', () => {
  const prev = [
    buildEvent({ id: 'event-40', event_index: 40 }),
    buildEvent({ id: 'event-41', event_index: 41 }),
  ]

  const incoming = buildEvent({
    id: 'event-42',
    event_index: 42,
  })

  assert.equal(shouldRefreshTimelineGap(prev, incoming), false)
})

test('shouldRefreshTimelineGap returns false when there is no prior persisted index yet', () => {
  const prev = [buildEvent({ id: 'optimistic-1', event_index: null })]
  const incoming = buildEvent({
    id: 'event-42',
    event_index: 42,
  })

  assert.equal(shouldRefreshTimelineGap(prev, incoming), false)
})
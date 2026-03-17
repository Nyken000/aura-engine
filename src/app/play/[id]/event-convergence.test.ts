import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

import {
  mergeTimelineEvent,
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
    mergeTimelineEvent(
      mergeTimelineEvent([], optimisticUserEvent), // Initial optimistic state
      persistedUserEvent
    ),
    gmReply,
  )

  const finalClientB = mergeTimelineEvent(
    mergeTimelineEvent([], persistedUserEvent),
    gmReply,
  )

  assert.deepEqual(finalClientA, finalClientB)
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
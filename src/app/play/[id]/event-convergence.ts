export type TimelineEvent = {
  id: string
  created_at: string
  event_index?: number | null
  client_event_id?: string | null
}

export function sortTimelineEvents<T extends TimelineEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const aHasIndex = typeof a.event_index === 'number'
    const bHasIndex = typeof b.event_index === 'number'

    if (aHasIndex && bHasIndex && a.event_index !== b.event_index) {
      return (a.event_index ?? 0) - (b.event_index ?? 0)
    }

    if (aHasIndex !== bHasIndex) {
      return aHasIndex ? -1 : 1
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export function mergeTimelineEvent<T extends TimelineEvent>(prev: T[], incoming: T): T[] {
  const next = [...prev]
  const byId = next.findIndex((event) => event.id === incoming.id)

  if (byId >= 0) {
    next[byId] = { ...next[byId], ...incoming }
    return sortTimelineEvents(next)
  }

  if (incoming.client_event_id) {
    const byClientEventId = next.findIndex(
      (event) => event.client_event_id === incoming.client_event_id,
    )

    if (byClientEventId >= 0) {
      next[byClientEventId] = { ...next[byClientEventId], ...incoming }
      return sortTimelineEvents(next)
    }
  }

  next.push(incoming)
  return sortTimelineEvents(next)
}

export function getHighestTimelineEventIndex<T extends TimelineEvent>(events: T[]): number | null {
  return events.reduce<number | null>((highest, event) => {
    if (typeof event.event_index !== 'number') return highest
    return highest === null ? event.event_index : Math.max(highest, event.event_index)
  }, null)
}

export function shouldRefreshTimelineGap<T extends TimelineEvent>(prev: T[], incoming: T): boolean {
  if (typeof incoming.event_index !== 'number') return false

  const highest = getHighestTimelineEventIndex(prev)
  if (highest === null) return false

  return incoming.event_index > highest + 1
}
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import {
  mergeTimelineEvent,
  reconcileTimelineSnapshot,
  shouldRefreshTimelineGap,
  sortTimelineEvents,
} from '../event-convergence'
import type { GameChatTab, NarrativeEvent, SidebarSelection } from '../types'

function eventMatchesSidebarSelection(event: NarrativeEvent, selection: SidebarSelection) {
  if (!selection) return true

  const semantic = event.payload?.semantic

  if (selection.type === 'quest') {
    const upserts = semantic?.quests?.upserts ?? []
    const updates = semantic?.quests?.updates ?? []

    return (
      upserts.some((quest) => quest.slug === selection.questSlug) ||
      updates.some((update) => update.slug === selection.questSlug)
    )
  }

  if (selection.type === 'relationship') {
    const relationshipMatch =
      semantic?.relationships?.some((relationship) => relationship.npcKey === selection.npcKey) ?? false

    const entityMatch =
      semantic?.entities?.some((entity) => entity.kind === 'npc' && entity.key === selection.npcKey) ?? false

    const companionMatch =
      semantic?.companions?.some((companion) => companion.npcKey === selection.npcKey) ?? false

    return relationshipMatch || entityMatch || companionMatch
  }

  if (selection.type === 'entity') {
    return (
      semantic?.entities?.some(
        (entity) =>
          entity.kind === selection.entity.kind && entity.key === selection.entity.key,
      ) ?? false
    )
  }

  return true
}

export function filterVisibleEvents(
  events: NarrativeEvent[],
  tab: GameChatTab,
  selection?: SidebarSelection,
) {
  return events.filter((event) => {
    const isOoc =
      event.event_type === 'group_message' ||
      event.payload?.channel === 'group' ||
      event.content.startsWith('[OOC]')

    const isHiddenSystemType =
      event.event_type === 'turn_advanced' ||
      event.event_type === 'dice_requested' ||
      event.event_type === 'dice_result' ||
      event.content.startsWith('[TIRADA:') ||
      event.content.startsWith('[SISTEMA_')

    if (isHiddenSystemType) return false
    if (tab === 'group') return isOoc

    return !isOoc && (!selection || eventMatchesSidebarSelection(event, selection))
  })
}

type UseGameTimelineParams = {
  initialEvents: NarrativeEvent[]
  chatTab: GameChatTab
  sidebarSelection?: SidebarSelection
  router: AppRouterInstance
}

export function useGameTimeline({
  initialEvents,
  chatTab,
  sidebarSelection,
  router,
}: UseGameTimelineParams) {
  const [events, setEvents] = useState<NarrativeEvent[]>(() => sortTimelineEvents(initialEvents || []))

  useEffect(() => {
    setEvents((prev) => reconcileTimelineSnapshot(prev, initialEvents || []))
  }, [initialEvents])

  const applyIncomingEvent = useCallback(
    (incoming: NarrativeEvent) => {
      let shouldRefresh = false

      setEvents((prev) => {
        shouldRefresh = shouldRefreshTimelineGap(prev, incoming)
        return mergeTimelineEvent(prev, incoming)
      })

      if (shouldRefresh) {
        router.refresh()
      }
    },
    [router],
  )

  const appendOptimisticEvent = useCallback((optimisticEvent: NarrativeEvent) => {
    setEvents((prev) => mergeTimelineEvent(prev, optimisticEvent))
  }, [])

  const visibleEvents = useMemo(
    () => filterVisibleEvents(events, chatTab, sidebarSelection),
    [events, chatTab, sidebarSelection],
  )

  return {
    events,
    visibleEvents,
    applyIncomingEvent,
    appendOptimisticEvent,
  }
}
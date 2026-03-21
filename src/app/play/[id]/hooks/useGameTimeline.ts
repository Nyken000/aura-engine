import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import {
    mergeTimelineEvent,
    reconcileTimelineSnapshot,
    shouldRefreshTimelineGap,
    sortTimelineEvents,
} from '../event-convergence'
import type { NarrativeEvent } from '../types'

export function filterVisibleEvents(events: NarrativeEvent[], tab: 'adventure' | 'group') {
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

        return !isOoc
    })
}

type UseGameTimelineParams = {
    initialEvents: NarrativeEvent[]
    chatTab: 'adventure' | 'group'
    router: AppRouterInstance
}

export function useGameTimeline({ initialEvents, chatTab, router }: UseGameTimelineParams) {
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

    const visibleEvents = useMemo(() => filterVisibleEvents(events, chatTab), [events, chatTab])

    return {
        events,
        setEvents,
        visibleEvents,
        applyIncomingEvent,
        appendOptimisticEvent,
    }
}
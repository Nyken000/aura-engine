'use client'

import { Bell, HeartHandshake, ScrollText, Shield } from 'lucide-react'
import type { SidebarSelection, WorldAlert } from '../types'

function getTone(alert: WorldAlert) {
    if (alert.kind === 'quest') {
        return {
            border: 'border-amber-900/40',
            bg: 'bg-amber-950/15',
            text: 'text-amber-300',
            icon: <ScrollText className="h-4 w-4" />,
        }
    }

    if (alert.kind === 'social') {
        return {
            border: 'border-violet-900/40',
            bg: 'bg-violet-950/15',
            text: 'text-violet-300',
            icon: <HeartHandshake className="h-4 w-4" />,
        }
    }

    return {
        border: 'border-sky-900/40',
        bg: 'bg-sky-950/15',
        text: 'text-sky-300',
        icon: <Shield className="h-4 w-4" />,
    }
}

export function GameWorldAlerts({
    alerts,
    onSelect,
    onUsePrompt,
}: {
    alerts: WorldAlert[]
    onSelect: (selection: SidebarSelection) => void
    onUsePrompt: (prompt: string) => void
}) {
    if (alerts.length === 0) return null

    return (
        <div className="mb-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-stone-500">
                <Bell className="h-3.5 w-3.5" />
                Mundo vivo
            </div>

            {alerts.map((alert) => {
                const tone = getTone(alert)

                return (
                    <div
                        key={alert.id}
                        className={`rounded-xl border ${tone.border} ${tone.bg} p-4`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className={`mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] ${tone.text}`}>
                                    {tone.icon}
                                    {alert.title}
                                </div>
                                <p className="text-sm leading-relaxed text-stone-300">{alert.detail}</p>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => onSelect(alert.selection)}
                                className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-stone-300 transition hover:bg-stone-900/70"
                            >
                                {alert.actionLabel}
                            </button>

                            {alert.prompt ? (
                                <button
                                    type="button"
                                    onClick={() => onUsePrompt(alert.prompt!)}
                                    className={`rounded-lg border px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition ${tone.border} ${tone.text} hover:bg-stone-900/40`}
                                >
                                    Usar sugerencia
                                </button>
                            ) : null}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
'use client'

import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

type GameAccordionSectionProps = {
    title: string
    subtitle?: string
    icon: ReactNode
    defaultOpen?: boolean
    children: ReactNode
    accent?: 'amber' | 'blood' | 'violet' | 'stone'
}

const ACCENT_STYLES: Record<
    NonNullable<GameAccordionSectionProps['accent']>,
    {
        headerTone: string
        badgeTone: string
        borderTone: string
        glowTone: string
    }
> = {
    amber: {
        headerTone: 'text-amber-300/85',
        badgeTone: 'border-amber-500/20 bg-amber-500/10 text-amber-200/80',
        borderTone: 'border-amber-900/20',
        glowTone: 'from-amber-500/8 to-transparent',
    },
    blood: {
        headerTone: 'text-red-300/85',
        badgeTone: 'border-red-500/20 bg-red-500/10 text-red-200/80',
        borderTone: 'border-red-900/20',
        glowTone: 'from-red-500/8 to-transparent',
    },
    violet: {
        headerTone: 'text-violet-300/85',
        badgeTone: 'border-violet-500/20 bg-violet-500/10 text-violet-200/80',
        borderTone: 'border-violet-900/20',
        glowTone: 'from-violet-500/8 to-transparent',
    },
    stone: {
        headerTone: 'text-stone-300/85',
        badgeTone: 'border-white/10 bg-white/5 text-stone-200/80',
        borderTone: 'border-white/10',
        glowTone: 'from-white/5 to-transparent',
    },
}

export function GameAccordionSection({
    title,
    subtitle,
    icon,
    defaultOpen = true,
    children,
    accent = 'amber',
}: GameAccordionSectionProps) {
    const [open, setOpen] = useState(defaultOpen)
    const tone = ACCENT_STYLES[accent]

    return (
        <section
            className={`glass-card group relative overflow-hidden rounded-[24px] border ${tone.borderTone}`}
        >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tone.glowTone} via-white/10`} />
            <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-amber-500/6 blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-60" />

            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors duration-200 hover:bg-white/[0.02]"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tone.badgeTone}`}
                    >
                        {icon}
                    </div>

                    <div className="min-w-0">
                        <div className={`text-[11px] uppercase tracking-[0.24em] ${tone.headerTone}`}>
                            {title}
                        </div>
                        {subtitle ? (
                            <div className="mt-1 text-xs text-foreground/35">{subtitle}</div>
                        ) : null}
                    </div>
                </div>

                <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/8 bg-black/20 text-foreground/45 transition-transform duration-200 ${open ? 'rotate-180' : ''
                        }`}
                >
                    <ChevronDown className="h-4 w-4" />
                </div>
            </button>

            <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-80'
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-white/5 px-4 pb-4 pt-3">{children}</div>
                </div>
            </div>
        </section>
    )
}
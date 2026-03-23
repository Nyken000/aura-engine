'use client'

import { Wand2 } from 'lucide-react'
import type { ComposerActionRequest, QuickAction } from '../types'

interface GameContextActionsProps {
  title: string
  actions: QuickAction[]
  onUseAction: (action: ComposerActionRequest) => void
}

export function GameContextActions({ title, actions, onUseAction }: GameContextActionsProps) {
  if (actions.length === 0) return null

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone- stone-500 flex items-center gap-2">
        <Wand2 className="h-3.5 w-3.5" />
        {title}
      </h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action) => {
          const toneClass = 
            action.tone === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' :
            action.tone === 'sky' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20' :
            action.tone === 'violet' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20' :
            action.tone === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' :
            'bg-stone-500/10 text-stone-400 border-stone-500/20 hover:bg-stone-500/20'

          return (
            <button
              key={action.id}
              onClick={() => onUseAction({ prompt: action.prompt, intent: action.intent })}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all ${toneClass}`}
            >
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              <span className="truncate">{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
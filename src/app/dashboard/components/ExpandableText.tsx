'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function ExpandableText({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Decide threshold for "long text"
  const isLong = text.length > 250
  const displayText = isExpanded || !isLong ? text : text.slice(0, 250).trim() + '...'

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600/50 rounded-full transition-all duration-300" />
      <div className="pl-6 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-serif pr-24">
        {displayText}
      </div>
      
      {isLong && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute right-0 top-0 px-2 py-1 bg-black/40 hover:bg-stone-800/80 border border-amber-500/30 text-amber-500 hover:text-amber-400 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
        >
          {isExpanded ? (
            <><ChevronUp className="w-3 h-3" /> Ocultar</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Leer Más</>
          )}
        </button>
      )}
    </div>
  )
}

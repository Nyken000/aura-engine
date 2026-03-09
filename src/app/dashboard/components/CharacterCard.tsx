'use client'

import Link from 'next/link'
import { Swords, Trash2, X, Check, ScrollText, Heart } from 'lucide-react'
import { useState } from 'react'
import { deleteCharacter } from '../characters/actions'
import { predefinedCampaigns } from '@/utils/game/campaigns'

export default function CharacterCard({ char }: { char: any }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isConfirming) {
      setIsConfirming(true)
      return
    }
    setIsDeleting(true)
    const res = await deleteCharacter(char.id)
    if (res?.error) {
      alert(res.error)
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsConfirming(false)
  }

  // Stats are stored inside the JSONB `stats` column
  const race = char.stats?.race || 'Raza desconocida'
  const charClass = char.stats?.class || 'Aventurero'
  const hpMax = char.hp_max || '?'
  const hpCurrent = char.hp_current ?? hpMax

  // Find the campaign name if it exists
  const campaign = char.campaign_id 
    ? predefinedCampaigns.find(c => c.id === char.campaign_id) 
    : null

  return (
    <div className="relative group rounded-xl bg-parchment-900/40 border border-white/5 hover:border-blood-500/50 transition-all">
      
      {/* Clickable Area for Navigation */}
      <Link href={`/play/${char.id}`} className="flex-1 flex items-start gap-4 cursor-pointer p-4">
        <div className="w-12 h-12 rounded-lg bg-background border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-blood-500/10 transition-colors mt-0.5">
          <Swords className="w-6 h-6 text-foreground/40 group-hover:text-blood-500 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-white group-hover:text-blood-400 transition-colors truncate">{char.name}</h3>
            <button 
              onClick={handleDelete}
              className="p-1.5 text-foreground/30 hover:text-blood-500 hover:bg-blood-500/10 rounded-lg transition-colors shrink-0"
              title="Eliminar personaje"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-foreground/60 mt-0.5">
            {race} · {charClass}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-blood-400 font-mono">
              <Heart className="w-3 h-3" /> {hpCurrent}/{hpMax}
            </span>
            <span className="text-[10px] text-foreground/40">
              {char.worlds?.name || 'Sin mundo'}
            </span>
          </div>
          {campaign && (
            <div className="mt-2 flex items-center gap-1.5">
              <ScrollText className="w-3 h-3 text-magic-400 shrink-0" />
              <span className="text-[10px] text-magic-400 truncate">{campaign.title}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Delete Confirmation Overlay */}
      {isConfirming && (
        <div className="absolute inset-0 rounded-xl bg-background/90 border border-blood-500/50 backdrop-blur-sm flex items-center justify-center gap-3 z-10 animate-in fade-in">
          <span className="text-sm text-parchment-200">¿Eliminar a <b>{char.name}</b>?</span>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-blood-600 hover:bg-blood-500 transition-colors text-white text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Sí
          </button>
          <button 
            onClick={cancelDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-bold rounded-lg flex items-center gap-1"
          >
            <X className="w-4 h-4" /> No
          </button>
        </div>
      )}
    </div>
  )
}

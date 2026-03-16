'use client'

import Link from 'next/link'
import { Swords, Trash2, X, Check, ScrollText, Heart, User } from 'lucide-react'
import { useState } from 'react'
import { deleteCharacter } from '../characters/actions'
import { predefinedCampaigns } from '@/utils/game/campaigns'

type CharacterCardItem = {
  id: string
  name: string
  hp_max: number
  hp_current: number | null
  campaign_id?: string | null
  stats?: {
    race?: string
    class?: string
  } | null
  worlds?: {
    name?: string | null
  } | null
}

export default function CharacterCard({ char }: { char: CharacterCardItem }) {
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

  const race = char.stats?.race || 'Raza desconocida'
  const charClass = char.stats?.class || 'Aventurero'
  const hpMax = char.hp_max || '?'
  const hpCurrent = char.hp_current ?? hpMax

  const campaign = char.campaign_id
    ? predefinedCampaigns.find((c) => c.id === char.campaign_id)
    : null

  return (
    <div className="relative group rounded-xl bg-parchment-900/40 border border-white/5 hover:border-blood-500/50 transition-all">
      <Link
        href={`/dashboard/characters/${char.id}`}
        className="flex flex-col flex-1 cursor-pointer p-5 group-hover:bg-white/5 transition-colors rounded-t-xl"
      >
        <div className="flex items-start gap-4 mb-2 w-full">
          <div className="w-12 h-12 rounded-lg bg-background border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/10 transition-colors mt-0.5">
            <User className="w-6 h-6 text-foreground/40 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors truncate text-lg">
                {char.name}
              </h3>
              <button
                onClick={handleDelete}
                className="p-1.5 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 z-10 relative"
                title="Eliminar personaje"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-foreground/60 capitalize truncate">
              {race} <span className="text-foreground/30 mx-1">•</span> {charClass}
            </p>

            <div className="flex items-center gap-3 mt-2.5">
              <span className="flex items-center gap-1.5 text-xs text-blood-400 font-mono bg-blood-500/10 px-2 py-0.5 rounded border border-blood-500/20">
                <Heart className="w-3.5 h-3.5" /> {hpCurrent}/{hpMax}
              </span>
              <span className="text-xs text-foreground/50 flex-1 truncate">
                {char.worlds?.name || 'Sin mundo'}
              </span>
            </div>

            {campaign && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                <ScrollText className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
                <span className="text-[10px] text-emerald-400/80 truncate uppercase tracking-widest font-semibold">
                  {campaign.title}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4 pt-2">
        <Link
          href={`/play/${char.id}`}
          className="w-full flex justify-center items-center gap-2 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600 border border-amber-600/30 text-amber-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
        >
          <Swords className="w-4 h-4" /> Jugar Aventura
        </Link>
      </div>

      {isConfirming && (
        <div className="absolute inset-0 rounded-xl bg-background/90 border border-blood-500/50 backdrop-blur-sm flex items-center justify-center gap-3 z-10 animate-in fade-in">
          <span className="text-sm text-parchment-200">
            ¿Eliminar a <b>{char.name}</b>?
          </span>
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
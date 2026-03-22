'use client'

import { Backpack, Heart, Shield, Sparkles, Zap } from 'lucide-react'

import { ALL_SKILLS, formatMod, isSkillProficient, skillModifier, statMod } from '@/utils/game/skills'
import type { CharacterSheet } from '../types'
import { GameAccordionSection } from './GameAccordionSection'

type InventoryLike = {
  name: string
  description?: string | null
  type?: string | null
}

function getModifierTone(value: number) {
  if (value >= 4) return 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.2)]'
  if (value >= 1) return 'text-amber-500/90'
  if (value === 0) return 'text-stone-500'
  return 'text-red-400/80'
}

function getRarityTone(item: InventoryLike | null | undefined) {
  const name = (item?.name || '').toLowerCase()
  const desc = (item?.description || '').toLowerCase()
  
  if (name.includes('mítico') || desc.includes('mítico') || name.includes('legendario')) {
    return 'border-amber-500/40 bg-amber-900/20 text-amber-300'
  }
  if (name.includes('épico') || desc.includes('épico') || name.includes('raro') || desc.includes('raro')) {
    return 'border-purple-500/40 bg-purple-900/20 text-purple-300'
  }
  if (name.includes('inusual') || desc.includes('inusual') || name.includes('mágico') || desc.includes('mágico')) {
    return 'border-sky-500/40 bg-sky-900/20 text-sky-300'
  }
  if (name.includes('maldito') || desc.includes('maldito')) {
    return 'border-red-900/50 bg-red-950/30 text-red-400'
  }
  return 'border-stone-800/50 bg-stone-900/20 text-stone-300'
}

function getArmorClass(character: CharacterSheet) {
  const statsRecord = (character.stats ?? {}) as Record<string, unknown>
  const dex = Number(statsRecord.dex ?? 10)
  const dexMod = statMod(dex)

  const directArmorClass =
    typeof (character as { armor_class?: unknown }).armor_class === 'number'
      ? (character as { armor_class?: number }).armor_class
      : typeof (character as { ac?: unknown }).ac === 'number'
        ? (character as { ac?: number }).ac
        : typeof statsRecord.ac === 'number'
          ? Number(statsRecord.ac)
          : typeof statsRecord.armor_class === 'number'
            ? Number(statsRecord.armor_class)
            : null

  return directArmorClass ?? 10 + dexMod
}

function isTraitItem(item: InventoryLike | null | undefined) {
  const type = (item?.type ?? '').toLowerCase()
  return type === 'passive' || type === 'trait' || type === 'rasgo'
}

export function GameCharacterPanel({ character }: { character: CharacterSheet }) {
  const hpPercentage = Math.max(
    0,
    Math.min(100, ((character.hp_current ?? character.hp_max) / Math.max(character.hp_max, 1)) * 100),
  )

  const armorClass = getArmorClass(character)

  const rawInventory = ((character.inventory ?? []) as InventoryLike[]).filter((i) => i !== null)
  const traits = rawInventory.filter(isTraitItem)
  const inventory = rawInventory.filter((item) => !isTraitItem(item))
  const skills = ALL_SKILLS

  return (
    <aside className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col p-4 bg-stone-950 text-stone-300 gap-3">
      
      {/* HEADER TILE */}
      <section className="shrink-0 relative overflow-hidden rounded-xl border border-stone-800 bg-stone-900/50 p-4">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
        
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-stone-700 bg-stone-950 shadow-inner">
            <Shield className="h-5 w-5 text-stone-500" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-xl tracking-wide text-amber-100/90 truncate">
              {character.name}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-stone-500 truncate">
              {character.stats?.race || 'Aventurero'} <span className="mx-1">·</span> {character.stats?.class || 'Sin clase'}
            </p>
          </div>
        </div>

        {/* VITALS & AC */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center justify-center rounded border border-red-900/20 bg-red-950/10 p-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent pointer-events-none" />
            <div className="relative flex h-10 w-10 items-center justify-center">
              {/* Background Heart (Empty) */}
              <Heart className="absolute h-9 w-9 text-stone-900" fill="currentColor" />
              {/* Foreground Heart (Filled based on HP) */}
              <Heart 
                className="absolute h-9 w-9 text-red-600 transition-all duration-1000" 
                fill="currentColor" 
                style={{ clipPath: `inset(${100 - hpPercentage}% 0 0 0)` }} 
              />
              {/* Outline */}
              <Heart className="absolute h-9 w-9 text-red-900/50" />
            </div>
            <div className="mt-2 font-serif text-lg text-red-200 z-10">
              {character.hp_current}<span className="text-xs text-red-500/70 mx-0.5">/</span>{character.hp_max}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-red-500/70 mt-0.5 z-10">
              Salud
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded border border-stone-800 bg-stone-900/40 p-3">
            <div className="relative flex h-10 w-10 items-center justify-center">
               <Shield className="absolute h-9 w-9 text-stone-700" fill="none" strokeWidth={1.5} />
               <div className="absolute inset-0 flex items-center justify-center">
                 <span className="font-serif text-lg text-amber-100/90 leading-none mt-0.5">{armorClass}</span>
               </div>
            </div>
            <div className="mt-2 font-serif text-sm text-stone-400 invisible h-0">
              {armorClass}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-stone-500 mt-2.5">
              Armadura
            </div>
          </div>
        </div>
      </section>

      {/* ATTRIBUTES */}
      <div className="shrink-0">
        <GameAccordionSection
          title="Atributos"
          subtitle="Habilidades innatas"
          icon={<Zap className="h-4 w-4" />}
          defaultOpen
          accent="amber"
        >
          <div className="grid grid-cols-3 gap-2">
            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((stat) => {
              const value = Number(character.stats?.[stat] || 10)
              const mod = statMod(value)

              return (
                <div key={stat} className="relative rounded border border-amber-900/20 bg-stone-900/40 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-amber-500/70 mb-1">{stat}</div>
                  <div className="font-serif text-xl text-amber-100">{value}</div>
                  <div className={`mt-0.5 text-xs font-bold ${getModifierTone(mod)}`}>
                    {formatMod(mod)}
                  </div>
                </div>
              )
            })}
          </div>
        </GameAccordionSection>
      </div>

      {/* SKILLS */}
      <div className="shrink-0">
        <GameAccordionSection
          title="Habilidades"
          subtitle="Competencias adquiridas"
          icon={<Sparkles className="h-4 w-4" />}
          defaultOpen={false}
          accent="stone"
        >
          <div className="grid grid-cols-2 gap-1.5">
            {skills.map((skill) => {
              const base = Number(character.stats?.[skill.stat] || 10)
              const proficient = isSkillProficient(skill, character.skills ?? [])
              const value = skillModifier(base, proficient)

              return (
                <div key={skill.name} className="flex flex-col rounded border border-sky-900/20 bg-stone-900/20 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className={`shrink-0 h-1 w-1 rounded-full ${proficient ? 'bg-sky-500' : 'bg-stone-700'}`} />
                      <span className="text-[10px] text-stone-300 tracking-wide truncate">{skill.name}</span>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ml-1 ${getModifierTone(value)}`}>
                      {formatMod(value)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </GameAccordionSection>
      </div>

      {/* TRAITS */}
      <div className="shrink-0">
        <GameAccordionSection
          title="Rasgos y Magia"
          subtitle={`${traits.length} habilidades pasivas`}
          icon={<Sparkles className="h-4 w-4" />}
          defaultOpen={traits.length > 0}
          accent="violet"
        >
          <div className="space-y-2">
            {traits.length ? traits.map(item => (
              <div key={item.name} className="rounded border border-emerald-900/30 bg-emerald-950/10 p-3">
                <h4 className="text-xs font-serif text-emerald-400 mb-1 tracking-wide">{item.name}</h4>
                <p className="text-[11px] text-stone-400 leading-relaxed font-light">{item.description}</p>
              </div>
            )) : (
              <div className="text-center p-3 text-xs italic text-stone-600">Sin habilidades especiales.</div>
            )}
          </div>
        </GameAccordionSection>
      </div>

      {/* INVENTORY */}
      <div className="shrink-0">
        <GameAccordionSection
          title="Inventario"
          subtitle="Objetos y reliquias"
          icon={<Backpack className="h-4 w-4" />}
          defaultOpen={false}
          accent="stone"
        >
          <div className="space-y-2">
            {inventory.length ? inventory.map(item => {
              const tone = getRarityTone(item)
              return (
                <div key={item.name} className={`rounded border ${tone} p-3`}>
                  <h4 className="text-xs font-serif mb-1 tracking-wide">{item.name}</h4>
                  <p className="text-[11px] opacity-80 leading-relaxed font-light">{item.description || 'Objeto misterioso.'}</p>
                </div>
              )
            }) : (
              <div className="text-center p-3 text-xs italic text-stone-600">Bolsa vacía.</div>
            )}
          </div>
        </GameAccordionSection>
      </div>

    </aside>
  )
}
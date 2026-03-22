import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Shield,
  Swords,
  Heart,
  Activity,
  ScrollText,
  User,
  Package,
  Target,
  Sparkles,
  Flame,
  BookOpen,
  Brain,
} from 'lucide-react'
import ExpandableText from '../../components/ExpandableText'
import { RACE_DESCRIPTIONS, CLASS_DESCRIPTIONS } from '@/data/dnd/basic_descriptions'
import { ALL_SKILLS, skillModifier, formatMod, isSkillProficient } from '@/utils/game/skills'


export const dynamic = 'force-dynamic'

type CharacterStats = {
  str?: number
  dex?: number
  con?: number
  int?: number
  wis?: number
  cha?: number
  race?: string
  class?: string
  background?: string
  class_progression?: ClassProgressionEntry[]
  custom_spells?: SpellEntry[]
  [key: string]: unknown
}

type InventoryItem = {
  name?: string
  type?: 'item' | 'weapon' | 'magic_item' | 'passive' | 'racial'
  description?: string
  damage?: string
  properties?: string
  rarity?: string
}

type ClassProgressionEntry = {
  level?: number
  features?: string[]
}

type SpellEntry = {
  name?: string
  level?: string
  casting_time?: string
  range?: string
  description?: string
}

function calculateModifier(score: number) {
  return Math.floor((score - 10) / 2)
}

function formatModifier(mod: number) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export default async function CharacterSheetPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth')

  // Fetch character and background
  const { data: character } = await supabase
    .from('characters')
    .select(`
      *,
      background:backgrounds(*)
    `)
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (!character) notFound()

  // Parse stats JSONB
  let stats: CharacterStats = {}
  try {
    stats = typeof character.stats === 'string' ? JSON.parse(character.stats) : (character.stats || {})
  } catch (e: unknown) {
    console.error("Failed to parse stats", e)
  }

  // Calculate modifiers
  const modifiers = {
    str: calculateModifier(Number(stats.str) || 10),
    dex: calculateModifier(Number(stats.dex) || 10),
    con: calculateModifier(Number(stats.con) || 10),
    int: calculateModifier(Number(stats.int) || 10),
    wis: calculateModifier(Number(stats.wis) || 10),
    cha: calculateModifier(Number(stats.cha) || 10),
  }

  // Parse arrays
  let skills: string[] = []
  let inventoryRaw: InventoryItem[] = []
  try { skills = typeof character.skills === 'string' ? JSON.parse(character.skills) : (character.skills || []) } catch(e: unknown){ console.error(e) }
  try { inventoryRaw = typeof character.inventory === 'string' ? JSON.parse(character.inventory) : (character.inventory || []) } catch(e: unknown){ console.error(e) }

  // Separate physical items from passive/magical AI traits
  const items = inventoryRaw.filter(i => i && typeof i === 'object' ? i.type !== 'passive' : true)
  const passives = inventoryRaw.filter(i => i && typeof i === 'object' && i.type === 'passive')

  const raceValue = stats.race || character.race || 'Desconocido'
  const classValue = stats.class || character.class || 'Desconocido'
  
  const raceInfo = RACE_DESCRIPTIONS[raceValue] || { flavor: 'Aventurero misterioso.', mechanics: '' }
  const classInfo = CLASS_DESCRIPTIONS[classValue] || { flavor: 'Aventurero novato.', mechanics: '', role: 'Desconocido' }

  return (
    <div className="flex-1 bg-black bg-opacity-90 overflow-y-auto w-full relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1601158935942-52254682594fea?q=80&w=2000')] bg-cover bg-center opacity-5 mix-blend-overlay pointer-events-none" />
      <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-amber-900/20 to-transparent pointer-events-none" />

      <main className="max-w-7xl mx-auto p-4 md:p-8 pt-24 relative z-10 w-full">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-amber-500 hover:text-amber-400 font-serif flex items-center gap-2 w-fit transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Posada</span>
          </Link>
        </div>

        {/* HEADER: Identity */}
        <header className="flex flex-col md:flex-row gap-6 items-end mb-12">
          {/* Avatar frame */}
          <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-stone-900 border-2 border-amber-600/50 rounded-2xl shadow-[0_0_30px_-5px_rgba(217,119,6,0.3)] flex items-center justify-center relative overflow-hidden">
            {character.avatar_url ? (
              <Image
                src={character.avatar_url}
                alt={character.name}
                fill
                className="object-cover"
                sizes="160px"
              />
            ) : (
              <User className="w-16 h-16 text-amber-600/30" />
            )}
            <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm p-1 text-center">
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Nivel {character.level}</span>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-4xl md:text-6xl font-black font-serif text-white tracking-tight mb-2 drop-shadow-md">
              {character.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              <span className="bg-amber-900/40 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                {raceValue}
              </span>
              <span className="bg-blue-900/40 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                {classValue}
              </span>
              <span className="bg-purple-900/40 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                {character.background?.name || stats.background || 'Aventurero'}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
             <Link href={`/play/${character.id}`} className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-xl font-bold font-serif shadow-lg shadow-amber-900/50 transition-all flex items-center gap-2 group">
              <Swords className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Jugar Aventura
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Stats & Core */}
          <div className="lg:col-span-4 space-y-8">
            {/* Health & Armor Module */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl flex justify-around">
              <div className="text-center group">
                <div className="w-16 h-16 mx-auto bg-red-900/20 border border-red-500/30 rounded-full flex items-center justify-center mb-2 group-hover:border-red-500 transition-colors">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-2xl font-black text-white">{character.hp_current} / {character.hp_max}</div>
                <div className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold">Puntos de Golpe</div>
              </div>
              
              <div className="w-px bg-white/10" />

              <div className="text-center group mt-2 flex flex-col justify-end">
                <div className="w-16 h-16 mx-auto bg-slate-900/30 border border-slate-500/30 hover:border-slate-400 rounded-full flex items-center justify-center mb-2 transition-colors">
                  <Shield className="w-6 h-6 text-slate-400" />
                </div>
                <div className="text-2xl font-black text-white">{10 + modifiers.dex}</div>
                <div className="text-[10px] text-foreground/50 uppercase tracking-widest font-bold">C.A. (Base)</div>
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
              <h3 className="text-lg font-bold font-serif text-amber-500 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5" /> Atributos Principales
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'str', label: 'Fuerza', score: Number(stats.str) || 10, mod: modifiers.str, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30' },
                  { key: 'dex', label: 'Destreza', score: Number(stats.dex) || 10, mod: modifiers.dex, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
                  { key: 'con', label: 'Constitución', score: Number(stats.con) || 10, mod: modifiers.con, color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
                  { key: 'int', label: 'Inteligencia', score: Number(stats.int) || 10, mod: modifiers.int, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
                  { key: 'wis', label: 'Sabiduría', score: Number(stats.wis) || 10, mod: modifiers.wis, color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
                  { key: 'cha', label: 'Carisma', score: Number(stats.cha) || 10, mod: modifiers.cha, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
                ].map(stat => (
                  <div key={stat.key} className={`flex items-center p-3 rounded-xl border ${stat.bg} ${stat.border} relative overflow-hidden group`}>
                    <div className="flex-1 z-10">
                      <div className="text-[10px] uppercase font-bold text-foreground/60 tracking-wider mb-1">{stat.label}</div>
                      <div className="text-2xl font-black text-white">{stat.score}</div>
                    </div>
                    <div className={`text-3xl font-black opacity-40 z-10 ${stat.color}`}>
                      {formatModifier(stat.mod)}
                    </div>
                    {/* Decorative giant letter */}
                    <div className="absolute -right-4 -bottom-4 text-7xl font-black text-white/5 select-none z-0 group-hover:scale-110 transition-transform">
                      {stat.label.substring(0,3).toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Proficiencies */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
              <h3 className="text-lg font-bold font-serif text-amber-500 mb-6 flex items-center justify-between">
                <span className="flex items-center gap-2"><Target className="w-5 h-5" /> Habilidades</span>
                <span className="text-[10px] text-amber-500/50 font-sans tracking-widest font-bold">PROF +2</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {ALL_SKILLS.map((skill, i) => {
                  const statValue = stats[skill.stat] ?? 10
                  const isProficient = isSkillProficient(skill, skills)
                  const totalMod = skillModifier(statValue as number, isProficient)
                  return (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-stone-900/40 border border-white/5 hover:border-white/10 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full border border-amber-500/50 shrink-0 transition-colors ${isProficient ? 'bg-amber-500 shadow-[0_0_10px_-2px_rgba(245,158,11,0.5)]' : 'bg-transparent'}`} title={isProficient ? 'Competente' : ''} />
                        <span className={`text-sm truncate transition-colors ${isProficient ? 'text-parchment-200 font-medium' : 'text-foreground/50'}`}>
                          {skill.name} <span className="text-[10px] text-foreground/40 uppercase ml-1">({skill.stat.substring(0,3)})</span>
                        </span>
                      </div>
                      <span className={`text-sm font-mono shrink-0 transition-colors ${isProficient ? 'text-amber-400 font-bold' : 'text-foreground/40'}`}>
                        {formatMod(totalMod)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Lore, Features & Inventory */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Features (Race & Class) */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
              <h3 className="text-xl font-bold font-serif text-amber-500 mb-6 flex items-center gap-2">
                <Brain className="w-5 h-5" /> Rasgos y Capacidades
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-amber-900/10 border border-amber-500/20 p-5 rounded-xl">
                  <h4 className="font-bold text-amber-400 mb-2 border-b border-amber-500/20 pb-2">Legado: {raceValue}</h4>
                  <p className="text-xs text-foreground/70 mb-3 italic">{raceInfo.flavor}</p>
                  <div className="text-xs bg-black/50 p-3 rounded font-medium text-amber-500/90 leading-relaxed">
                    {stats.racial_traits && Array.isArray(stats.racial_traits) && stats.racial_traits.length > 0 ? (
                      <ul className="space-y-2">
                        {stats.racial_traits.map((trait: string, i: number) => {
                          const [name, ...descParts] = trait.split(':')
                          const desc = descParts.join(':').trim()
                          return (
                            <li key={i} className="flex gap-2 items-start">
                              <span className="text-[10px] mt-0.5">•</span>
                              <div>
                                {desc ? (
                                  <><span className="text-emerald-300 font-bold">{name}: </span><span className="text-foreground/80 font-normal">{desc}</span></>
                                ) : (
                                  <span className="text-foreground/80 font-normal">{trait}</span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      raceInfo.mechanics
                    )}
                  </div>
                </div>

                <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-xl">
                  <h4 className="font-bold text-blue-400 mb-2 border-b border-blue-500/20 pb-2">Profesión: {classValue}</h4>
                  <p className="text-xs text-foreground/70 mb-3 italic">{classInfo.flavor}</p>
                  <div className="text-xs bg-black/50 p-3 rounded font-medium text-blue-400/90 leading-relaxed">
                    {stats.class_features && Array.isArray(stats.class_features) && stats.class_features.length > 0 ? (
                      <ul className="space-y-2">
                        {stats.class_features.map((feature: string, i: number) => {
                          const [name, ...descParts] = feature.split(':')
                          const desc = descParts.join(':').trim()
                          return (
                            <li key={i} className="flex gap-2 items-start">
                              <span className="text-[10px] mt-0.5">•</span>
                              <div>
                                {desc ? (
                                  <><span className="text-blue-300 font-bold">{name}: </span><span className="text-foreground/80 font-normal">{desc}</span></>
                                ) : (
                                  <span className="text-foreground/80 font-normal">{feature}</span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : classInfo.mechanics ? (
                      <>
                        <span className="block text-foreground/50 mb-1 font-bold">Cualidades Básicas:</span>
                        <span className="text-foreground/80 font-normal">{classInfo.mechanics}</span>
                      </>
                    ) : (
                      <span className="text-foreground/50 italic font-normal">Habilidades especiales en desarrollo. Las aventuras forjarán su camino.</span>
                    )}
                  </div>
                </div>
              </div>

              {passives.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-6">
                  <h4 className="font-bold text-magic-400 mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Dones del Oráculo
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {passives.map((trait, i) => (
                      <div key={i} className="bg-magic-900/10 border border-magic-500/20 p-4 rounded-xl relative overflow-hidden group hover:border-magic-500/40 transition-colors">
                        <div className="absolute -right-4 -bottom-4 text-7xl font-black text-magic-500/5 select-none z-0 group-hover:scale-110 transition-transform">✦</div>
                        <h5 className="font-bold text-magic-300 mb-1 relative z-10">{trait.name}</h5>
                        <p className="text-xs text-foreground/70 leading-relaxed relative z-10">{trait.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Class Progression Roadmap */}
            {stats.class_progression && Array.isArray(stats.class_progression) && stats.class_progression.length > 0 && (
              <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
                 <h3 className="text-xl font-bold font-serif text-blue-400 mb-6 flex items-center gap-2">
                  <Flame className="w-5 h-5" /> Progresión de Clase
                </h3>
                
                <div className="relative border-l border-white/10 ml-3 md:ml-4 space-y-6 pb-2">
                  {stats.class_progression.map((prog: ClassProgressionEntry, i: number) => (
                    <div key={i} className="relative pl-6 md:pl-8">
                      {/* Timeline dot */}
                      <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                      
                      <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 transition-colors group">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold tracking-wider mb-2 border border-blue-500/30">
                          NIVEL {prog.level}
                        </span>
                        
                        <ul className="space-y-2">
                          {prog.features && Array.isArray(prog.features) ? prog.features.map((feature: string, j: number) => {
                            const [name, ...descParts] = feature.split(':')
                            const desc = descParts.join(':').trim()
                            return (
                              <li key={j} className="text-sm">
                                {desc ? (
                                  <><span className="text-blue-300 font-bold">{name}: </span><span className="text-foreground/80 leading-relaxed">{desc}</span></>
                                ) : (
                                  <span className="text-foreground/80 leading-relaxed">{feature}</span>
                                )}
                              </li>
                            )
                          }) : null}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Backstory & Background */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
               <h3 className="text-xl font-bold font-serif text-amber-500 mb-6 flex items-center gap-2">
                <ScrollText className="w-5 h-5" /> Origen e Historia
              </h3>
              
              {character.background && (
                <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-5 mb-6">
                  <h4 className="font-bold text-purple-400 mb-2">Trasfondo: {character.background.name}</h4>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                    {character.background.description}
                  </p>
                  {character.background.feature_name && (
                    <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30">
                      <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Beneficio Exclusivo</span>
                      <h5 className="font-bold text-white mb-2">{character.background.feature_name}</h5>
                      <p className="text-xs text-purple-100/70 leading-relaxed">
                        {character.background.feature_description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!character.background && !character.background_story && (
                <p className="text-sm text-foreground/50 italic mt-2">
                  Orígenes inciertos... La historia de este aventurero aún está por escribirse en las estrellas.
                </p>
              )}

              {character.background_story && (
                <ExpandableText text={character.background_story} />
              )}
            </div>

            {/* Grimoire / Spells */}
            {stats.custom_spells && Array.isArray(stats.custom_spells) && stats.custom_spells.length > 0 && (
              <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
                 <h3 className="text-xl font-bold font-serif text-magic-400 mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" /> Grimorio y Habilidades Activas
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {stats.custom_spells.map((spell: SpellEntry, i: number) => (
                    <div key={i} className="bg-magic-900/10 border border-magic-500/20 p-4 rounded-xl hover:border-magic-500/40 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-magic-300">{spell.name}</h4>
                        <span className="text-[10px] bg-magic-900/40 text-magic-200 px-2 py-1 rounded border border-magic-500/30 uppercase tracking-widest">{spell.level}</span>
                      </div>
                      <div className="flex gap-4 mb-3 text-xs text-foreground/60">
                        {spell.casting_time && <span><strong className="text-foreground/80">Mecánica:</strong> {spell.casting_time}</span>}
                        {spell.range && <span><strong className="text-foreground/80">Alcance:</strong> {spell.range}</span>}
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{spell.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory / Equipment */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
               <h3 className="text-xl font-bold font-serif text-amber-500 mb-6 flex items-center gap-2">
                <Package className="w-5 h-5" /> Inventario
              </h3>
              
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.length > 0 ? (
                  items.map((item: InventoryItem, i: number) => (
                    <li key={i} className={`bg-stone-900/80 border p-3 rounded-lg flex items-start gap-3 transition-colors ${item.type === 'magic_item' ? 'border-purple-500/30 hover:border-purple-500/50' : item.type === 'weapon' ? 'border-red-500/20 hover:border-red-500/40' : 'border-white/5 hover:border-amber-500/20'}`}>
                      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5 border ${item.type === 'magic_item' ? 'bg-purple-900/30 border-purple-500/30 text-purple-400' : item.type === 'weapon' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-amber-900/30 border-amber-500/30 text-amber-500/70'}`}>
                        {item.type === 'weapon' ? <Swords className="w-4 h-4" /> : item.type === 'magic_item' ? <Sparkles className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-medium block ${item.type === 'magic_item' ? 'text-purple-300' : item.type === 'weapon' ? 'text-red-200' : 'text-white'}`}>{item.name || 'Objeto sin nombre'}</span>
                        
                        {item.type === 'weapon' && (
                           <div className="flex gap-2 mt-1.5 mb-1">
                              {item.damage && <span className="text-[10px] bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded border border-red-500/20">{item.damage}</span>}
                              {item.properties && <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded border border-white/10">{item.properties}</span>}
                           </div>
                        )}
                        
                        {item.type === 'magic_item' && item.rarity && (
                           <div className="mt-1.5 mb-1">
                              <span className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase tracking-wider font-bold">{item.rarity}</span>
                           </div>
                        )}

                        {item.description && (
                          <span className="text-xs text-foreground/60 block mt-1 leading-relaxed">{item.description}</span>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-foreground/50 italic col-span-2">Mochila vacía. Consigue equipo durante tus aventuras.</li>
                )}
              </ul>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Swords, 
  Send, 
  Heart, 
  Backpack, 
  Book, 
  Zap,
  MessageSquare,
  Users,
  ScrollText,
  ArrowLeft,
  Shield,
  Flame,
  Target
} from 'lucide-react'
import { submitChatAction } from './actions'
import { type Campaign } from '@/utils/game/campaigns'
import { ALL_SKILLS, skillModifier, formatMod, isSkillProficient, statMod } from '@/utils/game/skills'
import { DiceRoller } from './components/DiceRoller'

// ─── TypewriterMessage Component ───────────────────────────────────────────
// Reveals GM text paragraph by paragraph, letter by letter, with fade-in
function TypewriterMessage({ 
  text, 
  charSpeed = 20,
  onComplete 
}: { 
  text: string
  charSpeed?: number
  onComplete?: () => void 
}) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Store onComplete in a ref so changing it never re-triggers the effect
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete })

  useEffect(() => {
    idxRef.current = 0
    setDisplayed('')

    const tick = () => {
      if (idxRef.current < text.length) {
        idxRef.current++
        setDisplayed(text.slice(0, idxRef.current))
        timerRef.current = setTimeout(tick, charSpeed)
      } else {
        onCompleteRef.current?.()
      }
    }

    timerRef.current = setTimeout(tick, 60)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [text, charSpeed])  // ← onComplete deliberately excluded

  const isDone = displayed.length >= text.length

  // Split into paragraphs and animate each one as it's revealed
  const paragraphs = text.split('\n')
  let charsRendered = 0

  return (
    <div className="gm-text text-parchment-200 space-y-1">
      {paragraphs.map((para, pIdx) => {
        const paraStart = charsRendered
        const paraEnd = paraStart + para.length
        charsRendered = paraEnd + 1 // +1 for the \n

        const visibleChars = Math.max(0, Math.min(para.length, displayed.length - paraStart))
        const visiblePara = para.slice(0, visibleChars)
        const isParaStarted = displayed.length > paraStart
        const isLastPara = pIdx === paragraphs.length - 1
        const isLastVisible = isLastPara || displayed.length <= paraEnd

        if (!isParaStarted && para === '') return <div key={pIdx} className="h-2" />
        if (!isParaStarted) return null

        return (
          <p
            key={pIdx}
            className={`${
              para === '' ? 'h-2' : 'min-h-[1.5em]'
            } animate-in fade-in slide-in-from-bottom-1 duration-300`}
          >
            {visiblePara}
            {/* Blinking cursor at the very end of what's typed so far */}
            {isLastVisible && !isDone && (
              <span className="inline-block w-0.5 h-[1.1em] bg-amber-400/80 ml-[1px] animate-pulse align-middle rounded-sm" />
            )}
          </p>
        )
      })}
    </div>
  )
}

type Event = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  characters?: { name: string }
  dice_roll_required?: {
    needed: boolean
    die: string
    stat: string
    skill: string | null
    dc: number
    flavor: string
  } | null
  combat?: {
    in_combat: boolean
    initiative_requested: boolean
  } | null
}

// Per-campaign accent colors for the right panel
const CAMPAIGN_THEME: Record<string, { border: string; glow: string; badge: string; label: string }> = {
  'oakhaven-fall':    { border: 'border-gray-500/40',   glow: 'shadow-[0_0_20px_-5px_rgba(100,116,139,0.4)]',  badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30',   label: '🌫️ Ceniza' },
  'leviathan-veil':   { border: 'border-cyan-500/40',   glow: 'shadow-[0_0_20px_-5px_rgba(8,145,178,0.4)]',   badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',   label: '⚓ Mar' },
  'eternal-flame':    { border: 'border-amber-500/40',  glow: 'shadow-[0_0_20px_-5px_rgba(202,138,4,0.5)]',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: '🔥 Fuego' },
  'crimson-carnival': { border: 'border-purple-500/40', glow: 'shadow-[0_0_20px_-5px_rgba(147,51,234,0.4)]',  badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',label: '🎪 Carnaval' },
  'sand-king-tomb':   { border: 'border-yellow-600/40', glow: 'shadow-[0_0_20px_-5px_rgba(161,98,7,0.4)]',   badge: 'bg-yellow-700/20 text-yellow-300 border-yellow-700/30',label: '🏜️ Desierto' },
}

// Ember particle component for atmosphere
function EmberParticles() {
  return (
    <div className="ember-container absolute inset-0 pointer-events-none overflow-hidden opacity-60" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="ember"
          style={{
            left: `${10 + i * 9}%`,
            '--duration': `${3 + (i % 4)}s`,
            '--delay': `${i * 0.7}s`,
            '--drift': `${-15 + (i % 5) * 10}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export default function GameClient({ 
  character, 
  world, 
  campaign,
  initialEvents, 
  currentUser 
}: { 
  character: any
  world: any
  campaign: Campaign | null
  initialEvents: Event[]
  currentUser: any 
}) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [typewriterText, setTypewriterText] = useState('')  // GM text to typewrite
  const [isTyping, setIsTyping] = useState(false)           // typewriter in progress
  const [pendingDiceRoll, setPendingDiceRoll] = useState<any>(null) // Holds roll data until GM message finishes typing
  const [chatTab, setChatTab] = useState<'adventure' | 'group'>('adventure')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [events, chatTab, isTyping])

  const visibleEvents = events.filter(e => {
    const isOOC = e.content.startsWith('[OOC]')
    const isRollResult = e.content.startsWith('[TIRADA:')
    const isSystemEvent = e.content.startsWith('[SISTEMA_')
    
    if (isRollResult || isSystemEvent) return false // Hide internal mechanic results from chat UI
    
    if (chatTab === 'adventure') return !isOOC
    if (chatTab === 'group') return isOOC
    return true
  })

  // Function to shoot an automated message into the chat (like a dice roll result)
  const submitAutomatedAction = async (msg: string) => {
    setIsSending(true)
    const optimisticEvent: Event = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
      characters: { name: character.name }
    }
    
    // Only show optimistic event if it's not a silent system roll
    const isSilentEvent = msg.startsWith('[TIRADA')
    if (!isSilentEvent) {
      setEvents(prev => [...prev, optimisticEvent])
    }

    try {
      const response = await fetch('/api/engine/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: character.id, content: msg })
      })

      if (!response.ok || !response.body) throw new Error('Error del servidor')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.chunk) accumulated += parsed.chunk
            if (parsed.done) {
              const finalNarrative = parsed.narrative ?? accumulated
              setIsTyping(true)
              setTypewriterText(finalNarrative)
              setPendingDiceRoll(parsed.dice_roll_required)
              setIsSending(false)
              router.refresh()
            }
          } catch {}
        }
      }
    } catch (err: any) {
      console.error('Streaming error:', err)
      setIsSending(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return
    const userMessage = inputText.trim()
    setInputText('')
    setIsSending(true)
    setTypewriterText('')
    setIsTyping(false)
    setPendingDiceRoll(null)

    // Optimistic user message
    const optimisticEvent: Event = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatTab === 'group' ? `[OOC] ${userMessage}` : userMessage,
      created_at: new Date().toISOString(),
      characters: { name: character.name }
    }
    setEvents(prev => [...prev, optimisticEvent])

    // OOC group chat — simple server action, no streaming
    if (chatTab === 'group') {
      const res = await submitChatAction(character.id, userMessage, 'group')
      if (res?.error) {
        alert(res.error)
        setEvents(prev => prev.filter(ev => ev.id !== optimisticEvent.id))
      }
      setIsSending(false)
      return
    }

    // Adventure — consume Gemini SSE stream
    try {
      const response = await fetch('/api/engine/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: character.id, content: userMessage })
      })

      if (!response.ok || !response.body) {
        throw new Error('Error del servidor')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))

            if (parsed.error) {
              throw new Error(parsed.error)
            }

            if (parsed.chunk) {
              accumulated += parsed.chunk
              // Silent accumulation — no live display
            }

            if (parsed.done) {
              // Use the narrative already extracted by the server
              const finalNarrative = parsed.narrative 
                ?? accumulated  // fallback: re-extract if server narrative missing
                    .replace(/```json\s*/gi, '').replace(/```\s*/g, '')
                    .match(/"narrative_response"\s*:\s*"((?:[^"\\]|\\.)*)"/)
                    ?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') 
                ?? accumulated

              // Trigger typewriter animation
              setIsTyping(true)
              setTypewriterText(finalNarrative)
              setPendingDiceRoll(parsed.dice_roll_required)
              setIsSending(false)
              router.refresh()
            }
          } catch {}
        }
      }
    } catch (err: any) {
      console.error('Streaming error:', err)
      alert('El Oráculo no pudo responder. Intenta de nuevo.')
      setEvents(prev => prev.filter(ev => ev.id !== optimisticEvent.id))
    }

    setIsSending(false)
  }

  // --- HP calculations ---
  const hpPercentage = Math.max(0, Math.min(100, ((character.hp_current ?? character.hp_max) / character.hp_max) * 100))
  const isCritical = hpPercentage <= 20
  const hpBarColor = hpPercentage > 50 ? 'bg-emerald-500' : hpPercentage > 20 ? 'bg-amber-400' : 'bg-red-500'

  // Stat modifier helper
  const modifier = (val: number) => {
    const mod = Math.floor((val - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  const campaignTheme = campaign && CAMPAIGN_THEME[campaign.id]

  return (
    <div className="h-screen w-full bg-background flex flex-col text-foreground overflow-hidden relative">
      
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(202,138,4,0.04),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_100%,rgba(138,3,3,0.05),transparent)]" />
      </div>

      {/* Top Navbar */}
      <nav className="relative z-20 h-14 border-b border-amber-900/20 bg-stone-950/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="p-2 text-foreground/40 hover:text-parchment-200 hover:bg-parchment-900/30 rounded-lg transition-all duration-200 cursor-pointer"
            title="Volver a la Taverna"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-px h-5 bg-amber-900/40" />
          <div>
            <p className="font-display text-sm font-bold text-parchment-200 leading-none">{world.name}</p>
            <p className="text-[10px] text-foreground/40 mt-0.5">Sesión en curso</p>
          </div>
        </div>
        {campaign && (
          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${campaignTheme?.badge ?? 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            <ScrollText className="w-3 h-3" />
            {campaign.title}
          </div>
        )}
        <div className="w-20" /> {/* Spacer */}
      </nav>

      {/* Main 3-Column Layout */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        
        {/* ════ LEFT PANEL: Character Sheet ════ */}
        <aside className="w-72 border-r border-amber-900/20 bg-stone-950/60 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-5">
            
            {/* Character Header */}
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blood-700/60 to-stone-900 border border-blood-500/25 flex items-center justify-center shrink-0 shadow-blood-sm">
                <Swords className="w-7 h-7 text-blood-400" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-base text-parchment-100 leading-tight truncate">{character.name}</h2>
                <p className="text-xs text-amber-500/80 mt-0.5 font-medium">{character.stats?.class || 'Aventurero'}</p>
                <p className="text-[10px] text-foreground/40 uppercase tracking-widest mt-0.5">{character.stats?.race || 'Desconocida'}</p>
              </div>
            </div>

            {/* Health Bar */}
            <div className="space-y-2 p-3 rounded-xl bg-stone-900/60 border border-blood-900/30">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="flex items-center gap-1.5 font-bold text-blood-400">
                  <Heart className="w-3.5 h-3.5" /> Puntos de Vida
                </span>
                <span className={isCritical ? 'text-red-400 font-bold animate-pulse' : 'text-parchment-200 font-bold'}>
                  {character.hp_current ?? character.hp_max} / {character.hp_max}
                </span>
              </div>
              <div className="h-2.5 w-full bg-stone-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full ${hpBarColor} rounded-full transition-all duration-700 ${isCritical ? 'hp-critical' : ''}`}
                  style={{ width: `${hpPercentage}%` }}
                />
              </div>
              <div className="text-[10px] text-foreground/40 flex justify-between">
                <span>Dados de Golpe: <span className="text-amber-600/70 font-mono">{character.hit_dice || '1d8'}</span></span>
                <span className={isCritical ? 'text-red-400/80 font-bold' : 'text-foreground/30'}>
                  {isCritical ? '¡ESTADO CRÍTICO!' : `${Math.round(hpPercentage)}%`}
                </span>
              </div>
            </div>

            {/* Stats Grid — 3x2 D&D style */}
            <div>
              <h3 className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Atributos
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'str', label: 'FUE', color: 'text-red-400' },
                  { key: 'dex', label: 'DES', color: 'text-emerald-400' },
                  { key: 'con', label: 'CON', color: 'text-orange-400' },
                  { key: 'int', label: 'INT', color: 'text-blue-400' },
                  { key: 'wis', label: 'SAB', color: 'text-cyan-400' },
                  { key: 'cha', label: 'CAR', color: 'text-pink-400' },
                ].map(stat => (
                  <div key={stat.key} className="flex flex-col items-center bg-stone-900/60 p-2 rounded-lg border border-white/5 hover:border-white/10 transition-colors group">
                    <span className={`text-[9px] font-bold ${stat.color} tracking-widest`}>{stat.label}</span>
                    <span className="text-xl font-mono font-bold text-white leading-tight">{character.stats?.[stat.key] ?? 10}</span>
                    <span className="text-[10px] font-mono text-foreground/40 group-hover:text-foreground/60 transition-colors">{formatMod(statMod(character.stats?.[stat.key] ?? 10))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Proficiencias / Habilidades Completas */}
            <div className="space-y-2 pt-4 border-t border-amber-900/20">
              <h3 className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Target className="w-3 h-3" /> Habilidades</span>
                <span className="text-[9px] text-amber-500/50">PROF +2</span>
              </h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {ALL_SKILLS.map((skill, i) => {
                  const statValue = character.stats?.[skill.stat] ?? 10
                  const isProficient = isSkillProficient(skill, character.skills || [])
                  const totalMod = skillModifier(statValue, isProficient)
                  return (
                    <div key={i} className="flex items-center justify-between py-1 px-1.5 rounded bg-stone-900/40 border border-white/5 group">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full border border-amber-500/50 shrink-0 ${isProficient ? 'bg-amber-500' : 'bg-transparent'}`} title={isProficient ? 'Competente' : ''} />
                        <span className={`text-[10px] truncate ${isProficient ? 'text-parchment-200' : 'text-foreground/50'}`}>
                          {skill.name} <span className="text-[8px] text-foreground/30 uppercase ml-0.5">({skill.stat.substring(0,3)})</span>
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ${isProficient ? 'text-amber-400 font-bold' : 'text-foreground/40'}`}>
                        {formatMod(totalMod)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Inventario */}
            <div className="space-y-2 pt-4 border-t border-amber-900/20">
              <h3 className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
                <Backpack className="w-3 h-3" /> Inventario
              </h3>
              {character.inventory && character.inventory.length > 0 ? (
                <ul className="space-y-1.5">
                  {character.inventory.map((item: any, i: number) => (
                    <li key={i} className="text-xs flex items-start gap-2 p-2 rounded-lg bg-stone-900/40 border border-white/5">
                      <span className={`mt-0.5 shrink-0 ${item.type === 'passive' ? 'text-magic-400' : 'text-amber-600/70'}`}>
                        {item.type === 'passive' ? '✦' : '▸'}
                      </span>
                      <div>
                        <span className={item.type === 'passive' ? 'text-magic-300 font-bold text-[11px]' : 'text-parchment-200 text-[11px]'}>
                          {item.name}
                        </span>
                        {item.description && (
                          <p className="text-[10px] text-foreground/40 mt-0.5 leading-snug">{item.description}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-foreground/30 italic">Bolsillos vacíos.</p>
              )}
            </div>
          </div>
        </aside>

        {/* ════ CENTER PANEL: Chat Interface ════ */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          
          {/* Ember atmosphere behind chat */}
          <EmberParticles />

          {/* Chat Tabs */}
          <div className="relative z-10 h-12 border-b border-amber-900/20 bg-stone-950/60 flex items-stretch px-0 shrink-0">
            <button 
              onClick={() => setChatTab('adventure')}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
                chatTab === 'adventure' 
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5' 
                  : 'border-transparent text-foreground/40 hover:text-parchment-300 hover:bg-white/5'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span className="font-display">La Aventura</span>
            </button>
            <button 
              onClick={() => setChatTab('group')}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
                chatTab === 'group' 
                  ? 'border-magic-400 text-magic-300 bg-magic-500/5' 
                  : 'border-transparent text-foreground/40 hover:text-parchment-300 hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-display">Grupo</span>
            </button>
          </div>

          {/* Messages Area */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
            {visibleEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                <Flame className="w-8 h-8 text-amber-500/50" />
                <p className="font-narrative text-lg text-parchment-300">El destino aguarda en silencio...</p>
              </div>
            )}

            {visibleEvents.map((evt, idx) => {
              const isUser = evt.role === 'user'
              const isOOC = evt.content.startsWith('[OOC]')
              const content = isOOC ? evt.content.replace('[OOC]', '').trim() : evt.content
              const senderName = isUser ? (evt.characters?.name || character.name) : 'Game Master'

              return (
                <div 
                  key={evt.id}
                  className={`flex flex-col max-w-[88%] animate-in fade-in duration-300 ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                >
                  <span className="text-[10px] text-foreground/40 mb-1.5 font-bold tracking-widest uppercase px-1">
                    {isOOC && <span className="text-magic-500 mr-1">[OOC]</span>}
                    {senderName}
                  </span>
                  
                  {isUser ? (
                    /* Player message — stone tablet style */
                    <div className={`px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed ${
                      isOOC 
                        ? 'bg-magic-900/30 border border-magic-500/20 text-parchment-200'
                        : 'bg-stone-800/80 border border-amber-900/30 text-parchment-200'
                    }`}>
                      {content}
                    </div>
                  ) : (
                    /* GM message — parchment scroll style */
                    <div className="parchment-card px-5 py-4 rounded-2xl rounded-tl-sm relative overflow-hidden flex flex-col items-start">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-600/60 via-amber-500/30 to-transparent" />
                      <div className="gm-text text-parchment-200 relative z-10 w-full">
                        {content.split('\n').map((line, i) => (
                          <p key={i} className={`${line === '' ? 'mt-3' : 'mt-1 first:mt-0'}`}>{line}</p>
                        ))}
                      </div>
                      
                      {evt.dice_roll_required?.needed && (
                        <div className="mt-4 relative z-10 w-full border-t border-amber-900/30 pt-4 flex justify-center">
                          <DiceRoller 
                            rollData={evt.dice_roll_required}
                            playerStats={character.stats ?? {}}
                            playerSkills={character.skills ?? []}
                            onRollComplete={submitAutomatedAction}
                            disabled={idx !== visibleEvents.length - 1 || isSending || isTyping} 
                          />
                        </div>
                      )}
                      
                      {/* INICIATIVA */}
                      {evt.combat?.initiative_requested && character.combat_state?.in_combat && (
                        <div className="mt-4 relative z-10 w-full border-t border-blood-900/40 pt-4 flex justify-center">
                          <DiceRoller 
                            rollData={{
                              needed: true,
                              die: 'd20',
                              stat: 'dex',
                              skill: null,
                              dc: 0, 
                              flavor: 'Tirada de Iniciativa (DES)'
                            }}
                            playerStats={character.stats ?? {}}
                            playerSkills={character.skills ?? []}
                            onRollComplete={(msg) => {
                              // Extraemos num de [TIRADA: Atributo d20+X = Y vs CD 0 — ÉXITO]
                              const match = msg.match(/=\s*(\d+)/)
                              const initRoll = match ? parseInt(match[1], 10) : 10
                              submitAutomatedAction(`[SISTEMA_INICIATIVA: ${initRoll}] Tiré iniciativa y obtuve ${initRoll}.`)
                            }}
                            disabled={
                              idx !== visibleEvents.length - 1 || 
                              isSending || isTyping || 
                              (character.combat_state.participants.find((p:any) => p.is_player)?.initiative > 0)
                            } 
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Dots loader — while Gemini stream is accumulating */}
            {isSending && chatTab === 'adventure' && (
              <div className="flex flex-col mr-auto items-start max-w-[88%]">
                <span className="text-[10px] text-foreground/40 mb-1.5 font-bold tracking-widest uppercase ml-1">Game Master</span>
                <div className="parchment-card px-5 py-3 rounded-2xl rounded-tl-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-600/40 to-transparent" />
                  <div className="flex items-center gap-2 text-amber-500/60 relative z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="font-narrative text-sm italic ml-1">El Oráculo teje los hilos del destino...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Typewriter bubble — letter-by-letter reveal after stream completes */}
            {isTyping && typewriterText && (
              <div className="flex flex-col mr-auto items-start max-w-[88%] animate-in fade-in duration-500">
                <span className="text-[10px] text-foreground/40 mb-1.5 font-bold tracking-widest uppercase ml-1">Game Master</span>
                <div className="parchment-card px-5 py-4 rounded-2xl rounded-tl-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-600/60 via-amber-500/30 to-transparent" />
                  <div className="relative z-10">
                    <TypewriterMessage
                      text={typewriterText}
                      charSpeed={22}
                      onComplete={() => {
                        // Commit finished message to permanent events list
                        setEvents(prev => [...prev, {
                          id: crypto.randomUUID(),
                          role: 'assistant',
                          content: typewriterText,
                          created_at: new Date().toISOString(),
                          dice_roll_required: pendingDiceRoll
                        }])
                        setIsTyping(false)
                        setTypewriterText('')
                        setPendingDiceRoll(null)
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* OOC Group sending indicator */}
            {isSending && chatTab === 'group' && (
              <div className="flex flex-col mr-auto items-start max-w-[88%]">
                <span className="text-[10px] text-foreground/40 mb-1.5 font-bold tracking-widest uppercase ml-1">Sistema</span>
                <div className="px-4 py-2 rounded-2xl rounded-tl-sm bg-magic-900/20 border border-magic-700/20 text-magic-400/60 text-sm italic">
                  Enviando...
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-2 w-full" />
          </div>

          {/* Input Area */}
          <div className="relative z-10 p-4 bg-stone-950/80 border-t border-amber-900/20 backdrop-blur-sm shrink-0">
            <form onSubmit={handleSend} className="relative max-w-3xl mx-auto flex items-end gap-2">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                placeholder={
                  chatTab === 'adventure' 
                    ? '¿Qué harás? Escribe tu acción o diálogo...' 
                    : 'Habla con tu grupo fuera del personaje...'
                }
                className={`w-full bg-stone-900/60 border ${
                  chatTab === 'group' 
                    ? 'border-magic-700/40 focus:border-magic-500/60 focus:ring-1 focus:ring-magic-500/30' 
                    : 'border-amber-900/30 focus:border-amber-600/50 focus:ring-1 focus:ring-amber-500/20'
                } rounded-xl px-4 py-3 text-parchment-200 placeholder:text-foreground/30 focus:outline-none resize-none custom-scrollbar text-sm leading-relaxed transition-all duration-200`}
                rows={2}
                disabled={isSending}
              />
              <button 
                type="submit" 
                disabled={!inputText.trim() || isSending}
                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  chatTab === 'group' 
                    ? 'bg-magic-700/80 hover:bg-magic-600 text-white shadow-[0_0_12px_-4px_rgba(109,40,217,0.5)]'
                    : 'bg-amber-700/80 hover:bg-amber-600 text-white shadow-torch-sm hover:shadow-torch'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-center mt-2 text-[10px] text-foreground/25">
              <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">Enter</kbd> enviar &nbsp;·&nbsp;
              <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">Shift + Enter</kbd> nueva línea
            </p>
          </div>
        </main>

        {/* ════ RIGHT PANEL: Campaign & Initiative ════ */}
        <aside className="w-64 border-l border-amber-900/20 bg-stone-950/60 hidden lg:flex flex-col shrink-0">
          <div className="p-5 space-y-6">
            
            {/* Campaign Info */}
            <div className="space-y-3">
              <h3 className="font-display text-[10px] text-foreground/40 uppercase tracking-widest border-b border-amber-900/20 pb-2 flex items-center gap-2">
                <ScrollText className="w-3 h-3" /> Campaña Activa
              </h3>
              {campaign ? (
                <div className="space-y-3">
                  <p className={`text-[10px] px-2 py-1 rounded-full border inline-flex items-center gap-1 ${campaignTheme?.badge ?? 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {campaignTheme?.label ?? campaign.theme}
                  </p>
                  <p className="font-display font-bold text-parchment-100 text-sm leading-snug">{campaign.title}</p>
                  <div className={`p-3 rounded-xl border ${campaignTheme?.border ?? 'border-amber-500/20'} bg-stone-900/50 space-y-1.5 ${campaignTheme?.glow ?? ''}`}>
                    <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Objetivo Principal</p>
                    <p className="text-[11px] text-parchment-200/90 leading-relaxed font-narrative">{campaign.main_quest}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-foreground/30 italic leading-relaxed">{world.description}</p>
              )}
            </div>

            {/* Initiative Tracker */}
            <div className="space-y-3 pt-4 border-t border-amber-900/20">
              <h3 className="font-display text-[10px] text-blood-400/60 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3" /> Orden de Iniciativa
              </h3>
              <div className="space-y-1.5 relative min-h-[60px]">
                {character.combat_state?.in_combat ? (
                  character.combat_state.participants
                    .slice()
                    // Shift the array so that the participant at `turn` index is at the top
                    .map((p: any, originalIndex: number) => ({ p, originalIndex }))
                    .sort((a: any, b: any) => {
                      const turn = character.combat_state.turn || 0
                      const len = character.combat_state.participants.length
                      const posA = (a.originalIndex - turn + len) % len
                      const posB = (b.originalIndex - turn + len) % len
                      return posA - posB
                    })
                    .map(({ p, originalIndex }: any, visualIndex: number) => {
                      const isCurrentTurn = originalIndex === character.combat_state.turn
                      const hpPercent = Math.max(0, Math.min(100, (p.hp / p.max_hp) * 100))
                      const isDead = p.hp <= 0

                      return (
                        <div 
                          key={`${p.name}-${originalIndex}`}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-500 ease-out transform-gpu overflow-hidden relative ${
                             isCurrentTurn && !isDead
                              ? 'bg-gradient-to-r from-blood-900/40 to-stone-900/40 border-l-2 border-l-blood-500 border-y-blood-500/20 border-r-stone-800/50 shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] z-20 scale-100 translate-x-1' 
                              : isDead 
                                ? 'bg-stone-900/20 border-stone-800/50 opacity-40 grayscale blur-[0.5px] scale-95'
                                : 'bg-stone-950/60 border-white/5 opacity-80 hover:opacity-100 hover:border-white/10 scale-95 hover:scale-[0.98]'
                          }`}
                        >
                          {/* Mini HP background bar */}
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-stone-900/50" />
                          <div 
                            className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ease-out ${
                              isDead ? 'bg-stone-600' : 'bg-gradient-to-r from-blood-600 to-blood-400'
                            }`} 
                            style={{ width: `${hpPercent}%` }}
                          />

                          {/* Initiative Badge */}
                          <div className={`relative flex items-center justify-center w-6 h-6 rounded flex-shrink-0 transition-colors ${
                            isCurrentTurn && !isDead
                              ? 'bg-blood-500/20 text-blood-400 ring-1 ring-blood-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                              : isDead ? 'bg-stone-800 text-stone-600' : 'bg-stone-800/80 text-foreground/40 ring-1 ring-white/10'
                          }`}>
                            {isDead ? (
                              <div className="w-full h-full flex items-center justify-center border-t border-b border-rose-900/30 rotate-45" />
                            ) : (
                              <span className="text-[10px] font-bold font-mono">{originalIndex + 1}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 relative z-10">
                            <div className="flex justify-between items-center mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className={`text-xs font-bold truncate tracking-wide ${
                                  isDead ? 'text-stone-500 line-through decoration-stone-500/50' : 
                                  p.is_player ? 'text-parchment-100 drop-shadow-sm' : 'text-amber-500/90'
                                }`}>
                                  {p.name}
                                </p>
                                {isCurrentTurn && !isDead && (
                                  <Swords className="w-3 h-3 text-blood-400 animate-pulse flex-shrink-0" />
                                )}
                              </div>
                              <span className={`text-[10px] font-mono tracking-tighter ${
                                isCurrentTurn && !isDead ? 'text-blood-300 font-bold' : 'text-foreground/40'
                              }`}>
                                {p.hp}/{p.max_hp}
                              </span>
                            </div>
                            <p className="text-[9px] text-foreground/40 uppercase tracking-widest flex items-center justify-between">
                              <span>{p.is_player ? (character.stats?.class || 'Aventurero') : 'Enemigo'}</span>
                              <span className="opacity-70"><Shield className="w-2.5 h-2.5 inline mr-0.5 mb-0.5" />{p.ac}</span>
                            </p>
                          </div>
                        </div>
                      )
                  })
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-2.5 bg-stone-950/60 rounded-lg border border-white/5 opacity-70 scale-95">
                      <div className="relative flex items-center justify-center w-6 h-6 rounded flex-shrink-0 bg-stone-800/80 text-foreground/40 ring-1 ring-white/10">
                        <span className="text-[10px] font-bold font-mono">1</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-parchment-200/80 truncate tracking-wide">{character.name}</p>
                        <p className="text-[9px] text-foreground/40 uppercase tracking-widest flex justify-between">
                          <span>{character.stats?.class}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2.5 rounded-lg opacity-40 mt-1 scale-95 border border-transparent">
                      <div className="relative flex items-center justify-center w-6 h-6 rounded flex-shrink-0 bg-stone-900 border border-white/5">
                        <span className="text-[10px] font-bold font-mono text-stone-600">-</span>
                      </div>
                      <span className="text-xs text-stone-500 italic tracking-wide">Combate inactivo...</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Turn Controls */}
              {character.combat_state?.in_combat && 
               character.combat_state.participants[character.combat_state.turn]?.is_player && (
                <button
                  onClick={() => submitAutomatedAction('[SISTEMA_TURNO_SIGUIENTE] Mi turno ha terminado.')}
                  disabled={isSending || isTyping}
                  className="w-full mt-3 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest border transition-all duration-300 bg-gradient-to-r from-blood-900/40 via-blood-800/20 to-blood-900/40 text-blood-400 border-blood-500/30 hover:bg-blood-900/60 hover:border-blood-400/60 disabled:opacity-50 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_15px_-2px_rgba(239,68,68,0.4)]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    Finalizar Mi Turno
                  </span>
                </button>
              )}
            </div>

            {/* World Info */}
            <div className="space-y-2 pt-4 border-t border-amber-900/20">
              <h3 className="font-display text-[10px] text-foreground/30 uppercase tracking-widest">Mundo Activo</h3>
              <p className="font-display text-xs text-amber-600/60">{world.name}</p>
              {world.genre && (
                <p className="text-[10px] text-foreground/30 italic">{world.genre}</p>
              )}
            </div>

          </div>
        </aside>
      </div>
    </div>
  )
}

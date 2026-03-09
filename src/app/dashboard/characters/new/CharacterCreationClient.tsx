'use client'

import { createCharacter, aiGenerateBackstory, aiAnalyzeStory } from './actions'
import { Swords, ArrowLeft, Globe, Wand2, Sparkles, AlertCircle, Check, Target, Shield, Backpack, ScrollText, User, PenTool } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { getRaceBonuses, getClassBonuses, applyBonuses, type StatKey, type StatBlock } from '@/utils/game/stat-bonuses'
import { ALL_SKILLS, isSkillProficient } from '@/utils/game/skills'

const DND_RACES = [
  'Humano', 'Elfo', 'Alto Elfo', 'Elfo del Bosque', 'Elfo Oscuro', 
  'Enano', 'Mediano', 'Gnomo', 'Semielfo', 'Semiorco', 'Dracónido', 'Tiefling'
]

const DND_CLASSES = [
  'Guerrero', 'Bárbaro', 'Pícaro', 'Mago', 'Clérigo', 'Paladín', 
  'Explorador', 'Bardo', 'Brujo', 'Druida', 'Monje', 'Hechicero'
]

export default function CharacterCreationClient({ worlds, userId }: { worlds: any[], userId: string }) {
  // Mode Selection State
  const [creationMode, setCreationMode] = useState<'manual' | 'story'>('manual')

  // Common State
  const [selectedWorld, setSelectedWorld] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // -- STORY MODE STATE --
  // Pre-story info to guide AI
  const [guideName, setGuideName] = useState('')
  const [guideRace, setGuideRace] = useState('')
  const [guideClass, setGuideClass] = useState('')
  const [guideGoal, setGuideGoal] = useState('')
  
  const [backstory, setBackstory] = useState('')
  const [backstoryKeywords, setBackstoryKeywords] = useState('')
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)
  const [isConsultingOracle, setIsConsultingOracle] = useState(false)
  const [oracleResult, setOracleResult] = useState<any>(null)

  // -- MANUAL MODE STATE --
  const [manualName, setManualName] = useState('')
  const [manualRace, setManualRace] = useState('')
  const [manualClass, setManualClass] = useState('')
  const [manualStr, setManualStr] = useState(10)
  const [manualDex, setManualDex] = useState(10)
  const [manualCon, setManualCon] = useState(10)
  const [manualInt, setManualInt] = useState(10)
  const [manualWis, setManualWis] = useState(10)
  const [manualCha, setManualCha] = useState(10)
  const [manualBackstory, setManualBackstory] = useState('')

  // -- STORY MODE: GENERATE AI BACKSTORY --
  async function handleGenerateBackstory() {
    if (!backstoryKeywords) {
      alert("Escribe algunas ideas clave primero.")
      return
    }
    setIsGeneratingStory(true)

    // Prepend the guide info to the keywords so the AI incorporates it
    const enhancedKeywords = `Nombre sugerido: ${guideName || 'Cualquiera'}. Raza: ${guideRace || 'Cualquiera'}. Clase: ${guideClass || 'Cualquiera'}. Objetivo vital: ${guideGoal || 'Cualquiera'}. Otras claves: ${backstoryKeywords}`
    
    const formData = new FormData()
    formData.append('keywords', enhancedKeywords)
    formData.append('world_id', selectedWorld)
    
    const res = await aiGenerateBackstory(null, formData)
    if (res.success) {
      setBackstory(res.text)
      if (!selectedWorld && res.world_id) {
        setSelectedWorld(res.world_id)
      }
    } else {
      alert(res.error)
    }
    setIsGeneratingStory(false)
  }

  // -- STORY MODE: ANALYZE STORY --
  async function handleConsultOracle() {
    if (!backstory) {
      alert("Relata tu historia al Oráculo.")
      return
    }
    setIsConsultingOracle(true)
    
    // We prepend the guide to the story so the AI knows these are hard constraints preferred by the user
    // The prompt in `gemini.ts` will respect them if they make sense in the context of the story
    const contextPrefix = `[METADATOS PREFERIDOS POR EL USUARIO -> Nombre: ${guideName || 'IA decide'}, Raza: ${guideRace || 'IA decide'}, Clase: ${guideClass || 'IA decide'}]\n\n`
    
    const formData = new FormData()
    formData.append('story', contextPrefix + backstory)
    formData.append('world_id', selectedWorld)
    
    const res = await aiAnalyzeStory(null, formData)
    if (res.success) {
      setOracleResult(res.data)
      if (!selectedWorld && res.world_id) {
        setSelectedWorld(res.world_id)
      }
    } else {
      alert(res.error)
    }
    setIsConsultingOracle(false)
  }

  // Calculate UI preview bonuses for Story Mode
  let finalStats: Record<StatKey, number> | null = null
  let raceBonus: StatBlock = {}
  let classBonus: StatBlock = {}

  if (oracleResult) {
    const staticRaceBonuses = getRaceBonuses(oracleResult.race || '')
    raceBonus = Object.keys(staticRaceBonuses).length > 0 ? staticRaceBonuses : (oracleResult.racial_bonuses || {})
    
    const staticClassBonuses = getClassBonuses(oracleResult.class || '')
    classBonus = Object.keys(staticClassBonuses).length > 0 ? staticClassBonuses : (oracleResult.class_bonuses || {})

    finalStats = applyBonuses(
      oracleResult.stats as Record<StatKey, number>,
      raceBonus,
      classBonus
    )
  }

  // Pre-calculate full skill set for preview
  const proficientSkills = oracleResult?.skills || []

  return (
    <div className="min-h-screen bg-background text-foreground custom-scrollbar pb-24">
      {/* Top Navigation */}
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-foreground/60 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Volver a la Taverna</span>
          </Link>
          <div className="font-serif text-xl font-bold tracking-widest text-parchment-100 flex items-center gap-2">
            La Taverna
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white flex items-center justify-center gap-4 mb-4">
            <Swords className="w-10 h-10 text-blood-500" />
            Forjar Leyenda
          </h1>
          <p className="text-foreground/70 max-w-2xl mx-auto text-lg leading-relaxed">
            Elige tu camino de creación: confía en el análisis de narrativa del Oráculo o forja las estadísticas a mano con precisión meticulosa.
          </p>
        </div>

        {/* MODE TOGGLE */}
        {!oracleResult && (
          <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100 mb-8">
            <div className="bg-stone-900/40 p-2 md:p-3 rounded-2xl border border-white/5 flex flex-col sm:flex-row gap-4 w-full max-w-2xl shadow-xl">
              <button
                type="button"
                onClick={() => setCreationMode('manual')}
                className={`flex-1 py-5 px-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${
                  creationMode === 'manual'
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-500/50 shadow-[0_0_20px_-3px_rgba(217,119,6,0.4)] scale-[1.02]'
                    : 'text-foreground/40 hover:text-foreground/60 hover:bg-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3 text-lg md:text-xl font-bold tracking-wide">
                  <PenTool className="w-5 h-5 md:w-6 md:h-6" /> El Forjador de Destinos
                </div>
                <span className="text-sm font-medium opacity-80 uppercase tracking-widest">(Manual)</span>
              </button>
              
              <button
                type="button"
                onClick={() => setCreationMode('story')}
                className={`flex-1 py-5 px-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${
                  creationMode === 'story'
                    ? 'bg-magic-600/20 text-magic-300 border border-magic-500/50 shadow-[0_0_20px_-3px_rgba(0,180,216,0.4)] scale-[1.02]'
                    : 'text-foreground/40 hover:text-foreground/60 hover:bg-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3 text-lg md:text-xl font-bold tracking-wide">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6" /> El Oráculo de las Almas
                </div>
                <span className="text-sm font-medium opacity-80 uppercase tracking-widest">(IA)</span>
              </button>
            </div>
          </div>
        )}


        {/* STEP 1: World Selection (Common for both, optional) */}
        {!oracleResult && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <section className="bg-stone-900/60 border border-white/10 p-8 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
                  <Globe className="w-6 h-6 text-magic-400" />
                  1. Selecciona tu Destino
                </h2>
                <span className="text-xs font-bold text-foreground/40 bg-white/5 px-2 py-1 rounded uppercase tracking-wider">Opcional</span>
              </div>

              {worlds.length === 0 ? (
                <div className="text-center py-6 bg-black/20 rounded-xl border border-dashed border-white/10">
                  <Globe className="w-8 h-8 text-foreground/20 mx-auto mb-3" />
                  <p className="text-foreground/50">No hay mundos disponibles.</p>
                  <Link href="/dashboard/worlds/new" className="text-magic-400 hover:text-magic-300 text-sm mt-2 inline-block underline underline-offset-4">
                    Crear un mundo nuevo
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {worlds.map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWorld(w.id === selectedWorld ? '' : w.id)} // Allow toggle off
                      className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                        selectedWorld === w.id 
                        ? 'bg-magic-900/40 border-magic-500 shadow-[0_0_15px_rgba(0,180,216,0.2)]' 
                        : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="font-bold text-parchment-100 flex items-center justify-between mb-1">
                        {w.name}
                        {selectedWorld === w.id && <Check className="w-4 h-4 text-magic-400" />}
                      </div>
                      <p className="text-xs text-foreground/50 line-clamp-2">{w.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ─── STORY MODE (ORACLE) UI ─────────────────────────────────────────────────── */}
            {creationMode === 'story' && (
              <section className="transition-all duration-500 opacity-100 translate-y-0">
                <div className="bg-stone-900/60 border border-white/10 p-8 rounded-2xl shadow-xl space-y-8">
                  
                  {/* Step 2a: Guide the Oracle */}
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-white border-b border-white/10 pb-4 mb-6 flex items-center gap-3">
                      <User className="w-6 h-6 text-amber-500" />
                      2. Semilla de Identidad
                    </h2>
                    <p className="text-sm text-foreground/60 mb-6">
                      Da unas breves pinceladas sobre tu personaje. El Oráculo utilizará esta información para asentar las bases de tus estadísticas y habilidades durante el análisis, o para generar una historia si pides inspiración. Todo es <strong className="text-parchment-300 font-normal">opcional</strong>.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider ml-1">Nombre</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Aelar" 
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                          value={guideName}
                          onChange={e => setGuideName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider ml-1">Raza</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Alto Elfo o Genasi" 
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                          value={guideRace}
                          onChange={e => setGuideRace(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider ml-1">Clase</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Mago o Psiónico" 
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                          value={guideClass}
                          onChange={e => setGuideClass(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider ml-1">Objetivo Vital</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Vengar a mi maestro" 
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                          value={guideGoal}
                          onChange={e => setGuideGoal(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2b: Write/Generate Story */}
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-white border-b border-white/10 pb-4 mb-6 flex items-center gap-3">
                      <ScrollText className="w-6 h-6 text-amber-500" />
                      3. Escribe tu Pasado
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left: AI Generator Toolkit */}
                      <div className="lg:col-span-1 bg-black/40 p-5 rounded-xl border border-white/5 flex flex-col justify-center">
                        <h3 className="font-bold text-parchment-200 mb-2 flex items-center gap-2 text-sm">
                          <Wand2 className="w-4 h-4 text-magic-400" /> ¿Sin inspiración?
                        </h3>
                        <p className="text-xs text-foreground/50 mb-4 leading-relaxed">
                          Escribe algunas palabras clave separadas por comas. La IA tomará la "Semilla de Identidad" de arriba y forjará un pasado heroico entrelazado con esas claves y el universo.
                        </p>
                        <input 
                          type="text" 
                          placeholder="Ej: Traición ancestral, grimorio oscuro..." 
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white mb-3 focus:outline-none focus:border-magic-500 transition-colors"
                          value={backstoryKeywords}
                          onChange={e => setBackstoryKeywords(e.target.value)}
                        />
                        <button 
                          type="button" 
                          onClick={handleGenerateBackstory}
                          disabled={isGeneratingStory}
                          className="w-full bg-magic-600/20 hover:bg-magic-600/40 text-magic-300 text-sm font-medium py-2.5 rounded-lg border border-magic-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isGeneratingStory ? <Sparkles className="w-4 h-4 animate-spin" /> : "Generar Pasado Mágico"}
                        </button>
                      </div>

                      {/* Right: Manual Textarea */}
                      <div className="lg:col-span-2">
                        <textarea 
                          placeholder="Relata el trasfondo de tu personaje. Detalles sobre cómo adquirió su poder, sus fracasos pasados y batallas clave ayudan al Oráculo a forjar estadísticas precisas e inventario."
                          className="w-full h-48 bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-foreground/30 focus:outline-none focus:border-amber-500/50 transition-colors resize-none leading-relaxed"
                          value={backstory}
                          onChange={e => setBackstory(e.target.value)}
                        />
                        <div className="mt-4 flex justify-end">
                          <button 
                            type="button" 
                            onClick={handleConsultOracle}
                            disabled={isConsultingOracle || !backstory.trim()}
                            className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-[0_0_20px_-5px_rgba(217,119,6,0.4)] disabled:opacity-50 transition-all flex items-center gap-2"
                          >
                            {isConsultingOracle ? (
                              <><Sparkles className="w-5 h-5 animate-spin" /> Consultando Oráculo...</>
                            ) : (
                              <><Sparkles className="w-5 h-5" /> Analizar Historia</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ─── MANUAL MODE UI ─────────────────────────────────────────────────────────── */}
            {creationMode === 'manual' && (
              <form 
                action={async (formData) => {
                  if (!manualName || !manualRace || !manualClass) {
                    alert('Nombre, raza y clase son obligatorios en este modo.')
                    return
                  }
                  setIsSubmitting(true)
                  await createCharacter(formData)
                }}
                className="bg-stone-900/60 border border-white/10 p-8 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
                    <PenTool className="w-6 h-6 text-amber-500" />
                    2. Forja Precisa
                  </h2>
                </div>

                {/* Hidden manual fields for action submission */}
                <input type="hidden" name="world_id" value={selectedWorld || ''} />

                <div className="space-y-8">
                  {/* Identity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70 ml-1">Nombre</label>
                      <input 
                        type="text" 
                        name="name"
                        required
                        placeholder="Ej: Kael" 
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70 ml-1">Raza</label>
                      <select 
                        name="race"
                        required
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        value={manualRace}
                        onChange={e => setManualRace(e.target.value)}
                      >
                        <option value="">Selecciona Raza...</option>
                        {DND_RACES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground/70 ml-1">Clase</label>
                      <select 
                        name="class"
                        required
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        value={manualClass}
                        onChange={e => setManualClass(e.target.value)}
                      >
                        <option value="">Selecciona Clase...</option>
                        {DND_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Manual Stats Array */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-widest mb-4">
                      Atributos Base (Sin bonificadores)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      {[
                        { key: 'str', label: 'FUE', val: manualStr, set: setManualStr },
                        { key: 'dex', label: 'DES', val: manualDex, set: setManualDex },
                        { key: 'con', label: 'CON', val: manualCon, set: setManualCon },
                        { key: 'int', label: 'INT', val: manualInt, set: setManualInt },
                        { key: 'wis', label: 'SAB', val: manualWis, set: setManualWis },
                        { key: 'cha', label: 'CAR', val: manualCha, set: setManualCha },
                      ].map(stat => (
                        <div key={stat.key} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col items-center">
                          <label className="text-[10px] font-bold text-foreground/40 mb-2 uppercase tracking-widest">{stat.label}</label>
                          <input 
                            type="number" 
                            name={stat.key}
                            min="3" max="20"
                            className="w-full bg-transparent text-center font-mono text-2xl font-bold text-white focus:outline-none"
                            value={stat.val}
                            onChange={e => stat.set(Number(e.target.value))}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-foreground/40 mt-3 text-center italic">
                      Los bonificadores de raza y clase se añadirán automáticamente al crear el personaje basándose en las reglas oficiales.
                    </p>
                  </div>

                  {/* Backstory */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground/70 ml-1">Historia (Opcional)</label>
                    <textarea 
                      name="background"
                      placeholder="Escribe la historia de vida de tu personaje..."
                      className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-amber-500/50 resize-none"
                      value={manualBackstory}
                      onChange={e => setManualBackstory(e.target.value)}
                    />
                  </div>
                  
                  {/* Manual defaults for non-configured elements */}
                  <input type="hidden" name="skills" value="[]" />
                  <input type="hidden" name="hp_max" value="10" />
                  <input type="hidden" name="hit_dice" value="1d10" />

                  <div className="flex justify-end pt-4 border-t border-white/10">
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !manualName || !manualRace || !manualClass} 
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl px-10 py-3 font-bold shadow-[0_0_20px_-5px_rgba(217,119,6,0.4)] flex items-center gap-2 transition-all"
                    >
                      {isSubmitting ? (
                        <><Sparkles className="w-5 h-5 animate-spin" /> Guardando...</>
                      ) : (
                        <><Swords className="w-5 h-5" /> Crear Personaje Manual</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        )}

        {/* ─── FINAL STEP 3: ORACLE REVIEW (STORY MODE ONLY) ──────────────────────────── */}
        {creationMode === 'story' && oracleResult && finalStats && (
          // ... (The entire Oracle preview block remains the same beautiful UI) ...
          <form 
            action={async (formData) => {
              setIsSubmitting(true)
              await createCharacter(formData)
              // We rely on redirect inside action, so we leave loading true
            }} 
            className="animate-in fade-in slide-in-from-bottom-8 duration-700"
          >
            {/* Hidden fields to pass data to actions.ts */}
            <input type="hidden" name="world_id" value={selectedWorld} />
            <input type="hidden" name="background" value={backstory} />
            <input type="hidden" name="name" value={oracleResult.name} />
            
            {/* Base artificial stats (Server script applies bonuses again for security) */}
            <input type="hidden" name="str" value={oracleResult.stats?.str || 10} />
            <input type="hidden" name="dex" value={oracleResult.stats?.dex || 10} />
            <input type="hidden" name="con" value={oracleResult.stats?.con || 10} />
            <input type="hidden" name="int" value={oracleResult.stats?.int || 10} />
            <input type="hidden" name="wis" value={oracleResult.stats?.wis || 10} />
            <input type="hidden" name="cha" value={oracleResult.stats?.cha || 10} />
            
            <input type="hidden" name="race" value={oracleResult.race} />
            <input type="hidden" name="class" value={oracleResult.class} />
            <input type="hidden" name="hp_max" value={oracleResult.hp_max || 10} />
            <input type="hidden" name="hit_dice" value={oracleResult.hit_dice || '1d8'} />
            <input type="hidden" name="skills" value={JSON.stringify(proficientSkills)} />
            <input type="hidden" name="equipment" value={JSON.stringify(oracleResult.equipment || [])} />
            <input type="hidden" name="special_trait" value={oracleResult.specialTrait || ''} />
            
            {/* Custom AI bonuses passed to server */}
            <input type="hidden" name="ai_racial_bonuses" value={JSON.stringify(oracleResult.racial_bonuses || {})} />
            <input type="hidden" name="ai_class_bonuses" value={JSON.stringify(oracleResult.class_bonuses || {})} />
            <input type="hidden" name="racial_traits" value={JSON.stringify(oracleResult.racial_traits || [])} />

            <div className="bg-stone-900/80 border border-amber-900/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
              <div className="bg-gradient-to-r from-amber-900/20 to-stone-900 border-b border-amber-900/30 p-8 flex items-end gap-6 relative">
                <div className="w-24 h-24 rounded-full bg-stone-950/80 border-2 border-amber-500/50 flex flex-col items-center justify-center shrink-0 shadow-[0_0_30px_-5px_rgba(217,119,6,0.3)] z-10">
                  <span className="text-3xl font-serif text-amber-500 font-bold">{oracleResult.name?.charAt(0) || '?'}</span>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">NVL 1</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">HP {oracleResult.hp_max}</span>
                  </div>
                  <h2 className="text-4xl font-serif font-bold text-parchment-100">{oracleResult.name || 'Sin Nombre'}</h2>
                  <p className="text-parchment-300/70 font-serif text-lg">
                    {oracleResult.race || 'Desconocido'} • {oracleResult.class || 'Aventurero'}
                  </p>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* LEFT COL: Stats Breakdown */}
                <div className="lg:col-span-5 space-y-8">
                  <section>
                    <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Shield className="w-4 h-4" /> Resumen de Atributos
                    </h3>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-4 overflow-hidden">
                      <table className="w-full text-left text-xs mb-2">
                        <thead>
                          <tr className="text-foreground/40 border-b border-white/5">
                            <th className="pb-2 font-medium">ATRIB</th>
                            <th className="pb-2 font-medium text-center">IA Base</th>
                            <th className="pb-2 font-medium text-center text-magic-400">+Raza</th>
                            <th className="pb-2 font-medium text-center text-emerald-400">+Clase</th>
                            <th className="pb-2 font-medium text-right text-amber-400">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(['str','dex','con','int','wis','cha'] as StatKey[]).map(stat => {
                            const rb = raceBonus[stat] || 0
                            const cb = classBonus[stat] || 0
                            const total = finalStats![stat]
                            return (
                              <tr key={stat} className="hover:bg-white/5 transition-colors">
                                <td className="py-2.5 font-bold uppercase tracking-wider text-parchment-200">{stat}</td>
                                <td className="py-2.5 text-center font-mono text-foreground/60">{oracleResult.stats?.[stat] || 10}</td>
                                <td className="py-2.5 text-center font-mono text-magic-300">{rb > 0 ? `+${rb}` : '-'}</td>
                                <td className="py-2.5 text-center font-mono text-emerald-300">{cb > 0 ? `+${cb}` : '-'}</td>
                                <td className="py-2.5 text-right font-mono font-bold text-lg text-amber-400">{total}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      <div className="bg-stone-900 p-3 rounded-lg border border-amber-900/20 text-xs text-foreground/50 italic leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 inline mr-1 text-amber-500/50" />
                        Tus estadísticas base han sido generadas por la IA basándose en tu texto. Los bonificadores de raza y clase se aplican <strong className="text-parchment-200 font-normal">automáticamente</strong> por el sistema para asegurar el equilibrio de las reglas.
                      </div>
                    </div>
                  </section>
                </div>

                {/* RIGHT COL: Skills, Traits & Identity */}
                <div className="lg:col-span-7 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Skills Selection */}
                    <section>
                      <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-widest flex items-center justify-between mb-4">
                        <span className="flex items-center gap-2"><Target className="w-4 h-4" /> Competencias</span>
                        <span className="text-[10px] bg-amber-900/30 text-amber-500 px-1.5 py-0.5 rounded border border-amber-700/30">PROF +2</span>
                      </h3>
                      <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                        <div className="flex flex-wrap gap-2">
                          {ALL_SKILLS.map((skill, i) => {
                            const isProf = isSkillProficient(skill, proficientSkills)
                            return (
                              <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] border ${
                                isProf 
                                  ? 'bg-amber-900/20 border-amber-500/30 text-parchment-200 font-medium' 
                                  : 'bg-stone-900/40 border-white/5 text-foreground/40'
                              }`}>
                                <span className={`w-2 h-2 rounded-full border border-amber-500/50 shrink-0 ${isProf ? 'bg-amber-500' : 'bg-transparent'}`} />
                                {skill.name}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </section>

                    {/* Inventory & Special */}
                    <section className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-widest flex items-center gap-2 mb-4">
                          <Backpack className="w-4 h-4" /> Inventario y Rasgos
                        </h3>
                        {oracleResult.specialTrait && (
                          <div className="mb-3 p-3 bg-magic-900/10 border border-magic-500/20 rounded-lg">
                            <h4 className="font-bold text-magic-300 text-xs mb-1 uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Rasgo Único (Historia)</h4>
                            <p className="text-xs text-parchment-200">"{oracleResult.specialTrait}"</p>
                          </div>
                        )}
                        <ul className="space-y-2">
                          {oracleResult.equipment?.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-parchment-300/80 p-2 rounded bg-black/30 border border-white/5 flex items-center gap-2">
                              <span className="text-amber-600/50">▸</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {oracleResult.racial_traits && oracleResult.racial_traits.length > 0 && (
                        <div>
                           <h4 className="font-bold text-emerald-400 text-xs mb-2 uppercase tracking-wider">Rasgos Raciales</h4>
                           <ul className="space-y-1.5">
                             {oracleResult.racial_traits.map((trait: string, i: number) => (
                               <li key={i} className="text-xs text-foreground/60 flex items-start gap-1.5">
                                 <span className="text-emerald-500/50 mt-0.5">✦</span> 
                                 <span className="leading-snug">{trait}</span>
                               </li>
                             ))}
                           </ul>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Final Actions */}
                  <div className="pt-6 border-t border-amber-900/20 flex gap-4 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setOracleResult(null)} 
                      disabled={isSubmitting} 
                      className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50 text-foreground/70 font-medium"
                    >
                      Ajustar Historia
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl px-10 py-3 font-bold shadow-[0_0_20px_-5px_rgba(217,119,6,0.4)] flex items-center gap-2 transition-all"
                    >
                      {isSubmitting ? (
                        <><Sparkles className="w-5 h-5 animate-spin" /> Materializando...</>
                      ) : (
                        <><Swords className="w-5 h-5" /> Aceptar este Destino</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

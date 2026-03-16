'use client'

import { useEffect, useState } from 'react'
import { Dices, CheckCircle, XCircle } from 'lucide-react'
import type { DiceRollOutcome, DiceRollRequired } from '@/types/dice'

interface DiceRollerProps {
  rollData: DiceRollRequired
  playerStats: Record<string, number>
  playerSkills: string[]
  onRollComplete: (result: DiceRollOutcome) => void
  disabled?: boolean
}

const statNameMap: Record<string, string> = {
  str: 'FUE',
  dex: 'DES',
  con: 'CON',
  int: 'INT',
  wis: 'SAB',
  cha: 'CAR',
}

export function DiceRoller({ rollData, playerStats, playerSkills, onRollComplete, disabled }: DiceRollerProps) {
  const [isRolling, setIsRolling] = useState(false)
  const [result, setResult] = useState<DiceRollOutcome | null>(null)
  const [displayNumber, setDisplayNumber] = useState<number>(0)

  const statVal = playerStats[rollData.stat.toLowerCase()] || 10
  const statMod = Math.floor((statVal - 10) / 2)
  const isProficient = rollData.skill ? playerSkills.includes(rollData.skill) : false
  const profBonus = isProficient ? 2 : 0
  const totalMod = statMod + profBonus

  const maxRoll = parseInt(rollData.die.replace('d', ''), 10) || 20

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * maxRoll) + 1)
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isRolling, maxRoll])

  const handleRoll = () => {
    if (disabled || isRolling) return

    setIsRolling(true)

    const rollDuration = Math.random() * (2000 - 1200) + 1200

    setTimeout(() => {
      const rawRoll = Math.floor(Math.random() * maxRoll) + 1
      const totalResult = rawRoll + totalMod
      const isSuccess = totalResult >= rollData.dc
      const critical =
        rawRoll === 20 ? 'critical_success' : rawRoll === 1 ? 'critical_failure' : null

      const outcome: DiceRollOutcome = {
        rawRoll,
        modifier: totalMod,
        total: totalResult,
        dc: rollData.dc,
        success: isSuccess,
        critical,
        die: rollData.die,
        stat: rollData.stat,
        skill: rollData.skill,
        flavor: rollData.flavor,
      }

      setResult(outcome)
      setDisplayNumber(rawRoll)
      setIsRolling(false)
      onRollComplete(outcome)
    }, rollDuration)
  }

  if (result !== null && !isRolling) {
    const isSuccess = result.success
    return (
      <div
        className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-bold text-sm ${isSuccess
            ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-900/20 border-rose-500/30 text-rose-400'
          }`}
      >
        {isSuccess ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        <span>
          Resultado: {result.total} vs CD {result.dc}
          {result.critical === 'critical_success' && ' · Crítico'}
          {result.critical === 'critical_failure' && ' · Pifia'}
        </span>
      </div>
    )
  }

  const modDisplay = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`

  return (
    <button
      type="button"
      onClick={handleRoll}
      disabled={disabled || isRolling}
      className={`mt-4 group relative inline-flex items-center justify-center gap-4 px-6 py-3 rounded-xl font-bold transition-all overflow-hidden ${disabled && !isRolling
          ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
          : 'bg-amber-600/20 text-amber-500 border border-amber-500/50 shadow-[0_0_15px_-3px_rgba(217,119,6,0.3)] hover:bg-amber-600/30 hover:scale-[1.02]'
        }`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-r from-amber-600/0 via-amber-500/10 to-amber-600/0 translate-x-[-100%] ${(!disabled || isRolling) && 'group-hover:animate-[shimmer_1.5s_infinite]'
          }`}
      />

      <div className="flex items-center gap-3">
        <Dices className={`w-6 h-6 ${isRolling ? 'animate-bounce text-amber-300' : ''}`} />
        {isRolling ? (
          <div className="text-2xl font-mono text-amber-300 w-8 text-center bg-stone-950/40 rounded px-1">
            {displayNumber}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-start leading-tight">
        <span className="text-sm uppercase tracking-widest opacity-80">
          {isRolling ? 'Rodando...' : rollData.flavor}
        </span>
        <span className="text-xs font-normal opacity-60">
          {!isRolling && `Tirando ${rollData.die} ${modDisplay} de bonificador ${isProficient ? '(Competencia ✔)' : ''}`}
          {isRolling && `${modDisplay} modificador`}
        </span>
        {!isRolling && (
          <span className="text-[10px] font-normal opacity-50">
            {rollData.skill ? rollData.skill : statNameMap[rollData.stat.toLowerCase()] || 'Atributo'} · CD {rollData.dc}
          </span>
        )}
      </div>
    </button>
  )
}
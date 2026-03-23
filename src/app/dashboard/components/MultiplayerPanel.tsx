'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Key, Crown, Play, ChevronRight, X, Loader2 } from 'lucide-react'
import { createGameSession, joinGameSession } from '@/app/actions/sessions'

interface World { id: string; name: string; genre: string }
interface Session {
  id: string
  invite_code: string
  status: string
  host_id: string
  max_players: number
  worlds: { name: string; genre: string } | null
  profiles: { username: string } | null
}
interface Props {
  worlds: World[]
  activeSessions: Session[]
  currentUserId: string
}

export default function MultiplayerPanel({ worlds, activeSessions, currentUserId }: Props) {
  const [modal, setModal] = useState<'none' | 'create' | 'join'>('none')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [selectedWorld, setSelectedWorld] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)

  const safeSessions = (activeSessions ?? []).filter(Boolean)
  const safeWorlds = (worlds ?? []).filter(Boolean)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData()
    fd.set('world_id', selectedWorld)
    fd.set('max_players', String(maxPlayers))
    try {
      await createGameSession(fd)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error inesperado')
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData()
    fd.set('invite_code', joinCode)
    try {
      await joinGameSession(fd)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error inesperado')
      setLoading(false)
    }
  }

  const statusColor = (s: string) =>
    s === 'active' ? 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40' :
    'text-amber-400 bg-amber-900/20 border-amber-700/40'

  const statusLabel = (s: string) => s === 'active' ? 'Activa' : 'En Lobby'

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="font-display text-xl font-bold text-parchment-200">Multijugador</h2>
          {safeSessions.length > 0 && (
            <span className="text-xs text-foreground/40 font-mono">{safeSessions.length}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setModal('join'); setError('') }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-400 text-sm font-medium transition-all cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" /> Unirse
          </button>
          <button
            onClick={() => { setModal('create'); setError('') }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 text-sm font-medium transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Crear Sesión
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      {safeSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 rounded-2xl border border-dashed border-violet-900/30 bg-stone-950/30 text-center">
          <div className="text-3xl mb-3">🎲</div>
          <p className="text-sm text-foreground/40">Sin sesiones activas</p>
          <p className="text-xs text-foreground/25 mt-1">Crea una sala o únete con un código de invitación</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {safeSessions.map(session => (
            <Link
              key={session.id}
              href={`/session/${session.invite_code}`}
              className="group relative p-4 rounded-xl border border-violet-900/20 hover:border-violet-500/40 bg-stone-950/60 hover:bg-stone-900/80 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.06),transparent_60%)]" />
              <div className="relative flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-900/30 border border-violet-700/30 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-parchment-200 truncate">{session.worlds?.name || 'Mundo sin nombre'}</span>
                    {session.host_id === currentUserId && (
                      <Crown className="w-3 h-3 text-amber-400 shrink-0" aria-label="Eres el host" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${statusColor(session.status)}`}>
                      {statusLabel(session.status)}
                    </span>
                    <span className="text-xs text-foreground/40 font-mono">{session.invite_code}</span>
                  </div>
                  <p className="text-xs text-foreground/30 mt-1 truncate">
                    Host: {session.profiles?.username || 'Desconocido'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/20 group-hover:text-violet-400 transition-colors shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ─── CREATE SESSION MODAL ─── */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-stone-950 border border-violet-900/40 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-parchment-200 flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" /> Nueva Sesión Multijugador
              </h3>
              <button onClick={() => setModal('none')} className="text-foreground/40 hover:text-foreground/80 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-foreground/50 mb-1.5 block font-medium uppercase tracking-wider">Mundo de la aventura</label>
                {safeWorlds.length === 0 ? (
                  <p className="text-sm text-stone-500 italic">No tienes mundos. <Link href="/dashboard/worlds/new" className="text-amber-400 underline">Crea uno primero.</Link></p>
                ) : (
                  <select
                    value={selectedWorld}
                    onChange={e => setSelectedWorld(e.target.value)}
                    required
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-parchment-200 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
                  >
                    <option value="">Selecciona un mundo...</option>
                    {safeWorlds.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs text-foreground/50 mb-1.5 block font-medium uppercase tracking-wider">Máximo de jugadores</label>
                <div className="flex gap-2">
                  {[2,3,4,5,6].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxPlayers(n)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer
                        ${maxPlayers === n ? 'border-violet-500 bg-violet-900/30 text-violet-300' : 'border-stone-700 text-stone-500 hover:border-stone-600'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !selectedWorld}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Crear y Obtener Código
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── JOIN SESSION MODAL ─── */}
      {modal === 'join' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-stone-950 border border-amber-900/40 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-parchment-200 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" /> Unirse con Código
              </h3>
              <button onClick={() => setModal('none')} className="text-foreground/40 hover:text-foreground/80 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-xs text-foreground/50 mb-1.5 block font-medium uppercase tracking-wider">Código de invitación</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ej: AX7F2K"
                  maxLength={6}
                  required
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-center text-2xl font-mono font-bold tracking-widest text-amber-300 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-700 placeholder:text-base"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || joinCode.length < 4}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-amber-100 font-bold text-sm transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                Unirse a la Aventura
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

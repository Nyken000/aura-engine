'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Users,
  Copy,
  Check,
  Crown,
  Play,
  LogOut,
  UserMinus,
  Wifi,
  Shield,
  Zap,
  Scroll,
} from 'lucide-react'
import {
  startGameSession,
  kickPlayerFromSession,
  selectCharacterForSession,
  endGameSession,
} from '@/app/actions/sessions'

type CharacterStats = {
  class?: string
  race?: string
  [key: string]: unknown
}

interface SessionPlayer {
  id: string
  user_id: string
  character_id: string | null
  status: string
  profiles: { id: string; username: string; avatar_url: string | null }
  characters: { id: string; name: string; stats: CharacterStats } | null
}

interface GameSession {
  id: string
  invite_code: string
  status: string
  host_id: string
  max_players: number
  turn_player_id: string | null
  worlds: { id: string; name: string; description: string; genre: string } | null
  profiles: { id: string; username: string }
}

interface Character {
  id: string
  name: string
  stats: CharacterStats
}

interface CurrentUser {
  id: string
}

interface SessionUpdatePayload {
  new: {
    id: string
    status: string
    turn_player_id?: string | null
  }
}

interface Props {
  session: GameSession
  sessionPlayers: SessionPlayer[]
  myCharacters: Character[]
  currentUser: CurrentUser
  isHost: boolean
  myPlayer: SessionPlayer | null
}

export default function SessionLobbyClient({
  session: initialSession,
  sessionPlayers: initialPlayers,
  myCharacters,
  currentUser,
  isHost,
  myPlayer: initialMyPlayer,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [players, setPlayers] = useState<SessionPlayer[]>(initialPlayers)
  const [session, setSession] = useState<GameSession>(initialSession)
  const [myPlayer, setMyPlayer] = useState<SessionPlayer | null>(initialMyPlayer)
  const [copied, setCopied] = useState(false)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(initialMyPlayer?.character_id || '')
  const [selecting, setSelecting] = useState(false)
  const [status, setStatus] = useState<string>('')

  const myPlayerRef = useRef(myPlayer)

  useEffect(() => {
    myPlayerRef.current = myPlayer
  }, [myPlayer])

  useEffect(() => {
    setPlayers(initialPlayers)
  }, [initialPlayers])

  useEffect(() => {
    setSession(initialSession)
  }, [initialSession])

  useEffect(() => {
    setMyPlayer(initialMyPlayer)
    setSelectedCharacterId(initialMyPlayer?.character_id || '')
  }, [initialMyPlayer])

  const inviteUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/session/${session.invite_code}` : ''

  const refreshPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from('session_players')
      .select('*, profiles!user_id(id, username, avatar_url), characters(id, name, stats)')
      .eq('session_id', session.id)
      .eq('status', 'joined')
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Failed to refresh session players:', error)
      return
    }

    const nextPlayers = (data as SessionPlayer[] | null) ?? []
    setPlayers(nextPlayers)

    const mine = nextPlayers.find((player) => player.user_id === currentUser.id) ?? null
    setMyPlayer(mine)
    setSelectedCharacterId(mine?.character_id || '')
  }, [currentUser.id, session.id, supabase])

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('id, invite_code, status, host_id, max_players, turn_player_id, worlds(*), profiles(*)')
      .eq('id', session.id)
      .single()

    if (error) {
      console.error('Failed to refresh session:', error)
      return
    }

    if (data) {
      setSession({
        ...data,
        worlds: Array.isArray(data.worlds) ? data.worlds[0] : data.worlds,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
      } as unknown as GameSession)
    }
  }, [session.id, supabase])

  const redirectToGame = useCallback(
    async (sessionId: string) => {
      const currentCharacterId = myPlayerRef.current?.character_id

      if (currentCharacterId) {
        router.push(`/play/${currentCharacterId}?session=${sessionId}`)
        return
      }

      const { data, error } = await supabase
        .from('session_players')
        .select('character_id')
        .eq('session_id', sessionId)
        .eq('user_id', currentUser.id)
        .single()

      if (error) {
        console.error('Failed to resolve player character for redirect:', error)
        router.push('/dashboard')
        return
      }

      if (data?.character_id) {
        router.push(`/play/${data.character_id}?session=${sessionId}`)
        return
      }

      router.push('/dashboard')
    },
    [currentUser.id, router, supabase],
  )

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    void refreshPlayers()
    void refreshSession()
  }, [refreshPlayers, refreshSession])

  useEffect(() => {
    const channel = supabase
      .channel(`session:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_players',
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          void refreshPlayers()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload: SessionUpdatePayload) => {
          const updatedSession = payload.new
          setSession((prev) => ({ ...prev, ...updatedSession }))

          if (updatedSession.status === 'active') {
            void refreshPlayers().then(() => redirectToGame(updatedSession.id))
            return
          }

          if (updatedSession.status === 'ended') {
            router.push('/dashboard')
          }
        },
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          void refreshPlayers()
          void refreshSession()
        }
      })

    const pollInterval = window.setInterval(async () => {
      const { data: freshSession } = await supabase
        .from('game_sessions')
        .select('status, id')
        .eq('id', session.id)
        .single()

      if (freshSession?.status === 'active') {
        window.clearInterval(pollInterval)
        await refreshPlayers()
        await redirectToGame(freshSession.id)
      }

      if (freshSession?.status === 'ended') {
        window.clearInterval(pollInterval)
        router.push('/dashboard')
      }
    }, 3000)

    return () => {
      void supabase.removeChannel(channel)
      window.clearInterval(pollInterval)
    }
  }, [redirectToGame, refreshPlayers, refreshSession, router, session.id, supabase])

  const handleSelectCharacter = async (characterId: string) => {
    setSelecting(true)
    setStatus('')
    setSelectedCharacterId(characterId)

    const selectedCharacter = myCharacters.find((character) => character.id === characterId) ?? null

    if (selectedCharacter) {
      setPlayers((prev) =>
        prev.map((player) =>
          player.user_id === currentUser.id
            ? {
              ...player,
              character_id: characterId,
              characters: {
                id: selectedCharacter.id,
                name: selectedCharacter.name,
                stats: selectedCharacter.stats,
              },
            }
            : player,
        ),
      )

      setMyPlayer((prev) =>
        prev
          ? {
            ...prev,
            character_id: characterId,
            characters: {
              id: selectedCharacter.id,
              name: selectedCharacter.name,
              stats: selectedCharacter.stats,
            },
          }
          : prev,
      )
    }

    try {
      await selectCharacterForSession(session.id, characterId)
      await refreshPlayers()
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Error inesperado')
      await refreshPlayers()
    } finally {
      setSelecting(false)
    }
  }

  const canStart = isHost && players.length >= 1 && players.every((player) => player.character_id)

  const getClassIcon = (stats: CharacterStats | undefined) => {
    const cls = stats?.class?.toLowerCase() || ''
    if (['mago', 'wizard', 'hechicero', 'sorcerer', 'bardo'].some((candidate) => cls.includes(candidate))) {
      return '🧙‍♂️'
    }
    if (['clérigo', 'cleric', 'paladin', 'druida'].some((candidate) => cls.includes(candidate))) {
      return '⚜️'
    }
    if (['guerrero', 'fighter', 'barbaro', 'barbarian'].some((candidate) => cls.includes(candidate))) {
      return '⚔️'
    }
    if (['pícaro', 'rogue', 'ranger'].some((candidate) => cls.includes(candidate))) {
      return '🗡️'
    }
    return '🎭'
  }

  return (
    <div className="min-h-screen bg-[#0d0a07] text-[#f4e4c1] flex flex-col">
      <header className="border-b border-amber-900/40 bg-[#0d0a07]/90 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/30">
            <Scroll className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-amber-300">{session.worlds?.name || 'Sesión sin mundo'}</h1>
            <p className="text-xs text-amber-900 capitalize">{session.worlds?.genre || 'Fantasía'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/40 rounded-full px-3 py-1">
            <Wifi className="w-3 h-3" />
            Sala de Espera
          </span>
          <span className="text-xs text-amber-700">
            {players.length}/{session.max_players} jugadores
          </span>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full gap-6 p-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">Aventureros</h2>
            <span className="ml-auto text-xs text-amber-800">Todos deben elegir personaje para iniciar</span>
          </div>

          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className={`relative border rounded-xl p-4 transition-all ${player.user_id === currentUser.id
                  ? 'border-amber-600/60 bg-amber-950/30'
                  : 'border-amber-900/30 bg-stone-900/40'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-800 to-stone-900 flex items-center justify-center border-2 border-amber-700/40 text-xl">
                      {player.profiles?.username?.charAt(0).toUpperCase() || '?'}
                    </div>

                    {player.user_id === session.host_id && (
                      <span className="absolute -top-1 -right-1 text-xs bg-amber-500 rounded-full p-0.5">
                        <Crown className="w-2.5 h-2.5 text-stone-900" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-amber-200 truncate">
                        {player.profiles?.username || 'Anónimo'}
                        {player.user_id === currentUser.id && (
                          <span className="ml-2 text-xs text-amber-600">(Tú)</span>
                        )}
                      </span>
                    </div>

                    {player.characters ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-base">{getClassIcon(player.characters.stats)}</span>
                        <span className="text-xs text-amber-400">{player.characters.name}</span>
                        <span className="text-xs text-stone-500">
                          {player.characters.stats?.race} {player.characters.stats?.class}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 mt-0.5 italic">Sin personaje elegido...</p>
                    )}
                  </div>

                  {isHost && player.user_id !== currentUser.id && session.status === 'lobby' && (
                    <button
                      onClick={() => kickPlayerFromSession(session.id, player.user_id)}
                      className="text-red-700 hover:text-red-500 transition-colors p-1 rounded"
                      title="Expulsar"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {Array.from({ length: Math.max(0, session.max_players - players.length) }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="border border-dashed border-stone-800 rounded-xl p-4 flex items-center gap-3 opacity-40"
              >
                <div className="w-12 h-12 rounded-full bg-stone-900 border-2 border-stone-800" />
                <span className="text-sm text-stone-600">Esperando jugador...</span>
              </div>
            ))}
          </div>

          {status && <p className="text-red-400 text-sm mt-2">{status}</p>}
        </div>

        <div className="w-80 space-y-4">
          <div className="bg-stone-900/60 border border-amber-900/30 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Código de Invitación
            </h3>

            <div className="bg-[#0d0a07] border border-amber-800/50 rounded-lg p-3 text-center">
              <span className="text-3xl font-mono font-bold tracking-widest text-amber-300">
                {session.invite_code}
              </span>
            </div>

            <button
              onClick={copyInvite}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm border transition-all ${copied
                ? 'border-emerald-700 bg-emerald-900/30 text-emerald-400'
                : 'border-amber-700/50 bg-amber-950/30 text-amber-400 hover:bg-amber-900/40'
                }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '¡Enlace copiado!' : 'Copiar enlace de invitación'}
            </button>
          </div>

          {myCharacters.length > 0 && (
            <div className="bg-stone-900/60 border border-amber-900/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Tu Personaje
              </h3>

              <div className="space-y-2">
                {myCharacters.map((character) => (
                  <button
                    key={character.id}
                    onClick={() => handleSelectCharacter(character.id)}
                    disabled={selecting}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${selectedCharacterId === character.id
                      ? 'border-amber-500 bg-amber-950/50 text-amber-300'
                      : 'border-stone-700 bg-stone-900/40 text-stone-400 hover:border-amber-800 hover:text-amber-400'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{getClassIcon(character.stats)}</span>

                      <div>
                        <div className="font-medium">{character.name}</div>
                        <div className="text-xs text-stone-500">
                          {character.stats?.race} {character.stats?.class}
                        </div>
                      </div>

                      {selectedCharacterId === character.id && (
                        <Check className="w-4 h-4 ml-auto text-amber-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {myCharacters.length === 0 && (
                <p className="text-xs text-stone-500 italic text-center py-2">
                  No tienes personajes en este mundo.
                  <br />
                  Crea uno primero en el Dashboard.
                </p>
              )}
            </div>
          )}

          {isHost && session.status === 'lobby' && (
            <div className="space-y-2">
              <form action={startGameSession.bind(null, session.id)}>
                <button
                  type="submit"
                  disabled={!canStart}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border transition-all ${canStart
                    ? 'border-amber-500 bg-gradient-to-r from-amber-700 to-amber-600 text-amber-100 hover:from-amber-600 hover:to-amber-500 shadow-lg shadow-amber-900/30'
                    : 'border-stone-700 bg-stone-900/40 text-stone-600 cursor-not-allowed'
                    }`}
                >
                  <Play className="w-4 h-4" />
                  ¡Iniciar Aventura!
                </button>
              </form>

              {!canStart && (
                <p className="text-xs text-stone-600 text-center">
                  Todos los jugadores deben elegir un personaje
                </p>
              )}

              <form action={endGameSession.bind(null, session.id)}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm border border-stone-700 text-stone-500 hover:border-red-900 hover:text-red-500 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Cancelar Sesión
                </button>
              </form>
            </div>
          )}

          {!isHost && session.status === 'lobby' && (
            <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-4 text-center space-y-2">
              <div className="text-2xl">⏳</div>
              <p className="text-sm text-stone-400">
                Esperando a que <span className="text-amber-400">{session.profiles?.username}</span> inicie la aventura...
              </p>
            </div>
          )}

          <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Mundo</h3>
            <p className="text-sm text-amber-200 font-medium">{session.worlds?.name || 'Mundo Desconocido'}</p>
            <p className="text-xs text-stone-500 line-clamp-3">{session.worlds?.description || 'Sin descripción.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
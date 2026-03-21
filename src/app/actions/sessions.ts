'use server'

import {
  advanceSessionCombatTurn,
  createEmptySessionCombatState,
  resolveTurnPlayerIdFromParticipant,
} from '@/server/combat/session-combat-service'
import { persistSessionCombatTransition } from '@/server/combat/session-combat-transitions'
import type { SessionCombatStateRecord } from '@/types/session-combat'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type SessionPlayerRow = {
  user_id: string
}

type SessionRouteRecord = {
  id: string
  invite_code: string
}

export async function createGameSession(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autorizado')

  const worldId = formData.get('world_id') as string
  const maxPlayers = parseInt(formData.get('max_players') as string, 10) || 4

  if (!worldId) throw new Error('Debes seleccionar un mundo')

  const { data: session, error } = await supabase
    .from('game_sessions')
    .insert({ world_id: worldId, host_id: user.id, max_players: maxPlayers })
    .select('id, invite_code')
    .single()

  if (error || !session) throw new Error(`Error al crear sesión: ${error?.message}`)

  await supabase.from('session_players').insert({
    session_id: session.id,
    user_id: user.id,
    status: 'joined',
  })

  await supabase.from('session_combat_states').upsert(createEmptySessionCombatState(session.id), {
    onConflict: 'session_id',
  })

  redirect(`/session/${session.invite_code}`)
}

export async function joinGameSession(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autorizado')

  const inviteCode = (formData.get('invite_code') as string)?.toUpperCase().trim()
  const characterId = (formData.get('character_id') as string) || null

  if (!inviteCode) throw new Error('Introduce un código de invitación')

  const { data: session, error: sessErr } = await supabase
    .from('game_sessions')
    .select('id, status, max_players, invite_code')
    .eq('invite_code', inviteCode)
    .single()

  if (sessErr || !session) throw new Error('Código de invitación inválido o sesión no encontrada')
  if (session.status === 'ended') throw new Error('Esta sesión ya ha terminado')

  const { count } = await supabase
    .from('session_players')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('status', 'joined')

  if ((count ?? 0) >= session.max_players) throw new Error('La sesión está llena')

  const { data: existing } = await supabase
    .from('session_players')
    .select('id')
    .eq('session_id', session.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase
      .from('session_players')
      .update({ status: 'joined', character_id: characterId })
      .eq('id', existing.id)
  } else {
    await supabase.from('session_players').insert({
      session_id: session.id,
      user_id: user.id,
      character_id: characterId,
      status: 'joined',
    })
  }

  await supabase.from('session_combat_states').upsert(createEmptySessionCombatState(session.id), {
    onConflict: 'session_id',
  })

  revalidatePath(`/session/${session.invite_code}`)
  redirect(`/session/${session.invite_code}`)
}

export async function selectCharacterForSession(sessionId: string, characterId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autorizado')

  const { data: character } = await supabase
    .from('characters')
    .select('id, world_id')
    .eq('id', characterId)
    .eq('user_id', user.id)
    .single()

  if (!character) throw new Error('Personaje no encontrado')

  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, invite_code')
    .eq('id', sessionId)
    .single()

  const typedSession = (session as SessionRouteRecord | null) ?? null
  if (!typedSession) throw new Error('Sesión no encontrada')

  const { data: membership } = await supabase
    .from('session_players')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (membership?.id) {
    const { error } = await supabase
      .from('session_players')
      .update({
        character_id: characterId,
        status: 'joined',
      })
      .eq('id', membership.id)

    if (error) {
      throw new Error(`No se pudo vincular el personaje: ${error.message}`)
    }
  } else {
    const { error } = await supabase.from('session_players').insert({
      session_id: sessionId,
      user_id: user.id,
      character_id: characterId,
      status: 'joined',
    })

    if (error) {
      throw new Error(`No se pudo crear la entrada del jugador: ${error.message}`)
    }
  }

  revalidatePath(`/session/${typedSession.invite_code}`)
  revalidatePath(`/play/${characterId}`)
}

export async function startGameSession(sessionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autorizado')

  const { data: session } = await supabase
    .from('game_sessions')
    .select('id, host_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.host_id !== user.id) throw new Error('Solo el host puede iniciar la sesión')

  const { data: players } = await supabase
    .from('session_players')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('status', 'joined')
    .order('joined_at', { ascending: true })

  const typedPlayers = (players || []) as SessionPlayerRow[]
  const firstPlayerId = typedPlayers[0]?.user_id ?? user.id

  const { error } = await supabase
    .from('game_sessions')
    .update({
      status: 'active',
      turn_player_id: firstPlayerId,
    })
    .eq('id', sessionId)

  if (error) throw new Error(`Error al iniciar sesión: ${error.message}`)

  await supabase.from('session_combat_states').upsert(createEmptySessionCombatState(sessionId), {
    onConflict: 'session_id',
  })

  const { data: hostPlayer } = await supabase
    .from('session_players')
    .select('character_id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (hostPlayer?.character_id) {
    redirect(`/play/${hostPlayer.character_id}?session=${sessionId}`)
  }

  redirect('/dashboard')
}

export async function kickPlayerFromSession(sessionId: string, targetUserId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autorizado')

  const { data: session } = await supabase
    .from('game_sessions')
    .select('host_id, invite_code')
    .eq('id', sessionId)
    .single()

  if (session?.host_id !== user.id) throw new Error('Solo el host puede expulsar jugadores')

  await supabase
    .from('session_players')
    .update({ status: 'kicked' })
    .eq('session_id', sessionId)
    .eq('user_id', targetUserId)

  if (session?.invite_code) {
    revalidatePath(`/session/${session.invite_code}`)
  }
}

export async function advanceTurn(sessionId: string) {
  const supabase = createClient()

  const { data: combatState } = await supabase
    .from('session_combat_states')
    .select('session_id, status, round, turn_index, participants')
    .eq('session_id', sessionId)
    .single()

  const typedCombatState = (combatState as SessionCombatStateRecord | null) ?? null
  if (typedCombatState?.status === 'active') {
    const { combatState: nextCombatState, activeParticipant } = advanceSessionCombatTurn(typedCombatState)

    await persistSessionCombatTransition({
      supabase,
      sessionId,
      combatState: nextCombatState,
      turnPlayerId: resolveTurnPlayerIdFromParticipant(activeParticipant),
    })

    return
  }

  const { data: players } = await supabase
    .from('session_players')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('status', 'joined')
    .order('joined_at', { ascending: true })

  const typedPlayers = (players || []) as SessionPlayerRow[]
  if (typedPlayers.length === 0) return

  const { data: session } = await supabase
    .from('game_sessions')
    .select('turn_player_id')
    .eq('id', sessionId)
    .single()

  const currentIdx = typedPlayers.findIndex((player) => player.user_id === session?.turn_player_id)
  const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % typedPlayers.length : 0
  const nextPlayerId = typedPlayers[nextIdx]?.user_id

  if (!nextPlayerId) return

  await supabase.from('game_sessions').update({ turn_player_id: nextPlayerId }).eq('id', sessionId)
}

export async function endGameSession(sessionId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autorizado')

  const { data: session } = await supabase
    .from('game_sessions')
    .select('host_id, invite_code')
    .eq('id', sessionId)
    .single()

  if (!session || session.host_id !== user.id) throw new Error('Solo el host puede terminar la sesión')

  const { error } = await supabase
    .from('game_sessions')
    .update({ status: 'ended' })
    .eq('id', sessionId)

  if (error) throw new Error(`Error al terminar sesión: ${error.message}`)

  if (session.invite_code) {
    revalidatePath(`/session/${session.invite_code}`)
  }
  revalidatePath('/dashboard')
  redirect('/dashboard')
}
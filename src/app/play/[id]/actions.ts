'use server'

import { createClient } from '@/utils/supabase/server'
import { evaluateActionWithGM } from '@/utils/ai/engine'
import { getCampaignById } from '@/utils/game/campaigns'
import { revalidatePath } from 'next/cache'

type InventoryItem = {
  name: string
  type?: string
  description?: string
}

type CharacterRecord = {
  id: string
  user_id: string
  name: string
  world_id: string | null
  campaign_id: string | null
  hp_current: number
  hp_max: number
  inventory: InventoryItem[] | null
  worlds?: {
    id: string
    name: string
    description: string
  } | null
}

type EvaluationStateChanges = {
  hp_delta?: number
  inventory_added?: string[]
  inventory_removed?: string[]
}

type EvaluationResult = {
  narrative_response: string
  dice_roll_required?: unknown
  state_changes?: EvaluationStateChanges | null
}

export async function submitChatAction(
  characterId: string,
  content: string,
  type: 'adventure' | 'group' = 'adventure',
  sessionId?: string | null,
  clientEventId?: string,
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }

  const { data: character } = await supabase
    .from('characters')
    .select('*, worlds(*)')
    .eq('id', characterId)
    .single()

  const typedCharacter = character as CharacterRecord | null

  if (!typedCharacter) return { error: 'Personaje no encontrado' }
  if (typedCharacter.user_id !== user.id) return { error: 'No autorizado para usar este personaje' }

  const world = typedCharacter.worlds
  const campaign = typedCharacter.campaign_id ? getCampaignById(typedCharacter.campaign_id) : null
  const messageContent = type === 'group' ? `[OOC] ${content}` : content

  if (sessionId && clientEventId) {
    const { data: existingEvent } = await supabase
      .from('narrative_events')
      .select('id')
      .eq('session_id', sessionId)
      .eq('client_event_id', clientEventId)
      .maybeSingle()

    if (existingEvent) {
      return { success: true, duplicate: true }
    }
  }

  await supabase.from('narrative_events').insert([
    {
      world_id: world?.id ?? null,
      character_id: typedCharacter.id,
      session_id: sessionId ?? null,
      role: 'user',
      content: messageContent,
      client_event_id: clientEventId ?? null,
      event_type: type === 'group' ? 'group_message' : 'player_message',
      payload: {
        sender_name: typedCharacter.name,
        channel: type,
      },
    },
  ])

  if (type === 'group') {
    revalidatePath(`/play/${characterId}`)
    return { success: true }
  }

  const { data: recentEvents } = await supabase
    .from('narrative_events')
    .select('*')
    .eq('character_id', typedCharacter.id)
    .order('created_at', { ascending: false })
    .limit(8)

  try {
    const aiEvaluation = (await evaluateActionWithGM({
      character: typedCharacter,
      world: world || { name: 'Desconocido', description: 'Un lugar sin nombre en el multiverso.' },
      campaign: campaign || null,
      playerAction: content,
      recentHistory: (recentEvents || []).reverse(),
    })) as EvaluationResult

    let newHp =
      (typedCharacter.hp_current || typedCharacter.hp_max) + (aiEvaluation.state_changes?.hp_delta || 0)

    if (newHp > typedCharacter.hp_max) newHp = typedCharacter.hp_max
    if (newHp < 0) newHp = 0

    const currentInventory: InventoryItem[] = Array.isArray(typedCharacter.inventory)
      ? [...typedCharacter.inventory]
      : []

    aiEvaluation.state_changes?.inventory_added?.forEach((item) => {
      currentInventory.push({ name: item, type: 'item' })
    })

    aiEvaluation.state_changes?.inventory_removed?.forEach((target) => {
      const idx = currentInventory.findIndex((item) =>
        String(item.name || '')
          .toLowerCase()
          .includes(target.toLowerCase()),
      )

      if (idx > -1) currentInventory.splice(idx, 1)
    })

    await supabase
      .from('characters')
      .update({ hp_current: newHp, inventory: currentInventory })
      .eq('id', typedCharacter.id)

    await supabase.from('narrative_events').insert([
      {
        world_id: world?.id ?? null,
        character_id: typedCharacter.id,
        role: 'assistant',
        content: aiEvaluation.narrative_response,
        dice_roll_required: aiEvaluation.dice_roll_required ?? null,
        event_type: 'gm_message',
        payload: {
          sender_name: 'Game Master',
        },
      },
    ])

    revalidatePath(`/play/${characterId}`)
    return { success: true, evaluation: aiEvaluation }
  } catch (error: unknown) {
    console.error('Engine evaluation failed:', error instanceof Error ? error.message : error)
    return { error: 'El Oráculo falló al leer el destino. Intenta de nuevo.' }
  }
}
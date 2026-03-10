'use server'

import { createClient } from '@/utils/supabase/server'
import { evaluateActionWithGM } from '@/utils/ai/engine'
import { getCampaignById } from '@/utils/game/campaigns'
import { revalidatePath } from 'next/cache'

export async function submitChatAction(characterId: string, content: string, type: 'adventure' | 'group' = 'adventure', sessionId?: string | null) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'No autorizado' }

  // 1. Fetch Character (including campaign_id)
  const { data: character } = await supabase
    .from('characters')
    .select('*, worlds(*)')
    .eq('id', characterId)
    .single()

  if (!character) return { error: 'Personaje no encontrado' }

  const world = character.worlds
  if (character.user_id !== user.id) return { error: 'No autorizado para usar este personaje' }

  // 2. Resolve the campaign for this character
  const campaign = character.campaign_id ? getCampaignById(character.campaign_id) : null

  // 3. Build message content (tag OOC messages)
  let messageContent = type === 'group' ? `[OOC] ${content}` : content

  // 4. Insert user message
  await supabase
    .from('narrative_events')
    .insert([{
      world_id: world?.id ?? null,
      character_id: character.id,
      session_id: sessionId ?? null,
      role: 'user',
      content: messageContent
    }])

  // 5. Skip AI for group chat
  if (type === 'group') {
    revalidatePath(`/play/${characterId}`)
    return { success: true }
  }

  // 6. Fetch recent in-character events for context — filtered to THIS character
  const { data: recentEvents } = await supabase
    .from('narrative_events')
    .select('*, characters(name)')
    .eq('character_id', character.id)
    .order('created_at', { ascending: false })
    .limit(8)

  // 7. Call AI GM with full campaign context
  try {
    const aiEvaluation = await evaluateActionWithGM({
      character,
      world,
      campaign: campaign || null,
      playerAction: content,
      recentHistory: (recentEvents || []).reverse()
    })

    // 8. Apply stat changes
    let newHp = (character.hp_current || character.hp_max) + (aiEvaluation.state_changes?.hp_delta || 0)
    if (newHp > character.hp_max) newHp = character.hp_max
    if (newHp < 0) newHp = 0

    let currentInventory = character.inventory || []
    aiEvaluation.state_changes?.inventory_added?.forEach((item: string) => {
      currentInventory.push({ name: item, type: 'item' })
    })
    aiEvaluation.state_changes?.inventory_removed?.forEach((target: string) => {
      const idx = currentInventory.findIndex((i: any) => i.name.toLowerCase().includes(target.toLowerCase()))
      if (idx > -1) currentInventory.splice(idx, 1)
    })

    await supabase
      .from('characters')
      .update({ hp_current: newHp, inventory: currentInventory })
      .eq('id', character.id)

    // 9. Insert GM narrative response — linked to THIS character
    await supabase
      .from('narrative_events')
      .insert([{
        world_id: world?.id ?? null,
        character_id: character.id,
        role: 'assistant',
        content: aiEvaluation.narrative_response,
        dice_roll_required: aiEvaluation.dice_roll_required
      }])

    revalidatePath(`/play/${characterId}`)
    return { success: true, evaluation: aiEvaluation }

  } catch (error: any) {
    console.error("Engine evaluation failed:", error)
    return { error: 'El Oráculo falló al leer el destino. Intenta de nuevo.' }
  }
}

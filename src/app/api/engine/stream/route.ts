import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getCampaignById } from '@/utils/game/campaigns'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { characterId, content } = await req.json()
  if (!characterId || !content) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  // 1. Fetch character + world
  const { data: character } = await supabase
    .from('characters')
    .select('*, worlds(*)')
    .eq('id', characterId)
    .single()

  if (!character || character.user_id !== user.id)
    return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 })

  const world = character.worlds
  const campaign = character.campaign_id ? getCampaignById(character.campaign_id) : null

  // 3. Fetch active rule book file URIs (global — uploaded by admin, used by all players)
  const { data: activeBooks } = await supabase
    .from('rule_books')
    .select('gemini_file_uri')
    .eq('gemini_state', 'ACTIVE')

  const ruleBookParts = (activeBooks ?? [])
    .filter((b: any) => b.gemini_file_uri)
    .map((b: any) => ({ fileData: { mimeType: 'application/pdf', fileUri: b.gemini_file_uri } }))

  const hasRuleBooks = ruleBookParts.length > 0

  // 4. Fetch recent events for context (last 8 messages for this character)
  const { data: recentEvents } = await supabase
    .from('narrative_events')
    .select('*, characters(name)')
    .eq('character_id', character.id)
    .order('created_at', { ascending: false })
    .limit(8)

  const historyText = (recentEvents ?? []).reverse().map((evt: any) =>
    `[${evt.role.toUpperCase()}${evt.characters?.name ? ` - ${evt.characters.name}` : ''}]: ${evt.content}`
  ).join('\n')

  const campaignContext = campaign ? `
    === CAMPAÑA ACTIVA: "${campaign.title}" ===
    Premisa: ${campaign.description}
    OBJETIVO PRINCIPAL DEL JUGADOR: ${campaign.main_quest}
    SECRETO DEL DM (nunca lo reveles directamente, hazlo emerger lentamente): ${campaign.the_twist}
    NPCs Claves: ${campaign.key_npcs.join(' | ')}
    ===
  ` : ''

  const combatContext = character.combat_state?.in_combat ? `
    === COMBATE EN CURSO ===
    Turno actual de: ${character.combat_state.participants[character.combat_state.turn]?.name}
    Participantes (orden de iniciativa):
    ${character.combat_state.participants.map((p: any) => `- ${p.name} (HP: ${p.hp}/${p.max_hp}, AC: ${p.ac})`).join('\n')}
    ===
  ` : ''

  const prompt = `
    Eres el Game Master de una aventura de mesa basada en D&D 5E.
    Mundo: "${world.name}" - ${world.description}
    ${campaignContext}
    
    Personaje:
    - Nombre: ${character.name}
    - Raza: ${character.stats?.race} | Clase: ${character.stats?.class}
    - HP: ${character.hp_current}/${character.hp_max}
    - STR ${character.stats?.str} DEX ${character.stats?.dex} CON ${character.stats?.con} INT ${character.stats?.int} SAB ${character.stats?.wis} CAR ${character.stats?.cha}
    - Equipamiento: ${(character.inventory || []).map((i: any) => i.name).join(', ') || 'Nada'}

    ${combatContext}

    HISTORIAL RECIENTE:
    ${historyText}

    ACCIÓN DEL JUGADOR: "${content}"

    Responde ÚNICAMENTE con un JSON válido (sin markdown), con esta forma exacta:
    {
      "narrative_response": "Narración épica e inmersiva...",
      "dice_roll_required": {
        "needed": false,
        "die": "d20",
        "stat": "dex",
        "skill": "Sigilo",
        "dc": 15,
        "flavor": "Tirada de Sigilo (DES) — CD 15"
      },
      "state_changes": { "hp_delta": 0, "inventory_added": [], "inventory_removed": [], "skills_used": [] },
      "combat": { 
        "in_combat": false, 
        "initiative_requested": false,
        "enemies": [ 
          { "name": "Goblin 1", "hp": 7, "max_hp": 7, "ac": 12, "initiative": 0, "is_player": false } 
        ]
      }
    }
    
    IMPORTANTE PARA TIRADAS Y COMBATE:
    1. Si la acción del jugador requiere una tirada, pon "needed": true en dice_roll_required.
    2. Si decides INICIAR UN COMBATE (porque el jugador ataca, o es emboscado), pon "initiative_requested": true e "in_combat": true, y llena el array "enemies" con los monstruos generados (nombre, hp, max_hp, ac).
    3. Si ya estás en combate y un enemigo sufre daño, aplícalo lógicamente en tu narrativa. No tienes un campo para actualizar HP de enemigos directamente, pero puedes describirlo ("El goblin muere").
    4. El campo "flavor" de los dados debe ser corto, ej: "Tirada de Atletismo (FUE) — CD 12".
    ${
      hasRuleBooks
        ? `\n    INSTRUCCIÓN CRÍTICA SOBRE LOS MANUALES ADJUNTOS:
    Se te han proporcionado manuales de D&D como archivos de referencia (pueden estar en inglés o español).
    - ÚSALOS SOLO como referencia de mecánicas: CDs, efectos de hechizos, tiradas de salvación, estadísticas de monstruos, reglas de clase, etc.
    - NUNCA copies ni traduzcas texto de los manuales directamente en tu respuesta.
    - TODA tu respuesta narrativa debe estar en español épico e inmersivo, independientemente del idioma del manual.
    - Eres un DM que estudió las reglas en inglés pero narra la historia en español con naturalidad y fluidez.`
        : ''
    }
  `

  // 3. Insert user message first (non-blocking)
  await supabase.from('narrative_events').insert([{
    world_id: world.id,
    character_id: character.id,
    role: 'user',
    content
  }])

  // 4. Intercept Initiative System Rolls
  const initMatch = content.match(/\[SISTEMA_INICIATIVA:\s*(\d+)\]/)
  if (initMatch && character.combat_state?.in_combat) {
    const rolledInit = parseInt(initMatch[1], 10)
    let newCombatState = { ...character.combat_state }
    
    // Set player's initiative
    const pIdx = newCombatState.participants.findIndex((p: any) => p.is_player)
    if (pIdx > -1) {
      newCombatState.participants[pIdx].initiative = rolledInit
    }
    
    // Auto-roll for enemies that haven't rolled yet
    newCombatState.participants.forEach((p: any) => {
      if (!p.is_player && (!p.initiative || p.initiative === 0)) {
         p.initiative = Math.floor(Math.random() * 20) + 1 + Math.floor((p.ac - 10) / 2) // Rough initiative equivalent based on AC dex 
      }
    })

    // Sort participants by initiative (highest first)
    newCombatState.participants.sort((a: any, b: any) => b.initiative - a.initiative)
    newCombatState.turn = 0 // Start combat at top of the order

    await supabase.from('characters').update({ combat_state: newCombatState }).eq('id', character.id)
    character.combat_state = newCombatState // update local object for context
  }

  // Intercept Next Turn Action
  const nextTurnMatch = content.match(/\[SISTEMA_TURNO_SIGUIENTE\]/)
  if (nextTurnMatch && character.combat_state?.in_combat) {
    let newCombatState = { ...character.combat_state }
    newCombatState.turn = (newCombatState.turn + 1) % Math.max(1, newCombatState.participants.length)
    await supabase.from('characters').update({ combat_state: newCombatState }).eq('id', character.id)
    character.combat_state = newCombatState
  }

  // 5. Stream from Gemini using generateContentStream
  // Build multimodal content: rule book PDFs (if any) + text prompt
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const contentParts = [
    ...ruleBookParts,         // PDF file parts (empty array if no books)
    { text: prompt }          // The GM prompt text
  ]

  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream({ contents: [{ role: 'user', parts: contentParts }] })

        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            fullResponse += text
            // Stream each chunk as a Server-Sent Event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`))
          }
        }

        // After stream ends: robustly extract the narrative, apply state, save to DB
        // Helper: strip any markdown fences Gemini may have added
        const cleaned = fullResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

        // Strategy 1: JSON.parse the whole response
        let narrative = ''
        let stateChanges: any = null
        let diceRollRequired: any = null
        let combatUpdate: any = null
        try {
          const jsonBlock = cleaned.match(/\{[\s\S]*\}/)
          if (jsonBlock) {
            const evaluation = JSON.parse(jsonBlock[0])
            narrative = evaluation.narrative_response ?? ''
            stateChanges = evaluation.state_changes ?? null
            diceRollRequired = evaluation.dice_roll_required ?? null
            combatUpdate = evaluation.combat ?? null
          }
        } catch { /* try next strategy */ }

        // Strategy 2: regex extract only the narrative_response value
        if (!narrative) {
          const match = cleaned.match(/"narrative_response"\s*:\s*"((?:[^"\\]|\\.)*)"/)
          if (match) {
            narrative = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '  ')
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
          }
        }

        // Strategy 3: if no JSON at all, use the raw text (non-JSON free-form response)
        if (!narrative) {
          narrative = fullResponse
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .replace(/"narrative_response"\s*:\s*/g, '')
            .trim()
        }

        // Apply HP changes if we got state changes
        let newHp = character.hp_current ?? character.hp_max
        let inv = [...(character.inventory || [])]
        if (stateChanges) {
          const hpDelta = stateChanges.hp_delta ?? 0
          newHp = Math.min(character.hp_max, Math.max(0, newHp + hpDelta))

          stateChanges.inventory_added?.forEach((item: string) => inv.push({ name: item, type: 'item' }))
          stateChanges.inventory_removed?.forEach((target: string) => {
            const idx = inv.findIndex((i: any) => i.name.toLowerCase().includes(target.toLowerCase()))
            if (idx > -1) inv.splice(idx, 1)
          })
        }

        // Handle Combat State logic
        let newCombatState = character.combat_state || { in_combat: false, turn: 0, participants: [] }
        if (combatUpdate && combatUpdate.in_combat) {
          newCombatState.in_combat = true
          // If the GM requested combat, check if there are new enemies to add
          if (combatUpdate.enemies && combatUpdate.enemies.length > 0) {
            // Keep existing ones, append new ones 
            const existingNames = newCombatState.participants.map((p: any) => p.name)
            
            // First time entering combat? Add player too
            if (newCombatState.participants.length === 0) {
              newCombatState.participants.push({
                name: character.name,
                hp: newHp,
                max_hp: character.hp_max,
                ac: 10 + Math.floor(((character.stats?.dex || 10) - 10) / 2), // basic unarmored AC
                is_player: true,
                initiative: 0 // Will be rolled later
              })
            }
            
            combatUpdate.enemies.forEach((en: any) => {
              if (!existingNames.includes(en.name)) {
                newCombatState.participants.push({ ...en, is_player: false })
              }
            })
          }
        } else if (combatUpdate && !combatUpdate.in_combat) {
          // Combat ended
          newCombatState = { in_combat: false, turn: 0, participants: [] }
        } else if (newCombatState.in_combat) {
           // Still in combat, update player HP in the tracker
           const pIdx = newCombatState.participants.findIndex((p: any) => p.is_player)
           if (pIdx > -1) newCombatState.participants[pIdx].hp = newHp
        }

        await Promise.all([
          supabase.from('characters').update({ 
            hp_current: newHp, 
            inventory: inv,
            combat_state: newCombatState 
          }).eq('id', character.id),
          supabase.from('narrative_events').insert([{
            world_id: world.id,
            character_id: character.id,
            role: 'assistant',
            content: narrative,             // Always clean text, never raw JSON
            dice_roll_required: diceRollRequired
          }])
        ])

        // Signal done with extracted narrative
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          done: true, 
          narrative, 
          state_changes: stateChanges,
          dice_roll_required: diceRollRequired 
        })}\n\n`))

        controller.close()
      } catch (err: any) {
        console.error('Stream error:', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

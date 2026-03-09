import { geminiModel } from './gemini'
import { type Campaign } from '@/utils/game/campaigns'

// Types for the Engine
export interface TurnContext {
  character: any;
  world: any;
  campaign: Campaign | null;
  playerAction: string;
  recentHistory: any[]; // The last 5-10 messages for context
}

export interface GMEvaluation {
  narrative_response: string;
  state_changes: {
    hp_delta: number;
    inventory_added: string[];
    inventory_removed: string[];
    skills_used: string[];
  };
  combat: {
    in_combat: boolean;
    initiative_requested: boolean;
  };
  dice_roll_required?: {
    needed: boolean;
    die: string;
    stat: string;
    skill: string | null;
    dc: number;
    flavor: string;
  } | null;
}

export async function generateOpeningMonologue(character: any, campaign: Campaign, world: any): Promise<string> {
  const prompt = `
    Eres un escritor de novelas épicas y el Game Master de esta campaña de rol.
    
    MUNDO: "${world.name}" - ${world.description}

    CAMPAÑA ASIGNADA: "${campaign.title}" (${campaign.theme})
    Premisa de la Campaña: ${campaign.description}
    Objetivo Principal: ${campaign.main_quest}
    Situación Inicial: ${campaign.starting_situation}
    
    PERSONAJE DEL JUGADOR:
    - Nombre: ${character.name}
    - Raza: ${character.stats?.race || 'Desconocida'}
    - Clase: ${character.stats?.class || 'Aventurero'}
    - Rasgo Único: ${character.inventory?.find((i:any) => i.type === 'passive')?.description || 'Ninguno'}

    TU TAREA:
    Escribe el PRÓLOGO épico de la aventura. Este es el primer texto que leerá el jugador. 
    Este texto debe:
    1. Narrar vívidamente la "Situación Inicial" de la campaña.
    2. Usar el nombre del personaje para sumergirlo en la historia.
    3. Terminar con una pregunta implícita o una decisión inmediata para que el jugador sienta urgencia.
    4. Ser poético, oscuro (si el tema lo amerita), y profundamente inmersivo. Extremadamente literario.
    5. Tener entre 4-7 párrafos ricos en detalles sensoriales.
    
    Responde ÚNICA Y EXCLUSIVAMENTE con el prólogo narrativo. Sin notas, sin saludos, sin metadatos, sin JSON. Solo el texto de la historia.
  `
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

export async function evaluateActionWithGM(context: TurnContext): Promise<GMEvaluation> {
  const historyText = context.recentHistory.map(evt => 
    `[${evt.role.toUpperCase()}${evt.characters?.name ? ` - ${evt.characters.name}` : ''}]: ${evt.content}`
  ).join('\n')

  const campaignContext = context.campaign ? `
    === CAMPAÑA ACTIVA: "${context.campaign.title}" ===
    Premisa: ${context.campaign.description}
    OBJETIVO PRINCIPAL DEL JUGADOR: ${context.campaign.main_quest}
    SECRETO DEL DM (nunca lo reveles directamente, hazlo emerger lentamente): ${context.campaign.the_twist}
    NPCs Claves que puedes introducir cuando sea natural: 
    ${context.campaign.key_npcs.join('\n    ')}
    ===
  ` : ''

  const prompt = `
    Eres el Game Master de una aventura de mesa basada en D&D 5E.
    Mundo: "${context.world.name}" - ${context.world.description}
    
    ${campaignContext}

    Hoja de Personaje Actual:
    - Nombre: ${context.character.name}
    - Raza: ${context.character.stats?.race || 'Desconocida'}
    - Clase: ${context.character.stats?.class || 'Aventurero'}
    - HP: ${context.character.hp_current}/${context.character.hp_max}
    - Stats: STR ${context.character.stats?.str}, DEX ${context.character.stats?.dex}, CON ${context.character.stats?.con}, INT ${context.character.stats?.int}, WIS ${context.character.stats?.wis}, CHA ${context.character.stats?.cha}
    - Competencias: ${(context.character.skills || []).join(', ') || 'Ninguna'}
    - Equipamiento: ${(context.character.inventory || []).map((i:any) => i.name).join(', ') || 'Nada'}

    HISTORIAL RECIENTE:
    ${historyText}

    NUEVA ACCIÓN DEL JUGADOR (${context.character.name}):
    "${context.playerAction}"

    TU TAREA:
    Resuelve la acción del jugador de manera justa pero dramática, siempre avanzando la narrativa de la campaña.
    Tira dados mentalmente basándote en las estadísticas del personaje y sus competencias.
    Si recibe daño, usa hp_delta negativo. Si su acción les permite curar, usa positivo (no exagerado).
    Si recoge un objeto, usa inventory_added. Si usa o pierde algo, usa inventory_removed.
    Introduce NPCs de la campaña cuando sea narrativamente apropiado.
    
    Devuelve ÚNICAMENTE un objeto JSON válido (no uses markdown \`\`\`json):
    {
      "narrative_response": "Narración épica e inmersiva de lo que ocurre...",
      "state_changes": {
        "hp_delta": 0,
        "inventory_added": [],
        "inventory_removed": [],
        "skills_used": []
      },
      "combat": {
        "in_combat": false,
        "initiative_requested": false,
        "enemies": [ 
          { "name": "Goblin 1", "hp": 7, "max_hp": 7, "ac": 12, "initiative": 0, "is_player": false } 
        ]
      },
      "dice_roll_required": null
    }
    
    IMPORTANTE PARA COMBATES:
    - Si decides iniciar un combate (porque el jugador ataca o es atacado violentamente), envía \`"initiative_requested": true\`, \`"in_combat": true\` y llena \`"enemies"\` con los stats de los rivales.
    
    Nota: dice_roll_required puede ser null, O un objeto como el siguiente si la acción del jugador tiene posibilidades de fallar según su habilidad:
    { "needed": true, "die": "d20", "stat": "DEX", "skill": "Acrobacias", "dc": 14, "flavor": "Tira para saltar el abismo" }
  `

  const result = await geminiModel.generateContent(prompt)
  let text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Invalid JSON format from AI: ${text}`)
  }

  try {
    const evaluation = JSON.parse(jsonMatch[0]) as GMEvaluation
    return evaluation
  } catch (err: any) {
    console.error("Failed to parse GM result:", text)
    throw new Error("El Oráculo envió una respuesta incomprensible.")
  }
}

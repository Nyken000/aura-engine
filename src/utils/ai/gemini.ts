import { GoogleGenerativeAI } from '@google/generative-ai'

type WorldContext = {
  id?: string
  name: string
  description: string
  genre?: string | null
  ai_rules?: string | null
}

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

if (!apiKey) {
  throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is missing in .env.local')
}

const genAI = new GoogleGenerativeAI(apiKey)

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
})

export const geminiFlashModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
})

export async function generateLoreFriendlyBackstory(
  keywords: string,
  worldContext?: WorldContext,
) {
  const prompt = `
    Eres un aclamado novelista de fantasía y un Dungeon Master de D&D.
    Tengo un jugador que quiere crear un personaje para una campaña.
    
    ${worldContext
      ? `Contexto del mundo de la campaña:
    Nombre: ${worldContext.name}
    Descripción: ${worldContext.description}
    Género: ${worldContext.genre || 'Fantasía'}
    Reglas Especiales: ${worldContext.ai_rules || 'Ninguna'}`
      : 'Contexto del mundo: Las Tierras Desconocidas (Un entorno de rol clásico de alta fantasía).'
    }

    El jugador me dio estas palabras clave o ideas sueltas para su historia:
    "${keywords}"

    Tu tarea: Escribe una historia de fondo (backstory) inmersiva, rica y épica de máximo tres párrafos cortos. 
    Debe conectar orgánicamente las ideas del jugador con el lore de este mundo específico.
    Usa un tono épico y de rol. Escribe directamente la historia, sin introducciones ("Aquí tienes la historia:", etc).
  `

  try {
    const result = await geminiFlashModel.generateContent(prompt)
    return result.response.text()
  } catch (error: unknown) {
    console.error('Error generating backstory:', error)
    throw new Error('El Oráculo no pudo tejer esta historia. Inténtalo de nuevo.')
  }
}

export async function analyzeStoryForStats(story: string, worldContext?: WorldContext) {
  const prompt = `
    Eres el "Oráculo de las Almas", un ente analítico y un Dungeon Master experto en D&D 5ta Edición.
    Un jugador me ha entregado la historia de vida de su personaje${worldContext ? ` para el mundo "${worldContext.name}"` : ''}.
    
    Tu tarea: Extraer información táctica y generar estadísticas (Stats) equilibradas para este personaje basándote puramente en lo que cuenta la historia.

    REGLAS DE BALANCE ESTRICTAS:
    - Las estadísticas usan el sistema clásico: STR (Fuerza), DEX (Destreza), CON (Constitución), INT (Inteligencia), WIS (Sabiduría), CHA (Carisma).
    - El jugador empieza a Nivel 1.
    - El total de los puntos de los 6 atributos combinados (STR+DEX+CON+INT+WIS+CHA) de base DEBE sumar un máximo de 75 puntos.
    - Ninguna estadística base puede ser mayor a 18.
    - Asigna la vida máxima ("hp_max") lógica para Nivel 1 según clase y Constitución, y el Dado de Golpe ("hit_dice", ej. "1d8").
    - Lista un máximo de 4 habilidades (skills) en las que sea proficiente (usa nombres en español: "Sigilo", "Arcano", etc.).
    - Ya no generes "equipment" simple. Ahora inventa armas, reliquias y hechizos detallados para el personaje basándote en su trasfondo.

    REGLAS DE IDENTIDAD:
    - Las clases pueden ser personalizadas (Pirata Corsario, Erudito, etc.) si la historia lo indica.
    - El lenguaje debe ser español épico y consistente.

    BONIFICACIONES RACIALES Y DE CLASE:
    - Si la raza es conocida en D&D (Humano, Elfo, Enano, etc.), indica sus bonificaciones oficiales en "racial_bonuses".
    - Si la raza es personalizada/homebrew, inventa bonificaciones temáticas coherentes con la raza (máx +2 a un stat, +1 a otro).
    - Siempre incluye "racial_traits": lista de 2-4 rasgos raciales descriptivos en español.
    - Si la clase corresponde a una clase base de D&D (Guerrero, Pícaro, etc.), indica sus bonificaciones en "class_bonuses".
    - Si la clase es personalizada, inventa bonificaciones temáticas (máx +2 a un stat).
    - Siempre incluye "class_features": lista de 2-4 habilidades o mecánicas únicas de la clase en español para el Nivel 1.
    - Siempre incluye "class_progression": Un mapa JSON que describe la progresión de la clase del nivel 2 al 20, indicando qué habilidad nueva gana en ciertos niveles clave.

    CONJUROS OFICIALES:
    - Si la clase inferida es un lanzador de conjuros OFICIAL de D&D (Hechicero, Mago, Clérigo, Brujo, Bardo, Druida, Paladín, Explorador), el arreglo "custom_spells" DEBE contener única y exclusivamente TRUCOS (Cantrips) y CONJUROS DE NIVEL 1 reales del Player's Handbook de D&D 5e que tengan sentido para su historia. No inventes hechizos para estas clases.
    - Si la clase es inventada/homebrew, entonces sí inventa "custom_spells" únicos.

    Aquí está la historia del jugador:
    "${story}"

    Construye un objeto JSON válido (sin markdown), con esta estructura exacta:
    {
      "name": "Nombre inferido o string vacío",
      "race": "Raza inferida (puede ser personalizada)",
      "race_desc": "Descripción breve de la raza y sus características biológicas.",
      "class": "Clase inferida (puede ser personalizada)",
      "class_desc": "Descripción de cómo funciona esta clase.",
      "stats": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
      "hp_max": 10,
      "hit_dice": "1d8",
      "skills": ["Habilidad 1", "Habilidad 2"],
      "custom_weapons": [
        { "name": "Espadón Oxidado", "damage": "2d6", "properties": "Pesada, Dos Manos", "description": "Un arma ancestral de la familia." }
      ],
      "magic_items": [
        { "name": "Medallón del Alba", "rarity": "Común", "effect_description": "Brilla tenuemente en la oscuridad." }
      ],
      "custom_spells": [
        { "name": "Llama del Dragón", "level": "Truco", "casting_time": "1 acción", "range": "30 pies", "description": "Lanzas una pequeña flama." }
      ],
      "equipment": ["Item de aventurero 1", "Oro inicial"],
      "specialTrait": "Rasgo pasivo único con sentido narrativo",
      "racial_bonuses": { "str": 0, "dex": 1, "con": 0, "int": 0, "wis": 0, "cha": 0 },
      "racial_traits": ["Visión en la oscuridad", "Linaje feérico"],
      "class_bonuses": { "str": 0, "dex": 2, "con": 0, "int": 0, "wis": 0, "cha": 0 },
      "class_features": ["Ataque Furtivo: Descripción breve", "Evasión: Descripción"],
      "class_progression": [
        { "level": 2, "features": ["Acción Astuta: Puedes Esconderte como acción adicional."] },
        { "level": 3, "features": ["Arquetipo: Eliges una especialización."] },
        { "level": 5, "features": ["Ataque Extra: Puedes atacar dos veces."] }
      ],
      "explanations": {
        "str": "Por qué tiene esta puntuación...",
        "dex": "Razón", "con": "Razón", "int": "Razón", "wis": "Razón", "cha": "Razón"
      }
    }
  `

  try {
    const result = await geminiModel.generateContent(prompt)
    const text = result.response.text()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('El Oráculo no devolvió un formato válido.')
    }

    return JSON.parse(jsonMatch[0].trim()) as Record<string, unknown>
  } catch (error: unknown) {
    console.error('Error analyzing stats:', error)
    throw new Error('El Oráculo no pudo leer tu destino. Revisa la historia.')
  }
}
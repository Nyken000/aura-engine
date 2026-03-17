type WorldContext = {
  id?: string
  name: string
  description: string
  genre?: string | null
  ai_rules?: string | null
}

type StatBlock = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

type WeaponDefinition = {
  name: string
  damage: string
  properties: string
  description: string
}

type MagicItemDefinition = {
  name: string
  rarity: string
  effect_description: string
}

type CustomSpellDefinition = {
  name: string
  level: string
  casting_time: string
  range: string
  description: string
}

type ClassProgressionEntry = {
  level: number
  features: string[]
}

type CharacterOracleAnalysis = {
  name: string
  race: string
  race_desc: string
  class: string
  class_desc: string
  stats: StatBlock
  hp_max: number
  hit_dice: string
  skills: string[]
  custom_weapons: WeaponDefinition[]
  magic_items: MagicItemDefinition[]
  custom_spells: CustomSpellDefinition[]
  equipment: string[]
  specialTrait: string
  racial_bonuses: StatBlock
  racial_traits: string[]
  class_bonuses: StatBlock
  class_features: string[]
  class_progression: ClassProgressionEntry[]
  explanations: Record<keyof StatBlock, string>
}

type OllamaGenerateResponse = {
  response?: string
}

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const DEFAULT_OLLAMA_MODEL = 'llama3'

const DEFAULT_STATS: StatBlock = {
  str: 10,
  dex: 12,
  con: 12,
  int: 10,
  wis: 10,
  cha: 11,
}

const DEFAULT_ZERO_BONUSES: StatBlock = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
}

function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '')
}

function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL
}

function buildOllamaHeaders(): HeadersInit {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  if (process.env.OLLAMA_NGROK_SKIP_BROWSER_WARNING === 'true') {
    headers.set('ngrok-skip-browser-warning', 'true')
  }

  const hostHeader = process.env.OLLAMA_HOST_HEADER?.trim()
  if (hostHeader) {
    headers.set('host', hostHeader)
  }

  const authHeader = process.env.OLLAMA_AUTHORIZATION?.trim()
  if (authHeader) {
    headers.set('Authorization', authHeader)
  }

  return headers
}

async function generateWithOllama(prompt: string, temperature = 0.25): Promise<string> {
  const response = await fetch(`${getOllamaBaseUrl()}/api/generate`, {
    method: 'POST',
    headers: buildOllamaHeaders(),
    body: JSON.stringify({
      model: getOllamaModel(),
      prompt,
      stream: false,
      options: {
        temperature,
      },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Ollama request failed (${response.status}): ${errorBody || response.statusText}`)
  }

  const payload = (await response.json()) as OllamaGenerateResponse
  return (payload.response || '').trim()
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}

function normalizeSpanishText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback

  const cleaned = value
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  return cleaned.length > 0 ? cleaned : fallback
}

function normalizeStringArray(value: unknown, fallback: string[], minLength = 0): string[] {
  const parsed = Array.isArray(value)
    ? value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
    : []

  const result = parsed.length > 0 ? parsed : [...fallback]

  while (result.length < minLength) {
    result.push(fallback[result.length % fallback.length] || 'Detalle adicional')
  }

  return Array.from(new Set(result))
}

function normalizeStatBlock(value: unknown, fallback: StatBlock, maxTotal = 75): StatBlock {
  const source =
    typeof value === 'object' && value !== null
      ? (value as Partial<Record<keyof StatBlock, unknown>>)
      : {}

  const normalized: StatBlock = {
    str: clamp(Number(source.str ?? fallback.str), 6, 18),
    dex: clamp(Number(source.dex ?? fallback.dex), 6, 18),
    con: clamp(Number(source.con ?? fallback.con), 6, 18),
    int: clamp(Number(source.int ?? fallback.int), 6, 18),
    wis: clamp(Number(source.wis ?? fallback.wis), 6, 18),
    cha: clamp(Number(source.cha ?? fallback.cha), 6, 18),
  }

  let total =
    normalized.str +
    normalized.dex +
    normalized.con +
    normalized.int +
    normalized.wis +
    normalized.cha

  if (total <= maxTotal) return normalized

  const keys: Array<keyof StatBlock> = ['str', 'dex', 'con', 'int', 'wis', 'cha']

  while (total > maxTotal) {
    for (const key of keys) {
      if (normalized[key] > 8 && total > maxTotal) {
        normalized[key] -= 1
        total -= 1
      }
    }
  }

  return normalized
}

function normalizeBonusBlock(value: unknown): StatBlock {
  const source =
    typeof value === 'object' && value !== null
      ? (value as Partial<Record<keyof StatBlock, unknown>>)
      : {}

  return {
    str: clamp(Number(source.str ?? 0), -2, 2),
    dex: clamp(Number(source.dex ?? 0), -2, 2),
    con: clamp(Number(source.con ?? 0), -2, 2),
    int: clamp(Number(source.int ?? 0), -2, 2),
    wis: clamp(Number(source.wis ?? 0), -2, 2),
    cha: clamp(Number(source.cha ?? 0), -2, 2),
  }
}

function normalizeWeapons(value: unknown, characterClass: string): WeaponDefinition[] {
  const parsed = Array.isArray(value) ? value : []

  const weapons = parsed
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const source = item as Record<string, unknown>

      return {
        name: normalizeSpanishText(source.name, 'Arma sin nombre'),
        damage: normalizeSpanishText(source.damage, '1d6 contundente'),
        properties: normalizeSpanishText(
          source.properties,
          'Cuerpo a cuerpo, versátil',
        ),
        description: normalizeSpanishText(
          source.description,
          'Un arma cargada de historia, útil desde el primer día de campaña y ligada al pasado del personaje.',
        ),
      }
    })
    .filter((item): item is WeaponDefinition => item !== null)

  if (weapons.length >= 2) return weapons.slice(0, 4)

  if (/mago|hechicero|brujo|clérigo|bardo|druida/i.test(characterClass)) {
    return [
      {
        name: 'Bastón del Velo Ceniciento',
        damage: '1d6 contundente',
        properties: 'Cuerpo a cuerpo, versátil, foco arcano',
        description:
          'Un bastón ennegrecido por rituales antiguos. Sirve tanto para canalizar magia como para apartar enemigos en espacios cerrados.',
      },
      {
        name: 'Daga de Sellos Rotos',
        damage: '1d4 perforante',
        properties: 'Cuerpo a cuerpo, ligera, arrojadiza (20/60)',
        description:
          'Una hoja ritual marcada con runas partidas. Se usa para grabar símbolos, romper pactos o abrir carne cuando la magia llega tarde.',
      },
    ]
  }

  if (/pícaro|asesino|explorador|corsario|cazador/i.test(characterClass)) {
    return [
      {
        name: 'Hoja de Marea Negra',
        damage: '1d6 cortante',
        properties: 'Cuerpo a cuerpo, fina, ligera',
        description:
          'Forjada para duelos rápidos y golpes oportunistas. Su equilibrio favorece estocadas limpias y retiradas precisas.',
      },
      {
        name: 'Punzón de Cintura',
        damage: '1d4 perforante',
        properties: 'Cuerpo a cuerpo, ligera, oculta',
        description:
          'Pequeño, brutal y fácil de esconder. Ideal para rematar, intimidar a corta distancia o escapar de una presa desesperada.',
      },
    ]
  }

  return [
    {
      name: 'Espada del Juramento Marchito',
      damage: '1d8 cortante',
      properties: 'Cuerpo a cuerpo, versátil',
      description:
        'Una espada marcada por una vieja promesa. Su filo no es hermoso, pero sí fiable, y da la impresión de haber sobrevivido más guerras que su portador.',
    },
    {
      name: 'Martillo del Camino',
      damage: '1d6 contundente',
      properties: 'Cuerpo a cuerpo, ligera',
      description:
        'Herramienta y arma a la vez. Rompe cerraduras, huesos y tablones con una honestidad brutal que combina bien con aventureros de frontera.',
    },
  ]
}

function normalizeMagicItems(value: unknown): MagicItemDefinition[] {
  const parsed = Array.isArray(value) ? value : []

  const items = parsed
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const source = item as Record<string, unknown>

      return {
        name: normalizeSpanishText(source.name, 'Reliquia sin nombre'),
        rarity: normalizeSpanishText(source.rarity, 'Común'),
        effect_description: normalizeSpanishText(
          source.effect_description,
          'Un objeto extraño con un efecto menor pero útil, cargado de sabor narrativo y listo para aparecer desde la primera sesión.',
        ),
      }
    })
    .filter((item): item is MagicItemDefinition => item !== null)

  if (items.length >= 2) return items.slice(0, 4)

  return [
    {
      name: 'Medallón del Alba Marchita',
      rarity: 'Común',
      effect_description:
        'Tiembla y emite un resplandor viejo cuando detecta magia hostil, juramentos rotos o lugares donde ocurrieron muertes violentas.',
    },
    {
      name: 'Anillo del Último Vigía',
      rarity: 'Poco común',
      effect_description:
        'Una vez por escena narrativa, provoca una intuición nítida sobre una emboscada, una traición inminente o una presencia que no debería estar ahí.',
    },
  ]
}

function normalizeSpells(value: unknown, characterClass: string): CustomSpellDefinition[] {
  const parsed = Array.isArray(value) ? value : []

  const spells = parsed
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const source = item as Record<string, unknown>

      return {
        name: normalizeSpanishText(source.name, 'Conjuro sin nombre'),
        level: normalizeSpanishText(source.level, 'Truco'),
        casting_time: normalizeSpanishText(source.casting_time, '1 acción'),
        range: normalizeSpanishText(source.range, '30 pies'),
        description: normalizeSpanishText(
          source.description,
          'Una manifestación útil y temáticamente coherente del poder del personaje, con efecto claro y sabor narrativo.',
        ),
      }
    })
    .filter((item): item is CustomSpellDefinition => item !== null)

  if (spells.length >= 2) return spells.slice(0, 4)

  if (/mago|hechicero|brujo|clérigo|bardo|druida|paladín|explorador/i.test(characterClass)) {
    return [
      {
        name: 'Rayo de Escarcha',
        level: 'Truco',
        casting_time: '1 acción',
        range: '60 pies',
        description:
          'Lanzas un rayo gélido que inflige frío y entumece el avance del objetivo. Perfecto para controlar distancia y castigar perseguidores.',
      },
      {
        name: 'Misil Mágico',
        level: 'Nivel 1',
        casting_time: '1 acción',
        range: '120 pies',
        description:
          'Tres dardos de fuerza pura golpean sin fallar a criaturas visibles. Es fiable, limpio y excelente para rematar enemigos peligrosos.',
      },
      {
        name: 'Armadura de Mago',
        level: 'Nivel 1',
        casting_time: '1 acción',
        range: 'Toque',
        description:
          'Una piel invisible de energía endurece el aire alrededor del lanzador y le da la presencia de alguien protegido por secretos antiguos.',
      },
    ]
  }

  return []
}

function normalizeProgression(value: unknown, characterClass: string): ClassProgressionEntry[] {
  const parsed = Array.isArray(value) ? value : []

  const progression = parsed
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const source = item as Record<string, unknown>
      const level = clamp(Number(source.level ?? 2), 2, 20)
      const features = normalizeStringArray(source.features, ['Mejora temática de la clase.'], 1)
      return { level, features }
    })
    .filter((item): item is ClassProgressionEntry => item !== null)
    .sort((a, b) => a.level - b.level)

  if (progression.length >= 5) return progression

  if (/pícaro|asesino|corsario/i.test(characterClass)) {
    return [
      { level: 2, features: ['Acción Astuta: Puedes reposicionarte, ocultarte o retirarte con una velocidad desconcertante.'] },
      { level: 3, features: ['Arquetipo Sombrío: Defines tu doctrina de infiltración, engaño o ejecución silenciosa.'] },
      { level: 5, features: ['Golpe Preciso: Tu daño aumenta cuando castigas una apertura genuina del enemigo.'] },
      { level: 9, features: ['Paso Invisible: Entre penumbra, humo o caos, tu rastro se vuelve casi imposible de seguir.'] },
      { level: 13, features: ['Maestro del Riesgo: Transformas situaciones desesperadas en ventaja táctica con sangre fría.'] },
      { level: 17, features: ['Verdugo de Leyenda: Tus golpes críticos dejan cicatrices que otros recordarán durante años.'] },
    ]
  }

  if (/mago|hechicero|brujo|clérigo|bardo|druida/i.test(characterClass)) {
    return [
      { level: 2, features: ['Afinidad Arcana: Tu poder se inclina hacia una escuela, pacto, dominio o misterio propio.'] },
      { level: 3, features: ['Canalización Mejorada: Tus conjuros adquieren un sello personal y una presencia reconocible.'] },
      { level: 5, features: ['Descarga Potenciada: Tus efectos ofensivos y de apoyo ganan impacto visible en escena.'] },
      { level: 9, features: ['Rito Superior: Aprendes una técnica mágica reverenciada, prohibida o temida.'] },
      { level: 13, features: ['Voluntad Inquebrantable: Resistes mejor rupturas mentales y pérdidas de concentración.'] },
      { level: 17, features: ['Avatar del Misterio: Tu nombre queda unido a una manifestación singular del poder.'] },
    ]
  }

  return [
    { level: 2, features: ['Estilo Refinado: Perfeccionas la forma en que luchas, sobrevives o impones presencia.'] },
    { level: 3, features: ['Senda de Especialización: Adoptas una doctrina, juramento o disciplina que te distingue.'] },
    { level: 5, features: ['Ataque Extra: Tu experiencia te permite sostener la presión cuando otros ya flaquean.'] },
    { level: 9, features: ['Veterano de Guerra: Tu temple reduce el miedo, la fatiga y el desconcierto.'] },
    { level: 13, features: ['Voluntad de Hierro: Tu determinación cambia el ritmo de la batalla y de la escena.'] },
    { level: 17, features: ['Héroe de Leyenda: Tu sola presencia altera el ánimo de aliados y enemigos.'] },
  ]
}

function extractJsonObject(raw: string): string | null {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  const firstBrace = cleaned.indexOf('{')
  if (firstBrace === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = firstBrace; i < cleaned.length; i += 1) {
    const char = cleaned[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') depth -= 1

    if (depth === 0) {
      return cleaned.slice(firstBrace, i + 1)
    }
  }

  return null
}

function normalizeOracleAnalysis(raw: Record<string, unknown>): CharacterOracleAnalysis {
  const characterClass = normalizeSpanishText(raw.class, 'Aventurero')
  const normalizedStats = normalizeStatBlock(raw.stats, DEFAULT_STATS)

  const hpMax = clamp(
    Number(raw.hp_max ?? Math.max(8, 8 + Math.floor((normalizedStats.con - 10) / 2))),
    6,
    24,
  )

  return {
    name: normalizeSpanishText(raw.name, ''),
    race: normalizeSpanishText(raw.race, 'Humano'),
    race_desc: normalizeSpanishText(
      raw.race_desc,
      'Un linaje marcado por su cultura, su biología y la forma en que el mundo reacciona ante su presencia.',
    ),
    class: characterClass,
    class_desc: normalizeSpanishText(
      raw.class_desc,
      'Una senda marcial, mística o híbrida definida por la historia, la disciplina y el precio del poder.',
    ),
    stats: normalizedStats,
    hp_max: hpMax,
    hit_dice: normalizeSpanishText(raw.hit_dice, '1d8'),
    skills: normalizeStringArray(
      raw.skills,
      ['Percepción', 'Persuasión', 'Sigilo', 'Supervivencia'],
      4,
    ).slice(0, 6),
    custom_weapons: normalizeWeapons(raw.custom_weapons, characterClass),
    magic_items: normalizeMagicItems(raw.magic_items),
    custom_spells: normalizeSpells(raw.custom_spells, characterClass),
    equipment: normalizeStringArray(
      raw.equipment,
      ['Mochila de viaje', 'Raciones para 3 días', 'Capa de viaje', 'Talismán personal'],
      4,
    ).slice(0, 8),
    specialTrait: normalizeSpanishText(
      raw.specialTrait,
      'Voluntad de Superviviente: Cuando la presión alcanza su punto máximo, este personaje revela una determinación difícil de quebrar.',
    ),
    racial_bonuses: normalizeBonusBlock(raw.racial_bonuses ?? DEFAULT_ZERO_BONUSES),
    racial_traits: normalizeStringArray(
      raw.racial_traits,
      [
        'Herencia Singular: Tu linaje te concede una ventaja perceptible que otros notan con facilidad.',
        'Adaptación al Peligro: Tu pueblo aprendió a sobrevivir donde otros habrían desaparecido.',
      ],
      2,
    ).slice(0, 4),
    class_bonuses: normalizeBonusBlock(raw.class_bonuses ?? DEFAULT_ZERO_BONUSES),
    class_features: normalizeStringArray(
      raw.class_features,
      [
        'Talento de Nivel 1: Posees una ventaja táctica o mística que define tu forma de entrar en escena.',
        'Instinto de Oficio: Sabes resolver el tipo de problema para el que esta clase fue creada.',
      ],
      2,
    ).slice(0, 4),
    class_progression: normalizeProgression(raw.class_progression, characterClass),
    explanations: {
      str: normalizeSpanishText(
        raw.explanations && typeof raw.explanations === 'object'
          ? (raw.explanations as Record<string, unknown>).str
          : '',
        'Su Fuerza refleja entrenamiento, violencia sobrevivida o años de trabajo bajo presión real.',
      ),
      dex: normalizeSpanishText(
        raw.explanations && typeof raw.explanations === 'object'
          ? (raw.explanations as Record<string, unknown>).dex
          : '',
        'Su Destreza nace de reflejos, control corporal, precisión y una relación íntima con el riesgo.',
      ),
      con: normalizeSpanishText(
        raw.explanations && typeof raw.explanations === 'object'
          ? (raw.explanations as Record<string, unknown>).con
          : '',
        'Su Constitución proviene de resistencia física, dolor soportado y capacidad para mantenerse en pie cuando otros ceden.',
      ),
      int: normalizeSpanishText(
        raw.explanations && typeof raw.explanations === 'object'
          ? (raw.explanations as Record<string, unknown>).int
          : '',
        'Su Inteligencia expresa estudio, memoria, estrategia o comprensión de los mecanismos ocultos del mundo.',
      ),
      wis: normalizeSpanishText(
        raw.explanations && typeof raw.explanations === 'object'
          ? (raw.explanations as Record<string, unknown>).wis
          : '',
        'Su Sabiduría refleja intuición, experiencia, fe o una lectura fina del peligro y las personas.',
      ),
      cha: normalizeSpanishText(
        raw.explanations && typeof raw.explanations === 'object'
          ? (raw.explanations as Record<string, unknown>).cha
          : '',
        'Su Carisma emerge de presencia, liderazgo, magnetismo o una intensidad social imposible de ignorar.',
      ),
    },
  }
}

export async function generateLoreFriendlyBackstory(
  keywords: string,
  worldContext?: WorldContext,
) {
  const prompt = `
Eres un novelista de fantasía oscura, un Dungeon Master veterano y un diseñador narrativo.
Debes escribir SIEMPRE en ESPAÑOL neutro, natural y elegante.
Está prohibido responder en inglés o mezclar idiomas.

CONTEXTO DEL MUNDO:
${worldContext
      ? `Nombre: ${worldContext.name}
Descripción: ${worldContext.description}
Género: ${worldContext.genre || 'Fantasía'}
Reglas especiales: ${worldContext.ai_rules || 'Ninguna'}`
      : `Nombre: Las Tierras Desconocidas
Descripción: Un mundo de alta fantasía con ruinas, juramentos rotos, violencia antigua y magia impredecible.`
    }

IDEAS DEL JUGADOR:
"${keywords}"

INSTRUCCIONES:
- Escribe una historia de fondo inmersiva, emocional y útil para interpretar al personaje.
- Debe sentirse como el comienzo real de una campaña.
- Incluye origen, conflicto, herida o motivación central y un gancho claro de aventura.
- Si faltan detalles, invéntalos con coherencia.
- Máximo 3 párrafos.
- No uses listas.
- No uses introducciones.

SALIDA:
Devuelve únicamente la historia final en español.
`.trim()

  try {
    const text = await generateWithOllama(prompt, 0.4)

    if (!text) {
      throw new Error('La historia se devolvió vacía.')
    }

    return normalizeSpanishText(text, '')
  } catch (error: unknown) {
    console.error('Error generating backstory:', error)
    throw new Error('El Oráculo no pudo tejer esta historia. Inténtalo de nuevo.')
  }
}

export async function analyzeStoryForStats(story: string, worldContext?: WorldContext) {
  const prompt = `
Eres el "Oráculo de las Almas", una mezcla entre Dungeon Master experto, diseñador de clases, worldbuilder y autor de material premium para RPG.
Debes responder SIEMPRE en ESPAÑOL.

CONTEXTO DEL MUNDO:
${worldContext
      ? `Nombre: ${worldContext.name}
Descripción: ${worldContext.description}
Género: ${worldContext.genre || 'Fantasía'}
Reglas especiales: ${worldContext.ai_rules || 'Ninguna'}`
      : `Nombre: Las Tierras Desconocidas
Descripción: Fantasía oscura con ruinas, intrigas, magia peligrosa y facciones ambiguas.`
    }

HISTORIA DEL JUGADOR:
"${story}"

OBJETIVO:
Construye un personaje de Nivel 1 completo, evocador, coherente, útil en juego y muy satisfactorio para un usuario real.

CREATIVIDAD:
- Puedes inventar razas, clases, subclases, armas, reliquias, hechizos, rasgos, rarezas, nombres y progresión.
- Si la historia sugiere homebrew, desarróllalo con seguridad.
- Si encaja mejor material oficial, úsalo.
- Prioriza originalidad, coherencia y fuerza visual.

REGLAS DE CALIDAD:
- Todo en español.
- No dejes campos vacíos.
- No seas genérico.
- Da detalles concretos, vivos y jugables.
- El resultado debe sentirse premium.
- Debe parecer el inicio real de un personaje memorable.

REGLAS DE BALANCE:
- Stats base: STR, DEX, CON, INT, WIS, CHA.
- Suma máxima total: 75.
- Ningún atributo base supera 18.
- El personaje es Nivel 1.
- hp_max lógico para Nivel 1.
- hit_dice coherente con la clase.
- skills entre 4 y 6.
- racial_traits entre 2 y 4.
- class_features entre 2 y 4.
- class_progression con al menos 5 hitos.
- custom_weapons con al menos 2 armas si tienen sentido.
- magic_items con al menos 2 objetos.
- si usa magia, custom_spells entre 2 y 4.
- equipment entre 4 y 8 elementos.

FORMATO OBLIGATORIO:
Devuelve SOLO un JSON válido, sin markdown ni comentarios.

IMPORTANTE SOBRE EL DETALLE:
- En "racial_traits", cada entrada debe tener formato "Nombre del rasgo: descripción clara, útil y evocadora".
- En "class_features", cada entrada debe tener formato "Nombre de la característica: descripción clara, útil y evocadora".
- En "custom_weapons.damage" debes incluir dados y tipo de daño, por ejemplo "1d8 cortante" o "1d6 perforante".
- En "custom_weapons.properties" debes incluir estilo y propiedades jugables, por ejemplo "Cuerpo a cuerpo, versátil" o "A distancia, munición (80/320)".
- En armas, objetos y hechizos, escribe descripciones con sabor narrativo y utilidad real.
- En "race_desc" explica aspecto, cultura o naturaleza y cómo esa raza encaja en el mundo.
- En "class_desc" explica cómo pelea, sobrevive o usa su poder esta clase.
- En "specialTrait" entrega un rasgo pasivo con nombre y efecto narrativo implícito, formato "Nombre: descripción".

ESTRUCTURA EXACTA:
{
  "name": "Nombre inferido o vacío",
  "race": "Raza inferida",
  "race_desc": "Descripción rica y concreta",
  "class": "Clase inferida",
  "class_desc": "Descripción rica y concreta",
  "stats": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
  "hp_max": 10,
  "hit_dice": "1d8",
  "skills": ["Percepción", "Sigilo", "Arcano", "Persuasión"],
  "custom_weapons": [
    { "name": "Nombre", "damage": "1d8 cortante", "properties": "Cuerpo a cuerpo, versátil", "description": "Descripción viva, útil y evocadora." },
    { "name": "Nombre", "damage": "1d4 perforante", "properties": "Ligera, arrojadiza (20/60)", "description": "Descripción viva, útil y evocadora." }
  ],
  "magic_items": [
    { "name": "Nombre", "rarity": "Común", "effect_description": "Efecto claro, usable y con sabor narrativo." },
    { "name": "Nombre", "rarity": "Poco común", "effect_description": "Efecto claro, usable y con sabor narrativo." }
  ],
  "custom_spells": [
    { "name": "Nombre", "level": "Truco", "casting_time": "1 acción", "range": "60 pies", "description": "Qué hace el conjuro, cómo impacta y qué imagen deja." }
  ],
  "equipment": ["Objeto 1", "Objeto 2", "Objeto 3", "Objeto 4"],
  "specialTrait": "Nombre del rasgo: descripción potente y memorable",
  "racial_bonuses": { "str": 0, "dex": 1, "con": 0, "int": 0, "wis": 0, "cha": 0 },
  "racial_traits": ["Nombre del rasgo: descripción", "Nombre del rasgo: descripción"],
  "class_bonuses": { "str": 0, "dex": 2, "con": 0, "int": 0, "wis": 0, "cha": 0 },
  "class_features": ["Nombre de la característica: descripción", "Nombre de la característica: descripción"],
  "class_progression": [
    { "level": 2, "features": ["Nombre de mejora: descripción"] },
    { "level": 3, "features": ["Nombre de mejora: descripción"] },
    { "level": 5, "features": ["Nombre de mejora: descripción"] },
    { "level": 9, "features": ["Nombre de mejora: descripción"] },
    { "level": 13, "features": ["Nombre de mejora: descripción"] }
  ],
  "explanations": {
    "str": "Explicación",
    "dex": "Explicación",
    "con": "Explicación",
    "int": "Explicación",
    "wis": "Explicación",
    "cha": "Explicación"
  }
}
`.trim()

  try {
    const text = await generateWithOllama(prompt, 0.3)
    const jsonText = extractJsonObject(text)

    if (!jsonText) {
      throw new Error('El Oráculo no devolvió un JSON válido.')
    }

    const parsed = JSON.parse(jsonText) as Record<string, unknown>
    return normalizeOracleAnalysis(parsed)
  } catch (error: unknown) {
    console.error('Error analyzing stats:', error)
    throw new Error('El Oráculo no pudo leer tu destino. Revisa la historia.')
  }
}
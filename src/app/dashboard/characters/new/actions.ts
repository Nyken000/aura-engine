'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { generateLoreFriendlyBackstory, analyzeStoryForStats } from '@/utils/ai/gemini'
import { getRandomCampaign } from '@/utils/game/campaigns'
import {
  getRaceBonuses,
  getRacialTraits,
  getClassBonuses,
  applyBonuses,
  type StatKey,
} from '@/utils/game/stat-bonuses'

type WeaponDefinition = {
  name: string
  description?: string
  damage?: string
  properties?: string
}

type MagicItemDefinition = {
  name: string
  effect_description?: string
  rarity?: string
}

type SpellDefinition = {
  name: string
  level: string
  casting_time?: string
  range?: string
  description?: string
}

type BackgroundSkillRef = {
  name?: string
}

type BackgroundEquipmentRef = {
  quantity?: number
  equipment?: {
    name?: string
  } | null
}

type BackgroundRecord = {
  id: string
  name: string
  feature_name?: string | null
  feature_description?: string | null
  skill_proficiencies?: BackgroundSkillRef[] | string | null
  starting_equipment?: BackgroundEquipmentRef[] | string | null
}

type WorldRecord = {
  id: string
  name: string
  description: string
  genre?: string | null
  ai_rules?: string | null
}

type ActionResult =
  | { success: true; text: string; world_id: string | null }
  | { success: true; data: Record<string, unknown>; world_id: string | null }
  | { error: string }

const SKILL_TRANSLATIONS: Record<string, string> = {
  Insight: 'Perspicacia',
  Religion: 'Religión',
  Acrobatics: 'Acrobacias',
  Athletics: 'Atletismo',
  Deception: 'Engaño',
  History: 'Historia',
  Intimidation: 'Intimidación',
  Investigation: 'Investigación',
  Medicine: 'Medicina',
  Nature: 'Naturaleza',
  Perception: 'Percepción',
  Performance: 'Interpretación',
  Persuasion: 'Persuasión',
  'Sleight of Hand': 'Juego de Manos',
  Stealth: 'Sigilo',
  Survival: 'Supervivencia',
  'Animal Handling': 'Trato con Animales',
  Arcana: 'Arcano',
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export async function createCharacter(formData: FormData) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const background = formData.get('background') as string
  const background_story = formData.get('background_story') as string
  const world_id = formData.get('world_id') as string
  const race = formData.get('race') as string
  const charClass = formData.get('class') as string
  const background_id = formData.get('background_id') as string

  if (!name) {
    return { error: 'El nombre es requerido.' }
  }

  const finalWorldId = world_id || null

  const stats = {
    str: parseInt((formData.get('str') as string) || '10', 10) || 10,
    dex: parseInt((formData.get('dex') as string) || '10', 10) || 10,
    con: parseInt((formData.get('con') as string) || '10', 10) || 10,
    int: parseInt((formData.get('int') as string) || '10', 10) || 10,
    wis: parseInt((formData.get('wis') as string) || '10', 10) || 10,
    cha: parseInt((formData.get('cha') as string) || '10', 10) || 10,
  }

  const hp_max = parseInt((formData.get('hp_max') as string) || '10', 10) || 10
  const hp_current = parseInt((formData.get('hp_current') as string) || `${hp_max}`, 10) || hp_max
  const hit_dice = (formData.get('hit_dice') as string) || '1d8'

  let skills: string[] = []
  let equipment: string[] = []

  try {
    skills = JSON.parse(((formData.get('skills') as string) || '[]')) as string[]
    equipment = JSON.parse(((formData.get('equipment') as string) || '[]')) as string[]
  } catch (error: unknown) {
    console.error('Error parsing arrays', error)
  }

  const specialTrait = formData.get('special_trait') as string

  let racialTraits: string[] = []
  let classFeatures: string[] = []
  let classProgression: Record<string, unknown>[] = []
  let customWeapons: WeaponDefinition[] = []
  let magicItems: MagicItemDefinition[] = []
  let customSpells: SpellDefinition[] = []

  try {
    racialTraits = JSON.parse(((formData.get('racial_traits') as string) || '[]')) as string[]
    classFeatures = JSON.parse(((formData.get('class_features') as string) || '[]')) as string[]
    classProgression = JSON.parse(
      ((formData.get('class_progression') as string) || '[]'),
    ) as Record<string, unknown>[]
    customWeapons = JSON.parse(((formData.get('custom_weapons') as string) || '[]')) as WeaponDefinition[]
    magicItems = JSON.parse(((formData.get('magic_items') as string) || '[]')) as MagicItemDefinition[]
    customSpells = JSON.parse(((formData.get('custom_spells') as string) || '[]')) as SpellDefinition[]
  } catch {
    // noop
  }

  let aiRacialBonuses: Record<string, number> = {}
  let aiClassBonuses: Record<string, number> = {}

  try {
    aiRacialBonuses = JSON.parse(
      ((formData.get('ai_racial_bonuses') as string) || '{}'),
    ) as Record<string, number>
    aiClassBonuses = JSON.parse(
      ((formData.get('ai_class_bonuses') as string) || '{}'),
    ) as Record<string, number>
  } catch {
    // noop
  }

  const staticRaceBonuses = getRaceBonuses(race || '')
  const finalRaceBonuses =
    Object.keys(staticRaceBonuses).length > 0 ? staticRaceBonuses : aiRacialBonuses

  const staticClassBonuses = getClassBonuses(charClass || '')
  const finalClassBonuses =
    Object.keys(staticClassBonuses).length > 0 ? staticClassBonuses : aiClassBonuses

  const finalStats = applyBonuses(
    stats as Record<StatKey, number>,
    finalRaceBonuses,
    finalClassBonuses,
  )

  const staticTraits = getRacialTraits(race || '')
  const finalRacialTraits = staticTraits.length > 0 ? staticTraits : racialTraits

  const inventoryData = [
    ...equipment.map((item) => ({ name: item, type: 'item' })),
    ...customWeapons.map((weapon) => ({
      name: weapon.name,
      description: weapon.description,
      damage: weapon.damage,
      properties: weapon.properties,
      type: 'weapon',
    })),
    ...magicItems.map((item) => ({
      name: item.name,
      description: item.effect_description,
      rarity: item.rarity,
      type: 'magic_item',
    })),
    ...(specialTrait
      ? [{ name: 'Rasgo Único', description: specialTrait, type: 'passive' }]
      : []),
    ...finalRacialTraits.map((trait) => ({ name: trait, type: 'racial' })),
  ]

  if (background_id) {
    const { data: dbBackground } = await supabase
      .from('backgrounds')
      .select('*')
      .eq('id', background_id)
      .single()

    const typedBackground = dbBackground as BackgroundRecord | null

    if (typedBackground) {
      const skillRefs = Array.isArray(typedBackground.skill_proficiencies)
        ? typedBackground.skill_proficiencies
        : []

      const bgSkills = skillRefs.map((skillRef) => {
        const skillName = (skillRef.name || '').replace('Skill: ', '')
        return SKILL_TRANSLATIONS[skillName] || skillName
      })

      skills = Array.from(new Set(skills.concat(bgSkills)))

      if (typedBackground.feature_name) {
        inventoryData.push({
          name: `Trasfondo: ${typedBackground.feature_name}`,
          description: typedBackground.feature_description || undefined,
          type: 'passive',
        })
      }

      const startingEquipment = Array.isArray(typedBackground.starting_equipment)
        ? typedBackground.starting_equipment
        : []

      const bgEquip = startingEquipment.map((entry) => {
        const itemName = entry.equipment?.name || 'Item'
        const qty = entry.quantity || 1
        return qty > 1 ? `${itemName} (x${qty})` : itemName
      })

      inventoryData.push(...bgEquip.map((item) => ({ name: item, type: 'item' })))
    }
  }

  const assignedCampaign = getRandomCampaign()

  const expandedCharacterData = {
    name,
    background: background || null,
    background_story:
      background_story || (background && background.length > 50 ? background : null),
    background_id: background_id || null,
    world_id: finalWorldId,
    user_id: user.id,
    hp_current,
    hp_max,
    hit_dice,
    skills,
    inventory: inventoryData,
    status_effects: [],
    campaign_id: assignedCampaign.id,
    stats: {
      ...finalStats,
      race: race || 'Desconocida',
      class: charClass || 'Aventurero',
      racial_traits: finalRacialTraits,
      class_features: classFeatures,
      class_progression: classProgression,
      custom_spells: customSpells,
      base_stats: stats,
    },
  }

  const { error } = await supabase.from('characters').insert([expandedCharacterData]).select().single()

  if (error) {
    console.error('Error creating character:', error)
    return { error: 'Error al forjar tu personaje. La magia falló.' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function aiGenerateBackstory(_prevState: unknown, formData: FormData): Promise<ActionResult> {
  const keywords = formData.get('keywords') as string
  const world_id = formData.get('world_id') as string

  if (!keywords) {
    return { error: 'Necesitas dar algunas ideas clave.' }
  }

  try {
    const supabase = createClient()
    let world: WorldRecord | undefined

    if (world_id) {
      const { data } = await supabase.from('worlds').select('*').eq('id', world_id).single()
      world = (data as WorldRecord | null) || undefined
    }

    const backstory = await generateLoreFriendlyBackstory(keywords, world)
    return { success: true, text: backstory, world_id: world?.id || null }
  } catch (error: unknown) {
    return { error: getErrorMessage(error, 'Error al generar la historia.') }
  }
}

export async function aiAnalyzeStory(_prevState: unknown, formData: FormData): Promise<ActionResult> {
  const story = formData.get('story') as string
  const world_id = formData.get('world_id') as string

  if (!story) {
    return { error: 'Necesitas escribir tu historia.' }
  }

  try {
    const supabase = createClient()
    let world: WorldRecord | undefined

    if (world_id) {
      const { data } = await supabase.from('worlds').select('*').eq('id', world_id).single()
      world = (data as WorldRecord | null) || undefined
    }

    const analysis = await analyzeStoryForStats(story, world)
    return { success: true, data: analysis, world_id: world?.id || null }
  } catch (error: unknown) {
    return { error: getErrorMessage(error, 'Error al contactar con el Oráculo.') }
  }
}
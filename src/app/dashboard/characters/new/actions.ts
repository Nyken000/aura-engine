'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { generateLoreFriendlyBackstory, analyzeStoryForStats } from '@/utils/ai/gemini'
import { getRandomCampaign } from '@/utils/game/campaigns'
import {
  getRaceBonuses, getRacialTraits, getClassBonuses, applyBonuses,
  type StatKey
} from '@/utils/game/stat-bonuses'

export async function createCharacter(formData: FormData) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const name = formData.get('name') as string
  const background = formData.get('background') as string
  let world_id = formData.get('world_id') as string

  // Newly added fields
  const race = formData.get('race') as string 
  const charClass = formData.get('class') as string

  if (!name) {
    return { error: 'El nombre es requerido.' }
  }

  // If no world_id was selected (it's optional in the UI), assign a random one here
  if (!world_id) {
    const { data: worlds } = await supabase.from('worlds').select('id')
    if (worlds && worlds.length > 0) {
      world_id = worlds[Math.floor(Math.random() * worlds.length)].id
    } else {
      return { error: 'No hay mundos disponibles para crear el personaje.' }
    }
  }

  // Parse stats including CON and WIS
  const stats = {
    str: parseInt(formData.get('str') as string) || 10,
    dex: parseInt(formData.get('dex') as string) || 10,
    con: parseInt(formData.get('con') as string) || 10,
    int: parseInt(formData.get('int') as string) || 10,
    wis: parseInt(formData.get('wis') as string) || 10,
    cha: parseInt(formData.get('cha') as string) || 10,
  }

  const hp_max = parseInt(formData.get('hp_max') as string) || 10
  const hp_current = parseInt(formData.get('hp_current') as string) || hp_max
  const hit_dice = formData.get('hit_dice') as string || '1d8'
  
  let skills = []
  let equipment = []
  try {
    skills = JSON.parse(formData.get('skills') as string || '[]')
    equipment = JSON.parse(formData.get('equipment') as string || '[]')
  } catch (e) {
    console.error("Error parsing arrays", e)
  }

  const specialTrait = formData.get('special_trait') as string

  // Parse racial traits from form (sent by character creation UI after AI analysis)
  let racialTraits: string[] = []
  try {
    racialTraits = JSON.parse(formData.get('racial_traits') as string || '[]')
  } catch {}

  // Parse bonus overrides from AI (for custom races/classes not in static table)
  let aiRacialBonuses: Record<string, number> = {}
  let aiClassBonuses: Record<string, number> = {}
  try {
    aiRacialBonuses = JSON.parse(formData.get('ai_racial_bonuses') as string || '{}')
    aiClassBonuses = JSON.parse(formData.get('ai_class_bonuses') as string || '{}')
  } catch {}

  // Apply racial bonuses: prefer static table, fall back to AI-provided for custom races
  const staticRaceBonuses = getRaceBonuses(race || '')
  const finalRaceBonuses = Object.keys(staticRaceBonuses).length > 0 ? staticRaceBonuses : aiRacialBonuses

  const staticClassBonuses = getClassBonuses(charClass || '')
  const finalClassBonuses = Object.keys(staticClassBonuses).length > 0 ? staticClassBonuses : aiClassBonuses

  const finalStats = applyBonuses(stats as Record<StatKey, number>, finalRaceBonuses, finalClassBonuses)

  // Racial traits: prefer static table, fall back to AI
  const staticTraits = getRacialTraits(race || '')
  const finalRacialTraits = staticTraits.length > 0 ? staticTraits : racialTraits

  const inventoryData = [
    ...equipment.map((item: string) => ({ name: item, type: 'item' })),
    ...(specialTrait ? [{ name: 'Rasgo Único', description: specialTrait, type: 'passive' }] : []),
    ...finalRacialTraits.map((trait: string) => ({ name: trait, type: 'racial' }))
  ]

  // Assign a random campaign to the character
  const assignedCampaign = getRandomCampaign()

  const expandedCharacterData = {
    name,
    background: background || null,
    world_id,
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
      base_stats: stats,         // Store pre-bonus stats for reference
    }
  }

  const { error } = await supabase
    .from('characters')
    .insert([expandedCharacterData])
    .select()
    .single()

  if (error) {
    console.error('Error creating character:', error)
    return { error: 'Error al forjar tu personaje. La magia falló.' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}


// AI Actions that return data to the client instead of redirecting

export async function aiGenerateBackstory(prevState: any, formData: FormData) {
  const keywords = formData.get('keywords') as string;
  const world_id = formData.get('world_id') as string;

  if (!keywords) {
      return { error: "Necesitas dar algunas ideas clave." }
  }

  try {
      const supabase = createClient();
      let world;
      
      if (world_id) {
          const { data } = await supabase.from('worlds').select('*').eq('id', world_id).single();
          world = data;
      } else {
          const { data } = await supabase.from('worlds').select('*');
          if (data && data.length > 0) {
              world = data[Math.floor(Math.random() * data.length)];
          }
      }
      
      if (!world) throw new Error("No hay mundos disponibles.");

      const backstory = await generateLoreFriendlyBackstory(keywords, world);
      return { success: true, text: backstory, world_id: world.id };
  } catch (e: any) {
      return { error: e.message || "Error al generar la historia." }
  }
}

export async function aiAnalyzeStory(prevState: any, formData: FormData) {
    const story = formData.get('story') as string;
    const world_id = formData.get('world_id') as string;
  
    if (!story) {
        return { error: "Necesitas escribir tu historia." }
    }
  
    try {
        const supabase = createClient();
        let world;
        
        if (world_id) {
            const { data } = await supabase.from('worlds').select('*').eq('id', world_id).single();
            world = data;
        } else {
            const { data } = await supabase.from('worlds').select('*');
            if (data && data.length > 0) {
                world = data[Math.floor(Math.random() * data.length)];
            }
        }
        
        if (!world) throw new Error("No hay mundos disponibles.");
  
        const analysis = await analyzeStoryForStats(story, world);
        return { success: true, data: analysis, world_id: world.id };
    } catch (e: any) {
        return { error: e.message || "Error al contactar con el Oráculo." }
    }
}

// ─── Full D&D 5E Skill List ─────────────────────────────────────────────────
// 17 official skills, each tied to a core stat.
// Used both in character creation review and in the Game Client sheet.

import { type StatKey } from './stat-bonuses'

export type Skill = {
  name: string          // Spanish name
  nameEn: string        // English name (for reference)
  stat: StatKey         // Base ability score
}

export const ALL_SKILLS: Skill[] = [
  { name: 'Acrobacias',          nameEn: 'Acrobatics',       stat: 'dex' },
  { name: 'Trato con Animales',  nameEn: 'Animal Handling',  stat: 'wis' },
  { name: 'Arcano',              nameEn: 'Arcana',           stat: 'int' },
  { name: 'Atletismo',           nameEn: 'Athletics',        stat: 'str' },
  { name: 'Engaño',              nameEn: 'Deception',        stat: 'cha' },
  { name: 'Historia',            nameEn: 'History',          stat: 'int' },
  { name: 'Perspicacia',         nameEn: 'Insight',          stat: 'wis' },
  { name: 'Intimidación',        nameEn: 'Intimidation',     stat: 'cha' },
  { name: 'Investigación',       nameEn: 'Investigation',    stat: 'int' },
  { name: 'Medicina',            nameEn: 'Medicine',         stat: 'wis' },
  { name: 'Naturaleza',          nameEn: 'Nature',           stat: 'int' },
  { name: 'Percepción',          nameEn: 'Perception',       stat: 'wis' },
  { name: 'Actuación',           nameEn: 'Performance',      stat: 'cha' },
  { name: 'Persuasión',          nameEn: 'Persuasion',       stat: 'cha' },
  { name: 'Religión',            nameEn: 'Religion',         stat: 'int' },
  { name: 'Juego de Manos',      nameEn: 'Sleight of Hand',  stat: 'dex' },
  { name: 'Sigilo',              nameEn: 'Stealth',          stat: 'dex' },
  { name: 'Supervivencia',       nameEn: 'Survival',         stat: 'wis' },
]

/** Proficiency bonus at level 1 (scales at higher levels, static for now) */
export const PROFICIENCY_BONUS = 2

/** Calculate a D&D stat modifier: floor((stat - 10) / 2) */
export function statMod(value: number): number {
  return Math.floor((value - 10) / 2)
}

/** Format a modifier as "+3" or "-1" */
export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/**
 * Calculate the total modifier for a skill:
 * = stat modifier + (proficiency bonus if proficient)
 */
export function skillModifier(
  statValue: number,
  isProficient: boolean,
  profBonus = PROFICIENCY_BONUS
): number {
  return statMod(statValue) + (isProficient ? profBonus : 0)
}

/**
 * Returns true if the given proficiency list includes this skill.
 * Matches case-insensitively by Spanish or English name.
 */
export function isSkillProficient(skill: Skill, proficiencies: string[]): boolean {
  const lower = proficiencies.map(p => p.toLowerCase().trim())
  return lower.includes(skill.name.toLowerCase()) || lower.includes(skill.nameEn.toLowerCase())
}

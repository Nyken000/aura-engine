// ─── Racial & Class Stat Bonuses for Aura Engine ───────────────────────────
// Races and Classes are kept SEPARATE bonus systems.
// Caps all stats at 20 after applying bonuses.
// For custom/homebrew races and classes not in these tables,
// the AI `analyzeStoryForStats` prompt returns `racial_bonuses` and `class_bonuses`.

export type StatKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type StatBlock = Partial<Record<StatKey, number>>

// ─── RACIAL BONUSES (official D&D 5E) ───────────────────────────────────────
export const RACE_BONUSES: Record<string, StatBlock> = {
  // Humans
  'human':              { str:1, dex:1, con:1, int:1, wis:1, cha:1 },
  'human (variant)':    {},  // variant human: player chooses — handled by AI
  // Elves
  'elf':                { dex:2 },
  'high elf':           { dex:2, int:1 },
  'wood elf':           { dex:2, wis:1 },
  'dark elf':           { dex:2, cha:1 },
  'elfo':               { dex:2 },
  'elfo de los bosques':{ dex:2, wis:1 },
  'elfo oscuro':        { dex:2, cha:1 },
  // Dwarves
  'dwarf':              { con:2 },
  'hill dwarf':         { con:2, wis:1 },
  'mountain dwarf':     { con:2, str:2 },
  'enano':              { con:2 },
  // Halflings
  'halfling':           { dex:2 },
  'lightfoot halfling': { dex:2, cha:1 },
  'stout halfling':     { dex:2, con:1 },
  // Gnomes
  'gnome':              { int:2 },
  'forest gnome':       { int:2, dex:1 },
  'rock gnome':         { int:2, con:1 },
  // Half-breeds
  'half-elf':           { cha:2 },           // +1 to two others (simplified)
  'half-orc':           { str:2, con:1 },
  'semiorco':           { str:2, con:1 },
  'semielfo':           { cha:2 },
  // Tiefling / Dragonborn
  'tiefling':           { int:1, cha:2 },
  'dragonborn':         { str:2, cha:1 },
  'semidragón':         { str:2, cha:1 },
  // Aasimar
  'aasimar':            { wis:1, cha:2 },
  'fallen aasimar':     { str:1, cha:2 },
  // Tabaxi
  'tabaxi':             { dex:2, cha:1 },
  // Goliath
  'goliath':            { str:2, con:1 },
  // Genasi
  'earth genasi':       { str:1, con:2 },
  'fire genasi':        { int:1, con:2 },
  'water genasi':       { wis:1, con:2 },
  'air genasi':         { dex:1, con:2 },
  // Kenku / Tortle
  'kenku':              { dex:2, wis:1 },
  'tortle':             { str:2, wis:1 },
}

// ─── RACIAL TRAITS ───────────────────────────────────────────────────────────
export const RACIAL_TRAITS: Record<string, string[]> = {
  'human':         ['Versátil (+1 a todos los atributos)'],
  'elf':           ['Visión en la oscuridad (60 ft)', 'Linaje feérico (Adv. contra hechizo)', 'No necesita dormir (Trance)'],
  'high elf':      ['Visión en la oscuridad', 'Linaje feérico', 'Proficiencia en armas élficas', 'Cantrip de mago'],
  'wood elf':      ['Visión en la oscuridad', 'Linaje feérico', 'Velocidad 35 ft', 'Paso del bosque'],
  'dark elf':      ['Visión en la oscuridad superior (120 ft)', 'Magia drow', 'Sensibilidad a la luz solar'],
  'dwarf':         ['Visión en la oscuridad', 'Resistencia enana (Adv. contra veneno)', 'Resistencia al veneno', 'Sentido para piedra'],
  'hill dwarf':    ['Visión en la oscuridad', 'Resistencia enana', 'Tenacidad (PV extra por nivel)'],
  'halfling':      ['Suertudo (re-roll 1s)', 'Valiente (Adv. contra miedo)', 'Agilidad halfling (pasar por espacio de criaturas grandes)'],
  'gnome':         ['Visión en la oscuridad', 'Astucia gnomos (Ventaja a INT, SAB, CHA contra magia)'],
  'half-elf':      ['Visión en la oscuridad', 'Ascendencia feérica', 'Versatilidad (+2 competencias a elegir)'],
  'half-orc':      ['Visión en la oscuridad', 'Amenazante (Proficiencia en Intimidación)', 'Resistencia implacable (1 vez: quedar en 1 HP en vez de 0)', 'Ataques salvajes'],
  'tiefling':      ['Visión en la oscuridad', 'Resistencia infernal (fuego)', 'Legado infernal (hechizos gratuitos)'],
  'dragonborn':    ['Arma de aliento (tipo según ascendencia)', 'Resistencia al tipo dracónico'],
  'tabaxi':        ['Velocidad 30 ft / Escalar 20 ft', 'Garras (1d4 daño)', 'Visión felina', 'Pasos de gato'],
  'goliath':       ['Constitución atlética', 'Poderoso (llevar el doble)', 'Resistencia pétrea (1 vez reducir daño)'],
  'aasimar':       ['Visión en la oscuridad', 'Resistencia radiante y necrótica', 'Curación celestial (curar con acción)'],
}

// ─── CLASS BONUSES (stat emphasis at level 1) ────────────────────────────────
// These represent the primary stat focus of each class (NOT an official D&D rule,
// but a design choice for Aura Engine to reward thematic builds).
export const CLASS_BONUSES: Record<string, StatBlock> = {
  'fighter':      { str:1, con:1 },
  'barbarian':    { str:2, con:1 },
  'paladin':      { str:1, cha:1 },
  'ranger':       { dex:1, wis:1 },
  'rogue':        { dex:2 },
  'monk':         { dex:1, wis:1 },
  'bard':         { cha:2, dex:1 },
  'warlock':      { cha:2 },
  'sorcerer':     { cha:2 },
  'wizard':       { int:2 },
  'cleric':       { wis:2 },
  'druid':        { wis:2, con:1 },
  'artificer':    { int:2 },
  // Spanish equivalents
  'guerrero':     { str:1, con:1 },
  'bárbaro':      { str:2, con:1 },
  'paladín':      { str:1, cha:1 },
  'explorador':   { dex:1, wis:1 },
  'pícaro':       { dex:2 },
  'monje':        { dex:1, wis:1 },
  'bardo':        { cha:2, dex:1 },
  'brujo':        { cha:2 },
  'hechicero':    { cha:2 },
  'mago':         { int:2 },
  'clérigo':      { wis:2 },
  'druida':       { wis:2, con:1 },
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/** Look up racial bonuses by race name (case-insensitive). Returns {} if custom. */
export function getRaceBonuses(race: string): StatBlock {
  const key = race.toLowerCase().trim()
  return RACE_BONUSES[key] ?? {}
}

/** Look up racial traits by race name. Returns [] if unknown (AI will fill in). */
export function getRacialTraits(race: string): string[] {
  const key = race.toLowerCase().trim()
  return RACIAL_TRAITS[key] ?? []
}

/** Look up class bonuses by class name (case-insensitive). Returns {} if custom. */
export function getClassBonuses(charClass: string): StatBlock {
  // For multi-word or custom classes, try exact then first word
  const key = charClass.toLowerCase().trim()
  return CLASS_BONUSES[key] ?? CLASS_BONUSES[key.split(' ')[0]] ?? {}
}

/** Apply bonuses to a stat block, capping each stat at 20. */
export function applyBonuses(
  base: Record<StatKey, number>,
  ...bonuses: StatBlock[]
): Record<StatKey, number> {
  const result = { ...base }
  for (const bonus of bonuses) {
    for (const [stat, value] of Object.entries(bonus) as [StatKey, number][]) {
      if (value) {
        result[stat] = Math.min(20, (result[stat] ?? 10) + value)
      }
    }
  }
  return result
}

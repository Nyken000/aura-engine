import fs from 'fs'
import path from 'path'
import https from 'https'

const OUT_FILE = path.join(process.cwd(), 'src/data/dnd/spells_level_1.ts')

// Helper to map Open5e classes to our CasterClass names
function mapClassNameToCaster(className: string): string | null {
  const map: Record<string, string> = {
    'Wizard': 'Mago',
    'Cleric': 'Clérigo',
    'Sorcerer': 'Hechicero',
    'Bard': 'Bardo',
    'Druid': 'Druida',
    'Warlock': 'Brujo'
  }
  return map[className] || null
}

function fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch(e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function processSpellDescription(desc: string, higherLevel: string): string {
  let combined = desc.trim();
  if (higherLevel) {
    combined += "\\n\\nNiveles Superiores: " + higherLevel.trim();
  }
  return combined;
}

async function main() {
  const allSpells: any[] = []
  
  // We want Cantrips (level_int=0) and Level 1 (level_int=1) from the WotC SRD
  let nextUrl: string | null = 'https://api.open5e.com/spells/?level_int__in=0,1&document__slug=wotc-srd&limit=100'

  console.log("Fetching official SRD Cantrips and Level 1 Spells from Open5e...");
  
  while (nextUrl) {
      try {
          const data = await fetchJson(nextUrl);
          if (data && data.results) {
             allSpells.push(...data.results);
             console.log(`Fetched ${allSpells.length} of ${data.count} spells...`);
          }
          nextUrl = data.next ? data.next.replace('http://', 'https://') : null;
      } catch(e) {
          console.error(`Failed to load ${nextUrl}`, e);
          break;
      }
  }

  const generatedSpells: any[] = []

  for (const spell of allSpells) {
    if (!spell.dnd_class) continue;
    
    // The classes are provided as a comma separated string: "Druid, Wizard"
    const classNames = spell.dnd_class.split(',').map((c: string) => c.trim())
    
    const validClasses = classNames
      .map(mapClassNameToCaster)
      .filter(Boolean)
    
    if (validClasses.length === 0) continue;
    
    const isCantrip = spell.level_int === 0
    
    // Translate casting time to Spanish UI names
    let castingTime = spell.casting_time;
    if (castingTime.includes("1 action")) castingTime = "1 Acción";
    else if (castingTime.includes("1 bonus action")) castingTime = "1 Acción Adicional";
    else if (castingTime.includes("1 reaction")) castingTime = "1 Reacción";
    else if (castingTime.includes("1 minute")) castingTime = "1 Minuto";
    else if (castingTime.includes("10 minutes")) castingTime = "10 Minutos";

    // Translate basic ranges
    let range = spell.range;
    range = range.replace(' feet', ' pies');
    range = range.replace('Self', 'Personal');
    range = range.replace('Touch', 'Toque');

    generatedSpells.push({
      name: spell.name,
      level: isCantrip ? "Truco" : "Nivel 1",
      classes: validClasses,
      casting_time: castingTime,
      range: range,
      description: processSpellDescription(spell.desc, spell.higher_level)
    })
  }

  const jsContent = `// SYSTEM GENERATED FILE - Extracted from Open5e SRD

export type CasterClass = 'Mago' | 'Clérigo' | 'Hechicero' | 'Bardo' | 'Druida' | 'Brujo'

export interface SpellDefinition {
  name: string
  level: string
  casting_time: string
  range: string
  classes: CasterClass[]
  description: string
}

export const OFFICIAL_SPELLS_LEVEL_1_AND_0: SpellDefinition[] = ${JSON.stringify(generatedSpells, null, 2)}

export const CLASS_SPELL_LIMITS: Record<CasterClass, { cantrips: number, level_1: number }> = {
  'Bardo': { cantrips: 2, level_1: 4 },
  'Clérigo': { cantrips: 3, level_1: 2 }, // Base level 1 is technically Wisdom modifier + level, but 2 is a safe minimum for UI
  'Druida': { cantrips: 2, level_1: 2 }, // Same as cleric
  'Hechicero': { cantrips: 4, level_1: 2 },
  'Brujo': { cantrips: 2, level_1: 2 },
  'Mago': { cantrips: 3, level_1: 6 } // Wizard actually starts with 6 level 1 spells in their spellbook
}

export function getCantripsForClass(className: CasterClass): SpellDefinition[] {
  return OFFICIAL_SPELLS_LEVEL_1_AND_0.filter(s => s.level === 'Truco' && s.classes.includes(className))
}

export function getLevel1SpellsForClass(className: CasterClass): SpellDefinition[] {
  return OFFICIAL_SPELLS_LEVEL_1_AND_0.filter(s => s.level === 'Nivel 1' && s.classes.includes(className))
}
`

  fs.writeFileSync(OUT_FILE, jsContent, 'utf8')
  console.log("Successfully extracted " + generatedSpells.length + " spells into " + OUT_FILE)
}

main().catch(console.error)

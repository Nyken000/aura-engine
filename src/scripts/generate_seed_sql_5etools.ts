import fs from 'fs';
import path from 'path';

function escapeString(str: string): string {
    if (!str) return 'NULL';
    return "'" + str.replace(/'/g, "''") + "'";
}

function parseSkillProficiencies(spArray: any[]): string[] {
    if (!spArray || spArray.length === 0) return [];
    const skills = new Set<string>();
    
    // Some are formatted as: { "history": true, "intimidation": true }
    // Some are: { "choose": { "from": ["history", "nature"] } }
    for (const sp of spArray) {
        for (const [key, val] of Object.entries(sp)) {
            if (val === true) {
                skills.add(key.charAt(0).toUpperCase() + key.slice(1));
            } else if (key === 'choose' || key === 'any' || key === 'anyStandard') {
                skills.add('Choose from list');
            }
        }
    }
    return Array.from(skills);
}

function parseToolProficiencies(tpArray: any[]): string[] {
    if (!tpArray || tpArray.length === 0) return [];
    const tools = new Set<string>();
    for (const tp of tpArray) {
        for (const [key, val] of Object.entries(tp)) {
            if (val === true) {
                tools.add(key.charAt(0).toUpperCase() + key.slice(1));
            } else if (key === 'choose') {
                tools.add('Choose tool');
            }
        }
    }
    return Array.from(tools);
}

// 5eTools formatting like {@skill Athletics} -> Athletics
function stripTags(str: string): string {
    if (!str) return '';
    return str.replace(/\{@[\w]+ (.*?)(?:\|.*?)?\}/g, '$1');
}

function extractFeature(bg: any): { name: string, description: string } {
    let featureName = '';
    let featureDesc = '';
    
    if (bg.entries && bg.entries.length > 0) {
        // Look for the "Feature:" entries or similar
        for (const entry of bg.entries) {
            if (entry.name && entry.name.toLowerCase().includes('feature:')) {
                featureName = entry.name.replace('Feature:', '').trim();
                featureDesc = Array.isArray(entry.entries) ? entry.entries.join('\n') : (entry.entry || '');
                break;
            }
        }
        
        // Fallback: If no explicit "Feature", use the first substantial entry that isn't traits/ideals
        if (!featureName) {
           for (const entry of bg.entries) {
               if (entry.name && !['suggested characteristics', 'building a'].some(x => entry.name.toLowerCase().includes(x))) {
                   featureName = entry.name;
                   featureDesc = Array.isArray(entry.entries) ? entry.entries.join('\n') : (entry.entry || '');
                   break;
               }
           } 
        }
    }
    
    return { 
        name: stripTags(featureName), 
        description: stripTags(featureDesc) 
    };
}


function main() {
    const jsonPath = path.join(process.cwd(), 'src/data/dnd/5etools_backgrounds.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('Backgrounds file not found at', jsonPath);
        process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    // Filter out Unearthed Arcana (_copy or UA source)
    const backgrounds = rawData.background.filter((b: any) => !b.source.includes('UA') && !b._copy);

    let sqlOutput = `-- Migration: 13_seed_5etools_backgrounds\n-- Description: Seeds the structured backgrounds table using 5eTools data for the Character Builder.\n\n`;

    for (const bg of backgrounds) {
        const title = escapeString(bg.name);
        const description = escapeString(bg.entries ? 'A background from ' + bg.source : '');
        
        const skillsObj = parseSkillProficiencies(bg.skillProficiencies);
        const toolsObj = parseToolProficiencies(bg.toolProficiencies);
        const equipmentText = []; // We won't map complex JSON, just string for now to save time
        
        const { name: fName, description: fDesc } = extractFeature(bg);
        const sfName = escapeString(fName);
        const sfDesc = escapeString(fDesc);
        
        const skillsJson = escapeString(JSON.stringify(skillsObj));
        const toolsJson = escapeString(JSON.stringify(toolsObj));
        const equipJson = escapeString(JSON.stringify([])); // Empty default

        sqlOutput += `INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, starting_equipment, feature_name, feature_description)
VALUES (${title}, ${description}, ${skillsJson}::jsonb, ${toolsJson}::jsonb, ${equipJson}::jsonb, ${sfName}, ${sfDesc})
ON CONFLICT (name) DO NOTHING;\n\n`;
    }

    const outPath = path.join(process.cwd(), 'supabase/migrations/13_seed_5etools_backgrounds.sql');
    fs.writeFileSync(outPath, sqlOutput);
    console.log(`Generated SQL for ${backgrounds.length} backgrounds in ${outPath}`);
}

main();

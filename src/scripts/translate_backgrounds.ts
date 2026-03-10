import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

if (!geminiApiKey) {
  console.error("Faltan credenciales de Gemini")
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(geminiApiKey)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Help extract the same properties as our seed script
function parseSkillProficiencies(spArray: any[]): string[] {
    if (!spArray || spArray.length === 0) return [];
    const skills = new Set<string>();
    for (const sp of spArray) {
        for (const [key, val] of Object.entries(sp)) {
            if (val === true) skills.add(key.charAt(0).toUpperCase() + key.slice(1));
            else if (key === 'choose' || key === 'any' || key === 'anyStandard') skills.add('Choose from list');
        }
    }
    return Array.from(skills);
}

function parseToolProficiencies(tpArray: any[]): string[] {
    if (!tpArray || tpArray.length === 0) return [];
    const tools = new Set<string>();
    for (const tp of tpArray) {
        for (const [key, val] of Object.entries(tp)) {
            if (val === true) tools.add(key.charAt(0).toUpperCase() + key.slice(1));
            else if (key === 'choose') tools.add('Choose tool');
        }
    }
    return Array.from(tools);
}

function stripTags(str: string): string {
    if (!str) return '';
    return str.replace(/\{@[\w]+ (.*?)(?:\|.*?)?\}/g, '$1');
}

function extractFeature(bg: any): { name: string, description: string } {
    let featureName = '';
    let featureDesc = '';
    if (bg.entries && bg.entries.length > 0) {
        for (const entry of bg.entries) {
            if (entry.name && entry.name.toLowerCase().includes('feature:')) {
                featureName = entry.name.replace('Feature:', '').trim();
                featureDesc = Array.isArray(entry.entries) ? entry.entries.join('\n') : (entry.entry || '');
                break;
            }
        }
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
    return { name: stripTags(featureName), description: stripTags(featureDesc) };
}

async function translateBackground(bg: any) {
    const prompt = `
    Eres un experto localizador y traductor de Dungeons & Dragons 5e al español.
    Traduce el siguiente trasfondo de personaje de D&D manteniendo una excelente gramática, coherencia narrativa y terminología oficial de D&D.
    NO agregues explicaciones, solo devuelve un objeto JSON válido con la traducción.
    
    Datos a traducir:
    Nombre original: "${bg.name}"
    Descripción original: "${bg.description}"
    Nombre del rasgo: "${bg.feature_name || ''}"
    Descripción del rasgo: "${bg.feature_description || ''}"
    Habilidades: ${JSON.stringify(bg.skill_proficiencies)}
    Herramientas: ${JSON.stringify(bg.tool_proficiencies)}
    
    Devuelve EXACTAMENTE Y SOLAMENTE este formato JSON:
    {
      "name": "Nombre en español",
      "description": "Descripción en español",
      "feature_name": "Nombre del rasgo en español",
      "feature_description": "Descripción del rasgo en español",
      "skill_proficiencies": ["Habilidad 1 en español", "Habilidad 2 en español"],
      "tool_proficiencies": ["Herramienta 1 en español", "Herramienta 2 en español"]
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(responseText);
    } catch (e) {
        console.error("Error traduciendo " + bg.name, e);
        return null;
    }
}

async function main() {
    const jsonPath = path.join(process.cwd(), 'src/data/dnd/5etools_backgrounds.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('Backgrounds file not found at', jsonPath);
        process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const backgrounds = rawData.background.filter((b: any) => !b.source.includes('UA') && !b._copy);
    console.log(`Se encontraron ${backgrounds.length} trasfondos en el archivo. ¡Iniciando traducción!`);

    for (let i = 0; i < backgrounds.length; i++) {
        const bg = backgrounds[i];
        
        // Prepare mapping just like the seed script
        const description = bg.entries ? 'A background from ' + bg.source : '';
        const skillsObj = parseSkillProficiencies(bg.skillProficiencies);
        const toolsObj = parseToolProficiencies(bg.toolProficiencies);
        const { name: fName, description: fDesc } = extractFeature(bg);
        
        const preparedBg = {
            name: bg.name,
            description: description,
            feature_name: fName,
            feature_description: fDesc,
            skill_proficiencies: skillsObj,
            tool_proficiencies: toolsObj
        };

        console.log(`[${i + 1}/${backgrounds.length}] Traduciendo: ${preparedBg.name}...`);
        
        const translated = await translateBackground(preparedBg);
        
        if (translated) {
            console.log(`   -> Traducido a: ${translated.name}`);
            
            // To ensure matching updates later we use the exact original name as the search key in SQL
            const originalNameEscaped = `'${bg.name.replace(/'/g, "''")}'`;
            const sfName = translated.feature_name ? `'${translated.feature_name.replace(/'/g, "''")}'` : 'NULL';
            const sfDesc = translated.feature_description ? `'${translated.feature_description.replace(/'/g, "''")}'` : 'NULL';
            const sName = `'${translated.name.replace(/'/g, "''")}'`;
            const sDesc = `'${translated.description.replace(/'/g, "''")}'`;
            const sSkills = `'${JSON.stringify(translated.skill_proficiencies).replace(/'/g, "''")}'`;
            const sTools = `'${JSON.stringify(translated.tool_proficiencies).replace(/'/g, "''")}'`;

            const updateSql = `UPDATE public.backgrounds SET name = ${sName}, description = ${sDesc}, feature_name = ${sfName}, feature_description = ${sfDesc}, skill_proficiencies = ${sSkills}::jsonb, tool_proficiencies = ${sTools}::jsonb WHERE name = ${originalNameEscaped};\n`;
            
            fs.appendFileSync('supabase/migrations/15_translate_backgrounds.sql', updateSql);
        }
        
        // Rate limiting gentil para Gemini
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log("¡Traducción completa! Archivo SQL generado.");
}

main();

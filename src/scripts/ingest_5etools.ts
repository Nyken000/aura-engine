import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error("Missing credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const genAI = new GoogleGenerativeAI(geminiApiKey)

// A helper to format the complex JSON of 5eTools into a clean, searchable markdown string
function format5etoolsContent(item: any): string {
    let md = `# ${item.name}\n\n`;
    
    if (item.entries) {
        md += parseEntries(item.entries)
    }

    if (item.source) md += `\n\nFuente: ${item.source}`;
    
    return md;
}

// Minimal recursive parser for 5etools proprietary markup
function parseEntries(entries: any[]): string {
    let result = '';
    for (const e of entries) {
        if (typeof e === 'string') {
            // Strip out 5etools tag syntax {@spell Fireball} -> Fireball
            result += e.replace(/\{@\w+\s([^}]+)\}/g, '$1') + '\n\n';
        } else if (e.type === 'list' && e.items) {
            for (const item of e.items) {
                result += `- ${parseEntries([item]).trim()}\n`;
            }
            result += '\n';
        } else if (e.name) {
            result += `**${e.name}**: ${e.entries ? parseEntries(e.entries) : ''}\n`;
        } else if (e.entries) {
            result += parseEntries(e.entries);
        }
    }
    return result;
}


async function ingestBackgrounds() {
    // Note: The user was advised to download the 5etools-utils repo to src/data/dnd
    // For this script to work, the JSON files must exist. We will provide a stub generator
    // that the user can use once they place the actual 5etools backgrounds.json here.
    
    const filePath = path.join(__dirname, '../data/dnd/5etools_backgrounds.json');
    if (!fs.existsSync(filePath)) {
        console.warn(`[WARNING] No se encontró el archivo ${filePath}. Por favor, descarga los archivos de 5eTools-utils.`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const backgrounds = data.background || [];
    
    console.log(`Processing ${backgrounds.length} backgrounds...`);

    let count = 0;
    for (const bg of backgrounds) {
        // Only process official sources for now to save time/API calls, skip UA and homebrew unless requested
        if (bg.source && bg.source.includes('UA')) continue;

        const contentStr = format5etoolsContent(bg);
        
        try {
            // 1. Generate Embedding using Gemini
            const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
            const response = await model.embedContent(contentStr);
            
            const embedding = response.embedding?.values;
            
            if (!embedding) {
                console.error(`Failed to get embedding for ${bg.name}`);
                continue;
            }

            // 2. Insert into Supabase dnd_knowledge table
            const { error } = await supabase.from('dnd_knowledge').insert({
                name: bg.name,
                entity_type: 'background',
                source_book: bg.source,
                category: bg.source === 'PHB' ? 'Oficial (Core)' : 'Oficial (Expansión)',
                content: contentStr,
                metadata: { is_5etools: true },
                embedding: embedding
            });

            if (error) {
                console.error(`DB Error on ${bg.name}:`, error.message);
            } else {
                count++;
                if (count % 10 === 0) console.log(`✓ Inserted ${count} backgrounds...`);
            }
            
            // Respect rate limits for Gemini API (pause 200ms)
            await new Promise(r => setTimeout(r, 200));

        } catch (err: any) {
            console.error(`Error processing ${bg.name}:`, err.message);
        }
    }
    
    console.log(`\n🎉 Successfully ingested ${count} backgrounds!`);
}

// FORMATTER FOR SPELLS
function formatSpellContent(spell: any): string {
    let md = `# Hechizo: ${spell.name}\n`;
    md += `Nivel: ${spell.level === 0 ? 'Truco (Cantrip)' : spell.level}\n`;
    md += `Escuela: ${spell.school}\n`;
    md += `Tiempo de lanzamiento: ${spell.time ? spell.time.map((t:any) => `${t.number} ${t.unit}`).join(', ') : 'Desconocido'}\n`;
    md += `Rango: ${spell.range ? (spell.range.distance ? `${spell.range.distance.amount || ''} ${spell.range.distance.type}` : spell.range.type) : 'Desconocido'}\n`;
    
    let components = [];
    if (spell.components) {
        if (spell.components.v) components.push('Verbal (V)');
        if (spell.components.s) components.push('Somático (S)');
        if (spell.components.m) {
            const m = typeof spell.components.m === 'string' ? spell.components.m : spell.components.m.text;
            components.push(`Material (M): ${m}`);
        }
    }
    md += `Componentes: ${components.join(', ')}\n`;
    md += `Duración: ${spell.duration ? spell.duration.map((d:any) => d.type === 'instant' ? 'Instantáneo' : (d.duration ? `${d.duration.amount} ${d.duration.type}` : d.type)).join(', ') : 'Desconocida'}\n\n`;

    md += `### Descripción:\n`;
    if (spell.entries) {
        md += parseEntries(spell.entries);
    }
    if (spell.entriesHigherLevel) {
        md += `\n### A niveles superiores:\n`;
        md += parseEntries(spell.entriesHigherLevel);
    }
    md += `\nFuente: ${spell.source}`;
    return md;
}

async function ingestSpells() {
    const filePath = path.join(__dirname, '../data/dnd/spells-phb.json');
    if (!fs.existsSync(filePath)) {
        console.warn(`[WARNING] No se encontró el archivo ${filePath}.`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const spells = data.spell || [];
    console.log(`Processing ${spells.length} Spells from PHB...`);

    let count = 0;
    for (const sp of spells) {
        const contentStr = formatSpellContent(sp);
        
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
            const response = await model.embedContent(contentStr);
            const embedding = response.embedding?.values;
            if (!embedding) continue;

            const { error } = await supabase.from('dnd_knowledge').insert({
                name: sp.name,
                entity_type: 'spell',
                source_book: sp.source,
                category: 'Oficial (Core)',
                content: contentStr,
                metadata: { is_5etools: true, level: sp.level, school: sp.school },
                embedding: embedding
            });

            if (error) {
                console.error(`DB Error on ${sp.name}:`, error.message);
            } else {
                count++;
                if (count % 10 === 0) console.log(`✓ Inserted ${count} spells...`);
            }
            
            // Respect rate limits!
            await new Promise(r => setTimeout(r, 200));
        } catch (err: any) {
            console.error(`Error processing ${sp.name}:`, err.message);
        }
    }
    console.log(`\n🎉 Successfully ingested ${count} Spells!`);
}

// FORMATTER FOR ITEMS
function formatItemContent(item: any): string {
    let md = `# Objeto: ${item.name}\n`;
    md += `Tipo: ${item.type || 'Aventuras / Misceláneo'}\n`;
    if (item.rarity && item.rarity !== 'none') md += `Rareza: ${item.rarity}\n`;
    if (item.value) md += `Valor: ${item.value / 100} gp\n`; // 5etools uses copper as base usually
    if (item.weight) md += `Peso: ${item.weight} lb.\n`;
    if (item.reqAttune) md += `*Requiere sintonización*\n`;
    
    // Weapon specifics
    if (item.weaponCategory) {
        md += `Arma: ${item.weaponCategory}\n`;
        if (item.dmg1) md += `Daño: ${item.dmg1} ${item.dmgType ? item.dmgType : ''}\n`;
        if (item.property) md += `Propiedades: ${item.property.join(', ')}\n`;
    }
    
    // Armor specifics
    if (item.ac) md += `Clase de Armadura (AC): ${item.ac}\n`;
    
    md += `\n### Descripción:\n`;
    if (item.entries) {
        md += parseEntries(item.entries);
    }
    
    md += `\nFuente: ${item.source}`;
    return md;
}

async function ingestItems() {
    const filePath = path.join(__dirname, '../data/dnd/items.json');
    if (!fs.existsSync(filePath)) {
        console.warn(`[WARNING] No se encontró el archivo ${filePath}.`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Usually items.json has 'item', 'itemGroup', 'magicvariant', etc.
    const items = data.item || []; 
    console.log(`Processing ${items.length} Items...`);

    let count = 0;
    // For items, there are thousands. Let's only process Adventuring Gear, Weapons, Armor, and Magic Items
    // to keep the Free Tier API limits happy.
    for (const it of items) {
        // Skip basic useless items or very obscure sources
        if (it.source && it.source !== 'PHB' && it.source !== 'DMG') continue;

        const contentStr = formatItemContent(it);
        
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
            const response = await model.embedContent(contentStr);
            const embedding = response.embedding?.values;
            if (!embedding) continue;

            const { error } = await supabase.from('dnd_knowledge').insert({
                name: it.name,
                entity_type: 'item',
                source_book: it.source,
                category: 'Oficial (Core)',
                content: contentStr,
                metadata: { is_5etools: true, type: it.type, rarity: it.rarity },
                embedding: embedding
            });

            if (error) {
                console.error(`DB Error on ${it.name}:`, error.message);
            } else {
                count++;
                if (count % 20 === 0) console.log(`✓ Inserted ${count} items...`);
            }
            
            await new Promise(r => setTimeout(r, 200));
        } catch (err: any) {
            console.error(`Error processing ${it.name}:`, err.message);
        }
    }
    console.log(`\n🎉 Successfully ingested ${count} Items!`);
}

async function main() {
    console.log('Starting ingestion pipeline...');
    
    // Check args to see which one to run to avoid hitting API limits all at once
    const args = process.argv.slice(2);
    
    if (args.includes('--backgrounds')) {
        await ingestBackgrounds();
    } else if (args.includes('--spells')) {
        await ingestSpells();
    } else if (args.includes('--items')) {
        await ingestItems();
    } else {
        console.log("Please specify what to ingest: --backgrounds, --spells, or --items");
    }
}

main();

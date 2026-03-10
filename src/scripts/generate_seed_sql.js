const fs = require('fs');
const path = require('path');

const weapons = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dnd/srd_weapons.json'), 'utf8'));
const armor = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dnd/srd_armor.json'), 'utf8'));
const backgrounds = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/dnd/srd_backgrounds.json'), 'utf8'));

let sql = `-- Seed data for D&D 5e (Weapons, Armor, Backgrounds)\n\n`;

// Insert weapons
sql += `-- === WEAPONS ===\n`;
sql += `INSERT INTO public.game_items (name, item_type, description, weight, cost_quantity, cost_unit, properties, damage_dice, damage_type, armor_class) VALUES\n`;
const weaponValues = weapons.map(w => {
  const name = w.name.replace(/'/g, "''");
  const type = 'weapon';
  const desc = w.desc ? w.desc.join('\\n').replace(/'/g, "''") : '';
  const weight = w.weight || 0;
  const costQ = w.cost?.quantity || 0;
  const costU = w.cost?.unit || 'gp';
  const props = JSON.stringify(w.properties || []).replace(/'/g, "''");
  const dd = w.damage?.damage_dice || null;
  const dt = w.damage?.damage_type?.name || null;
  return `('${name}', '${type}', '${desc}', ${weight}, ${costQ}, '${costU}', '${props}'::jsonb, ${dd ? `'${dd}'` : 'NULL'}, ${dt ? `'${dt}'` : 'NULL'}, NULL)`;
});
sql += weaponValues.join(',\n') + `\nON CONFLICT (name) DO NOTHING;\n\n`;


// Insert armor
sql += `-- === ARMOR ===\n`;
sql += `INSERT INTO public.game_items (name, item_type, description, weight, cost_quantity, cost_unit, properties, damage_dice, damage_type, armor_class) VALUES\n`;
const armorValues = armor.map(a => {
  const name = a.name.replace(/'/g, "''");
  const type = a.equipment_category?.index === 'shield' ? 'shield' : 'armor';
  const desc = a.desc ? a.desc.join('\\n').replace(/'/g, "''") : '';
  const weight = a.weight || 0;
  const costQ = a.cost?.quantity || 0;
  const costU = a.cost?.unit || 'gp';
  const props = JSON.stringify({ stealth_disadvantage: a.stealth_disadvantage, str_minimum: a.str_minimum }).replace(/'/g, "''");
  const ac = a.armor_class?.base || 0;
  return `('${name}', '${type}', '${desc}', ${weight}, ${costQ}, '${costU}', '${props}'::jsonb, NULL, NULL, ${ac})`;
});
sql += armorValues.join(',\n') + `\nON CONFLICT (name) DO NOTHING;\n\n`;

// Insert backgrounds
sql += `-- === BACKGROUNDS ===\n`;
sql += `INSERT INTO public.backgrounds (name, description, skill_proficiencies, tool_proficiencies, languages, starting_equipment, feature_name, feature_description) VALUES\n`;
const bgValues = backgrounds.map(b => {
  const name = b.name.replace(/'/g, "''");
  const desc = ''; // Some SRD endpoints don't have general description, we'll leave empty for now
  const skills = JSON.stringify(b.starting_proficiencies || []).replace(/'/g, "''");
  const tools = JSON.stringify([]).replace(/'/g, "''"); // Tool proficiencies are usually in options
  const languages = JSON.stringify(b.language_options || {}).replace(/'/g, "''");
  const equip = JSON.stringify(b.starting_equipment || []).replace(/'/g, "''");
  const featName = (b.feature?.name || '').replace(/'/g, "''");
  const featDesc = (b.feature?.desc || []).join('\\n').replace(/'/g, "''");
  return `('${name}', '${desc}', '${skills}'::jsonb, '${tools}'::jsonb, '${languages}'::jsonb, '${equip}'::jsonb, '${featName}', '${featDesc}')`;
});
sql += bgValues.join(',\n') + `\nON CONFLICT (name) DO NOTHING;\n`;

fs.writeFileSync(path.join(__dirname, '../../supabase/migrations/07_seed_dnd_data.sql'), sql);
console.log('Successfully generated SQL seed file: supabase/migrations/07_seed_dnd_data.sql');

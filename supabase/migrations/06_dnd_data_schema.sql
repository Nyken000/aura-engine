-- Migration: 06_dnd_data_schema
-- Description: Adds tables for game items (weapons, armor, generic equipment) and character backgrounds

-- Create the backgrounds table
CREATE TABLE public.backgrounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    skill_proficiencies JSONB,
    tool_proficiencies JSONB,
    languages JSONB,
    starting_equipment JSONB,
    feature_name TEXT,
    feature_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Protect backgrounds with RLS (Read-only for all authenticated users)
ALTER TABLE public.backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users to backgrounds" ON public.backgrounds FOR SELECT TO authenticated USING (true);


-- Create the game_items table
CREATE TABLE public.game_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    item_type TEXT NOT NULL, -- 'weapon', 'armor', 'gear', 'magic_item'
    description TEXT,
    weight NUMERIC,
    cost_quantity INTEGER,
    cost_unit TEXT,
    source_book TEXT DEFAULT 'SRD 5.1',
    properties JSONB,
    damage_dice TEXT,
    damage_type TEXT,
    armor_class INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Protect game_items with RLS (Read-only for all authenticated users)
ALTER TABLE public.game_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users to game_items" ON public.game_items FOR SELECT TO authenticated USING (true);


-- Update characters table to optionally link to a background
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS background_id UUID REFERENCES public.backgrounds(id) ON DELETE SET NULL;

-- Initial Schema for Aura Engine
-- This script creates the fundamental tables for the application and sets up Row Level Security (RLS).

-- 1. Profiles Table (Extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Worlds Table (Narrative Settings)
CREATE TABLE public.worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  genre TEXT,
  ai_rules TEXT,
  is_public BOOLEAN DEFAULT false,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;

-- 3. Characters Table (Player Characters in Worlds)
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  background TEXT,
  inventory JSONB DEFAULT '{}'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- 4. Narrative Events Table (Chat History)
CREATE TABLE public.narrative_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES public.worlds(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.narrative_events ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES --

-- Profiles: Users can read all public profiles, but only update their own.
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Worlds: Anyone can view public worlds, or worlds they created. Users can create/edit own worlds.
CREATE POLICY "Public worlds are viewable by everyone." ON public.worlds FOR SELECT USING (is_public = true OR auth.uid() = creator_id);
CREATE POLICY "Users can create worlds." ON public.worlds FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own worlds." ON public.worlds FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own worlds." ON public.worlds FOR DELETE USING (auth.uid() = creator_id);

-- Characters: Users can see all characters in a public world or their own characters. Users can only edit own characters.
CREATE POLICY "Characters in public worlds are viewable." ON public.characters FOR SELECT USING (
  world_id IN (SELECT id FROM public.worlds WHERE is_public = true) OR auth.uid() = user_id
);
CREATE POLICY "Users can insert own characters." ON public.characters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own characters." ON public.characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own characters." ON public.characters FOR DELETE USING (auth.uid() = user_id);

-- Narrative Events: Users can see events in public worlds, or worlds they participate in. Users can insert if they own the character or world.
CREATE POLICY "Events in public worlds are viewable." ON public.narrative_events FOR SELECT USING (
  world_id IN (SELECT id FROM public.worlds WHERE is_public = true) OR 
  world_id IN (SELECT id FROM public.worlds WHERE creator_id = auth.uid()) OR
  character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert events for their characters or worlds." ON public.narrative_events FOR INSERT WITH CHECK (
  world_id IN (SELECT id FROM public.worlds WHERE creator_id = auth.uid()) OR
  character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid())
);

-- Trigger to automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

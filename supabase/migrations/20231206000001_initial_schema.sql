-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table linked to auth.users
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  script TEXT,
  style TEXT DEFAULT 'cartoon' CHECK (style IN ('cartoon', 'anime', 'realistic', 'comic')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'rendering', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create characters table
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  appearance TEXT,
  personality TEXT,
  image_url TEXT,
  sprite_sheet_url TEXT,
  voice_settings JSONB DEFAULT '{}'::jsonb,
  animation_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scenes table
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  title TEXT,
  script_text TEXT NOT NULL,
  background_url TEXT,
  background_description TEXT,
  duration REAL DEFAULT 5.0,
  camera_settings JSONB DEFAULT '{}'::jsonb,
  transition_type TEXT DEFAULT 'fade' CHECK (transition_type IN ('fade', 'slide', 'zoom', 'none')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, scene_number)
);

-- Create scene_characters junction table
CREATE TABLE scene_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  scale REAL DEFAULT 1.0,
  z_index INTEGER DEFAULT 0,
  animation_sequence JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scene_id, character_id)
);

-- Create audio_tracks table
CREATE TABLE audio_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('narration', 'dialogue', 'music', 'sfx')),
  audio_url TEXT NOT NULL,
  transcript TEXT,
  start_time REAL DEFAULT 0.0,
  duration REAL NOT NULL,
  phoneme_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_exports table
CREATE TABLE video_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  resolution TEXT DEFAULT '720p' CHECK (resolution IN ('480p', '720p', '1080p')),
  duration REAL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create templates table for predefined characters and scenes
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('character', 'scene', 'story')),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_characters_story_id ON characters(story_id);
CREATE INDEX idx_scenes_story_id ON scenes(story_id);
CREATE INDEX idx_scenes_scene_number ON scenes(story_id, scene_number);
CREATE INDEX idx_scene_characters_scene_id ON scene_characters(scene_id);
CREATE INDEX idx_scene_characters_character_id ON scene_characters(character_id);
CREATE INDEX idx_audio_tracks_scene_id ON audio_tracks(scene_id);
CREATE INDEX idx_video_exports_story_id ON video_exports(story_id);
CREATE INDEX idx_video_exports_user_id ON video_exports(user_id);
CREATE INDEX idx_templates_type ON templates(type);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stories
CREATE POLICY "Users can view own stories" ON stories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for characters
CREATE POLICY "Users can view characters from own stories" ON characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = characters.story_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create characters for own stories" ON characters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = characters.story_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update characters from own stories" ON characters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = characters.story_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete characters from own stories" ON characters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = characters.story_id AND stories.user_id = auth.uid()
    )
  );

-- RLS Policies for scenes
CREATE POLICY "Users can view scenes from own stories" ON scenes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = scenes.story_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scenes for own stories" ON scenes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = scenes.story_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scenes from own stories" ON scenes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = scenes.story_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scenes from own stories" ON scenes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM stories WHERE stories.id = scenes.story_id AND stories.user_id = auth.uid()
    )
  );

-- RLS Policies for scene_characters
CREATE POLICY "Users can view scene_characters from own stories" ON scene_characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN stories ON stories.id = scenes.story_id 
      WHERE scenes.id = scene_characters.scene_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scene_characters for own stories" ON scene_characters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN stories ON stories.id = scenes.story_id 
      WHERE scenes.id = scene_characters.scene_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scene_characters from own stories" ON scene_characters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN stories ON stories.id = scenes.story_id 
      WHERE scenes.id = scene_characters.scene_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scene_characters from own stories" ON scene_characters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN stories ON stories.id = scenes.story_id 
      WHERE scenes.id = scene_characters.scene_id AND stories.user_id = auth.uid()
    )
  );

-- RLS Policies for audio_tracks
CREATE POLICY "Users can view audio_tracks from own stories" ON audio_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN stories ON stories.id = scenes.story_id 
      WHERE scenes.id = audio_tracks.scene_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create audio_tracks for own stories" ON audio_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN stories ON stories.id = scenes.story_id 
      WHERE scenes.id = audio_tracks.scene_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update audio_tracks from own stories" ON audio_tracks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN stories ON stories.id = scenes.story_id 
      WHERE scenes.id = audio_tracks.scene_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete audio_tracks from own stories" ON audio_tracks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM scenes 
      JOIN stories ON stories.id = scenes.story_id 
      WHERE scenes.id = audio_tracks.scene_id AND stories.user_id = auth.uid()
    )
  );

-- RLS Policies for video_exports
CREATE POLICY "Users can view own video_exports" ON video_exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own video_exports" ON video_exports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video_exports" ON video_exports
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for templates
CREATE POLICY "Public templates are viewable by all" ON templates
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON templates
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create user_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

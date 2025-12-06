-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('character-images', 'character-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('scene-backgrounds', 'scene-backgrounds', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('audio-tracks', 'audio-tracks', true, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']::text[]),
  ('video-exports', 'video-exports', true, 524288000, ARRAY['video/mp4', 'video/webm']::text[]),
  ('sprite-sheets', 'sprite-sheets', true, 10485760, ARRAY['image/png', 'image/webp']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for character-images
CREATE POLICY "Users can upload character images for own stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'character-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Character images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-images');

CREATE POLICY "Users can update own character images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'character-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own character images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'character-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for scene-backgrounds
CREATE POLICY "Users can upload scene backgrounds for own stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'scene-backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Scene backgrounds are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'scene-backgrounds');

CREATE POLICY "Users can update own scene backgrounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'scene-backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own scene backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'scene-backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for audio-tracks
CREATE POLICY "Users can upload audio tracks for own stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-tracks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Audio tracks are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-tracks');

CREATE POLICY "Users can update own audio tracks"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audio-tracks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own audio tracks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-tracks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for video-exports
CREATE POLICY "Users can upload video exports for own stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'video-exports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Video exports are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'video-exports');

CREATE POLICY "Users can update own video exports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'video-exports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own video exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'video-exports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for sprite-sheets
CREATE POLICY "Users can upload sprite sheets for own stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sprite-sheets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sprite sheets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'sprite-sheets');

CREATE POLICY "Users can update own sprite sheets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'sprite-sheets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own sprite sheets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'sprite-sheets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

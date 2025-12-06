'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import SceneCarousel from '@/components/animation/scene-carousel';
import { getFFmpegGenerator, type VideoGenerationProgress } from '@/lib/video/ffmpeg-generator';
import type { AnimationScene } from '@/lib/types/animation';
import { 
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Download,
  Loader2,
  Volume2,
  VolumeX,
  Film
} from 'lucide-react';

type Story = Database['public']['Tables']['stories']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];
type Scene = Database['public']['Tables']['scenes']['Row'];

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [story, setStory] = useState<Story | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [animationScenes, setAnimationScenes] = useState<AnimationScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<VideoGenerationProgress | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setIsLoading(true);
    console.log('Loading preview data for story:', id);

    // Load story
    const { data: storyData } = await supabase
      .from('stories')
      .select('*')
      .eq('id', id)
      .single();

    if (!storyData) {
      console.error('Story not found');
      setIsLoading(false);
      return;
    }

    console.log('Story loaded:', storyData.title);
    setStory(storyData);

    // Load characters
    const { data: charactersData } = await supabase
      .from('characters')
      .select('*')
      .eq('story_id', id);

    if (charactersData) {
      console.log('Characters loaded:', charactersData.length);
      setCharacters(charactersData);
    }

    // Load scenes
    const { data: scenesData } = await supabase
      .from('scenes')
      .select('*')
      .eq('story_id', id)
      .order('scene_number');

    if (scenesData) {
      console.log('Scenes loaded:', scenesData.length);
      setScenes(scenesData);
      convertToAnimationScenes(scenesData, charactersData || []);
    }

    setIsLoading(false);
  };

  const convertToAnimationScenes = (sceneList: Scene[], characterList: Character[]) => {
    const converted: AnimationScene[] = sceneList.map((scene) => ({
      title: scene.title || `Scene ${scene.scene_number}`,
      backgroundUrl: scene.background_url || '',
      duration: scene.duration || 5,
      audioUrl: undefined, // Can add TTS narration later
    }));

    setAnimationScenes(converted);
    console.log('Animation scenes prepared:', converted.length, 'scenes');
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleExport = async () => {
    if (!story || scenes.length === 0) return;

    setIsExporting(true);
    setExportProgress({
      stage: 'loading',
      progress: 0,
      message: 'Preparing to generate video...',
    });

    try {
      const generator = getFFmpegGenerator();

      // Prepare scene data for FFmpeg
      const videoScenes = scenes.map(scene => ({
        imageUrl: scene.background_url || '',
        duration: scene.duration || 5,
        audioUrl: undefined, // Will add audio in next step
      }));

      console.log('Generating video with FFmpeg:', videoScenes.length, 'scenes');

      // Generate video
      const videoBlob = await generator.generateVideo(
        videoScenes,
        {
          width: 1280,
          height: 720,
          fps: 30,
        },
        (progress) => {
          setExportProgress(progress);
        }
      );

      console.log('Video generated:', videoBlob.size, 'bytes');

      // Upload to Supabase Storage
      setExportProgress({
        stage: 'finalizing',
        progress: 95,
        message: 'Uploading video...',
      });

      const fileName = `${story.id}_${Date.now()}.mp4`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('video-exports')
        .upload(fileName, videoBlob, {
          contentType: 'video/mp4',
          cacheControl: '3600',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('video-exports')
        .getPublicUrl(fileName);

      // Save to database
      await supabase.from('video_exports').insert({
        story_id: story.id,
        video_url: publicUrl,
        duration: scenes.reduce((sum, s) => sum + (s.duration || 5), 0),
        resolution: '1280x720',
        status: 'completed',
      });

      setExportProgress({
        stage: 'complete',
        progress: 100,
        message: 'Video exported successfully!',
      });

      // Download the video
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story.title.replace(/\s+/g, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(null);
      }, 2000);
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress({
        stage: 'loading',
        progress: 0,
        message: 'Failed to generate video. Please try again.',
      });
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(null);
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="mb-4">Story not found</p>
          <Button onClick={() => router.push('/protected')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Check if story is ready for preview
  const hasCharacterImages = characters.every(c => c.image_url);
  const hasSceneBackgrounds = scenes.every(s => s.background_url);
  const isReady = hasCharacterImages && hasSceneBackgrounds && animationScenes.length > 0;

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/protected/story/${id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Editor
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{story.title}</h1>
              <p className="text-sm text-muted-foreground">
                {animationScenes.length} {animationScenes.length === 1 ? 'scene' : 'scenes'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge>{story.style}</Badge>
            <Badge variant={isReady ? 'default' : 'secondary'}>
              {isReady ? 'Ready' : 'Incomplete'}
            </Badge>
          </div>
        </div>

        {!isReady && (
          <Card className="mb-6 border-yellow-500">
            <CardHeader>
              <CardTitle className="text-yellow-600">Story Not Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {!hasCharacterImages && (
                  <li>Some characters are missing images</li>
                )}
                {!hasSceneBackgrounds && (
                  <li>Some scenes are missing backgrounds</li>
                )}
                {animationScenes.length === 0 && (
                  <li>No scenes available for animation</li>
                )}
              </ul>
              <Button
                className="mt-4"
                onClick={() => router.push(`/protected/story/${id}`)}
              >
                Go to Editor
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Animation Player */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="relative rounded-t-lg overflow-hidden">
              {animationScenes.length > 0 ? (
                <SceneCarousel
                  scenes={animationScenes}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  className="w-full"
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-gray-900 text-white">
                  <div className="text-center">
                    <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Preview unavailable</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {isLoading ? 'Loading...' : 'No scenes'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Export Controls */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Use the controls below to preview your story. When ready, export to video.
                </p>

                <Button
                  onClick={handleExport}
                  disabled={animationScenes.length === 0 || isExporting}
                  size="lg"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Export Video
                    </>
                  )}
                </Button>
              </div>

              {/* Export Progress */}
              {exportProgress && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{exportProgress.message}</span>
                    <span className="text-sm text-muted-foreground">{exportProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Story Details */}
        <Card>
          <CardHeader>
            <CardTitle>Story Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Characters</h3>
                <div className="flex flex-wrap gap-2">
                  {characters.map((char) => (
                    <Badge key={char.id} variant="outline">
                      {char.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Scenes</h3>
                <p className="text-sm text-muted-foreground">
                  {scenes.length} scenes • Total duration: {scenes.reduce((sum, s) => sum + (s.duration || 0), 0)}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

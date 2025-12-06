'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Plus, 
  Download,
  Loader2,
  Image as ImageIcon,
  Music,
  Film
} from 'lucide-react';
import { generateCharacterAction, generateSceneBackgroundAction } from '@/app/actions/ai-actions';

type Story = Database['public']['Tables']['stories']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];
type Scene = Database['public']['Tables']['scenes']['Row'];

export default function StoryEditorPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);
  
  const [story, setStory] = useState<Story | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingCharacters, setGeneratingCharacters] = useState(false);
  const [generatingBackgrounds, setGeneratingBackgrounds] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadStoryData();
  }, [id]);

  const loadStoryData = async () => {
    setIsLoading(true);

    // Load story
    const { data: storyData } = await supabase
      .from('stories')
      .select('*')
      .eq('id', id)
      .single();

    if (storyData) {
      setStory(storyData);

      // Parse script to check if we need to generate scenes
      let scriptData: any = null;
      if (storyData.script) {
        scriptData = JSON.parse(storyData.script);
        
        // Check if scenes exist
        const { data: scenesData } = await supabase
          .from('scenes')
          .select('*')
          .eq('story_id', id)
          .order('scene_number');

        if (!scenesData || scenesData.length === 0) {
          // Create scenes from script
          await createScenesFromScript(id, scriptData);
        } else {
          setScenes(scenesData);
        }
      }

      // Load characters
      const { data: charactersData } = await supabase
        .from('characters')
        .select('*')
        .eq('story_id', id);

      if (charactersData) {
        setCharacters(charactersData);

        // Check if we need to generate character images
        if (scriptData && scriptData.characters && charactersData.length === 0) {
          await generateAllCharacters(id, scriptData.characters);
        }
      }
    }

    setIsLoading(false);
  };

  const createScenesFromScript = async (storyId: string, scriptData: any) => {
    const scenesData = scriptData.scenes.map((scene: any, index: number) => ({
      story_id: storyId,
      scene_number: index + 1,
      title: scene.title || `Scene ${index + 1}`,
      script_text: scene.narration || '',
      background_description: scene.setting,
      duration: 5.0,
    }));

    const { data } = await supabase
      .from('scenes')
      .insert(scenesData)
      .select();

    if (data) {
      setScenes(data);
    }
  };

  const generateAllCharacters = async (storyId: string, charactersData: any[]) => {
    setGeneratingCharacters(true);

    for (const charData of charactersData) {
      await generateCharacterAction(storyId, {
        name: charData.name,
        description: charData.description,
        style: story?.style as any || 'cartoon',
      });
    }

    setGeneratingCharacters(false);
    loadStoryData();
  };

  const generateAllBackgrounds = async () => {
    if (!story) return;

    setGeneratingBackgrounds(true);

    try {
      for (const scene of scenes) {
        if (!scene.background_url && scene.background_description) {
          await generateSceneBackgroundAction(scene.id, {
            description: scene.background_description,
            style: story.style as any,
          });
        }
      }
      await loadStoryData();
    } catch (error) {
      console.error('Error generating backgrounds:', error);
      alert('Failed to generate backgrounds. Please try again.');
    } finally {
      setGeneratingBackgrounds(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!confirm('Are you sure you want to delete this story? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      router.push('/protected');
    } catch (error) {
      console.error('Error deleting story:', error);
      alert('Failed to delete story. Please try again.');
    }
  };

  const handlePreviewAnimation = () => {
    router.push(`/protected/story/${id}/preview`);
  };

  const handleGenerateAudio = async () => {
    // TODO: Implement audio generation
    alert('Audio generation coming soon! This will generate narration and dialogue for all scenes.');
  };

  const handleExportVideo = async () => {
    // TODO: Implement video export
    alert('Video export coming soon! This will render your story as a video file.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'generating': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'rendering': return 'bg-yellow-500';
      case 'completed': return 'bg-purple-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
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
        <p>Story not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
            <p className="text-muted-foreground">{story.description}</p>
            <div className="flex gap-2 mt-2">
              <Badge className={getStatusColor(story.status)}>{story.status}</Badge>
              <Badge variant="outline">{story.style}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/protected/story/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteStory}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={generateAllBackgrounds}
              disabled={generatingBackgrounds || scenes.every(s => s.background_url)}
            >
              {generatingBackgrounds ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4 mr-2" />
              )}
              Generate All Backgrounds
            </Button>
            <Button variant="outline" onClick={handleGenerateAudio}>
              <Music className="w-4 h-4 mr-2" />
              Generate Audio
            </Button>
            <Button variant="outline" onClick={handlePreviewAnimation}>
              <Film className="w-4 h-4 mr-2" />
              Preview Animation
            </Button>
            <Button variant="outline" onClick={handleExportVideo}>
              <Download className="w-4 h-4 mr-2" />
              Export Video
            </Button>
          </CardContent>
        </Card>

        {/* Characters Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Characters ({characters.length})</CardTitle>
            <CardDescription>
              {generatingCharacters ? 'Generating character images...' : 'Characters in this story'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {characters.map((character) => (
                <div key={character.id} className="space-y-2">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    {character.image_url ? (
                      <img
                        src={character.image_url}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{character.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {character.description}
                    </p>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="aspect-square"
                onClick={() => alert('Add character functionality coming soon!')}
              >
                <Plus className="w-8 h-8" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scenes Section */}
        <Card>
          <CardHeader>
            <CardTitle>Scenes ({scenes.length})</CardTitle>
            <CardDescription>Edit and arrange your story scenes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scenes.map((scene, index) => (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex gap-4">
                    <div className="w-32 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                      {scene.background_url ? (
                        <img
                          src={scene.background_url}
                          alt={scene.title || `Scene ${scene.scene_number}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No BG
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">
                            Scene {scene.scene_number}: {scene.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {scene.background_description}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => alert('Scene editor coming soon!')}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => alert('Scene preview coming soon!')}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{scene.script_text}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{scene.duration}s</Badge>
                        <Badge variant="outline">{scene.transition_type}</Badge>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

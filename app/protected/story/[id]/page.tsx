"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";
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
  Film,
  Volume2,
} from "lucide-react";
import {
  generateCharacterAction,
  generateSceneBackgroundAction,
  generateSceneAudioAction,
} from "@/app/actions/ai-actions";
import { toast } from "sonner";

type Story = Database["public"]["Tables"]["stories"]["Row"];
type Character = Database["public"]["Tables"]["characters"]["Row"];
type Scene = Database["public"]["Tables"]["scenes"]["Row"];
type StoryStyle = "cartoon" | "anime" | "realistic" | "comic";

export default function StoryEditorPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);

  const [story, setStory] = useState<Story | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingCharacters, setGeneratingCharacters] = useState(false);
  const [generatingBackgrounds, setGeneratingBackgrounds] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState({ current: 0, total: 0 });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; description: string; style: StoryStyle }>({
    title: "",
    description: "",
    style: "cartoon",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadStoryData();
  }, [id]);

  useEffect(() => {
    if (story) {
      setEditForm({
        title: story.title,
        description: story.description || "",
        style: story.style,
      });
    }
  }, [story]);

  const loadStoryData = async () => {
    setIsLoading(true);

    // Load story
    const { data: storyData } = await supabase.from("stories").select("*").eq("id", id).single();

    if (storyData) {
      setStory(storyData);

      // Parse script to check if we need to generate scenes
      let scriptData: any = null;
      if (storyData.script) {
        scriptData = JSON.parse(storyData.script);

        // Check if scenes exist
        const { data: scenesData } = await supabase.from("scenes").select("*").eq("story_id", id).order("scene_number");

        if (!scenesData || scenesData.length === 0) {
          // Create scenes from script
          await createScenesFromScript(id, scriptData);
        } else {
          setScenes(scenesData);
        }
      }

      // Load characters
      const { data: charactersData } = await supabase.from("characters").select("*").eq("story_id", id);

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
      script_text: scene.narration || "",
      background_description: scene.setting,
      duration: 5.0,
    }));

    const { data } = await supabase.from("scenes").insert(scenesData).select();

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
        style: (story?.style as any) || "cartoon",
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
      toast.success("Backgrounds generated successfully");
    } catch (error) {
      console.error("Error generating backgrounds:", error);
      toast.error("Failed to generate backgrounds. Please try again.");
    } finally {
      setGeneratingBackgrounds(false);
    }
  };

  const handleSaveStory = async () => {
    if (!story) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("stories")
        .update({
          title: editForm.title,
          description: editForm.description,
          style: editForm.style,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Reload story data
      await loadStoryData();
      setIsEditDialogOpen(false);
      toast.success("Story updated successfully");
    } catch (error) {
      console.error("Error updating story:", error);
      toast.error("Failed to update story");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("stories").delete().eq("id", id);

      if (error) throw error;

      toast.success("Story deleted successfully");
      router.push("/protected");
    } catch (error) {
      console.error("Error deleting story:", error);
      toast.error("Failed to delete story. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePreviewAnimation = () => {
    router.push(`/protected/story/${id}/preview`);
  };

  const handleGenerateAudio = async () => {
    if (!story || scenes.length === 0) return;

    setGeneratingAudio(true);
    setAudioProgress({ current: 0, total: scenes.length });

    try {
      // Delete existing audio tracks for these scenes
      const sceneIds = scenes.map((s) => s.id);
      const { error: deleteError } = await supabase.from("audio_tracks").delete().in("scene_id", sceneIds);

      if (deleteError) {
        console.warn("Failed to delete old audio tracks:", deleteError);
      }

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        setAudioProgress({ current: i + 1, total: scenes.length });

        // Use script_text as the narration text
        const text = scene.script_text || `Scene ${scene.scene_number}`;

        if (!text.trim()) continue;

        console.log(`Generating audio for scene ${scene.scene_number}:`, text);

        try {
          // Generate speech using ElevenLabs (server-side)
          const result = await generateSceneAudioAction(scene.id);

          if (!result.success) {
            throw new Error(result.error || "Failed to generate audio");
          }

          console.log(`Audio generated for scene ${scene.scene_number}: ${result.duration?.toFixed(2)}s`);
        } catch (error) {
          console.error(`Error generating audio for scene ${scene.scene_number}:`, error);
          // Continue with next scene even if one fails
        }
      }

      toast.success(`Audio generation complete! Generated narration for ${scenes.length} scenes.`);
      loadStoryData(); // Reload to show audio indicators
    } catch (error) {
      console.error("Error generating audio:", error);
      toast.error("Failed to generate audio. Please try again.");
    } finally {
      setGeneratingAudio(false);
      setAudioProgress({ current: 0, total: 0 });
    }
  };

  const handleExportVideo = async () => {
    // TODO: Implement video export
    toast.info("Video export coming soon! This will render your story as a video file.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "generating":
        return "bg-blue-500";
      case "ready":
        return "bg-green-500";
      case "rendering":
        return "bg-yellow-500";
      case "completed":
        return "bg-purple-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
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
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Story Details</DialogTitle>
                  <DialogDescription>Update your story's title, description, and visual style.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Enter story title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Enter story description"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="style">Visual Style</Label>
                    <Select
                      value={editForm.style}
                      onValueChange={(value) => setEditForm({ ...editForm, style: value as StoryStyle })}
                    >
                      <SelectTrigger id="style">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="anime">Anime</SelectItem>
                        <SelectItem value="realistic">Realistic</SelectItem>
                        <SelectItem value="comic">Comic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveStory} disabled={isSaving || !editForm.title.trim()}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your story and all associated characters,
                    scenes, and media.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteStory}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Story"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
              disabled={generatingBackgrounds || scenes.every((s) => s.background_url)}
            >
              {generatingBackgrounds ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4 mr-2" />
              )}
              Generate All Backgrounds
            </Button>
            <Button variant="outline" onClick={handleGenerateAudio} disabled={generatingAudio}>
              {generatingAudio ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating ({audioProgress.current}/{audioProgress.total})
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Generate Audio
                </>
              )}
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
              {generatingCharacters ? "Generating character images..." : "Characters in this story"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {characters.map((character) => (
                <div key={character.id} className="space-y-2">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    {character.image_url ? (
                      <img src={character.image_url} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{character.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{character.description}</p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="aspect-square"
                onClick={() => toast.info("Add character functionality coming soon!")}
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
                          <p className="text-sm text-muted-foreground">{scene.background_description}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toast.info("Scene editor coming soon!")}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toast.info("Scene preview coming soon!")}>
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

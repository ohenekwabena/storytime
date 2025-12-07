"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";
import { generateSceneBackgroundAction } from "@/app/actions/ai-actions";
import { toast } from "sonner";

type Scene = Database["public"]["Tables"]["scenes"]["Row"];
type TransitionType = "fade" | "slide" | "zoom" | "none";

interface SceneEditorDialogProps {
  scene: Scene | null;
  storyId: string;
  storyStyle: "cartoon" | "anime" | "realistic" | "comic";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function SceneEditorDialog({ scene, storyId, storyStyle, open, onOpenChange, onSave }: SceneEditorDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    script_text: "",
    background_description: "",
    duration: 5.0,
    transition_type: "fade" as TransitionType,
  });

  const supabase = createClient();

  useEffect(() => {
    if (scene) {
      setFormData({
        title: scene.title || "",
        script_text: scene.script_text || "",
        background_description: scene.background_description || "",
        duration: scene.duration || 5.0,
        transition_type: scene.transition_type || "fade",
      });
    }
  }, [scene]);

  const handleGenerateBackground = async () => {
    if (!scene || !formData.background_description.trim()) {
      toast.error("Please enter a background description first");
      return;
    }

    setIsGeneratingBackground(true);
    try {
      await generateSceneBackgroundAction(scene.id, {
        description: formData.background_description,
        style: storyStyle,
      });
      toast.success("Background generated successfully");
      onSave(); // Refresh the scene data
    } catch (error) {
      console.error("Error generating background:", error);
      toast.error("Failed to generate background");
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const handleSave = async () => {
    if (!scene) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("scenes")
        .update({
          title: formData.title,
          script_text: formData.script_text,
          background_description: formData.background_description,
          duration: formData.duration,
          transition_type: formData.transition_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scene.id);

      if (error) throw error;

      toast.success("Scene updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating scene:", error);
      toast.error("Failed to update scene");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scene {scene?.scene_number}</DialogTitle>
          <DialogDescription>Update the scene details, narration, and background settings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Scene Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter scene title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="script">Narration / Script</Label>
            <Textarea
              id="script"
              value={formData.script_text}
              onChange={(e) => setFormData({ ...formData, script_text: e.target.value })}
              placeholder="Enter scene narration or dialogue"
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="background">Background Description</Label>
            <div className="flex gap-2">
              <Textarea
                id="background"
                value={formData.background_description}
                onChange={(e) => setFormData({ ...formData, background_description: e.target.value })}
                placeholder="Describe the scene background (e.g., 'A sunny beach with palm trees')"
                rows={3}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateBackground}
                disabled={isGeneratingBackground || !formData.background_description.trim()}
                title="Generate background image"
              >
                {isGeneratingBackground ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
            {scene?.background_url && (
              <div className="mt-2">
                <img
                  src={scene.background_url}
                  alt="Scene background"
                  className="w-full h-32 object-cover rounded border"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="30"
                step="0.5"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) || 5.0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transition">Transition Type</Label>
              <Select
                value={formData.transition_type}
                onValueChange={(value) => setFormData({ ...formData, transition_type: value as TransitionType })}
              >
                <SelectTrigger id="transition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !formData.script_text.trim()}>
            {isLoading ? (
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
  );
}

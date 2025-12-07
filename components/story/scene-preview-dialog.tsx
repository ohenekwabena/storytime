"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";
import { motion, AnimatePresence } from "framer-motion";

type Scene = Database["public"]["Tables"]["scenes"]["Row"];
type Character = Database["public"]["Tables"]["characters"]["Row"];

interface ScenePreviewDialogProps {
  scene: Scene | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SceneCharacter {
  character: Character;
  position: { x: number; y: number };
  scale: number;
  z_index: number;
}

export function ScenePreviewDialog({ scene, open, onOpenChange }: ScenePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sceneCharacters, setSceneCharacters] = useState<SceneCharacter[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (scene && open) {
      loadSceneData();
    } else {
      // Reset state when dialog closes
      resetPreview();
    }
  }, [scene, open]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (audioRef.current) {
        // Wait for play promise before pausing
        if (playPromiseRef.current) {
          playPromiseRef.current
            .then(() => {
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }
            })
            .catch(() => {
              // Ignore errors during cleanup
            });
        } else if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
    };
  }, []);

  const loadSceneData = async () => {
    if (!scene) return;

    setIsLoading(true);
    try {
      // Load scene characters with their details
      const { data: sceneCharsData } = await supabase
        .from("scene_characters")
        .select("*, characters(*)")
        .eq("scene_id", scene.id)
        .order("z_index");

      if (sceneCharsData) {
        const chars: SceneCharacter[] = sceneCharsData.map((sc: any) => ({
          character: sc.characters,
          position: sc.position || { x: 50, y: 50 },
          scale: sc.scale || 1.0,
          z_index: sc.z_index || 0,
        }));
        setSceneCharacters(chars);
      }

      // Load audio track
      const { data: audioData } = await supabase
        .from("audio_tracks")
        .select("*")
        .eq("scene_id", scene.id)
        .eq("track_type", "narration")
        .single();

      if (audioData?.audio_url) {
        setAudioUrl(audioData.audio_url);
      }
    } catch (error) {
      console.error("Error loading scene data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pausePreview();
    } else {
      playPreview();
    }
  };

  const playPreview = () => {
    setIsPlaying(true);
    setProgress(0);

    // Play audio if available
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0;
      playPromiseRef.current = audioRef.current.play().catch((error) => {
        if (error.name !== "AbortError") {
          console.warn("Audio playback failed:", error);
        }
      });
    }

    // Animate progress bar
    const duration = scene?.duration || 5;
    const interval = 50; // Update every 50ms
    const increment = (interval / 1000 / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          pausePreview();
          return 100;
        }
        return next;
      });
    }, interval);
  };

  const pausePreview = () => {
    setIsPlaying(false);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (audioRef.current && playPromiseRef.current) {
      // Wait for play promise to resolve before pausing
      playPromiseRef.current
        .then(() => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
        })
        .catch(() => {
          // Ignore - play was interrupted
        });
      playPromiseRef.current = null;
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const resetPreview = () => {
    pausePreview();
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const getTransitionVariants = () => {
    const type = scene?.transition_type || "fade";

    switch (type) {
      case "fade":
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
      case "slide":
        return {
          initial: { x: 100, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: -100, opacity: 0 },
        };
      case "zoom":
        return {
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 1.2, opacity: 0 },
        };
      default:
        return {
          initial: {},
          animate: {},
          exit: {},
        };
    }
  };

  if (!scene) return null;

  const variants = getTransitionVariants();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Scene Preview - {scene.title || `Scene ${scene.scene_number}`}</DialogTitle>
          <DialogDescription>Preview the animation and timing for this scene</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview Canvas */}
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              <AnimatePresence mode="wait">
                {scene.background_url && (
                  <motion.div
                    key="background"
                    className="absolute inset-0"
                    initial={variants.initial}
                    animate={variants.animate}
                    exit={variants.exit}
                    transition={{ duration: 0.5 }}
                  >
                    <img src={scene.background_url} alt="Scene background" className="w-full h-full object-cover" />
                  </motion.div>
                )}

                {/* Characters */}
                {sceneCharacters.map((sc, index) => (
                  <motion.div
                    key={sc.character.id}
                    className="absolute"
                    style={{
                      left: `${sc.position.x}%`,
                      top: `${sc.position.y}%`,
                      transform: `translate(-50%, -50%) scale(${sc.scale})`,
                      zIndex: sc.z_index,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    {sc.character.image_url && (
                      <img
                        src={sc.character.image_url}
                        alt={sc.character.name}
                        className="max-h-64 object-contain drop-shadow-xl"
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Script Text Overlay */}
              {scene.script_text && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-4"
                  initial={{ y: 100 }}
                  animate={{ y: isPlaying ? 0 : 100 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-white text-center text-sm md:text-base">{scene.script_text}</p>
                </motion.div>
              )}

              {/* No Content Warning */}
              {!scene.background_url && sceneCharacters.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <p className="text-lg">No preview available</p>
                    <p className="text-sm">Generate a background to see the preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button onClick={handlePlayPause} size="sm">
                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button onClick={resetPreview} variant="outline" size="sm" disabled={isPlaying}>
                  Reset
                </Button>
                {audioUrl && (
                  <Button onClick={() => setIsMuted(!isMuted)} variant="ghost" size="sm">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">{scene.duration}s</Badge>
                <Badge variant="outline">{scene.transition_type}</Badge>
                {audioUrl && <Badge variant="outline">Audio ✓</Badge>}
                {sceneCharacters.length > 0 && <Badge variant="outline">{sceneCharacters.length} character(s)</Badge>}
              </div>
            </div>

            {/* Scene Info */}
            <div className="text-sm text-muted-foreground space-y-1">
              {scene.background_description && (
                <p>
                  <strong>Background:</strong> {scene.background_description}
                </p>
              )}
              {sceneCharacters.length > 0 && (
                <p>
                  <strong>Characters:</strong> {sceneCharacters.map((sc) => sc.character.name).join(", ")}
                </p>
              )}
            </div>

            {/* Hidden Audio Element */}
            {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

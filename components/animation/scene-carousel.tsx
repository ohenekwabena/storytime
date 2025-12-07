"use client";

import { useState, useEffect, useRef } from "react";
import { AnimationScene } from "@/lib/types/animation";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface SceneCarouselProps {
  scenes: AnimationScene[];
  isPlaying: boolean;
  onPlayPause: () => void;
  className?: string;
}

export default function SceneCarousel({ scenes, isPlaying, onPlayPause, className = "" }: SceneCarouselProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const currentScene = scenes[currentSceneIndex];
  const totalScenes = scenes.length;

  // Play audio when scene changes or play state changes
  useEffect(() => {
    // Cleanup previous audio
    const cleanupAudio = async () => {
      if (audioRef.current) {
        // Wait for any pending play promise to resolve
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch (e) {
            // Ignore - play was interrupted
          }
          playPromiseRef.current = null;
        }
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };

    if (isPlaying && currentScene?.audioUrl) {
      console.log(`Playing audio for scene ${currentSceneIndex + 1}:`, currentScene.audioUrl);
      const audio = new Audio(currentScene.audioUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        console.log(`Audio loaded, duration: ${audio.duration}s`);
      };

      audio.onended = () => {
        console.log("Audio playback ended");
      };

      // Store the play promise and handle it properly
      playPromiseRef.current = audio.play().catch((error) => {
        if (error.name !== "AbortError") {
          console.warn("Audio playback failed:", error);
        }
      });
    } else if (isPlaying && !currentScene?.audioUrl) {
      console.log(`Scene ${currentSceneIndex + 1} has no audio`);
      cleanupAudio();
    } else {
      cleanupAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [currentSceneIndex, isPlaying, currentScene?.audioUrl]);

  // Auto-advance to next scene based on duration
  useEffect(() => {
    if (!isPlaying || !currentScene) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now();
    setProgress(0);

    console.log(`Scene ${currentSceneIndex + 1} started, duration: ${currentScene.duration}s`);

    // Update progress bar every 50ms
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const duration = currentScene.duration * 1000;
      const newProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(newProgress);

      // Move to next scene when current scene finishes
      if (elapsed >= duration) {
        console.log(`Scene ${currentSceneIndex + 1} complete`);
        if (currentSceneIndex < totalScenes - 1) {
          setCurrentSceneIndex((prev) => prev + 1);
        } else {
          // Reached the end - stop playing
          console.log("All scenes complete, stopping playback");
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onPlayPause(); // Stop at end
        }
      }
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentSceneIndex, currentScene, totalScenes, onPlayPause]);

  const goToScene = (index: number) => {
    if (index >= 0 && index < totalScenes) {
      setCurrentSceneIndex(index);
      setProgress(0);
    }
  };

  const previousScene = () => {
    goToScene(currentSceneIndex - 1);
  };

  const nextScene = () => {
    goToScene(currentSceneIndex + 1);
  };

  if (!currentScene) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`}>
        <p className="text-gray-400">No scenes available</p>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Scene Image */}
      <div className="relative w-full aspect-video">
        <img
          src={currentScene.backgroundUrl}
          alt={`Scene ${currentSceneIndex + 1}`}
          className="w-full h-full object-contain transition-opacity duration-300"
        />

        {/* Scene Info Overlay */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-md text-sm">
          Scene {currentSceneIndex + 1} of {totalScenes}
        </div>

        {/* Scene Title/Description */}
        {currentScene.title && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white px-4 py-2 rounded-md">
            <p className="font-medium">{currentScene.title}</p>
          </div>
        )}

        {/* Progress Bar */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
            <div
              className="h-full bg-blue-500 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={previousScene}
            disabled={currentSceneIndex === 0}
            className="text-white hover:bg-white/20"
          >
            <SkipBack className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={onPlayPause} className="text-white hover:bg-white/20 w-12 h-12">
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextScene}
            disabled={currentSceneIndex === totalScenes - 1}
            className="text-white hover:bg-white/20"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Scene Thumbnails */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {scenes.map((scene, index) => (
            <button
              key={index}
              onClick={() => goToScene(index)}
              className={`relative flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-all ${
                index === currentSceneIndex ? "border-blue-500 scale-110" : "border-transparent hover:border-gray-400"
              }`}
            >
              <img src={scene.backgroundUrl} alt={`Scene ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs">
                {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

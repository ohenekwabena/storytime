"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export interface VideoScene {
  imageUrl: string;
  duration: number;
  audioUrl?: string;
}

export interface VideoGenerationProgress {
  stage: "loading" | "preparing" | "encoding" | "finalizing" | "complete";
  progress: number; // 0-100
  message: string;
}

export class FFmpegVideoGenerator {
  private ffmpeg: FFmpeg;
  private loaded: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  /**
   * Load FFmpeg.wasm (only needs to be done once)
   */
  async load(onProgress?: (progress: VideoGenerationProgress) => void): Promise<void> {
    if (this.loaded) return;

    try {
      onProgress?.({
        stage: "loading",
        progress: 0,
        message: "Loading FFmpeg engine...",
      });

      // Load from CDN
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      this.loaded = true;

      onProgress?.({
        stage: "loading",
        progress: 100,
        message: "FFmpeg loaded successfully",
      });
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      throw new Error("Failed to load video encoder. Please try again.");
    }
  }

  /**
   * Generate video from scenes with images and audio
   */
  async generateVideo(
    scenes: VideoScene[],
    options: {
      width?: number;
      height?: number;
      fps?: number;
      backgroundColor?: string;
    } = {},
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.load(onProgress);
    }

    const { width = 1280, height = 720, fps = 30, backgroundColor = "black" } = options;

    try {
      onProgress?.({
        stage: "preparing",
        progress: 10,
        message: "Downloading scene images...",
      });

      // Download and write scene images
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const imageData = await fetchFile(scene.imageUrl);
        await this.ffmpeg.writeFile(`scene_${i}.png`, imageData);

        onProgress?.({
          stage: "preparing",
          progress: 10 + (i / scenes.length) * 30,
          message: `Loading scene ${i + 1} of ${scenes.length}...`,
        });
      }

      // Create concat file for scenes
      const concatContent = scenes
        .map((scene, i) => {
          const frameDuration = scene.duration * fps;
          return `file 'scene_${i}.png'\nduration ${scene.duration}`;
        })
        .join("\n");

      await this.ffmpeg.writeFile("concat.txt", concatContent);

      onProgress?.({
        stage: "encoding",
        progress: 50,
        message: "Generating video...",
      });

      // Create video from images
      await this.ffmpeg.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "concat.txt",
        "-vf",
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:${backgroundColor}`,
        "-r",
        String(fps),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "medium",
        "-crf",
        "23",
        "output_video.mp4",
      ]);

      // If we have audio files, process them
      const audioScenes = scenes.filter((s) => s.audioUrl);

      if (audioScenes.length > 0) {
        onProgress?.({
          stage: "encoding",
          progress: 70,
          message: "Adding audio tracks...",
        });

        // Download audio files
        for (let i = 0; i < audioScenes.length; i++) {
          const audioData = await fetchFile(audioScenes[i].audioUrl!);
          await this.ffmpeg.writeFile(`audio_${i}.mp3`, audioData);
        }

        // Combine audio files if multiple
        if (audioScenes.length === 1) {
          // Single audio track
          await this.ffmpeg.exec([
            "-i",
            "output_video.mp4",
            "-i",
            "audio_0.mp3",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-shortest",
            "final_output.mp4",
          ]);
        } else {
          // Multiple audio tracks - concat them first
          const audioConcat = audioScenes.map((_, i) => `file 'audio_${i}.mp3'`).join("\n");

          await this.ffmpeg.writeFile("audio_concat.txt", audioConcat);

          await this.ffmpeg.exec([
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            "audio_concat.txt",
            "-c:a",
            "aac",
            "combined_audio.mp3",
          ]);

          // Combine with video
          await this.ffmpeg.exec([
            "-i",
            "output_video.mp4",
            "-i",
            "combined_audio.mp3",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-shortest",
            "final_output.mp4",
          ]);
        }

        onProgress?.({
          stage: "finalizing",
          progress: 90,
          message: "Finalizing video...",
        });

        // Read the final output
        const data = await this.ffmpeg.readFile("final_output.mp4");
        const blob = new Blob([data as any], { type: "video/mp4" });

        onProgress?.({
          stage: "complete",
          progress: 100,
          message: "Video generated successfully!",
        });

        return blob;
      } else {
        // No audio, return video only
        onProgress?.({
          stage: "finalizing",
          progress: 90,
          message: "Finalizing video...",
        });

        const data = await this.ffmpeg.readFile("output_video.mp4");
        const blob = new Blob([data as any], { type: "video/mp4" });

        onProgress?.({
          stage: "complete",
          progress: 100,
          message: "Video generated successfully!",
        });

        return blob;
      }
    } catch (error) {
      console.error("Video generation error:", error);
      throw new Error("Failed to generate video. Please try again.");
    } finally {
      // Cleanup
      try {
        await this.cleanup();
      } catch (e) {
        console.warn("Cleanup error:", e);
      }
    }
  }

  /**
   * Simple version: Generate video from a single image per scene
   */
  async generateSimpleVideo(
    scenes: Array<{ imageUrl: string; duration: number }>,
    onProgress?: (progress: VideoGenerationProgress) => void
  ): Promise<Blob> {
    return this.generateVideo(scenes, {}, onProgress);
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(): Promise<void> {
    try {
      // FFmpeg.wasm will handle cleanup automatically
      // But we can explicitly delete files if needed
    } catch (error) {
      console.warn("Cleanup warning:", error);
    }
  }

  /**
   * Check if FFmpeg is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}

// Singleton instance
let generatorInstance: FFmpegVideoGenerator | null = null;

export function getFFmpegGenerator(): FFmpegVideoGenerator {
  if (!generatorInstance) {
    generatorInstance = new FFmpegVideoGenerator();
  }
  return generatorInstance;
}

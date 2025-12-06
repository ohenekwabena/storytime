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

      // Enable logging for debugging
      this.ffmpeg.on("log", ({ message }) => {
        console.log("FFmpeg:", message);
      });

      // Download and write scene images
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        try {
          const imageData = await fetchFile(scene.imageUrl);
          await this.ffmpeg.writeFile(`scene_${i}.png`, imageData);
          console.log(`Written scene_${i}.png (${imageData.byteLength} bytes)`);
        } catch (err) {
          console.error(`Failed to download scene ${i}:`, err);
          throw new Error(`Failed to load scene ${i + 1} image. Please ensure all images are generated.`);
        }

        onProgress?.({
          stage: "preparing",
          progress: 10 + (i / scenes.length) * 30,
          message: `Loading scene ${i + 1} of ${scenes.length}...`,
        });
      }

      onProgress?.({
        stage: "encoding",
        progress: 50,
        message: "Generating video...",
      });

      // Simple approach: create video from first image, then concat with others
      // This is more reliable than using concat demuxer
      const videoSegments: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const outputName = `segment_${i}.mp4`;

        console.log(`Creating segment ${i}: ${scene.duration}s`);

        try {
          // Create video segment from single image
          await this.ffmpeg.exec([
            "-loop",
            "1",
            "-i",
            `scene_${i}.png`,
            "-t",
            String(scene.duration),
            "-vf",
            `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:${backgroundColor}`,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-r",
            String(fps),
            "-preset",
            "ultrafast",
            "-crf",
            "23",
            outputName,
          ]);

          // Verify the segment was created
          const files = await this.ffmpeg.listDir("/");
          console.log("Files after segment creation:", files);

          videoSegments.push(outputName);
        } catch (segmentError) {
          console.error(`Failed to create segment ${i}:`, segmentError);
          throw new Error(`Failed to encode scene ${i + 1}. Check that the image was loaded correctly.`);
        }

        onProgress?.({
          stage: "encoding",
          progress: 50 + (i / scenes.length) * 20,
          message: `Encoding scene ${i + 1} of ${scenes.length}...`,
        });
      }

      // Create concat file for video segments
      let concatContent = "";
      for (const segment of videoSegments) {
        concatContent += `file '${segment}'\n`;
      }

      await this.ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatContent));
      console.log("Concat file content:", concatContent);

      // Concatenate video segments
      onProgress?.({
        stage: "encoding",
        progress: 70,
        message: "Combining scenes...",
      });

      try {
        await this.ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output_video.mp4"]);

        console.log("Video concatenation complete");
      } catch (concatError) {
        console.error("Concatenation failed:", concatError);
        throw new Error("Failed to combine video scenes. This may be due to codec incompatibilities.");
      }

      // If we have audio files, process them
      const audioScenes = scenes.filter((s) => s.audioUrl);

      if (audioScenes.length > 0) {
        onProgress?.({
          stage: "encoding",
          progress: 75,
          message: "Adding audio tracks...",
        });

        try {
          // Download audio files
          for (let i = 0; i < audioScenes.length; i++) {
            const audioData = await fetchFile(audioScenes[i].audioUrl!);
            await this.ffmpeg.writeFile(`audio_${i}.mp3`, audioData);
            console.log(`Downloaded audio ${i}: ${audioData.byteLength} bytes`);
          }

          if (audioScenes.length === 1) {
            // Single audio track - directly merge with video
            await this.ffmpeg.exec([
              "-i",
              "output_video.mp4",
              "-i",
              "audio_0.mp3",
              "-c:v",
              "copy",
              "-c:a",
              "aac",
              "-map",
              "0:v:0",
              "-map",
              "1:a:0",
              "-shortest",
              "final_output.mp4",
            ]);
            console.log("Single audio track merged");
          } else {
            // Multiple audio tracks - use filter_complex to concat
            const inputs = audioScenes.map((_, i) => ["-i", `audio_${i}.mp3`]).flat();
            const filterInput = audioScenes.map((_, i) => `[${i}:a]`).join("");
            const filterComplex = `${filterInput}concat=n=${audioScenes.length}:v=0:a=1[aout]`;

            await this.ffmpeg.exec([
              ...inputs,
              "-filter_complex",
              filterComplex,
              "-map",
              "[aout]",
              "combined_audio.aac",
            ]);

            console.log("Audio concatenated with filter_complex");

            // Combine with video
            await this.ffmpeg.exec([
              "-i",
              "output_video.mp4",
              "-i",
              "combined_audio.aac",
              "-c:v",
              "copy",
              "-c:a",
              "copy",
              "-map",
              "0:v:0",
              "-map",
              "1:a:0",
              "-shortest",
              "final_output.mp4",
            ]);

            console.log("Audio merged with video");
          }
        } catch (audioError) {
          console.error("Audio processing failed:", audioError);
          // If audio fails, just use video without audio
          console.warn("Continuing without audio due to error");

          // Copy video as final output
          const videoData = await this.ffmpeg.readFile("output_video.mp4");
          await this.ffmpeg.writeFile("final_output.mp4", videoData);
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
      if (error instanceof Error) {
        throw new Error(`Failed to generate video: ${error.message}`);
      }
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

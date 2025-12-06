"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateStory,
  generateCharacterImage,
  generateSceneBackground,
  parseStoryJSON,
  type StoryGenerationParams,
  type CharacterGenerationParams,
  type SceneGenerationParams,
} from "@/lib/ai/huggingface";
import { revalidatePath } from "next/cache";

export async function generateStoryAction(params: StoryGenerationParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Generate story using AI
    const storyResponse = await generateStory(params);
    const storyData = parseStoryJSON(storyResponse);

    // Create story in database
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .insert({
        user_id: user.id,
        title: storyData.title || "Untitled Story",
        description: params.prompt,
        script: JSON.stringify(storyData),
        style: params.style || "cartoon",
        status: "draft",
      })
      .select()
      .single();

    if (storyError) {
      return { error: storyError.message };
    }

    revalidatePath("/protected");
    return { story, storyData };
  } catch (error) {
    console.error("Error generating story:", error);
    return { error: error instanceof Error ? error.message : "Failed to generate story" };
  }
}

export async function generateCharacterAction(storyId: string, params: CharacterGenerationParams) {
  try {
    console.log("[generateCharacterAction] Starting with params:", params);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("[generateCharacterAction] No user found");
      return { error: "Unauthorized" };
    }

    console.log("[generateCharacterAction] User authenticated:", user.id);

    // Verify story ownership
    const { data: story } = await supabase.from("stories").select("user_id").eq("id", storyId).single();

    if (!story || story.user_id !== user.id) {
      console.error("[generateCharacterAction] Story not found or unauthorized");
      return { error: "Story not found or unauthorized" };
    }

    console.log("[generateCharacterAction] Story ownership verified");
    console.log("[generateCharacterAction] Calling generateCharacterImage...");

    // Generate character image
    const imageBlob = await generateCharacterImage(params);
    console.log("[generateCharacterAction] Image generated, blob size:", imageBlob.size);

    // Upload to Supabase Storage
    const fileName = `${user.id}/${storyId}/${params.name.replace(/\s+/g, "_")}_${Date.now()}.png`;
    console.log("[generateCharacterAction] Uploading to:", fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("character-images")
      .upload(fileName, imageBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("[generateCharacterAction] Upload error:", uploadError);
      return { error: `Upload failed: ${uploadError.message}` };
    }

    console.log("[generateCharacterAction] Image uploaded successfully");

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("character-images").getPublicUrl(fileName);

    console.log("[generateCharacterAction] Public URL:", publicUrl);

    // Create character in database
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .insert({
        story_id: storyId,
        name: params.name,
        description: params.description,
        appearance: JSON.stringify(params),
        image_url: publicUrl,
        voice_settings: {
          voiceProfile: params.gender === "male" ? "male_child" : "female_child",
        },
      })
      .select()
      .single();

    if (characterError) {
      console.error("[generateCharacterAction] Database error:", characterError);
      return { error: characterError.message };
    }

    console.log("[generateCharacterAction] Character saved to database:", character.id);

    revalidatePath(`/protected/story/${storyId}`);
    return { character };
  } catch (error) {
    console.error("[generateCharacterAction] Error:", error);
    return { error: error instanceof Error ? error.message : "Failed to generate character" };
  }
}

export async function generateSceneBackgroundAction(sceneId: string, params: SceneGenerationParams) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify scene ownership and get scene details
    const { data: scene } = await supabase
      .from("scenes")
      .select("story_id, background_description, stories!inner(user_id, style)")
      .eq("id", sceneId)
      .single();

    if (!scene || (scene.stories as any).user_id !== user.id) {
      return { error: "Scene not found or unauthorized" };
    }

    // Fetch all characters for this story
    const { data: storyCharacters } = await supabase
      .from("characters")
      .select("id, name, description")
      .eq("story_id", scene.story_id);

    // Fetch scene_characters to see which characters are in this scene
    const { data: sceneCharacters } = await supabase
      .from("scene_characters")
      .select("character_id, position")
      .eq("scene_id", sceneId);

    // Build character descriptions with positions
    const characters = (storyCharacters || [])
      .filter((char) => {
        // Include character if they're explicitly in scene_characters, or include all if none specified
        if (!sceneCharacters || sceneCharacters.length === 0) return true;
        return sceneCharacters.some((sc) => sc.character_id === char.id);
      })
      .map((char) => {
        const sceneChar = sceneCharacters?.find((sc) => sc.character_id === char.id);
        const position = sceneChar?.position as any;
        // Determine position from JSONB position data
        let positionLabel: "left" | "center" | "right" | "background" = "center";
        if (position?.x !== undefined) {
          if (position.x < 0.33) positionLabel = "left";
          else if (position.x > 0.66) positionLabel = "right";
          else positionLabel = "center";
        }
        return {
          name: char.name,
          description: char.description,
          position: positionLabel,
        };
      });

    // Generate background image with characters included
    const imageBlob = await generateSceneBackground({
      ...params,
      characters,
    });

    // Upload to Supabase Storage
    const fileName = `${user.id}/${scene.story_id}/scene_${sceneId}_${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("scene-backgrounds")
      .upload(fileName, imageBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("scene-backgrounds").getPublicUrl(fileName);

    // Update scene with background
    const { error: updateError } = await supabase
      .from("scenes")
      .update({
        background_url: publicUrl,
        background_description: params.description,
      })
      .eq("id", sceneId);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath(`/protected/story/${scene.story_id}`);
    return { backgroundUrl: publicUrl };
  } catch (error) {
    console.error("Error generating scene background:", error);
    return { error: error instanceof Error ? error.message : "Failed to generate background" };
  }
}

export async function createScenesFromStoryAction(storyId: string, storyData: any) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify story ownership
    const { data: story } = await supabase.from("stories").select("user_id").eq("id", storyId).single();

    if (!story || story.user_id !== user.id) {
      return { error: "Story not found or unauthorized" };
    }

    // Create scenes from story data
    const scenesData = storyData.scenes.map((scene: any, index: number) => ({
      story_id: storyId,
      scene_number: index + 1,
      title: scene.title || `Scene ${index + 1}`,
      script_text: scene.narration || "",
      background_description: scene.setting,
      duration: 5.0, // Default duration
      camera_settings: {},
      transition_type: "fade",
    }));

    const { data: scenes, error: scenesError } = await supabase.from("scenes").insert(scenesData).select();

    if (scenesError) {
      return { error: scenesError.message };
    }

    // Get all characters for this story
    const { data: characters } = await supabase.from("characters").select("id").eq("story_id", storyId);

    // Automatically add all characters to all scenes with default positioning
    if (scenes && characters && characters.length > 0) {
      const sceneCharactersData = scenes.flatMap((scene, sceneIndex) =>
        characters.map((char, charIndex) => {
          // Distribute characters across the scene (left, center, right)
          const totalChars = characters.length;
          const position = charIndex / Math.max(1, totalChars - 1); // 0 to 1

          return {
            scene_id: scene.id,
            character_id: char.id,
            position: { x: position, y: 0.7 }, // x: 0-1 (left-right), y: 0.7 (near bottom)
            scale: 1.0,
            z_index: charIndex,
          };
        })
      );

      await supabase.from("scene_characters").insert(sceneCharactersData);
    }

    revalidatePath(`/protected/story/${storyId}`);
    return { scenes };
  } catch (error) {
    console.error("Error creating scenes:", error);
    return { error: error instanceof Error ? error.message : "Failed to create scenes" };
  }
}

export async function generateSceneAudioAction(sceneId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get scene with text
    const { data: scene } = await supabase
      .from("scenes")
      .select("script_text, story_id, scene_number, duration, stories!inner(user_id)")
      .eq("id", sceneId)
      .single();

    if (!scene || (scene.stories as any).user_id !== user.id) {
      return { success: false, error: "Scene not found or unauthorized" };
    }

    const text = scene.script_text || `Scene ${scene.scene_number}`;

    if (!text.trim()) {
      return { success: false, error: "No text to narrate" };
    }

    // Generate audio using ElevenLabs
    const { generateSpeechElevenLabs } = await import("@/lib/audio/elevenlabs");
    const result = await generateSpeechElevenLabs(text);

    // Upload to storage
    const fileName = `${user.id}/${scene.story_id}/audio_${sceneId}_${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio-tracks")
      .upload(fileName, result.audioBlob, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("audio-tracks").getPublicUrl(fileName);

    // Save audio track record
    const { error: audioError } = await supabase.from("audio_tracks").insert({
      scene_id: sceneId,
      type: "narration",
      audio_url: publicUrl,
      transcript: result.transcript,
      start_time: 0,
      duration: result.duration,
    });

    if (audioError) {
      return { success: false, error: audioError.message };
    }

    // Update scene duration if audio is longer
    if (result.duration > scene.duration) {
      await supabase.from("scenes").update({ duration: result.duration }).eq("id", sceneId);
    }

    return {
      success: true,
      duration: result.duration,
      url: publicUrl,
    };
  } catch (error) {
    console.error("Error generating scene audio:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate scene audio",
    };
  }
}

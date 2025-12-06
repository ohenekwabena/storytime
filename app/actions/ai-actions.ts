'use server';

import { createClient } from '@/lib/supabase/server';
import {
  generateStory,
  generateCharacterImage,
  generateSceneBackground,
  parseStoryJSON,
  type StoryGenerationParams,
  type CharacterGenerationParams,
  type SceneGenerationParams,
} from '@/lib/ai/huggingface';
import { revalidatePath } from 'next/cache';

export async function generateStoryAction(params: StoryGenerationParams) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized' };
    }

    // Check user credits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.credits < 10) {
      return { error: 'Insufficient credits. Story generation requires 10 credits.' };
    }

    // Generate story using AI
    const storyResponse = await generateStory(params);
    const storyData = parseStoryJSON(storyResponse);

    // Create story in database
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        title: storyData.title || 'Untitled Story',
        description: params.prompt,
        script: JSON.stringify(storyData),
        style: params.style || 'cartoon',
        status: 'draft',
      })
      .select()
      .single();

    if (storyError) {
      return { error: storyError.message };
    }

    // Deduct credits
    await supabase
      .from('user_profiles')
      .update({ credits: profile.credits - 10 })
      .eq('user_id', user.id);

    revalidatePath('/protected');
    return { story, storyData };
  } catch (error) {
    console.error('Error generating story:', error);
    return { error: error instanceof Error ? error.message : 'Failed to generate story' };
  }
}

export async function generateCharacterAction(
  storyId: string,
  params: CharacterGenerationParams
) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized' };
    }

    // Verify story ownership
    const { data: story } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single();

    if (!story || story.user_id !== user.id) {
      return { error: 'Story not found or unauthorized' };
    }

    // Check user credits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.credits < 5) {
      return { error: 'Insufficient credits. Character generation requires 5 credits.' };
    }

    // Generate character image
    const imageBlob = await generateCharacterImage(params);

    // Upload to Supabase Storage
    const fileName = `${user.id}/${storyId}/${params.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('character-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('character-images').getPublicUrl(fileName);

    // Create character in database
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .insert({
        story_id: storyId,
        name: params.name,
        description: params.description,
        appearance: JSON.stringify(params),
        image_url: publicUrl,
        voice_settings: {
          voiceProfile: params.gender === 'male' ? 'male_child' : 'female_child',
        },
      })
      .select()
      .single();

    if (characterError) {
      return { error: characterError.message };
    }

    // Deduct credits
    await supabase
      .from('user_profiles')
      .update({ credits: profile.credits - 5 })
      .eq('user_id', user.id);

    revalidatePath(`/protected/story/${storyId}`);
    return { character };
  } catch (error) {
    console.error('Error generating character:', error);
    return { error: error instanceof Error ? error.message : 'Failed to generate character' };
  }
}

export async function generateSceneBackgroundAction(
  sceneId: string,
  params: SceneGenerationParams
) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized' };
    }

    // Verify scene ownership
    const { data: scene } = await supabase
      .from('scenes')
      .select('story_id, stories!inner(user_id)')
      .eq('id', sceneId)
      .single();

    if (!scene || (scene.stories as any).user_id !== user.id) {
      return { error: 'Scene not found or unauthorized' };
    }

    // Check user credits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.credits < 3) {
      return { error: 'Insufficient credits. Background generation requires 3 credits.' };
    }

    // Generate background image
    const imageBlob = await generateSceneBackground(params);

    // Upload to Supabase Storage
    const fileName = `${user.id}/${scene.story_id}/scene_${sceneId}_${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('scene-backgrounds')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('scene-backgrounds').getPublicUrl(fileName);

    // Update scene with background
    const { error: updateError } = await supabase
      .from('scenes')
      .update({
        background_url: publicUrl,
        background_description: params.description,
      })
      .eq('id', sceneId);

    if (updateError) {
      return { error: updateError.message };
    }

    // Deduct credits
    await supabase
      .from('user_profiles')
      .update({ credits: profile.credits - 3 })
      .eq('user_id', user.id);

    revalidatePath(`/protected/story/${scene.story_id}`);
    return { backgroundUrl: publicUrl };
  } catch (error) {
    console.error('Error generating scene background:', error);
    return { error: error instanceof Error ? error.message : 'Failed to generate background' };
  }
}

export async function createScenesFromStoryAction(storyId: string, storyData: any) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized' };
    }

    // Verify story ownership
    const { data: story } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single();

    if (!story || story.user_id !== user.id) {
      return { error: 'Story not found or unauthorized' };
    }

    // Create scenes from story data
    const scenesData = storyData.scenes.map((scene: any, index: number) => ({
      story_id: storyId,
      scene_number: index + 1,
      title: scene.title || `Scene ${index + 1}`,
      script_text: scene.narration || '',
      background_description: scene.setting,
      duration: 5.0, // Default duration
      camera_settings: {},
      transition_type: 'fade',
    }));

    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .insert(scenesData)
      .select();

    if (scenesError) {
      return { error: scenesError.message };
    }

    revalidatePath(`/protected/story/${storyId}`);
    return { scenes };
  } catch (error) {
    console.error('Error creating scenes:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create scenes' };
  }
}

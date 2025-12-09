import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. AI features will not work.");
}

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export interface StoryGenerationParams {
  prompt: string;
  style?: "cartoon" | "anime" | "realistic" | "comic";
  targetLength?: "short" | "medium" | "long";
  ageGroup?: "toddler" | "preschool" | "elementary";
}

export interface CharacterGenerationParams {
  name: string;
  description: string;
  style: "cartoon" | "anime" | "realistic" | "comic";
  age?: string;
  gender?: string;
  traits?: string[];
}

export interface SceneGenerationParams {
  description: string;
  style: "cartoon" | "anime" | "realistic" | "comic";
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  setting?: string;
  characters?: Array<{
    name: string;
    description: string;
    position?: "left" | "center" | "right" | "background";
  }>;
}

/**
 * Generate a story script using OpenAI's GPT models
 */
export async function generateStory(params: StoryGenerationParams): Promise<string> {
  if (!openai) throw new Error("OpenAI API not configured");

  const { prompt, style = "cartoon", targetLength = "short", ageGroup = "preschool" } = params;

  const lengthGuide = {
    short: { scenes: 3, description: "2-3 minutes" },
    medium: { scenes: 5, description: "4-6 minutes" },
    long: { scenes: 8, description: "7-10 minutes" },
  };

  const length = lengthGuide[targetLength];

  // System prompt to guide OpenAI
  const systemPrompt = `You are a creative children's story writer. Create engaging, age-appropriate stories with clear structure.
Always return your response as valid JSON with this exact structure:
{
  "title": "Story Title",
  "characters": [
    {
      "name": "Character Name",
      "description": "Physical description",
      "personality": "personality traits"
    }
  ],
  "scenes": [
    {
      "number": 1,
      "title": "Scene Title",
      "setting": "Description of location",
      "narration": "Narrative text for this scene",
      "dialogue": [
        {
          "character": "Character Name",
          "text": "What they say"
        }
      ],
      "actions": ["Action descriptions"]
    }
  ]
}`;

  const userPrompt = `Create a ${ageGroup} children's story in ${style} style about: ${prompt}

Requirements:
- Include exactly ${length.scenes} scenes
- Each scene should have narration, dialogue, and actions
- Create 2-4 memorable characters with UNIQUE, DISTINCT names (no duplicates)
- Each character must have a detailed physical description suitable for ${style} style artwork
- Make it engaging and age-appropriate for ${ageGroup} children
- Include a clear beginning, middle, and end
- Target duration: ${length.description}

IMPORTANT: Every character must have a completely unique name. No two characters should share the same name.

Return only valid JSON following the specified structure.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using GPT-4o-mini for cost efficiency, can use "gpt-4o" for better quality
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    // Validate that it's proper JSON
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch (error) {
    console.error("OpenAI generation failed:", error);
    throw error;
  }
}

/**
 * Generate a character image using DALL-E
 */
export async function generateCharacterImage(params: CharacterGenerationParams): Promise<Blob> {
  if (!openai) throw new Error("OpenAI API not configured");

  const { name, description, style, age, gender, traits } = params;

  // Build detailed prompt for DALL-E with emphasis on style
  const styleDescriptions = {
    cartoon: "vibrant cartoon style with bold outlines, exaggerated features, bright colors",
    anime: "anime/manga style with expressive eyes, cel-shaded coloring, dynamic poses",
    realistic: "realistic illustration style with detailed textures, natural proportions, lifelike colors",
    comic: "comic book style with strong ink lines, dramatic shading, action-oriented poses",
  };

  let prompt = `A ${styleDescriptions[style]} character illustration. Character name: ${name}. `;
  prompt += description;

  if (age) prompt += ` Age: ${age}.`;
  if (gender) prompt += ` Gender: ${gender}.`;
  if (traits && traits.length > 0) prompt += ` Personality traits: ${traits.join(", ")}.`;

  prompt += ` Clean white background, full body view, friendly appearance, suitable for children's content. Must be in ${style} art style.`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
      style: "vivid",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data returned from DALL-E");
    }

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No image URL returned from DALL-E");
    }

    // Fetch the image and convert to blob
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch generated image: ${imageResponse.statusText}`);
    }

    return await imageResponse.blob();
  } catch (error) {
    console.error("DALL-E generation failed:", error);
    throw error;
  }
}

/**
 * Generate a scene background using DALL-E
 */
export async function generateSceneBackground(params: SceneGenerationParams): Promise<Blob> {
  if (!openai) throw new Error("OpenAI API not configured");

  const { description, style, timeOfDay, setting, characters } = params;

  // Build detailed prompt for DALL-E with characters included
  const styleDescriptions = {
    cartoon: "vibrant cartoon style with bold outlines, bright cheerful colors",
    anime: "anime/manga style with cel-shaded coloring and expressive atmosphere",
    realistic: "realistic illustration style with detailed environment and natural lighting",
    comic: "comic book style with strong ink lines and dramatic composition",
  };

  let prompt = `A ${styleDescriptions[style]} scene for a children's story. `;
  prompt += description;

  if (setting) prompt += ` Setting: ${setting}.`;
  if (timeOfDay) prompt += ` Time of day: ${timeOfDay}.`;

  // Include characters in the scene
  if (characters && characters.length > 0) {
    prompt += ` Include these characters in the scene: `;
    characters.forEach((char, index) => {
      prompt += `${char.name} (${char.description})`;
      if (char.position) prompt += ` positioned ${char.position}`;
      if (index < characters.length - 1) prompt += ", ";
    });
    prompt += ".";
  }

  prompt += ` Vibrant colors, suitable for children's content, landscape composition. Must be in ${style} art style.`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024", // Landscape format for scenes
      quality: "standard",
      style: "vivid",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data returned from DALL-E");
    }

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No image URL returned from DALL-E");
    }

    // Fetch the image and convert to blob
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch generated image: ${imageResponse.statusText}`);
    }

    return await imageResponse.blob();
  } catch (error) {
    console.error("DALL-E generation failed:", error);
    throw error;
  }
}

/**
 * Parse story JSON with validation
 */
export function parseStoryJSON(jsonString: string): any {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate required fields
    if (!parsed.title || !parsed.characters || !parsed.scenes) {
      throw new Error("Invalid story structure");
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse story JSON:", error);
    throw new Error("Invalid story format returned");
  }
}

import { HfInference } from "@huggingface/inference";

if (!process.env.HUGGINGFACE_API_KEY) {
  console.warn("HUGGINGFACE_API_KEY is not set. AI features will not work.");
}

export const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;

// Free models we'll use
export const MODELS = {
  // Story generation - Using GPT-2 or Flan-T5 (both free and supported)
  STORY: "google/flan-t5-large", // Alternative: 'gpt2' or 'facebook/opt-350m'

  // Image generation - Stable Diffusion (free, but rate limited)
  IMAGE: "stabilityai/stable-diffusion-xl-base-1.0",

  // Text-to-speech - we'll use ElevenLabs or browser Web Speech API
  // Rhubarb for lip sync (local processing)
} as const;

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
 * Generate a story script using Flan-T5 or fallback to structured template
 */
export async function generateStory(params: StoryGenerationParams): Promise<string> {
  if (!hf) throw new Error("HuggingFace API not configured");

  const { prompt, style = "cartoon", targetLength = "short", ageGroup = "preschool" } = params;

  const lengthGuide = {
    short: { scenes: 3, description: "2-3 minutes" },
    medium: { scenes: 5, description: "4-6 minutes" },
    long: { scenes: 8, description: "7-10 minutes" },
  };

  const length = lengthGuide[targetLength];

  // Simplified prompt for text2text-generation models like Flan-T5
  const instructionPrompt = `Create a ${ageGroup} children's story in ${style} style about: ${prompt}. 
Include ${length.scenes} scenes with characters, settings, and dialogue. Make it simple and engaging.`;

  try {
    const response = await hf.textGeneration({
      model: MODELS.STORY,
      inputs: instructionPrompt,
      parameters: {
        max_new_tokens: 1500,
        temperature: 0.8,
        top_p: 0.9,
        return_full_text: false,
      },
    });

    // Convert free-form text to structured JSON
    const structuredStory = convertToStructuredStory(response.generated_text, prompt, length.scenes, style);

    return JSON.stringify(structuredStory);
  } catch (error) {
    console.error("AI generation failed, using template:", error);

    // Fallback: Generate a simple story structure from the prompt
    return JSON.stringify(generateTemplateStory(prompt, length.scenes, style, ageGroup));
  }
}

/**
 * Convert AI-generated text to structured story format
 */
function convertToStructuredStory(text: string, prompt: string, sceneCount: number, style: string): any {
  // Extract character names (simple heuristic)
  const characterMatches = text.match(/([A-Z][a-z]+)(?=\s+(?:was|is|said|went|saw))/g) || [];
  const uniqueCharacters = [...new Set(characterMatches)].slice(0, 3);

  // Split into scenes (rough approximation)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const sentencesPerScene = Math.max(2, Math.floor(sentences.length / sceneCount));

  const scenes = [];
  for (let i = 0; i < sceneCount && i * sentencesPerScene < sentences.length; i++) {
    const sceneText = sentences.slice(i * sentencesPerScene, (i + 1) * sentencesPerScene).join(". ") + ".";

    scenes.push({
      number: i + 1,
      title: `Scene ${i + 1}`,
      setting: i === 0 ? "Beginning" : i === sceneCount - 1 ? "Ending" : `Middle part ${i}`,
      narration: sceneText,
      dialogue: [],
      actions: [`Characters interact in scene ${i + 1}`],
    });
  }

  return {
    title: prompt.substring(0, 50),
    characters: uniqueCharacters.map((name) => ({
      name,
      description: `A character in the story`,
      personality: "friendly and curious",
    })),
    scenes,
  };
}

/**
 * Generate a template-based story when AI fails
 */
function generateTemplateStory(prompt: string, sceneCount: number, style: string, ageGroup: string): any {
  // Extract likely character from prompt
  const words = prompt.split(" ");
  const characterWord = words.find((w) => w.length > 3 && /^[A-Z]/.test(w)) || "Hero";

  const templates = {
    toddler: {
      intro: `Once upon a time, there was a little ${characterWord} who loved to explore.`,
      middle: `${characterWord} discovered something wonderful and made new friends.`,
      end: `Everyone was happy and ${characterWord} learned something new!`,
    },
    preschool: {
      intro: `In a magical place, ${characterWord} began an exciting adventure.`,
      middle: `${characterWord} faced a challenge but didn't give up.`,
      end: `With help from friends, ${characterWord} succeeded and everyone celebrated!`,
    },
    elementary: {
      intro: `${characterWord} lived in an interesting world and had a problem to solve.`,
      middle: `Through creativity and determination, ${characterWord} worked on a solution.`,
      end: `${characterWord} achieved their goal and learned an important lesson.`,
    },
  };

  const template = templates[ageGroup as keyof typeof templates];

  return {
    title: prompt.substring(0, 60).trim(),
    characters: [
      {
        name: characterWord,
        description: prompt,
        personality: "brave, curious, and kind",
      },
    ],
    scenes: [
      {
        number: 1,
        title: "Beginning",
        setting: "A peaceful starting location",
        narration: template.intro,
        dialogue: [],
        actions: [`${characterWord} looks around with curiosity`],
      },
      ...Array.from({ length: sceneCount - 2 }, (_, i) => ({
        number: i + 2,
        title: `Scene ${i + 2}`,
        setting: "An interesting place",
        narration: template.middle,
        dialogue: [{ character: characterWord, text: "I can do this!" }],
        actions: [`${characterWord} takes action`],
      })),
      {
        number: sceneCount,
        title: "Ending",
        setting: "The final location",
        narration: template.end,
        dialogue: [{ character: characterWord, text: "What an adventure!" }],
        actions: [`${characterWord} celebrates happily`],
      },
    ],
  };
}

/**
 * Generate character image using Stable Diffusion
 */
export async function generateCharacterImage(params: CharacterGenerationParams): Promise<Blob> {
  if (!hf) throw new Error("HuggingFace API not configured");

  const { name, description, style, age = "child", gender = "neutral", traits = [] } = params;

  const stylePrompts = {
    cartoon: "cartoon style, simple shapes, bold outlines, flat colors, child-friendly",
    anime: "anime style, cute, big eyes, colorful hair, expressive",
    realistic: "3D rendered, Pixar style, detailed, soft lighting",
    comic: "comic book style, bold lines, vibrant colors, dynamic",
  };

  const prompt = `${
    stylePrompts[style]
  }, full body character design, ${age} ${gender}, ${name}, ${description}, ${traits.join(
    ", "
  )}, white background, character sheet, front view, high quality, professional`;

  const negativePrompt = "blurry, scary, violent, inappropriate, dark, realistic photo, adult content";

  try {
    const result = await hf.textToImage({
      model: MODELS.IMAGE,
      inputs: prompt,
      parameters: {
        negative_prompt: negativePrompt,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    });

    // HuggingFace returns Blob
    return result as unknown as Blob;
  } catch (error) {
    console.error("Error generating character image:", error);
    throw error;
  }
}

/**
 * Generate scene background using Stable Diffusion
 */
export async function generateSceneBackground(params: SceneGenerationParams): Promise<Blob> {
  if (!hf) throw new Error("HuggingFace API not configured");

  const { description, style, timeOfDay = "afternoon", setting = "", characters = [] } = params;

  const stylePrompts = {
    cartoon: "cartoon style illustration, simple, colorful, flat design, child-friendly",
    anime: "anime style illustration, detailed, atmospheric, colorful",
    realistic: "3D rendered illustration, Pixar style, detailed, soft lighting",
    comic: "comic book style illustration, bold colors, stylized",
  };

  const timePrompts = {
    morning: "morning light, sunrise, soft warm lighting",
    afternoon: "bright daylight, clear sky, vibrant colors",
    evening: "sunset, golden hour, warm orange tones",
    night: "nighttime, stars, moonlight, cool blue tones",
  };

  // Build character descriptions for the prompt
  let characterPrompt = "";
  if (characters.length > 0) {
    const characterDescriptions = characters
      .map((char) => {
        const positionText = char.position ? `on the ${char.position}` : "";
        return `${char.name} (${char.description}) ${positionText}`;
      })
      .join(", ");
    characterPrompt = `, featuring ${characterDescriptions}`;
  }

  const prompt = `${stylePrompts[style]}, ${setting} ${description}${characterPrompt}, ${timePrompts[timeOfDay]}, landscape orientation, full scene with characters, high quality illustration`;

  const negativePrompt = "text, watermark, blurry, scary, dark, violent, photorealistic, photograph";

  try {
    const result = await hf.textToImage({
      model: MODELS.IMAGE,
      inputs: prompt,
      parameters: {
        negative_prompt: negativePrompt,
        num_inference_steps: 25,
        guidance_scale: 7.0,
      },
    });

    // HuggingFace returns Blob
    return result as unknown as Blob;
  } catch (error) {
    console.error("Error generating scene background:", error);
    throw error;
  }
}

/**
 * Parse story JSON from AI response (handles malformed JSON)
 */
export function parseStoryJSON(response: string): any {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try direct parsing
    return JSON.parse(response);
  } catch (error) {
    console.error("Failed to parse story JSON:", error);
    // Return a basic structure if parsing fails
    return {
      title: "Generated Story",
      characters: [],
      scenes: [],
      error: "Failed to parse AI response",
    };
  }
}

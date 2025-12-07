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
  console.log("[generateTemplateStory] Prompt:", prompt);

  // Extract the main story elements from prompt
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract main character
  let mainCharacter = "Hero";
  const manMatch = prompt.match(/(?:a|the)\s+(man|woman|boy|girl|person|child|king|queen|prince|princess|farmer|merchant|traveler|explorer)/i);
  if (manMatch) {
    mainCharacter = manMatch[1].charAt(0).toUpperCase() + manMatch[1].slice(1);
  }
  
  // Extract main object/goal
  let mainObject = "";
  const objectMatch = prompt.match(/(?:finds|discovers|seeks|wants|gets|loses|hides)\s+(?:a|the|some)?\s*(\w+)/i);
  if (objectMatch) {
    mainObject = objectMatch[1];
  }
  
  // Extract key actions
  const actions = {
    finds: lowerPrompt.includes("find") || lowerPrompt.includes("discover"),
    hides: lowerPrompt.includes("hide") || lowerPrompt.includes("conceal"),
    loses: lowerPrompt.includes("lose") || lowerPrompt.includes("lost"),
    tries: lowerPrompt.includes("tries") || lowerPrompt.includes("attempts"),
    family: lowerPrompt.includes("family") || lowerPrompt.includes("relative"),
  };

  console.log("[generateTemplateStory] Extracted - Character:", mainCharacter, "Object:", mainObject, "Actions:", actions);

  const characters = [mainCharacter];
  if (actions.family) {
    characters.push("Family");
  }

  // Create story narrative based on actual prompt
  const storyNarrative = {
    intro: prompt.split(/(?:but|and then|eventually|however)/i)[0].trim() || `${mainCharacter} begins an adventure.`,
    conflict: actions.hides ? `${mainCharacter} tries to keep the secret hidden` : `${mainCharacter} faces a difficult choice`,
    resolution: actions.loses ? `In the end, ${mainCharacter} loses what was found` : `${mainCharacter} learns an important lesson`,
  };

  const themes = {
    action: lowerPrompt.match(/adventure|explore|discover|find|search|quest/),
    conflict: lowerPrompt.match(/hide|secret|tries|but|however|challenge/),
    loss: lowerPrompt.match(/lose|lost|gone|vanish|disappear/),
    moral: lowerPrompt.match(/learn|realize|understand|eventually/),
  };

  console.log("[generateTemplateStory] Story themes:", themes);
  console.log("[generateTemplateStory] Story themes:", themes);

  // Generate scenes based on actual story structure
  const scenes = [];
  const charList = characters.join(" and ");

  if (sceneCount === 3) {
    // 3-act structure
    scenes.push({
      number: 1,
      title: "The Discovery",
      setting: mainObject ? `A place where ${mainObject} can be found` : "The story begins",
      narration: storyNarrative.intro,
      dialogue: [{ character: mainCharacter, text: mainObject ? `I found ${mainObject}!` : "What an opportunity!" }],
      actions: [`${mainCharacter} discovers something valuable`],
    });

    scenes.push({
      number: 2,
      title: "The Secret",
      setting: actions.hides ? "A hidden place away from others" : "Things get complicated",
      narration: storyNarrative.conflict,
      dialogue: [{ character: mainCharacter, text: actions.hides ? "I must keep this hidden." : "What should I do?" }],
      actions: [`${mainCharacter} struggles with their decision`],
    });

    scenes.push({
      number: 3,
      title: "The Outcome",
      setting: actions.loses ? "The moment of loss" : "The resolution",
      narration: storyNarrative.resolution,
      dialogue: [{ character: mainCharacter, text: actions.loses ? "It's gone..." : "I've learned my lesson." }],
      actions: [`${mainCharacter} faces the consequences and learns something important`],
    });
  } else {
    // 5+ act structure - more detailed
    scenes.push({
      number: 1,
      title: "The Beginning",
      setting: "Where the story starts",
      narration: `${mainCharacter} lives an ordinary life.`,
      dialogue: [{ character: mainCharacter, text: "Today seems like any other day." }],
      actions: [`${mainCharacter} goes about their daily routine`],
    });

    scenes.push({
      number: 2,
      title: "The Discovery",
      setting: mainObject ? `The place where ${mainObject} is found` : "A surprising moment",
      narration: storyNarrative.intro,
      dialogue: [{ character: mainCharacter, text: mainObject ? `I can't believe I found ${mainObject}!` : "This changes everything!" }],
      actions: [`${mainCharacter} makes an important discovery`],
    });

    if (actions.hides) {
      scenes.push({
        number: 3,
        title: "The Deception",
        setting: actions.family ? "At home with family" : "Making difficult choices",
        narration: storyNarrative.conflict,
        dialogue: [
          { character: mainCharacter, text: "No one can know about this." },
          ...(actions.family ? [{ character: "Family", text: "Is something wrong?" }] : []),
        ],
        actions: [`${mainCharacter} tries to keep the secret from those close to them`],
      });
    } else {
      scenes.push({
        number: 3,
        title: "The Dilemma",
        setting: "A moment of uncertainty",
        narration: `${mainCharacter} doesn't know what to do.`,
        dialogue: [{ character: mainCharacter, text: "This is harder than I thought." }],
        actions: [`${mainCharacter} faces unexpected challenges`],
      });
    }

    if (actions.loses) {
      scenes.push({
        number: 4,
        title: "The Loss",
        setting: "The moment everything changes",
        narration: `Despite all efforts, ${mainCharacter} loses what was found.`,
        dialogue: [{ character: mainCharacter, text: "It's gone... all of it." }],
        actions: [`${mainCharacter} experiences loss`],
      });
    } else {
      scenes.push({
        number: 4,
        title: "The Revelation",
        setting: "Truth comes to light",
        narration: `${mainCharacter} realizes the truth.`,
        dialogue: [{ character: mainCharacter, text: "I understand now." }],
        actions: [`${mainCharacter} has an important realization`],
      });
    }

    scenes.push({
      number: 5,
      title: "The Lesson",
      setting: "The story concludes",
      narration: storyNarrative.resolution,
      dialogue: [{ character: mainCharacter, text: themes.loss ? "Some things aren't meant to be kept." : "I've learned what truly matters." }],
      actions: [`${mainCharacter} reflects on the experience and grows from it`],
    });
  }

  console.log("[generateTemplateStory] Generated story with", scenes.length, "scenes");

  return {
    title: prompt.length > 60 ? prompt.substring(0, 60).trim() + "..." : prompt,
    characters: characters.map((name) => ({
      name,
      description: name === mainCharacter 
        ? `The main character who ${storyNarrative.intro.split('.')[0].toLowerCase()}`
        : `${name} plays an important role in the story`,
      personality: themes.conflict ? "complex, conflicted, human" : "brave, curious, and kind",
    })),
    scenes,
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

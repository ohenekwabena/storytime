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

  // Extract characters and themes from prompt
  const lowerPrompt = prompt.toLowerCase();

  // Try to extract multiple characters
  let characters: string[] = [];

  // Look for "two X" or "two Y and Z" patterns
  const twoPattern = /two\s+(\w+)(?:\s+and\s+(\w+))?/i;
  const twoMatch = prompt.match(twoPattern);
  if (twoMatch) {
    characters.push(twoMatch[1].charAt(0).toUpperCase() + twoMatch[1].slice(1).toLowerCase());
    if (twoMatch[2]) {
      characters.push(twoMatch[2].charAt(0).toUpperCase() + twoMatch[2].slice(1).slice(1).toLowerCase());
    } else {
      // If just "two X", create two character names
      const base = twoMatch[1].charAt(0).toUpperCase() + twoMatch[1].slice(1).toLowerCase();
      characters = [base + " One", base + " Two"];
    }
  } else {
    // Look for common character patterns
    const characterPatterns = [
      /(?:about|featuring)\s+(?:a\s+)?(?:brave|little|young|curious)?\s*(\w+)/i,
      /(\w+)\s+(?:who|that|goes|learns|discovers|wants|likes)/i,
      /(?:story of|tale of)\s+(?:a\s+)?(\w+)/i,
      /(?:a|the)\s+(\w+)\s+(?:and|with)/i,
    ];

    for (const pattern of characterPatterns) {
      const match = prompt.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        if (!characters.includes(name)) {
          characters.push(name);
        }
      }
    }
  }

  // If still no characters, use descriptive words from prompt
  if (characters.length === 0) {
    const words = prompt.split(/\s+/).filter((w) => w.length > 4);
    if (words.length > 0) {
      const word = words[0].replace(/[^a-zA-Z]/g, "");
      characters.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    } else {
      characters.push("Hero");
    }
  }

  console.log("[generateTemplateStory] Extracted characters:", characters);

  const mainChar = characters[0];
  const charList = characters.length > 1 ? characters.join(" and ") : mainChar;

  // Extract themes/actions from prompt
  const themes = {
    action: lowerPrompt.match(/adventure|explore|discover|find|search|quest/),
    friendship: lowerPrompt.match(/friend|together|help|love|care|bond/),
    learning: lowerPrompt.match(/learn|discover|understand|teach|grow/),
    magic: lowerPrompt.match(/magic|magical|enchant|spell|wonder/),
    problem: lowerPrompt.match(/problem|challenge|overcome|solve|fix/),
  };

  // Create varied scenes based on theme
  const sceneVariations = [
    {
      setting: themes.magic ? "A magical forest filled with wonder" : "A sunny meadow full of surprises",
      action: `${charList} set${characters.length === 1 ? "s" : ""} out on an exciting journey`,
    },
    {
      setting: themes.friendship ? "A place where new friends gather" : "An interesting location to explore",
      action: `${charList} meet${characters.length === 1 ? "s" : ""} someone who needs help`,
    },
    {
      setting: themes.problem ? "A tricky situation appears" : "Things get more interesting",
      action: `${charList} discover${characters.length === 1 ? "s" : ""} a challenge to overcome`,
    },
    {
      setting: themes.learning ? "A moment of discovery" : "The adventure continues",
      action: `${charList} learn${characters.length === 1 ? "s" : ""} something important`,
    },
    {
      setting: "The perfect place for celebration",
      action: `${charList} succeed${characters.length === 1 ? "s" : ""} and everyone is happy`,
    },
  ];

  const templates = {
    toddler: {
      intro: `Once upon a time, ${charList} loved to play and explore together.`,
      middle: `${charList} discovered something wonderful and made new friends along the way.`,
      end: `Everyone was happy and ${charList} learned something new! The end!`,
    },
    preschool: {
      intro: `In a magical place, ${charList} began an exciting adventure together.`,
      middle: `${charList} faced a challenge but didn't give up, working together.`,
      end: `With help from friends, ${charList} succeeded and everyone celebrated!`,
    },
    elementary: {
      intro: `${charList} lived in an interesting world and wanted to ${
        prompt.includes("find") ? "find something special" : "go on an adventure"
      }.`,
      middle: `Through creativity and determination, ${charList} worked together to overcome obstacles.`,
      end: `${charList} achieved their goal and learned that teamwork and courage make anything possible!`,
    },
  };

  const template = templates[ageGroup as keyof typeof templates] || templates.preschool;

  // Generate scenes with variety
  const scenes = [];

  // Opening scene
  scenes.push({
    number: 1,
    title: "The Beginning",
    setting: themes.magic ? "A magical world full of wonder" : "A beautiful place ready for adventure",
    narration: template.intro,
    dialogue: characters.map((c) => ({ character: c, text: "Let's go on an adventure!" })),
    actions: [`${charList} look${characters.length === 1 ? "s" : ""} around with excitement`],
  });

  // Middle scenes with variation
  for (let i = 0; i < sceneCount - 2; i++) {
    const variation = sceneVariations[Math.min(i + 1, sceneVariations.length - 2)];
    scenes.push({
      number: i + 2,
      title: `Scene ${i + 2}: ${["The Journey", "New Friends", "The Challenge", "Discovery"][i] || "Adventure"}`,
      setting: variation.setting,
      narration: i === 0 ? template.middle : variation.action,
      dialogue: [
        {
          character: characters[i % characters.length],
          text: ["We can do this!", "This is exciting!", "Let's keep going!", "I have an idea!"][i % 4],
        },
      ],
      actions: [variation.action],
    });
  }

  // Ending scene
  scenes.push({
    number: sceneCount,
    title: "The Happy Ending",
    setting: "A wonderful place where everyone celebrates together",
    narration: template.end,
    dialogue: [{ character: mainChar, text: "What an amazing adventure!" }],
    actions: [`${charList} celebrate${characters.length === 1 ? "s" : ""} happily with all their friends`],
  });

  console.log("[generateTemplateStory] Generated story with", scenes.length, "scenes");

  return {
    title: prompt.substring(0, 60).trim() || `The Adventure of ${charList}`,
    characters: characters.map((name) => ({
      name,
      description: `${name} is a ${themes.friendship ? "friendly" : "brave"} character who loves ${
        themes.action ? "adventures" : "making friends"
      }`,
      personality: "brave, curious, and kind",
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

// Text-to-Speech utilities using free options

export interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResult {
  audioBlob: Blob;
  duration: number;
  format: string;
}

/**
 * Browser-based TTS using Web Speech API (completely free, but limited voices)
 */
export async function generateSpeechBrowser(options: TTSOptions): Promise<TTSResult> {
  const { text, voice = "default", speed = 1.0, pitch = 1.0 } = options;

  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Browser does not support speech synthesis"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.pitch = pitch;

    // Select voice if available
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0 && voice !== "default") {
      const selectedVoice = voices.find((v) => v.name.includes(voice));
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    // Record audio using MediaRecorder
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const mediaRecorder = new MediaRecorder(destination.stream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      resolve({
        audioBlob,
        duration: utterance.text.length / 15, // Rough estimate
        format: "webm",
      });
    };

    utterance.onend = () => {
      mediaRecorder.stop();
    };

    utterance.onerror = (error) => {
      reject(error);
    };

    mediaRecorder.start();
    speechSynthesis.speak(utterance);
  });
}

/**
 * Get available voices for browser TTS
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if ("speechSynthesis" in window) {
    return speechSynthesis.getVoices();
  }
  return [];
}

/**
 * ElevenLabs API (10k characters/month free)
 * Call from server-side only to protect API key
 */
export async function generateSpeechElevenLabs(
  text: string,
  voiceId: string = "EXAVITQu4vr4xnSDxMaL", // Default voice
  apiKey?: string
): Promise<Blob> {
  if (!apiKey && !process.env.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const key = apiKey || process.env.ELEVENLABS_API_KEY;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": key!,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Character voice profiles for consistent TTS
 */
export const CHARACTER_VOICES = {
  child_friendly: {
    elevenlabs: "EXAVITQu4vr4xnSDxMaL", // Rachel voice
    browser: "Google US English",
    settings: { speed: 1.1, pitch: 1.2 },
  },
  narrator: {
    elevenlabs: "pNInz6obpgDQGcFmaJgB", // Adam voice
    browser: "Google UK English Male",
    settings: { speed: 1.0, pitch: 1.0 },
  },
  female_child: {
    elevenlabs: "jsCqWAovK2LkecY7zXl4", // Female child-like
    browser: "Microsoft Zira Desktop",
    settings: { speed: 1.15, pitch: 1.3 },
  },
  male_child: {
    elevenlabs: "onwK4e9ZLuTAKqWW03F9", // Male child-like
    browser: "Google US English",
    settings: { speed: 1.1, pitch: 1.25 },
  },
} as const;

/**
 * Generate audio for a scene with multiple dialogues
 */
export async function generateSceneAudio(
  narration: string | null,
  dialogues: Array<{ character: string; text: string; voiceProfile?: keyof typeof CHARACTER_VOICES }>,
  useElevenLabs: boolean = false
): Promise<Array<{ type: "narration" | "dialogue"; audioBlob: Blob; character?: string; duration: number }>> {
  const results = [];

  // Generate narration if present
  if (narration) {
    const voiceProfile = CHARACTER_VOICES.narrator;
    let audioBlob: Blob;

    if (useElevenLabs && process.env.ELEVENLABS_API_KEY) {
      audioBlob = await generateSpeechElevenLabs(narration, voiceProfile.elevenlabs);
    } else {
      const result = await generateSpeechBrowser({
        text: narration,
        voice: voiceProfile.browser,
        ...voiceProfile.settings,
      });
      audioBlob = result.audioBlob;
    }

    results.push({
      type: "narration" as const,
      audioBlob,
      duration: estimateAudioDuration(narration),
    });
  }

  // Generate dialogues
  for (const dialogue of dialogues) {
    const voiceProfile = CHARACTER_VOICES[dialogue.voiceProfile || "child_friendly"];
    let audioBlob: Blob;

    if (useElevenLabs && process.env.ELEVENLABS_API_KEY) {
      audioBlob = await generateSpeechElevenLabs(dialogue.text, voiceProfile.elevenlabs);
    } else {
      const result = await generateSpeechBrowser({
        text: dialogue.text,
        voice: voiceProfile.browser,
        ...voiceProfile.settings,
      });
      audioBlob = result.audioBlob;
    }

    results.push({
      type: "dialogue" as const,
      character: dialogue.character,
      audioBlob,
      duration: estimateAudioDuration(dialogue.text),
    });
  }

  return results;
}

/**
 * Estimate audio duration based on text length (rough approximation)
 * Average speaking rate: ~150 words per minute = 2.5 words per second
 */
export function estimateAudioDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const duration = wordCount / 2.5 + 0.5; // Add 0.5s padding
  return Math.max(duration, 1.0); // Minimum 1 second
}

/**
 * Simple phoneme extraction for lip sync
 * Returns approximate mouth shapes timed with audio
 */
export interface PhonemeData {
  time: number; // Time in seconds
  phoneme: string; // Mouth shape: 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X' (closed)
}

export function generateSimpleLipSync(text: string, duration: number): PhonemeData[] {
  const phonemes: PhonemeData[] = [];
  const words = text.toLowerCase().split(/\s+/);
  const timePerWord = duration / words.length;

  let currentTime = 0;

  for (const word of words) {
    // Start with closed mouth
    phonemes.push({ time: currentTime, phoneme: "X" });

    // Simple mapping based on vowel sounds
    const hasA = /[aA]/.test(word);
    const hasE = /[eE]/.test(word);
    const hasI = /[iI]/.test(word);
    const hasO = /[oO]/.test(word);
    const hasU = /[uU]/.test(word);

    // Add mouth shapes during word
    if (hasA) phonemes.push({ time: currentTime + timePerWord * 0.3, phoneme: "A" });
    if (hasE) phonemes.push({ time: currentTime + timePerWord * 0.5, phoneme: "E" });
    if (hasI) phonemes.push({ time: currentTime + timePerWord * 0.6, phoneme: "D" });
    if (hasO) phonemes.push({ time: currentTime + timePerWord * 0.7, phoneme: "B" });
    if (hasU) phonemes.push({ time: currentTime + timePerWord * 0.8, phoneme: "C" });

    currentTime += timePerWord;
  }

  // End with closed mouth
  phonemes.push({ time: duration, phoneme: "X" });

  return phonemes;
}

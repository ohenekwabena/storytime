/**
 * ElevenLabs TTS Server Module
 * Server-side only - keeps API key secure
 */

export interface AudioGenerationResult {
  audioBlob: Blob;
  duration: number;
  transcript: string;
}

/**
 * Estimate speech duration based on text length
 * Average speaking rate: ~150 words per minute
 */
function estimateSpeechDuration(text: string, rate: number = 1.0): number {
  const words = text.trim().split(/\s+/).length;
  const wordsPerMinute = 150 * rate;
  const minutes = words / wordsPerMinute;
  return Math.max(1.0, minutes * 60); // At least 1 second
}

/**
 * Generate speech using ElevenLabs API (premium quality)
 * Free tier: 10,000 characters/month
 * Returns MP3 audio file
 */
export async function generateSpeechElevenLabs(
  text: string,
  voiceId: string = 'EXAVITQu4vr4xnSDxMaL' // Default: Bella (child-friendly female)
): Promise<AudioGenerationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured in ELEVENLABS_API_KEY');
  }

  console.log(`Generating TTS with ElevenLabs for ${text.length} characters`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5', // Free tier model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.statusText} - ${errorText}`);
  }

  const audioBlob = await response.blob();
  
  // Estimate duration from text (ElevenLabs doesn't provide duration directly)
  const duration = estimateSpeechDuration(text, 1.0);

  console.log(`Generated ${audioBlob.size} bytes of audio (estimated ${duration.toFixed(2)}s)`);

  return {
    audioBlob,
    duration,
    transcript: text,
  };
}

/**
 * ElevenLabs voice IDs (child-friendly voices)
 */
export const ELEVENLABS_VOICES = {
  BELLA: 'EXAVITQu4vr4xnSDxMaL', // Young female
  RACHEL: '21m00Tcm4TlvDq8ikWAM', // Young adult female
  DOMI: 'AZnzlk1XvdvUeBnXmlld', // Young adult female
  ANTONI: 'ErXwobaYiN019PkySvjV', // Male narrator
  JOSH: 'TxGEqnHWrfWFTfGW9XjX', // Young male
  ARNOLD: 'VR6AewLTigWG4xSOukaG', // Male narrator
} as const;

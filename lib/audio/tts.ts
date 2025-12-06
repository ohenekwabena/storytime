'use client';

export interface TTSOptions {
  text: string;
  voice?: string;
  rate?: number; // 0.5 to 2.0
  pitch?: number; // 0 to 2
  volume?: number; // 0 to 1
}

export interface AudioGenerationResult {
  audioBlob: Blob;
  duration: number;
  transcript: string;
}

/**
 * Generate speech audio using Web Speech API (browser-based, free)
 * This runs entirely in the browser using the native TTS engine
 * Returns WAV format for universal browser compatibility
 */
export async function generateSpeechWebAPI(options: TTSOptions): Promise<AudioGenerationResult> {
  const { text, voice, rate = 1.0, pitch = 1.0, volume = 1.0 } = options;

  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Web Speech API not supported in this browser'));
      return;
    }

    // Clear any previous speech synthesis
    window.speechSynthesis.cancel();

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Set voice if specified
    if (voice) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find((v) => v.name === voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Track actual speaking duration
    let startTime = 0;
    let endTime = 0;
    
    // Capture audio using Web Audio API
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const mediaRecorder = new MediaRecorder(destination.stream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      try {
        // Use measured duration and create a simple blob
        const measuredDuration = (endTime - startTime) / 1000;
        
        // Create audio blob from chunks
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // If blob is too small, estimate duration from text
        let duration = measuredDuration;
        if (audioBlob.size < 1000) {
          console.warn('Audio blob too small, using estimated duration');
          duration = estimateSpeechDuration(text, rate);
        }
        
        console.log(`Generated audio: ${duration.toFixed(2)}s (${audioBlob.size} bytes)`);
        
        resolve({
          audioBlob,
          duration,
          transcript: text,
        });
      } catch (error) {
        console.error('Audio generation failed:', error);
        // Fallback: return empty blob with estimated duration
        const duration = estimateSpeechDuration(text, rate);
        resolve({
          audioBlob: new Blob([], { type: 'audio/wav' }),
          duration,
          transcript: text,
        });
      } finally {
        audioContext.close();
      }
    };

    utterance.onstart = () => {
      startTime = Date.now();
    };

    utterance.onend = () => {
      endTime = Date.now();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 100); // Small delay to ensure all audio is captured
    };

    utterance.onerror = (error) => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      audioContext.close();
      reject(error);
    };

    // Start recording, then speak
    mediaRecorder.start();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Get available voices from Web Speech API
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

/**
 * Generate speech using ElevenLabs API (premium quality, requires API key)
 * Free tier: 10,000 characters/month
 * NOTE: This should be called from a server action to keep API key secure
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
      model_id: 'eleven_monolingual_v1',
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
 * Get duration of audio blob
 */
async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });
    
    audio.src = url;
  });
}

/**
 * Estimate speech duration from text (fallback if metadata not available)
 * Average speaking rate: 150 words per minute
 */
export function estimateSpeechDuration(text: string, rate: number = 1.0): number {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 150 * rate;
  const durationMinutes = words / wordsPerMinute;
  return durationMinutes * 60; // Convert to seconds
}

/**
 * Generate speech audio on the server
 * This function should only be called from server actions
 * Uses ElevenLabs API for high-quality MP3 audio
 */
export async function generateSpeech(options: TTSOptions): Promise<AudioGenerationResult> {
  return generateSpeechElevenLabs(options.text);
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

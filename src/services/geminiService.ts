import { GoogleGenAI, Modality } from "@google/genai";

export enum VoiceName {
  PUCK = 'Puck',
  CHARON = 'Charon',
  KORE = 'Kore',
  FENRIR = 'Fenrir',
  ZEPHYR = 'Zephyr',
}

export type VoiceEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'curious' | 'authoritative';

export interface VoiceOption {
  name: VoiceName;
  description: string;
  gender: 'male' | 'female';
}

export const VOICES: VoiceOption[] = [
  { name: VoiceName.KORE, description: 'Realistic, clear, and professional female voice.', gender: 'female' },
  { name: VoiceName.ZEPHYR, description: 'Soft, ethereal, and calm female voice.', gender: 'female' },
  { name: VoiceName.CHARON, description: 'Deep, resonant, and authoritative male voice.', gender: 'male' },
  { name: VoiceName.PUCK, description: 'Energetic, youthful, and vibrant voice.', gender: 'female' },
  { name: VoiceName.FENRIR, description: 'Steady, neutral, and reliable male voice.', gender: 'male' },
];

export const EMOTIONS: { id: VoiceEmotion; label: string; icon: string }[] = [
  { id: 'neutral', label: 'Neutral', icon: '😐' },
  { id: 'happy', label: 'Happy', icon: '😊' },
  { id: 'sad', label: 'Sad', icon: '😢' },
  { id: 'angry', label: 'Angry', icon: '😠' },
  { id: 'curious', label: 'Curious', icon: '🤔' },
  { id: 'authoritative', label: 'Commanding', icon: '🫡' },
];

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables via the Secrets panel.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateSpeech(text: string, voiceName: VoiceName = VoiceName.KORE, emotion: VoiceEmotion = 'neutral') {
  const ai = getAI();
  
  // Refine the prompt to include emotional context for the TTS model
  const emotionPrompt = emotion !== 'neutral' 
    ? `Speak the following text with a ${emotion} tone and expression: "${text}"`
    : text;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: emotionPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Failed to generate audio data from Gemini.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Speech generation error:", error);
    throw error;
  }
}

export async function analyzeVoiceSample(base64Audio: string, mimeType: string) {
  const ai = getAI();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType,
              },
            },
            {
              text: "Analyze this voice sample. Describe its characteristics (pitch, tone, emotional quality, age, gender) and suggest which prebuilt voice (Kore, Zephyr, Puck, Charon, Fenrir) would be the closest match for a realistic reproduction.",
            },
          ],
        },
      ],
    });

    return response.text;
  } catch (error) {
    console.error("Voice analysis error:", error);
    throw error;
  }
}

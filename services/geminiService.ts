import { GoogleGenAI } from "@google/genai";

// Initialize the API client
// Note: In a production environment, API keys should be handled via a secure backend proxy
// or user input to avoid exposing them in client-side code. 
// For this demo, we assume the environment variable or user provides it.
const getClient = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey: key });
};

export const generateCoverImage = async (prompt: string, apiKey: string): Promise<string> => {
  try {
    const ai = getClient(apiKey);
    
    // Using gemini-2.5-flash-image for speed and standard image generation
    // Ideally use gemini-3-pro-image-preview for highest quality if available
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate a high-quality, photorealistic square image suitable for steganography. Subject: ${prompt}. The image should have clean textures.`
          }
        ]
      }
    });

    // Check for inline data (images)
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64Data}`;
        }
      }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

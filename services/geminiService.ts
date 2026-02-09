
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// Initialize Gemini
const getAI = () => {
  // Use the process.env.API_KEY string directly as mandated by guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export const generateProductImage = async (prompt: string, aspectRatio: string = "1:1", size: string = "1K") => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: `High quality food photography of ${prompt}, commercial style, appetizing, bright lighting.` }],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: size as any
      }
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const editProductImage = async (base64Image: string, prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: 'image/png',
          },
        },
        {
          text: `Modify this food image: ${prompt}. Maintain high quality and realism.`,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image generated");
};

export const getSmartResponse = async (prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    // Fixed model alias from gemini-2.5-flash-lite-latest to gemini-flash-lite-latest per guidelines
    model: 'gemini-flash-lite-latest',
    contents: prompt,
  });
  return response.text;
};

export const searchRestaurantInfo = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = chunks.map((chunk: any) => chunk.web?.uri).filter(Boolean);
  
  return {
    text: response.text,
    sources
  };
};

export const getNearbyPlaces = async (lat: number, lng: number) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "What are some highly-rated local gourmet restaurants near me?",
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      }
    },
  });
  
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const places = chunks.map((chunk: any) => ({
    title: chunk.maps?.title,
    uri: chunk.maps?.uri
  })).filter((p: any) => p.title);
  
  return {
    text: response.text,
    places
  };
};

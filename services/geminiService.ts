
import { GoogleGenAI } from "@google/genai";

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`VITE_${key}`] || process.env[`NEXT_PUBLIC_${key}`] || null;
  }
  return null;
};

export const generateProductImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" = "1:1") => {
  const apiKey = getEnv('API_KEY');
  if (!apiKey) throw new Error("Chave de API do Gemini não configurada.");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Fotografia profissional de comida gourmet: ${prompt}. Iluminação de estúdio, profundidade de campo, resolução 8k, apetitoso, estilo restaurante de luxo.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    
    if (imagePart?.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    
    throw new Error("Não foi possível gerar a imagem no momento.");
  } catch (error) {
    console.error("Erro Gemini Image:", error);
    throw error;
  }
};

export const getSmartProductDescription = async (productName: string) => {
  const apiKey = getEnv('API_KEY');
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escreva uma descrição irresistível, curta e profissional para o produto "${productName}" em um cardápio de lanchonete premium brasileira. Use adjetivos que despertem fome. Máximo de 140 caracteres.`,
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro Gemini Text:", error);
    return "";
  }
};

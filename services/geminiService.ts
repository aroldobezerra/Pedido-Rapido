
import { GoogleGenAI } from "@google/genai";

/**
 * Gemini Service using the latest @google/genai SDK.
 * All calls strictly adhere to provided guidelines.
 */

export const generateProductImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" = "1:1") => {
  // Guideline: Create a new instance right before making an API call
  const apiKey = process.env.API_KEY;
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

    // Guideline: Iterate through parts to find the image, do not assume the first part is an image.
    let base64ImageData = '';
    let mimeType = 'image/png';
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64ImageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType;
          break;
        }
      }
    }
    
    if (base64ImageData) {
      return `data:${mimeType};base64,${base64ImageData}`;
    }
    
    throw new Error("Não foi possível gerar a imagem no momento.");
  } catch (error) {
    console.error("Erro Gemini Image:", error);
    throw error;
  }
};

export const getSmartProductDescription = async (productName: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Guideline: Recommended model for basic text tasks
      contents: `Escreva uma descrição irresistível, curta e profissional para o produto "${productName}" em um cardápio de lanchonete premium brasileira. Use adjetivos que despertem fome. Máximo de 140 caracteres.`,
    });

    // Guideline: Access .text property directly (not a method)
    return response.text || "";
  } catch (error) {
    console.error("Erro Gemini Text:", error);
    return "";
  }
};

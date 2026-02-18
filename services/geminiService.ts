import { GoogleGenAI } from "@google/genai";

export const generateProductImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" = "1:1") => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("Chave de API do Gemini não configurada.");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          { text: `Fotografia profissional de comida gourmet: ${prompt}. Iluminação de estúdio, profundidade de campo, resolução 8k, apetitoso, estilo restaurante de luxo.` }
        ]
      },
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        aspectRatio: aspectRatio
      } as any
    });

    let base64ImageData = '';
    let mimeType = 'image/png';
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64ImageData = part.inlineData.data ?? '';
          mimeType = part.inlineData.mimeType ?? 'image/png';
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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Escreva uma descrição irresistível, curta e profissional para o produto "${productName}" em um cardápio de lanchonete premium brasileira. Use adjetivos que despertem fome. Máximo de 140 caracteres.`,
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro Gemini Text:", error);
    return "";
  }
};
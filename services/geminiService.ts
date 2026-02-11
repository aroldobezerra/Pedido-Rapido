
import { GoogleGenAI } from "@google/genai";

/**
 * Serviço especializado em IA para o SnackDash.
 * Utiliza os modelos Gemini mais recentes para geração de imagens e textos.
 */

export const generateProductImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" = "1:1") => {
  // Inicialização dinâmica para garantir que use a API_KEY mais recente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Professional gourmet food photography of: ${prompt}. Studio lighting, depth of field, 8k resolution, appetizing, restaurant style.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    // Procura pela parte da imagem no retorno
    const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    
    if (imagePart?.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    
    throw new Error("Nenhuma imagem gerada pelo modelo.");
  } catch (error) {
    console.error("Erro na geração de imagem Gemini:", error);
    throw error;
  }
};

export const getSmartProductDescription = async (productName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escreva uma descrição curta, apetitosa e persuasiva para um(a) ${productName} em um cardápio de lanchonete premium. Máximo 150 caracteres.`,
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro na geração de texto Gemini:", error);
    return "";
  }
};

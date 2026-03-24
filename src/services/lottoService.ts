import { GoogleGenAI } from "@google/genai";
import { LottoResult, LottoCategory, LOTTO_CONFIGS } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const fetchLatestLotteryResults = async (category: LottoCategory): Promise<LottoResult[]> => {
  const config = LOTTO_CONFIGS[category];
  try {
    const prompt = `Find the 10 most recent results for the ${config.name} lottery as of March 2026. 
    Rules: ${config.mainBalls} main balls (max ${config.maxMain})${config.bonusBalls > 0 ? ` and ${config.bonusBalls} bonus balls (max ${config.maxBonus})` : ''}.
    Return them as a JSON array of objects with 'id' (string), 'date' (YYYY-MM-DD), 'category' (string: "${category}"), 'numbers' (array of integers), and 'bonusNumbers' (array of integers, if applicable). Only return the JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
  } catch (error) {
    console.error("Error fetching lottery results:", error);
  }
  return [];
};

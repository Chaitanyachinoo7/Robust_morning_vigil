import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FatalityCategory {
  category: string;
  count: string;
  summary: string;
  sources: { title: string; url: string }[];
}

export interface GlobalVigilSummary {
  timestamp: string;
  totalEstimated: string;
  categories: FatalityCategory[];
  overallAnalysis: string;
}

export async function getGlobalFatalitySummary(): Promise<GlobalVigilSummary> {
  const now = new Date().toISOString();
  const prompt = `
    Search for global news reports from the last 24 hours (strictly since ${now}) regarding fatalities in these categories:
    1. Accidents (Road, Air, Industrial)
    2. Killings & Crime
    3. Terrorist Attacks
    4. Natural Calamities (Floods, Earthquakes, etc.)
    5. Disease Deaths (Major outbreaks or significant daily stats)
    
    Provide a structured summary including estimated counts where reported by major news agencies. 
    Be objective and cite sources where possible.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING },
          totalEstimated: { type: Type.STRING },
          overallAnalysis: { type: Type.STRING },
          categories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                count: { type: Type.STRING },
                summary: { type: Type.STRING },
                sources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      url: { type: Type.STRING }
                    }
                  }
                }
              },
              required: ["category", "count", "summary"]
            }
          }
        },
        required: ["timestamp", "totalEstimated", "categories", "overallAnalysis"]
      }
    },
  });

  try {
    const data = JSON.parse(response.text);
    return data;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Failed to generate global summary");
  }
}

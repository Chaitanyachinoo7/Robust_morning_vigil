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
  const now = new Date();
  const nowISO = now.toISOString();
  const nowUTC = now.toUTCString();
  
  const prompt = `
    CURRENT UTC TIME: ${nowUTC}.
    STRICT SEARCH WINDOW: Last 24 hours (since ${nowISO}).
    
    Perform an exhaustive search of global news agencies (international, national, and local/regional) for reports of fatalities occurring strictly within this 24-hour window in MARCH 2026.
    
    You must "rope in" news from every nook and corner of the world, covering:
    1. Crime & Homicide (including specific reports of stabbings, shootings, and violent theft)
    2. Accidents (Road, Rail, Air, Maritime, and Industrial)
    3. Terrorist Attacks & Armed Conflicts
    4. Natural Calamities (Floods, Storms, Earthquakes, Landslides)
    5. Disease Outbreaks & Health Emergencies (Significant daily death tolls or new outbreak fatalities)
    
    For each category, provide:
    - An estimated fatality count based on aggregated reports.
    - A concise summary of the major incidents.
    - Direct links to the reporting news agencies (prioritize diverse regional sources).
    
    IMPORTANT: Ensure all data is strictly from the last 24 hours of the present time in 2026. Do not include historical data.
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

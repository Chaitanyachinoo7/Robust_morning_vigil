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

const CACHE_KEY = 'vigil_summary_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getGlobalFatalitySummary(forceRefresh = false): Promise<GlobalVigilSummary> {
  if (!forceRefresh) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const nowISO = now.toISOString();
  const startTimeISO = startTime.toISOString();
  const nowUTC = now.toUTCString();
  const startTimeUTC = startTime.toUTCString();
  
  const prompt = `
    STRICT TEMPORAL PARAMETERS:
    - CURRENT DATE: March 23, 2026
    - CURRENT TIME (END): ${nowUTC} (${nowISO})
    - START TIME (24H AGO): ${startTimeUTC} (${startTimeISO})
    
    TASK: Perform an exhaustive search across diverse regional news agencies for reports of fatalities where the INCIDENT ITSELF occurred STRICTLY within this 24-hour window in the year 2026.
    
    STRICT EXCLUSION RULES:
    1. DO NOT include any event that occurred before ${startTimeISO}, even if it is being reported now for the first time.
    2. DO NOT include any data from 2025 or earlier. All results MUST be from March 2026.
    3. DO NOT include "ongoing" death tolls unless there are specific NEW fatalities that OCCURRED in the last 24 hours.
    4. DO NOT include historical data or summaries of past weeks/months.
    5. VERIFY the actual time of the incident. If the event occurred before ${startTimeISO}, DISCARD IT.
    6. STRICTLY EXCLUDE natural deaths, passings due to old age, or deaths from long-term chronic illnesses. This app is for monitoring sudden, tragic, or preventable global fatalities.
    
    ROPE IN NEWS FROM EVERY NOOK AND CORNER (MANDATORY REGIONAL COVERAGE):
    - PAKISTAN: Dawn, The Express Tribune, Geo News.
    - CENTRAL ASIA: AKIpress, Radio Free Europe/Radio Liberty (Central Asia).
    - ARAB WORLD: Al Jazeera, Al Arabiya, Gulf News, Arab News.
    - ASIA & SE ASIA: Channel News Asia (CNA), The Straits Times, NHK World, Bangkok Post, South China Morning Post (SCMP).
    - AUSTRALIA & OCEANIA: ABC News Australia, The Sydney Morning Herald, Radio New Zealand.
    - SOUTH AMERICA: MercoPress, Buenos Aires Times, Reuters (Latin America).
    - AFRICA: Africa News, The EastAfrican, Premium Times, Daily Maverick.
    - MARITIME & OCEAN: Maritime Executive, gCaptain, IMO News.
    - GLOBAL MAINSTREAM: News18 World, WION, DW News, CBS News, Firstpost, RT.
    
    - Crime & Homicide (stabbings, shootings, violent theft - EXCLUDE any incidents with terrorist or extremist motives).
    - Accidents (Road, Rail, Air, Maritime, Industrial)
    - Terrorist Attacks & Armed Conflicts (ALL incidents with terrorist, extremist, or insurgent motives MUST be categorized here).
    - Natural Calamities (Incidents occurring in the last 24h only)
    - Disease Outbreaks (New fatalities occurring in the last 24h only)
    
    For each category, provide:
    - An estimated fatality count based on incidents that OCCURRED in the LAST 24 HOURS ONLY.
    - A concise summary of the major incidents.
    - Direct links to the reporting news agencies (prioritize diverse regional sources).
  `;

  try {
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
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      throw new Error("Failed to generate global summary");
    }
  } catch (error: any) {
    if (error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("quota")) {
      console.error("Gemini Quota Exceeded", error);
      
      // Try to extract retry time
      const retryMatch = error.message.match(/retry in ([\w\.]+)/);
      const retryTime = retryMatch ? retryMatch[1] : null;
      
      const quotaError: any = new Error("QUOTA_EXCEEDED");
      quotaError.retryTime = retryTime;
      throw quotaError;
    }
    throw error;
  }
}

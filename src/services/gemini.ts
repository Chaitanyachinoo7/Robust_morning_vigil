import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

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
  isFallback?: boolean;
}

const CACHE_KEY = 'vigil_summary_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash"
];

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
    - AUSTRALIA & OCEANIA: ABC News Australia, The Sydney Herald, Radio New Zealand.
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
    
    RESPONSE FORMAT: JSON
  `;

  let lastError: any = null;

  for (const modelName of MODELS) {
    try {
      console.log(`Attempting summary with model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
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
        console.error(`Failed to parse response from ${modelName}`, e);
        continue; // Try next model if parsing fails
      }
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("quota");
      
      if (isQuotaError) {
        console.warn(`Quota exceeded for ${modelName}, trying next model...`);
        continue;
      }
      
      console.error(`Error with model ${modelName}:`, error);
      throw error; // For non-quota errors, throw immediately
    }
  }

  // If we get here, all Gemini models failed. Try OpenAI if available.
  const openAIKey = process.env.OPENAI_API_KEY;
  const isRealOpenAIKey = openAIKey && openAIKey !== "MY_OPENAI_API_KEY" && openAIKey.startsWith("sk-");

  if (isRealOpenAIKey) {
    try {
      console.log("Attempting summary with OpenAI GPT-4o fallback...");
      const openaiClient = new OpenAI({ apiKey: openAIKey, dangerouslyAllowBrowser: true });
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a global fatality monitoring assistant. Provide data in the requested JSON format." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      if (content) {
        const data = JSON.parse(content);
        const result = { ...data, isFallback: true };
        console.log("OpenAI fallback successful");
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
        return result;
      }
    } catch (error: any) {
      console.error("OpenAI fallback failed:", error);
      // If OpenAI also fails, we fall through to the final error block
      lastError = error; 
    }
  } else {
    console.log("OpenAI fallback skipped: No valid API key found (key must start with 'sk-')");
  }

  // If we get here, all models failed
  if (lastError?.message?.includes("RESOURCE_EXHAUSTED") || lastError?.message?.includes("quota") || lastError?.status === 429) {
    console.error("All Gemini models hit quota limits", lastError);
    
    // Try to extract retry time from Gemini error
    const retryMatch = lastError?.message?.match(/retry in ([\w\.]+)/) || 
                       (lastError?.error?.message?.match(/retry in ([\w\.]+)/));
    const retryTime = retryMatch ? retryMatch[1] : null;
    
    const quotaError: any = new Error("QUOTA_EXCEEDED");
    quotaError.retryTime = retryTime;
    throw quotaError;
  }
  
  throw lastError || new Error("Failed to generate global summary after trying all models");
}

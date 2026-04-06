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
  groundingSources?: { title: string; url: string }[];
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
    - CURRENT DATE: ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    - CURRENT TIME (END): ${nowUTC} (${nowISO})
    - START TIME (24H AGO): ${startTimeUTC} (${startTimeISO})
    - THE 24-HOUR WINDOW IS DEFINED AS: From ${startTimeUTC} to ${nowUTC}.
    
    TASK: Perform an exhaustive search across diverse regional and local news agencies, town-level bulletins, and village-level reports for fatalities where the INCIDENT ITSELF occurred STRICTLY within this 24-hour window in the year ${now.getFullYear()}. Include data from every city, town, and village where reports are available.
    
    STRICT EXCLUSION RULES:
    1. DO NOT include any event that occurred before ${startTimeISO}, even if it is being reported now for the first time.
    2. DO NOT include any data from previous years. All results MUST be from ${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}.
    3. DO NOT include "ongoing" death tolls unless there are specific NEW fatalities that OCCURRED in the last 24 hours.
    4. DO NOT include historical data or summaries of past weeks/months.
    5. VERIFY the actual time of the incident. If the event occurred before ${startTimeISO}, DISCARD IT.
    6. STRICTLY EXCLUDE natural deaths, passings due to old age, or deaths from long-term chronic illnesses. This app is for monitoring sudden, tragic, or preventable global fatalities.
    
    ROPE IN NEWS FROM EVERY NOOK AND CORNER (MANDATORY REGIONAL & LOCAL COVERAGE):
    - NATIONAL & OFFICIAL HANDLES: Search for reports from official national news handles, primary state broadcasters, and verified social media accounts of major news organizations (e.g., BBC, CNN, NDTV, Reuters, AP, and specific national broadcasters for every country).
    - VIDEO & SOCIAL: Search YouTube for recent news clips, breaking news reports, and verified citizen journalism regarding sudden fatalities. Look for channels like WION, Al Jazeera English, South China Morning Post, and local news broadcasters' YouTube handles.
    - LOCAL & GRANULAR: Search for reports from local news agencies, town-level bulletins, and village-level reports. Include data from every city, town, and village where reports are available.
    - PAKISTAN: Dawn, The Express Tribune, Geo News, and local Urdu/regional language news.
    - CENTRAL ASIA: AKIpress, Radio Free Europe/Radio Liberty (Central Asia), and local state/independent news.
    - ARAB WORLD: Al Jazeera, Al Arabiya, Gulf News, Arab News, and local Arabic news.
    - ASIA & SE ASIA: Channel News Asia (CNA), The Straits Times, NHK World, Bangkok Post, South China Morning Post (SCMP), and local language news.
    - AUSTRALIA & OCEANIA: ABC News Australia, The Sydney Herald, Radio New Zealand, and local community news.
    - SOUTH AMERICA: MercoPress, Buenos Aires Times, Reuters (Latin America), and local Spanish/Portuguese news.
    - AFRICA: Africa News, The EastAfrican, Premium Times, Daily Maverick, and local regional news.
    - MARITIME & OCEAN: Maritime Executive, gCaptain, IMO News.
    - GLOBAL MAINSTREAM: News18 World, WION, DW News, CBS News, Firstpost, RT.
    - NORTH AMERICA & LOCAL US: KKTV 11 News (Colorado), WGN News (Chicago), local CBS/NBC/ABC/FOX affiliates, and regional news handles.
    
    - Crime & Homicide (stabbings, shootings, violent theft - EXCLUDE any incidents with terrorist or extremist motives).
    - Accidents (Road, Rail, Air, Maritime, Industrial)
    - Terrorist Attacks & Armed Conflicts (ALL incidents with terrorist, extremist, or insurgent motives MUST be categorized here).
    - Natural Calamities (Incidents occurring in the last 24h only)
    - Disease Outbreaks (New fatalities occurring in the last 24h only)
    
    For each category, provide:
    - An estimated fatality count based on incidents that OCCURRED in the LAST 24 HOURS ONLY, including data from local and granular reports (towns, villages, cities).
    - A concise summary of the major and local incidents, highlighting reports from specific towns or villages where available.
    - Direct, valid, and live article URLs to the reporting news agencies (prioritize diverse regional and local sources). 
    - CRITICAL: DO NOT hallucinate URLs. Only provide URLs that you have actually found in the search results. If a specific article URL is not found, provide the most relevant live page URL from that agency. Ensure the URLs are not broken (no 404s).
    
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
        
        // Extract grounding sources from the response if available
        const groundingSources: { title: string; url: string }[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          chunks.forEach((chunk: any) => {
            if (chunk.web && chunk.web.uri && chunk.web.title) {
              groundingSources.push({
                title: chunk.web.title,
                url: chunk.web.uri
              });
            }
          });
        }
        
        const result = { ...data, groundingSources };
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
        return result;
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

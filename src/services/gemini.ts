import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface FatalityCategory {
  category: string;
  count: string;
  summary: string;
  verifiedYear: number; // Must be the current year
  sources: { title: string; url: string; date?: string }[];
}

export interface ContinentData {
  continent: string;
  count: string;
  summary: string;
  sources: { title: string; url: string; date?: string }[];
}

export interface GlobalVigilSummary {
  timestamp: string;
  totalEstimated: string;
  categories: FatalityCategory[];
  continents: ContinentData[];
  overallAnalysis: string;
  isFallback?: boolean;
  groundingSources?: { title: string; url: string }[];
}

const CACHE_KEY = 'vigil_summary_cache_v2';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-2.5-flash"
];

export async function getGlobalFatalitySummary(forceRefresh = false): Promise<GlobalVigilSummary> {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0] + '_' + now.getHours(); // Unique key per hour
  const dynamicCacheKey = `${CACHE_KEY}_${dateKey}`;

  if (!forceRefresh) {
    const cached = localStorage.getItem(dynamicCacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (now.getTime() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  }

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
    
    TASK: Perform an exhaustive search across diverse regional and local news agencies, town-level bulletins, and village-level reports for fatalities where the INCIDENT ITSELF occurred STRICTLY within this 24-hour window in the year ${now.getFullYear()}. 
    
    SEARCH QUERY REQUIREMENT: All your search queries MUST include the terms "${now.getFullYear()}", "${now.toLocaleString('en-US', { month: 'long' })} ${now.getDate()}", "heatwave", "suicide", and "unnatural death" to avoid fetching historical results and ensure coverage of environmental fatalities.
    
    STRICT EXCLUSION RULES:
    1. DO NOT include any event that occurred before ${startTimeISO}, even if it is being reported now for the first time.
    2. YEAR LOCK: You are strictly forbidden from including results from any year other than ${now.getFullYear()}. Any event mentioning a previous year (e.g., ${now.getFullYear() - 1}, ${now.getFullYear() - 2}, etc.) MUST be discarded immediately.
    3. MONTH/DAY LOCK: All results MUST be from ${now.toLocaleString('en-US', { month: 'long' })} ${now.getDate()}, ${now.getFullYear()} or ${startTime.toLocaleString('en-US', { month: 'long' })} ${startTime.getDate()}, ${now.getFullYear()}. Any event from "last week", "3 days ago", or "April 20" (if today is April 27) MUST be discarded.
    4. NO HISTORICAL DATA: Discard all "On this day," "Anniversary," "Archive," or "Flashback" reports. 
    5. NO ONGOING TOTALS: Do not include "ongoing" death tolls unless there are specific NEW fatalities that OCCURRED in the last 24 hours.
    6. VERIFY PUBLICATION DATE: Check the date of the news article or YouTube video. If it was published before the last 24 hours (i.e., before ${startTimeUTC}), it is historical and MUST be discarded.
    7. EXCLUDE NATURAL DEATHS: Strictly exclude natural deaths, old age passings, or chronic illness deaths. Monitor only sudden, tragic, or preventable fatalities.
    8. MIRZAPUR/STALE EVENTS: There is a known stale report about a Mirzapur incident from last week—DO NOT INCLUDE IT. Discard all items that look "old" even if the website was updated recently.

    YEAR AND DATE VERIFICATION STEP:
    - For every incident you find, you MUST verify the year. If it is any year prior to ${now.getFullYear()}, it is a CRITICAL ERROR to include it.
    - URL AUDIT: Inspect the source URL. If the URL contains "/2024/", "/2025/", or any previous year in its path, it is a historical article and MUST be discarded.
    - You MUST provide a "verifiedYear" for each category, which MUST be ${now.getFullYear()}.
    - In the "sources" list, for each link, include the "date" you found for that report if available.
    
    ROPE IN NEWS FROM EVERY NOOK AND CORNER (MANDATORY REGIONAL & LOCAL COVERAGE):
    - MULTILINGUAL INTELLIGENCE: You MUST search in native languages (Russian, Chinese, Arabic, Spanish, Urdu, etc.) to capture local town and village reports that may not yet be translated to English. Translate these findings into English for the summary.
    - NATIONAL & OFFICIAL HANDLES: Search for reports from official national news handles, primary state broadcasters, and verified social media accounts of major news organizations (e.g., BBC, CNN, NDTV, Reuters, AP, and specific national broadcasters for every country).
    - VIDEO & SOCIAL: Search YouTube for recent news clips, breaking news reports, and verified citizen journalism regarding sudden fatalities. Look for channels like WION, Al Jazeera English, South China Morning Post, and local news broadcasters' YouTube handles.
    - LOCAL & GRANULAR: Search for reports from local news agencies, town-level bulletins, and village-level reports. Include data from every city, town, and village where reports are available.
    - RUSSIA & CIS: TASS, RIA Novosti, Interfax, RT, and local regional Russian-language news.
    - CHINA: Xinhua, Global Times, People's Daily, South China Morning Post (SCMP), and local provincial news bulletins in Mandarin.
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
    
    - Crime & Homicide (stabbings, shootings, violent theft that occurred in ${now.getFullYear()} - EXCLUDE any incidents with terrorist or extremist motives).
    - Accidents (Road, Rail, Air, Maritime, Industrial accidents that occurred in ${now.getFullYear()})
    - Terrorist Attacks & Armed Conflicts (ALL incidents with terrorist, extremist, or insurgent motives in ${now.getFullYear()} MUST be categorized here).
    - Heatwaves & Unnatural Deaths (Specific fatalities caused by extreme heat, heatwaves, or other unnatural causes not covered above, occurring in ${now.getFullYear()}).
    - Natural Calamities (Incidents occurring in the last 24h of ${now.getFullYear()} only)
    - Disease Outbreaks (New fatalities occurring in the last 24h of ${now.getFullYear()} only)
    - Suicide & Self-Harm (Sudden fatalities across the globe related to self-inflicted harm that occurred in the last 24h of ${now.getFullYear()} only)
    
    CONTINENT CATEGORIZATION:
    In addition to the thematic categories above, you MUST ALSO categorize ALL incidents by the seven continents: Africa, Antarctica, Asia, Europe, North America, Oceania, and South America.
    
    For each category and continent, provide:
    - An estimated fatality count based on incidents that OCCURRED in the LAST 24 HOURS ONLY, including data from local and granular reports (towns, villages, cities).
    - A concise summary of the major and local incidents, highlighting reports from specific towns or villages where available.
    - Direct, valid, and live article URLs to the reporting news agencies (prioritize diverse regional and local sources). 
    - CRITICAL: DO NOT hallucinate URLs. Only provide URLs that you have actually found in the search results. If a specific article URL is not found, provide the most relevant live page URL from that agency. Ensure the URLs are not broken (no 404s).
    
    RESPONSE FORMAT: JSON
    
    SELF-CORRECTION CHECK: Before generating the JSON, verify every single incident. If an incident is from a previous year (before ${now.getFullYear()}) or any time outside the last 24 hours of ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, YOU MUST DELETE IT FROM YOUR RESULT. Accuracy of the year ${now.getFullYear()} is your absolute priority.
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
                    verifiedYear: { type: Type.NUMBER },
                    sources: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          url: { type: Type.STRING },
                          date: { type: Type.STRING }
                        }
                      }
                    }
                  },
                  required: ["category", "count", "summary", "verifiedYear"]
                }
              },
              continents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    continent: { type: Type.STRING },
                    count: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    sources: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          url: { type: Type.STRING },
                          date: { type: Type.STRING }
                        }
                      }
                    }
                  },
                  required: ["continent", "count", "summary"]
                }
              }
            },
            required: ["timestamp", "totalEstimated", "categories", "continents", "overallAnalysis"]
          }
        },
      });

      try {
        const data = JSON.parse(response.text) as GlobalVigilSummary;
        
        // --- PROGRAMMATIC FILTERING ---
        // Final safety net: filter out any categories or sources that mention the wrong year or look stale
        const currentYearStr = new Date().getFullYear().toString();
        const prohibitedAgeKeywords = ['last week', 'days ago', 'weeks ago', 'month ago', 'years ago'];
        
        data.categories = data.categories.filter(cat => {
          const summaryLower = cat.summary.toLowerCase();
          
          // Check for forbidden age keywords in summary (except "1 day ago")
          const hasStaleKeyword = prohibitedAgeKeywords.some(keyword => {
            if (summaryLower.includes(keyword)) {
              // Be careful not to block "within the last 24 hours" if it somehow matched "hours"
              // But 'days ago' is definitely stale (>1 day)
              return true;
            }
            return false;
          });
          if (hasStaleKeyword) return false;

          // Check summary for ANY 4-digit number that is NOT the current year
          const unauthorizedYearMatch = cat.summary.match(/\b(20\d{2})\b/g);
          if (unauthorizedYearMatch) {
            const hasWrongYear = unauthorizedYearMatch.some(year => year !== currentYearStr);
            if (hasWrongYear) return false;
          }

          // Per-source filtering
          cat.sources = (cat.sources || []).filter(src => {
            const srcText = `${src.title} ${src.url} ${src.date || ''}`.toLowerCase();
            
            // Check for stale keywords in source metadata
            const hasStaleKeywordSrc = prohibitedAgeKeywords.some(kw => srcText.includes(kw));
            if (hasStaleKeywordSrc) return false;

            const yearMatch = srcText.match(/\b(20\d{2})\b/g);
            if (yearMatch) {
              const hasWrongYear = yearMatch.some(year => year !== currentYearStr);
              if (hasWrongYear) return false;
            }
            return true;
          });

          return cat.verifiedYear === parseInt(currentYearStr) && cat.sources.length > 0;
        });

        // Also filter continents sources for years
        data.continents = (data.continents || []).filter(cont => {
          cont.sources = (cont.sources || []).filter(src => {
            const srcText = `${src.title} ${src.url} ${src.date || ''}`.toLowerCase();
            const yearMatch = srcText.match(/\b(20\d{2})\b/g);
            if (yearMatch) {
              const hasWrongYear = yearMatch.some(year => year !== currentYearStr);
              if (hasWrongYear) return false;
            }
            return true;
          });
          return cont.sources.length > 0;
        });

        // Recalculate total if we filtered something out
        if (data.categories.length === 0) {
          data.totalEstimated = "0 (Filtered: No recent year matches)";
          data.overallAnalysis = "No sudden fatalities were found within the strictly monitored 24-hour window for the current year.";
        }
        
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
        localStorage.setItem(dynamicCacheKey, JSON.stringify({ data: result, timestamp: now.getTime() }));
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
        localStorage.setItem(dynamicCacheKey, JSON.stringify({ data: result, timestamp: now.getTime() }));
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

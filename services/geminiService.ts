import { GoogleGenAI, Type } from "@google/genai";
import { FightEvent, Source, Promotion } from '../types';

const CACHE_KEY = 'mma_fights_cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

const extractSources = (groundingMetadata: any): Source[] => {
    if (!groundingMetadata?.groundingChunks) return [];
    const sources: Source[] = [];
    const seenUris = new Set<string>();
    for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web && chunk.web.uri && !seenUris.has(chunk.web.uri)) {
            sources.push({
                title: chunk.web.title || chunk.web.uri,
                uri: chunk.web.uri,
            });
            seenUris.add(chunk.web.uri);
        }
    }
    return sources;
};

export const fetchUpcomingFights = async (): Promise<{ events: FightEvent[], sources: Source[] }> => {
  // 1. Check Cache First
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log("Loading from cache...");
      return data;
    }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 2. Single-Pass Prompt for maximum speed
  const prompt = `
    Search for and list major upcoming MMA fight cards for UFC, PFL, Bellator, ONE Championship, and BKFC scheduled within the next 3 months.
    
    CRITICAL: 
    1. Find specific Main Card start times (e.g., UFC PPV at 03:00 UTC).
    2. Return the data as a JSON array.
    3. The "date" field MUST be a full ISO 8601 string in UTC (e.g., "2025-01-24T22:30:00Z").
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }, // Minimize latency
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              promotion: { type: Type.STRING, enum: Object.values(Promotion) },
              eventName: { type: Type.STRING },
              date: { type: Type.STRING, description: "ISO 8601 UTC string" },
              venue: { type: Type.STRING },
              location: { type: Type.STRING },
              fightCard: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fighter1: { type: Type.STRING },
                    fighter2: { type: Type.STRING },
                    weightClass: { type: Type.STRING },
                    isMainEvent: { type: Type.BOOLEAN },
                    isCoMainEvent: { type: Type.BOOLEAN },
                  },
                  required: ['fighter1', 'fighter2', 'weightClass', 'isMainEvent', 'isCoMainEvent'],
                },
              },
            },
            required: ['promotion', 'eventName', 'date', 'venue', 'location', 'fightCard'],
          },
        },
      },
    });

    const events = JSON.parse(response.text.trim());
    const sources = extractSources(response.candidates?.[0]?.groundingMetadata);
    const result = { events, sources };

    // 3. Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: result,
      timestamp: Date.now()
    }));

    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // If API fails but we have old cache, return that as fallback
    if (cached) {
        return JSON.parse(cached).data;
    }
    throw new Error("Failed to fetch live fight data. Check your internet connection.");
  }
};

import { GoogleGenAI, Type } from "@google/genai";
import { FightEvent, Source, Promotion } from '../types';

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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const searchPrompt = `
    Find major upcoming MMA fight cards for UFC, PFL, Bellator, ONE Championship, and BKFC scheduled within the next 3 months.
    Search for the specific Main Card start time in GMT/UTC. 
    Include promotion name, event title, venue name, and city/country location.
    Identify the main event and co-main event matchups.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: searchPrompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const sources = extractSources(response.candidates?.[0]?.groundingMetadata);
    const contextText = response.text;

    const jsonPrompt = `
      Convert the following MMA event data into a clean JSON array.
      CRITICAL: The "date" field MUST be a full ISO 8601 string in UTC (e.g., "2025-05-15T22:00:00Z").
      If a specific time isn't mentioned, use a likely start time (e.g., 22:00 UTC for Europe events, 03:00 UTC for US PPVs).
      
      Data: ${contextText}
    `;

    const jsonResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: jsonPrompt,
      config: {
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

    const events = JSON.parse(jsonResponse.text.trim());
    return { events, sources };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Unable to load latest fight data. The service might be experiencing high traffic.");
  }
};

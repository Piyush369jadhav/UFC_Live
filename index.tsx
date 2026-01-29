import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---
enum Promotion {
    UFC = 'UFC',
    PFL = 'PFL',
    BKFC = 'BKFC',
    ONE = 'ONE Championship',
    BELLATOR = 'Bellator MMA',
    RIZIN = 'RIZIN FF',
}

interface Matchup {
    fighter1: string;
    fighter2: string;
    weightClass: string;
    isMainEvent: boolean;
    isCoMainEvent: boolean;
}

interface FightEvent {
    promotion: Promotion;
    eventName: string;
    date: string; 
    venue: string;
    location: string;
    fightCard: Matchup[];
}

interface Source {
    title: string;
    uri: string;
}

// --- CONSTANTS ---
const LOGO_BASE64 = 'data:image/png;base64,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';

// --- UTILS ---
const convertGMTtoIST = (isoDateStr: string) => {
    const gmt = new Date(isoDateStr);
    let year = gmt.getUTCFullYear();
    let month = gmt.getUTCMonth();
    let day = gmt.getUTCDate();
    let hours = gmt.getUTCHours();
    let minutes = gmt.getUTCMinutes();

    let total = (hours * 60) + minutes;
    total += 330; // GMT to IST (+5:30)

    let dayOffset = 0;
    if (total >= 1440) {
        total -= 1440;
        dayOffset = 1;
    } else if (total < 0) {
        total += 1440;
        dayOffset = -1;
    }

    const istHours = Math.floor(total / 60);
    const istMinutes = total % 60;
    const istDate = new Date(Date.UTC(year, month, day + dayOffset));
    
    const ampm = istHours >= 12 ? 'PM' : 'AM';
    const displayHours = istHours % 12 || 12;
    const displayMin = istMinutes.toString().padStart(2, '0');

    const dayName = istDate.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
    const monthName = istDate.toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' });
    const dateNum = istDate.getUTCDate();
    const yearNum = istDate.getUTCFullYear();

    return {
        dateStr: `${dayName}, ${monthName} ${dateNum}, ${yearNum}`,
        timeStr: `${displayHours}:${displayMin} ${ampm} IST`
    };
};

// --- SERVICES ---
const fetchUpcomingFights = async (): Promise<{ events: FightEvent[], sources: Source[] }> => {
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

    const sources: Source[] = [];
    const grounding = response.candidates?.[0]?.groundingMetadata;
    if (grounding?.groundingChunks) {
      const seen = new Set<string>();
      for (const chunk of grounding.groundingChunks) {
        if (chunk.web && chunk.web.uri && !seen.has(chunk.web.uri)) {
          sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri });
          seen.add(chunk.web.uri);
        }
      }
    }

    const jsonPrompt = `
      Convert the following MMA event data into a clean JSON array.
      CRITICAL: The "date" field MUST be a full ISO 8601 string in UTC (e.g., "2025-05-15T22:00:00Z").
      If a specific time isn't mentioned, use a likely start time (e.g., 22:00 UTC for Europe, 03:00 UTC for US PPVs).
      Data: ${response.text}
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
              date: { type: Type.STRING },
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

    return { events: JSON.parse(jsonResponse.text.trim()), sources };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Unable to load latest fight data.");
  }
};

// --- COMPONENTS ---

// Use React.FC to ensure component handles internal React props like 'key' correctly
const Header: React.FC<{ selectedPromotion: Promotion | null, onBack: () => void }> = ({ selectedPromotion, onBack }) => {
  const title = selectedPromotion ? `${selectedPromotion} Fights` : 'Upcoming MMA Fights';
  return (
    <header className="bg-[#44444E]/30 backdrop-blur-md border-b border-[#37353E]/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          {selectedPromotion && (
            <button onClick={onBack} className="flex items-center text-[#D3DAD9] hover:text-white transition-all group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="font-bold text-sm">Back</span>
            </button>
          )}
        </div>
        <div className="flex-1 text-center">
          {!selectedPromotion && <img src={LOGO_BASE64} alt="Logo" className="h-8 mx-auto mb-1" />}
          <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D3DAD9] to-[#b0b8b7] tracking-tight uppercase">{title}</h1>
          <p className="text-[10px] text-[#715A5A] font-black tracking-[0.3em] uppercase mt-0.5">app by Automation.go</p>
        </div>
        <div className="flex-1"></div>
      </div>
    </header>
  );
};

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[#715A5A]"></div>
    <p className="text-[#b0b8b7] mt-6 font-bold uppercase tracking-widest text-sm">Searching Live Data...</p>
  </div>
);

// Use React.FC to ensure component handles internal React props like 'key' correctly
const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="max-w-md mx-auto bg-red-900/20 border border-red-500/50 text-red-100 p-6 rounded-lg text-center my-10">
    <p className="font-bold text-lg mb-2">Oops!</p>
    <p className="text-sm opacity-80">{message}</p>
    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white rounded font-bold text-xs uppercase hover:bg-red-600 transition-colors">Retry</button>
  </div>
);

// Use React.FC to allow 'key' prop when mapped in lists
const FightMatchup: React.FC<{ matchup: Matchup }> = ({ matchup }) => (
  <div className="bg-[#37353E]/40 rounded-md p-3 border-l-2 border-transparent hover:border-[#715A5A] transition-all">
    <div className="flex justify-between items-center mb-2">
      <span className="text-[9px] font-black text-[#715A5A] uppercase tracking-widest">{matchup.weightClass}</span>
      <div className="flex gap-1">
        {matchup.isMainEvent && <span className="bg-[#715A5A] text-[#D3DAD9] text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Main Event</span>}
        {matchup.isCoMainEvent && <span className="bg-[#D3DAD9] text-[#37353E] text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Co-Main</span>}
      </div>
    </div>
    <div className="flex items-center justify-between text-center gap-2">
      <p className="w-[44%] font-black text-sm text-[#D3DAD9] uppercase leading-tight">{matchup.fighter1}</p>
      <span className="w-[12%] text-[#715A5A] font-bold text-[9px] italic opacity-50">VS</span>
      <p className="w-[44%] font-black text-sm text-[#D3DAD9] uppercase leading-tight">{matchup.fighter2}</p>
    </div>
  </div>
);

// Use React.FC to allow 'key' prop when mapped in lists
const FightCard: React.FC<{ event: FightEvent }> = ({ event }) => {
  const ist = convertGMTtoIST(event.date);
  const gmtStr = new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' }) + ' GMT';
  
  const logo = event.promotion === Promotion.UFC ? 'UFC' : event.promotion.split(' ')[0];

  return (
    <div className="bg-[#44444E]/60 rounded-lg shadow-xl border border-[#37353E] flex flex-col hover:border-[#715A5A]/30 transition-all">
      <div className="p-4 bg-[#37353E]/80 flex justify-between items-center border-b border-[#37353E]">
        <h2 className="text-base font-black text-[#D3DAD9] flex-1 truncate uppercase tracking-tight pr-2">{event.eventName}</h2>
        <span className="text-lg font-black italic text-[#715A5A]">{logo}</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="bg-[#715A5A]/5 border-l-4 border-[#715A5A] p-3 rounded">
          <p className="text-[9px] font-black text-[#715A5A] uppercase tracking-widest mb-1">IST (Local Time)</p>
          <p className="text-xs font-bold text-[#D3DAD9]">{ist.dateStr}</p>
          <p className="text-lg font-black text-[#715A5A]">{ist.timeStr}</p>
        </div>
        <div className="text-[10px] text-[#b0b8b7] font-semibold flex items-center gap-2">
          <svg className="w-3 h-3 text-[#715A5A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {event.venue}, {event.location}
        </div>
      </div>
      <div className="px-4 pb-4">
        <p className="text-[9px] font-black text-[#715A5A] uppercase tracking-widest border-b border-[#37353E] mb-2 pb-1">Fight Card</p>
        <div className="space-y-2">
          {event.fightCard.map((m, i) => <FightMatchup key={i} matchup={m} />)}
        </div>
      </div>
    </div>
  );
};

// Use React.FC for consistency across components
const SourceLinks: React.FC<{ sources: Source[] }> = ({ sources }) => {
  if (!sources.length) return null;
  return (
    <div className="mb-6 p-4 bg-[#44444E]/30 rounded-lg border border-[#37353E]/50">
      <p className="text-[10px] font-bold text-[#b0b8b7] uppercase mb-2 flex items-center">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM5.884 6.607a1 1 0 01-.226 1.396l-.822.603a1 1 0 11-1.17-1.594l.822-.603a1 1 0 011.396.198zm8.232 0a1 1 0 00.226 1.396l.822.603a1 1 0 101.17-1.594l-.822-.603a1 1 0 00-1.396.198zM10 6a4 4 0 100 8 4 4 0 000-8z" /></svg>
        Sourced via Google Search:
      </p>
      <div className="flex flex-wrap gap-3">
        {sources.map((s, i) => (
          <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#D3DAD9]/60 hover:text-white hover:underline transition-all">
            {new URL(s.uri).hostname}
          </a>
        ))}
      </div>
    </div>
  );
};

// --- APP ROOT ---
const App = () => {
  const [allEvents, setAllEvents] = useState<FightEvent[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    fetchUpcomingFights().then(({ events, sources }) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const filtered = events.filter(e => new Date(e.date) >= today);
      filtered.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAllEvents(filtered);
      setSources(sources);
      setIsLoading(false);
    }).catch(err => {
      setError(err.message);
      setIsLoading(false);
    });
  }, []);

  const promoCounts = useMemo(() => {
    const map = new Map<Promotion, number>();
    allEvents.forEach(e => map.set(e.promotion, (map.get(e.promotion) || 0) + 1));
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]));
  }, [allEvents]);

  if (isLoading) return <><Header selectedPromotion={null} onBack={() => {}} /><main className="p-6"><LoadingSpinner /></main></>;
  if (error) return <><Header selectedPromotion={null} onBack={() => {}} /><main className="p-6"><ErrorDisplay message={error} /></main></>;

  return (
    <div className="min-h-screen">
      <Header selectedPromotion={selectedPromotion} onBack={() => setSelectedPromotion(null)} />
      <main className="container mx-auto p-4 md:p-8">
        {!selectedPromotion ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {promoCounts.length ? promoCounts.map(([promo, count]) => (
              <button 
                key={promo} 
                onClick={() => setSelectedPromotion(promo)}
                className="group bg-[#44444E]/40 border border-[#37353E] p-6 rounded-lg hover:border-[#715A5A] hover:-translate-y-1 transition-all text-center relative overflow-hidden shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#715A5A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <h2 className="text-xl font-black text-[#D3DAD9] uppercase tracking-wider group-hover:scale-110 transition-transform">{promo.split(' ')[0]}</h2>
                <p className="text-[10px] text-[#715A5A] font-black mt-2 uppercase tracking-widest">{count} Fight{count > 1 ? 's' : ''}</p>
              </button>
            )) : (
              <div className="col-span-full text-center p-12 bg-[#44444E]/20 rounded-lg">
                <p className="text-[#b0b8b7] italic">No upcoming major cards found today. Check back soon!</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <SourceLinks sources={sources} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {allEvents.filter(e => e.promotion === selectedPromotion).map((e, i) => (
                <FightCard key={i} event={e} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);

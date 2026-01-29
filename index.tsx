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
    date: string; // ISO 8601 format string
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
/**
 * Convert GMT to IST Algorithm
 * 1. Convert hours and minutes to total minutes: total = hours × 60 + minutes
 * 2. Add +330 for GMT → IST (+5:30)
 * 3. If total ≥ 1440, subtract 1440 and increment date by 1 day
 * 4. If total < 0, add 1440 and decrement date by 1 day
 * 5. Convert back to hours = total // 60 and minutes = total % 60
 */
const convertGMTtoIST = (isoDateStr: string) => {
    const gmt = new Date(isoDateStr);
    let year = gmt.getUTCFullYear();
    let month = gmt.getUTCMonth();
    let day = gmt.getUTCDate();
    let hours = gmt.getUTCHours();
    let minutes = gmt.getUTCMinutes();

    let total = (hours * 60) + minutes;
    total += 330; 

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
    Find MAJOR upcoming MMA fight cards for UFC, PFL, Bellator, ONE Championship, and BKFC scheduled within the next 3 months.
    Identify the specific Main Card start time in GMT/UTC for each event. 
    Include promotion name, event title, venue name, and city/country location.
    List the main event and co-main event matchups with weight classes.
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
      If a specific time isn't mentioned in the text, use a likely start time (e.g., 03:00 UTC for US PPVs, 22:00 UTC for European events).
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
    throw new Error("Unable to load latest fight data from Google.");
  }
};

// --- COMPONENTS ---

const Header: React.FC<{ selectedPromotion: Promotion | null, onBack: () => void }> = ({ selectedPromotion, onBack }) => {
  const title = selectedPromotion ? `${selectedPromotion} Fights` : 'MMA Fight Tracker';
  return (
    <header className="bg-[#44444E]/40 backdrop-blur-xl border-b border-[#37353E]/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex-1">
          {selectedPromotion && (
            <button onClick={onBack} className="flex items-center text-[#D3DAD9] hover:text-white transition-all group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="font-black text-sm uppercase tracking-tighter">Back</span>
            </button>
          )}
        </div>
        <div className="flex-1 text-center">
          {!selectedPromotion && <img src={LOGO_BASE64} alt="Logo" className="h-10 mx-auto mb-2" />}
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase italic">{title}</h1>
          <p className="text-[10px] text-[#715A5A] font-black tracking-[0.4em] uppercase mt-1">Live Updates • Automation.go</p>
        </div>
        <div className="flex-1"></div>
      </div>
    </header>
  );
};

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-32">
    <div className="relative w-20 h-20">
      <div className="absolute inset-0 border-4 border-[#715A5A]/20 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-[#715A5A] rounded-full border-t-transparent animate-spin"></div>
    </div>
    <p className="text-[#D3DAD9] mt-8 font-black uppercase tracking-[0.3em] text-xs">Scanning Fight Intelligence...</p>
    <p className="text-[#715A5A] mt-2 text-[10px] font-bold uppercase italic">Grounding with Google Search</p>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="max-w-xl mx-auto bg-red-950/30 border border-red-500/50 p-8 rounded-xl text-center my-20 shadow-2xl backdrop-blur-md">
    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
    </div>
    <p className="text-white font-black text-xl mb-2 uppercase italic tracking-tighter">Communication Lost</p>
    <p className="text-red-200/70 text-sm mb-6">{message}</p>
    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest transition-all rounded shadow-lg shadow-red-900/50">Re-initiate Connection</button>
  </div>
);

const FightMatchup: React.FC<{ matchup: Matchup }> = ({ matchup }) => (
  <div className="bg-[#37353E]/60 rounded-lg p-4 border-l-4 border-transparent hover:border-[#715A5A] transition-all group">
    <div className="flex justify-between items-center mb-3">
      <span className="text-[10px] font-black text-[#715A5A] uppercase tracking-widest">{matchup.weightClass}</span>
      <div className="flex gap-1">
        {matchup.isMainEvent && <span className="bg-[#715A5A] text-white text-[8px] font-black px-2 py-1 rounded uppercase italic tracking-tight">Main Event</span>}
        {matchup.isCoMainEvent && <span className="bg-white text-[#37353E] text-[8px] font-black px-2 py-1 rounded uppercase italic tracking-tight">Co-Main</span>}
      </div>
    </div>
    <div className="flex items-center justify-between text-center gap-4">
      <div className="flex-1">
        <p className="font-black text-base text-[#D3DAD9] uppercase leading-none group-hover:text-white transition-colors">{matchup.fighter1}</p>
      </div>
      <div className="px-2">
        <span className="text-[#715A5A] font-black text-[10px] italic opacity-40">VS</span>
      </div>
      <div className="flex-1">
        <p className="font-black text-base text-[#D3DAD9] uppercase leading-none group-hover:text-white transition-colors">{matchup.fighter2}</p>
      </div>
    </div>
  </div>
);

const FightCard: React.FC<{ event: FightEvent }> = ({ event }) => {
  const ist = convertGMTtoIST(event.date);
  const promoLabel = event.promotion === Promotion.UFC ? 'UFC' : event.promotion.split(' ')[0];

  return (
    <div className="bg-[#44444E]/40 rounded-2xl shadow-2xl border border-[#37353E] flex flex-col hover:border-[#715A5A]/50 transition-all overflow-hidden group">
      <div className="p-6 bg-[#37353E]/80 flex justify-between items-center border-b border-[#37353E] group-hover:bg-[#37353E] transition-colors">
        <div className="flex-1">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter pr-4 leading-tight italic">{event.eventName}</h2>
        </div>
        <div className="bg-[#715A5A] px-3 py-1 rounded skew-x-[-10deg]">
           <span className="text-xl font-black text-white italic block skew-x-[10deg]">{promoLabel}</span>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="bg-[#715A5A]/5 border-l-4 border-[#715A5A] p-4 rounded-xl shadow-inner">
          <p className="text-[10px] font-black text-[#715A5A] uppercase tracking-[0.3em] mb-2">Local Fight Time (IST)</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <p className="text-sm font-bold text-[#D3DAD9] uppercase">{ist.dateStr}</p>
            <p className="text-2xl font-black text-[#715A5A] italic tracking-tighter">{ist.timeStr}</p>
          </div>
        </div>
        <div className="text-xs text-[#b0b8b7] font-bold flex items-center gap-2 bg-[#37353E]/40 p-3 rounded-lg border border-[#37353E]">
          <svg className="w-4 h-4 text-[#715A5A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="uppercase tracking-tight">{event.venue} — {event.location}</span>
        </div>
      </div>
      <div className="px-6 pb-6 flex-grow">
        <p className="text-[10px] font-black text-[#715A5A] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          Featured Bouts
          <span className="h-[1px] flex-grow bg-[#37353E]"></span>
        </p>
        <div className="space-y-3">
          {event.fightCard.map((m, i) => <FightMatchup key={i} matchup={m} />)}
        </div>
      </div>
    </div>
  );
};

const SourceLinks: React.FC<{ sources: Source[] }> = ({ sources }) => {
  if (!sources.length) return null;
  return (
    <div className="mb-8 p-4 bg-[#44444E]/20 rounded-xl border border-[#37353E]/50 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
          <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM5.884 6.607a1 1 0 01-.226 1.396l-.822.603a1 1 0 11-1.17-1.594l.822-.603a1 1 0 011.396.198zm8.232 0a1 1 0 00.226 1.396l.822.603a1 1 0 101.17-1.594l-.822-.603a1 1 0 00-1.396.198zM10 6a4 4 0 100 8 4 4 0 000-8z" /></svg>
        </div>
        <p className="text-[10px] font-black text-[#b0b8b7] uppercase tracking-widest">Sources:</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {sources.map((s, i) => (
          <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-[#715A5A] hover:text-white hover:underline transition-all">
            {new URL(s.uri).hostname.replace('www.', '')}
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

  const initApp = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { events, sources: fetchedSources } = await fetchUpcomingFights();
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const upcoming = events.filter(e => new Date(e.date) >= today);
      upcoming.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setAllEvents(upcoming);
      setSources(fetchedSources);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const promoCounts = useMemo(() => {
    const map = new Map<Promotion, number>();
    allEvents.forEach(e => map.set(e.promotion, (map.get(e.promotion) || 0) + 1));
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]));
  }, [allEvents]);

  return (
    <div className="min-h-screen bg-[#37353E] text-[#D3DAD9] selection:bg-[#715A5A] selection:text-white">
      <Header selectedPromotion={selectedPromotion} onBack={() => setSelectedPromotion(null)} />
      
      <main className="container mx-auto px-4 py-12">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorDisplay message={error} />
        ) : !selectedPromotion ? (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase mb-4">Choose Your Promotion</h2>
              <p className="text-[#715A5A] font-black uppercase tracking-[0.4em] text-xs">Tracking global MMA intelligence in real-time</p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {promoCounts.length ? promoCounts.map(([promo, count]) => (
                <button 
                  key={promo} 
                  onClick={() => setSelectedPromotion(promo)}
                  className="group relative bg-[#44444E]/30 border-2 border-[#37353E] p-10 rounded-2xl hover:border-[#715A5A] transition-all text-center overflow-hidden shadow-2xl hover:-translate-y-2 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#715A5A]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <h3 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter group-hover:scale-110 transition-transform duration-500">{promo.split(' ')[0]}</h3>
                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-[10px] font-black text-[#715A5A] uppercase tracking-[0.3em]">{count} Upcoming Event{count > 1 ? 's' : ''}</span>
                    <div className="w-8 h-[2px] bg-[#715A5A]/30 mt-2 group-hover:w-16 transition-all"></div>
                  </div>
                </button>
              )) : (
                <div className="col-span-full text-center py-20 bg-[#44444E]/10 rounded-3xl border-2 border-dashed border-[#37353E]">
                  <p className="text-[#715A5A] font-black italic uppercase tracking-widest">No major cards found in immediate future.</p>
                </div>
              )}
            </div>
            
            <div className="mt-20 flex justify-center">
               <button onClick={initApp} className="text-[#715A5A] hover:text-white flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 Force Sync Search Engine
               </button>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <SourceLinks sources={sources} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {allEvents.filter(e => e.promotion === selectedPromotion).map((e, i) => (
                <FightCard key={i} event={e} />
              ))}
            </div>
            {allEvents.filter(e => e.promotion === selectedPromotion).length === 0 && (
              <div className="text-center py-32">
                <p className="text-[#715A5A] font-black italic text-xl uppercase tracking-tighter">No events found for {selectedPromotion}</p>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-12 border-t border-[#37353E] mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] text-[#715A5A] font-black uppercase tracking-[0.5em]">MMA Tracker • Intelligence Protocol 2.5</p>
        </div>
      </footer>
    </div>
  );
};

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
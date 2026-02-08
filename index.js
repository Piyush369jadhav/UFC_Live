import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- CONFIG & CONSTANTS ---
const Promotion = {
    UFC: 'UFC',
    PFL: 'PFL',
    BKFC: 'BKFC',
    ONE: 'ONE Championship',
    BELLATOR: 'Bellator MMA',
    RIZIN: 'RIZIN FF',
};

const CACHE_KEY = 'mma_fights_cache_v2';
const CACHE_DURATION = 6 * 60 * 60 * 1000;
const NOTIFICATION_STORAGE_KEY = 'mma-fight-notifications';

// --- UTILITIES ---
const extractSources = (groundingMetadata) => {
    if (!groundingMetadata?.groundingChunks) return [];
    const sources = [];
    const seenUris = new Set();
    for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web && chunk.web.uri && !seenUris.has(chunk.web.uri)) {
            sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri });
            seenUris.add(chunk.web.uri);
        }
    }
    return sources;
};

const getManualIST = (isoDateStr) => {
    const gmt = new Date(isoDateStr);
    let year = gmt.getUTCFullYear();
    let month = gmt.getUTCMonth();
    let day = gmt.getUTCDate();
    let hours = gmt.getUTCHours();
    let minutes = gmt.getUTCMinutes();
    let total = (hours * 60) + minutes + 330;
    let dayOffset = 0;
    if (total >= 1440) { total -= 1440; dayOffset = 1; }
    else if (total < 0) { total += 1440; dayOffset = -1; }
    const istHours = Math.floor(total / 60);
    const istMinutes = total % 60;
    const istVirtualDate = new Date(Date.UTC(year, month, day + dayOffset));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const ampm = istHours >= 12 ? 'PM' : 'AM';
    const displayHours = istHours % 12 || 12;
    const displayMinutes = istMinutes.toString().padStart(2, '0');
    return {
        dateString: `${days[istVirtualDate.getUTCDay()]}, ${months[istVirtualDate.getUTCMonth()]} ${istVirtualDate.getUTCDate()}, ${istVirtualDate.getUTCFullYear()}`,
        timeString: `${displayHours}:${displayMinutes} ${ampm} IST`
    };
};

// --- DATA FETCHING ---
const fetchUpcomingFights = async () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) return data;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Find major upcoming MMA fight cards for UFC, PFL, Bellator, ONE, and BKFC for the next 3 months. Return as JSON array. Date must be ISO 8601 UTC.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            promotion: { type: Type.STRING },
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
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const events = JSON.parse(response.text.trim());
        const sources = extractSources(response.candidates?.[0]?.groundingMetadata);
        const result = { events, sources };
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
        return result;
    } catch (e) {
        if (cached) return JSON.parse(cached).data;
        throw e;
    }
};

// --- COMPONENTS ---
const Header = ({ selectedPromotion, onBack }) => (
    <header className="bg-[#44444E]/30 backdrop-blur-md border-b border-[#D3DAD9]/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between min-h-[80px]">
            <div className="w-20">
                {selectedPromotion && (
                    <button onClick={onBack} className="flex items-center text-[#D3DAD9] hover:text-white font-bold group">
                        <svg className="h-6 w-6 transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        <span className="ml-1 uppercase">BACK</span>
                    </button>
                )}
            </div>
            <div className="flex-1 text-center">
                <h1 className="text-xl md:text-3xl font-black text-[#D3DAD9] uppercase italic tracking-tighter">{selectedPromotion ? `${selectedPromotion} Fights` : 'Upcoming MMA Fights'}</h1>
                <p className="text-[#715A5A] text-[10px] md:text-xs font-black tracking-[0.3em] uppercase mt-1">app by Automation.go</p>
            </div>
            <div className="w-20 flex justify-end">
                {!selectedPromotion && <div className="bg-[#715A5A] p-2 rounded transform rotate-3 shadow-lg"><span className="text-white font-black text-xs italic">LIVE</span></div>}
            </div>
        </div>
    </header>
);

const FightMatchup = ({ matchup }) => (
    <div className="bg-[#37353E]/60 rounded p-4 border-l-4 border-transparent hover:border-[#715A5A] transition-colors">
        <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-[#715A5A] uppercase tracking-widest">{matchup.weightClass}</p>
            {matchup.isMainEvent && <span className="bg-[#715A5A] text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Main Event</span>}
        </div>
        <div className="flex items-center justify-between text-center gap-2">
            <div className="flex-1 font-black text-sm uppercase">{matchup.fighter1}</div>
            <div className="text-[#715A5A] text-[10px] italic">VS</div>
            <div className="flex-1 font-black text-sm uppercase">{matchup.fighter2}</div>
        </div>
    </div>
);

const FightCard = ({ event }) => {
    const ist = getManualIST(event.date);
    return (
        <div className="bg-[#44444E]/80 rounded-lg shadow-xl border border-[#37353E] transition-all hover:border-[#715A5A]/50 flex flex-col h-full overflow-hidden">
            <div className="p-4 bg-[#37353E]/70 flex justify-between items-center border-b border-[#37353E]">
                <h2 className="text-lg font-black text-[#D3DAD9] uppercase truncate">{event.eventName}</h2>
                <span className="text-xl font-black italic text-[#715A5A]">{event.promotion}</span>
            </div>
            <div className="p-4 space-y-4">
                <div className="bg-[#715A5A]/10 border-l-4 border-[#715A5A] p-3 rounded-r">
                    <p className="text-[9px] font-black text-[#715A5A] uppercase tracking-widest">IST (India)</p>
                    <p className="text-sm font-black text-[#D3DAD9]">{ist.dateString}</p>
                    <p className="text-xl font-black text-[#715A5A]">{ist.timeString}</p>
                </div>
                <div className="text-xs font-bold text-[#D3DAD9] opacity-70">
                    {event.venue}, {event.location}
                </div>
            </div>
            <div className="px-4 pb-4 flex-grow">
                <div className="grid gap-2">{event.fightCard.map((m, i) => <FightMatchup key={i} matchup={m} />)}</div>
            </div>
        </div>
    );
};

const App = () => {
    const [allEvents, setAllEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPromotion, setSelectedPromotion] = useState(null);

    const load = useCallback(async () => {
        try {
            setIsLoading(true); setError(null);
            const { events } = await fetchUpcomingFights();
            const now = Date.now();
            const upcoming = events.filter(e => new Date(e.date).getTime() > (now - 12 * 3600000))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setAllEvents(upcoming);
        } catch (err) { setError('Search currently unavailable.'); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = selectedPromotion ? allEvents.filter(e => e.promotion === selectedPromotion) : allEvents;
    const stats = useMemo(() => {
        const map = {};
        allEvents.forEach(e => map[e.promotion] = (map[e.promotion] || 0) + 1);
        return Object.entries(map).sort().map(([p, c]) => ({ p, c }));
    }, [allEvents]);

    return (
        <div className="min-h-screen bg-[#37353E] text-[#D3DAD9]">
            <Header selectedPromotion={selectedPromotion} onBack={() => setSelectedPromotion(null)} />
            <main className="container mx-auto p-4 md:p-6 pb-20">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64"><div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-[#715A5A]"></div><p className="mt-4 text-[#715A5A] font-bold">Scanning Global Fights...</p></div>
                ) : error ? (
                    <div className="text-center p-10"><p className="mb-4">{error}</p><button onClick={load} className="bg-[#715A5A] px-6 py-2 rounded font-black uppercase">Retry</button></div>
                ) : selectedPromotion ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered.map((e, i) => <FightCard key={i} event={e} />)}</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {stats.map(({ p, c }) => (
                            <button key={p} onClick={() => setSelectedPromotion(p)} className="bg-[#44444E] p-6 rounded-lg border border-[#37353E] hover:border-[#715A5A] transition-all h-32 flex flex-col items-center justify-center">
                                <h2 className="text-xl md:text-2xl font-black uppercase italic">{p}</h2>
                                <p className="text-[10px] text-[#715A5A] font-bold mt-1 uppercase">{c} Event{c > 1 ? 's' : ''}</p>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
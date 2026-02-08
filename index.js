import { GoogleGenAI, Type } from "@google/genai";

// --- STATE MANAGEMENT ---
const state = {
    events: [],
    loading: true,
    error: null,
    selectedPromotion: null,
};

// --- CONSTANTS ---
const CACHE_KEY = 'mma_fights_vanilla_v1';
const CACHE_DURATION = 1000 * 60 * 60 * 2; // 2 Hours for faster updates

// --- UTILS ---
const getManualIST = (isoDateStr) => {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return { dateString: 'TBA', timeString: 'TBA' };

    const utcTime = date.getTime();
    const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    return {
        dateString: `${days[istTime.getUTCDay()]}, ${months[istTime.getUTCMonth()]} ${istTime.getUTCDate()}, ${istTime.getUTCFullYear()}`,
        timeString: `${displayHours}:${displayMinutes} ${ampm} IST`
    };
};

// --- API SERVICE ---
const fetchFights = async () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) return data;
    }

    const ai = new GoogleGenAI({ apiKey: window.process.env.API_KEY || '' });
    const prompt = `LATEST INFO: Find major upcoming MMA cards for UFC, PFL, Bellator, ONE, and BKFC for the next 4 months. 
    Strictly upcoming only. Return JSON array. 
    Schema: promotion, eventName, date (ISO UTC), venue, location, fightCard (array of {fighter1, fighter2, weightClass, isMainEvent}).`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingBudget: 0 }, // MAX SPEED: Disable thinking
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
                                        isMainEvent: { type: Type.BOOLEAN }
                                    },
                                    required: ['fighter1', 'fighter2', 'weightClass', 'isMainEvent']
                                }
                            }
                        },
                        required: ['promotion', 'eventName', 'date', 'venue', 'location', 'fightCard']
                    }
                }
            }
        });

        const events = JSON.parse(response.text.trim());
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: events, timestamp: Date.now() }));
        return events;
    } catch (e) {
        console.error("API Error:", e);
        if (cached) return JSON.parse(cached).data;
        throw e;
    }
};

// --- RENDER FUNCTIONS ---
const render = () => {
    const root = document.getElementById('root');
    if (!root) return;

    if (state.loading) {
        root.innerHTML = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="text-center">
                    <div class="w-12 h-12 border-4 border-[#715A5A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p class="text-[#715A5A] font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">Syncing Satellite Data...</p>
                </div>
            </div>
        `;
        return;
    }

    if (state.error) {
        root.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-screen p-6">
                <div class="text-5xl mb-6 grayscale opacity-50">📡</div>
                <p class="font-black uppercase text-xs tracking-widest text-[#715A5A] mb-4">Connection Terminated</p>
                <p class="text-sm font-bold opacity-60 mb-8 text-center">${state.error}</p>
                <button onclick="window.initApp()" class="bg-[#715A5A] text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-xl">Re-establish Link</button>
            </div>
        `;
        return;
    }

    const filteredEvents = state.selectedPromotion 
        ? state.events.filter(e => e.promotion === state.selectedPromotion)
        : state.events;

    const promotionCounts = {};
    state.events.forEach(e => {
        promotionCounts[e.promotion] = (promotionCounts[e.promotion] || 0) + 1;
    });
    const promotions = Object.entries(promotionCounts).sort((a, b) => b[1] - a[1]);

    root.innerHTML = `
        <header class="bg-[#44444E]/30 backdrop-blur-xl border-b border-[#D3DAD9]/10 sticky top-0 z-50 p-4">
            <div class="container mx-auto flex items-center justify-between">
                <div class="w-20">
                    ${state.selectedPromotion ? `
                        <button onclick="window.selectPromotion(null)" class="text-[#D3DAD9] font-black uppercase text-xs hover:text-[#715A5A] transition-all flex items-center gap-1 group">
                            <span class="group-hover:-translate-x-1 transition-transform">←</span> BACK
                        </button>
                    ` : ''}
                </div>
                <div class="text-center">
                    <h1 class="text-xl md:text-3xl font-black italic uppercase tracking-tighter leading-none">
                        ${state.selectedPromotion || 'MMA TRACKER'}
                    </h1>
                    <p class="text-[10px] text-[#715A5A] font-bold uppercase tracking-[0.3em] mt-1">Satellite Grounding Enabled</p>
                </div>
                <div class="w-20 flex justify-end">
                    <div class="bg-[#715A5A] px-2 py-1 rounded-sm rotate-3 shadow-xl">
                        <span class="text-white text-[10px] font-black italic">LIVE</span>
                    </div>
                </div>
            </div>
        </header>

        <main class="container mx-auto p-4 md:p-10 max-w-7xl pb-20">
            ${state.selectedPromotion ? `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${filteredEvents.map(event => renderEventCard(event)).join('')}
                </div>
            ` : `
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    ${promotions.map(([p, c]) => `
                        <button onclick="window.selectPromotion('${p}')" class="group relative bg-[#44444E]/20 p-10 rounded-3xl border border-[#D3DAD9]/5 hover:border-[#715A5A] transition-all h-48 flex flex-col items-center justify-center overflow-hidden active:scale-[0.97] shadow-xl">
                            <div class="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#715A5A]/5 group-hover:to-[#715A5A]/10 transition-all"></div>
                            <h2 class="text-3xl md:text-4xl font-black italic uppercase tracking-tighter z-10 group-hover:scale-105 transition-transform duration-500 text-[#D3DAD9]">${p}</h2>
                            <p class="text-[10px] text-[#715A5A] font-black mt-3 uppercase tracking-widest z-10 group-hover:text-[#D3DAD9] transition-colors">${c} EVENT${c > 1 ? 'S' : ''}</p>
                        </button>
                    `).join('')}
                </div>
            `}
        </main>

        <footer class="fixed bottom-0 left-0 right-0 p-4 bg-[#37353E]/90 backdrop-blur-xl border-t border-[#D3DAD9]/5 text-center text-[8px] font-black uppercase tracking-[0.5em] text-[#715A5A]/60 z-40">
            Satellite MMA Network • Real-time Grounding Enabled • Automation.go
        </footer>
    `;
};

const renderEventCard = (event) => {
    const ist = getManualIST(event.date);
    return `
        <div class="bg-[#44444E]/30 rounded-2xl overflow-hidden border border-[#D3DAD9]/5 hover:border-[#715A5A]/50 transition-all flex flex-col h-full shadow-2xl">
            <div class="p-4 bg-[#37353E]/80 border-b border-[#D3DAD9]/5 flex justify-between items-center">
                <h2 class="font-black uppercase truncate text-sm tracking-tight flex-1 mr-2">${event.eventName}</h2>
                <span class="text-[10px] font-black italic text-[#715A5A] bg-[#37353E] px-2 py-1 rounded border border-[#715A5A]/20">${event.promotion}</span>
            </div>
            
            <div class="p-5 bg-gradient-to-br from-[#715A5A]/5 to-transparent border-b border-[#D3DAD9]/5">
                <p class="text-[9px] font-bold text-[#715A5A] uppercase tracking-[0.2em] mb-1">Schedule (IST)</p>
                <p class="font-black text-2xl text-[#D3DAD9] leading-none mb-1">${ist.timeString}</p>
                <p class="text-xs font-bold opacity-40">${ist.dateString}</p>
            </div>

            <div class="px-5 py-4 space-y-2 flex-grow">
                ${event.fightCard.map(m => `
                    <div class="bg-[#37353E]/60 p-3 rounded border border-transparent hover:border-[#715A5A]/40 transition-all">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[8px] font-black text-[#715A5A] uppercase tracking-widest">${m.weightClass}</span>
                            ${m.isMainEvent ? `<span class="bg-[#715A5A] text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow">MAIN</span>` : ''}
                        </div>
                        <div class="flex items-center justify-between font-black text-sm uppercase">
                            <span class="flex-1 text-left truncate">${m.fighter1}</span>
                            <span class="mx-3 text-[9px] text-[#715A5A] italic opacity-50">VS</span>
                            <span class="flex-1 text-right truncate">${m.fighter2}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="p-4 bg-[#37353E]/40 text-[10px] font-black opacity-30 text-center border-t border-[#D3DAD9]/5 uppercase tracking-widest">
                ${event.venue} // ${event.location}
            </div>
        </div>
    `;
};

// --- CONTROLLERS ---
window.selectPromotion = (p) => {
    state.selectedPromotion = p;
    render();
};

window.initApp = async () => {
    try {
        state.loading = true;
        state.error = null;
        render();

        const data = await fetchFights();
        const now = Date.now();
        state.events = data
            .filter(e => new Date(e.date).getTime() > (now - (12 * 60 * 60 * 1000)))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        state.loading = false;
        render();
    } catch (e) {
        state.loading = false;
        state.error = "Satellite sync failed. Global fight feeds are currently unreachable.";
        render();
    }
};

// Start the app
window.initApp();

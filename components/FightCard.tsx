
import React from 'react';
import { FightEvent, Promotion } from '../types';
import FightMatchup from './FightMatchup';
import NotificationButton from './NotificationButton';

interface FightCardProps {
  event: FightEvent;
}

const getPromotionStyles = (promotion: Promotion) => {
    const styles = { textColor: 'text-[#715A5A]' };
    switch (promotion) {
        case Promotion.UFC: return { logo: 'UFC', ...styles };
        case Promotion.PFL: return { logo: 'PFL', ...styles };
        case Promotion.BKFC: return { logo: 'BKFC', ...styles };
        case Promotion.ONE: return { logo: 'ONE', ...styles };
        case Promotion.BELLATOR: return { logo: 'BELLATOR', ...styles };
        default: return { logo: promotion, ...styles };
    }
}

/**
 * EXACT ALGORITHM IMPLEMENTATION:
 * 1. Convert hours and minutes to total minutes: total = hours × 60 + minutes
 * 2. Add +330 for GMT → IST
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

    // 1. Total minutes
    let total = (hours * 60) + minutes;

    // 2. Add +330
    total += 330;

    // 3 & 4. Rollover logic
    let dayOffset = 0;
    if (total >= 1440) {
        total -= 1440;
        dayOffset = 1;
    } else if (total < 0) {
        total += 1440;
        dayOffset = -1;
    }

    // 5. Back to hours/minutes
    const istHours = Math.floor(total / 60);
    const istMinutes = total % 60;

    // Use a date object to handle calendar math for the day/month/year rollover
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

const FightCard: React.FC<FightCardProps> = ({ event }) => {
    const { logo, textColor } = getPromotionStyles(event.promotion);
    const ist = convertGMTtoIST(event.date);
    const gmtDate = new Date(event.date);

    const gmtDisplay = gmtDate.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC'
    }) + ' GMT';

  return (
    <div className="bg-[#44444E]/80 rounded-lg shadow-lg overflow-hidden border border-[#37353E] flex flex-col transition-all duration-300 hover:border-[#715A5A]/40">
      <div className="p-4 bg-[#37353E]/70 flex justify-between items-center border-b border-[#37353E]">
        <h2 className="text-lg md:text-xl font-black text-[#D3DAD9] flex-1 truncate pr-2 uppercase tracking-tight">{event.eventName}</h2>
        <div className="flex items-center space-x-3">
          <NotificationButton event={event} />
          <span className={`text-xl md:text-2xl font-black italic ${textColor} opacity-80`}>{logo}</span>
        </div>
      </div>
      
      <div className="p-5 space-y-5">
        <div className="flex items-start">
          <div className="bg-[#715A5A]/10 p-2 rounded mr-3 mt-1 text-[#715A5A]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col space-y-3 w-full">
            <div>
                <p className="text-[10px] font-black text-[#715A5A] uppercase tracking-widest opacity-60">Global Time</p>
                <p className="text-xs font-bold text-[#b0b8b7]">{gmtDisplay}</p>
            </div>
            
            <div className="bg-[#715A5A]/5 border-l-4 border-[#715A5A] p-3 rounded shadow-sm">
              <p className="text-[10px] font-black text-[#715A5A] uppercase tracking-widest mb-1">🇮🇳 India Standard Time (IST)</p>
              <p className="text-base font-black text-[#D3DAD9]">{ist.dateStr}</p>
              <p className="text-xl font-black text-[#715A5A]">{ist.timeStr}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center text-[#D3DAD9] bg-[#37353E]/20 p-3 rounded border border-[#37353E]/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-[#715A5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <p className="text-sm font-semibold text-[#D3DAD9]">{event.venue}, {event.location}</p>
        </div>
      </div>

      <div className="px-5 pb-5 flex-grow">
        <h3 className="text-[10px] font-black text-[#715A5A] mb-3 border-b border-[#37353E] pb-2 uppercase tracking-widest">Full Matchups</h3>
        <div className="space-y-2">
          {event.fightCard.map((matchup, index) => (
            <FightMatchup key={index} matchup={matchup} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FightCard;


import React from 'react';
import { Matchup } from '../types';

interface FightMatchupProps {
  matchup: Matchup;
}

const FightMatchup: React.FC<FightMatchupProps> = ({ matchup }) => {
  return (
    <div className="bg-[#37353E]/40 rounded p-3 border-l-2 border-transparent hover:border-[#715A5A] transition-colors duration-200">
      <div className="flex justify-between items-center mb-2">
        <p className="text-[9px] font-black text-[#715A5A] uppercase tracking-widest">{matchup.weightClass}</p>
        <div className="flex gap-1.5">
            {matchup.isMainEvent && <span className="bg-[#715A5A] text-[#D3DAD9] text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Main Event</span>}
            {matchup.isCoMainEvent && <span className="bg-[#D3DAD9] text-[#37353E] text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Co-Main</span>}
        </div>
      </div>
      <div className="flex items-center justify-between text-center gap-2">
        <div className="w-[44%]">
            <p className="font-black text-sm md:text-base text-[#D3DAD9] uppercase tracking-tight leading-tight">{matchup.fighter1}</p>
        </div>
        <div className="w-[12%]">
            <span className="text-[#715A5A] font-bold text-[10px] italic opacity-50">VS</span>
        </div>
        <div className="w-[44%]">
            <p className="font-black text-sm md:text-base text-[#D3DAD9] uppercase tracking-tight leading-tight">{matchup.fighter2}</p>
        </div>
      </div>
    </div>
  );
};

export default FightMatchup;

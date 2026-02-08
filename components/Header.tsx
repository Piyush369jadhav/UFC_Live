import React from 'react';
import { Promotion } from '../types';

interface HeaderProps {
  selectedPromotion: Promotion | null;
  onBack: () => void;
}

const Header: React.FC<HeaderProps> = ({ selectedPromotion, onBack }) => {
  const title = selectedPromotion ? `${selectedPromotion} Fights` : 'Upcoming MMA Fights';
  const subtitleText = selectedPromotion ? 'Live Data via Google Search' : 'app by Automation.go';

  return (
    <header className="bg-[#44444E]/30 backdrop-blur-md border-b border-[#D3DAD9]/10 sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between min-h-[80px]">
        <div className="w-20 flex justify-start">
          {selectedPromotion && (
            <button 
              onClick={onBack}
              className="flex items-center text-[#D3DAD9] hover:text-white transition-all duration-200 group"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="ml-1 font-bold">BACK</span>
            </button>
          )}
        </div>

        <div className="flex-1 text-center">
            <h1 className="text-xl md:text-3xl font-black text-[#D3DAD9] tracking-tighter uppercase italic">
              {title}
            </h1>
            <p className="text-[#715A5A] text-[10px] md:text-xs font-black tracking-[0.3em] uppercase mt-1">
              {subtitleText}
            </p>
        </div>

        <div className="w-20 flex justify-end">
            {!selectedPromotion && (
              <div className="bg-[#715A5A] p-2 rounded transform rotate-3 shadow-lg">
                <span className="text-white font-black text-xs italic">LIVE</span>
              </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
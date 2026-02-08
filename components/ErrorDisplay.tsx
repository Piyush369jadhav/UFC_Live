import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="bg-[#715A5A]/20 border border-[#715A5A]/50 text-[#D3DAD9] px-6 py-4 rounded-lg relative text-center max-w-lg" role="alert">
        <strong className="font-bold block mb-1 text-xl">Connection Issue</strong>
        <span className="block sm:inline opacity-80">{message}</span>
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="bg-[#715A5A] hover:bg-[#8b6e6e] text-white font-black py-3 px-8 rounded-md transition-all uppercase tracking-widest shadow-lg"
      >
        Retry Fetch
      </button>
    </div>
  );
};

export default ErrorDisplay;
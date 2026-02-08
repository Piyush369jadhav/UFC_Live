import React, { useState, useEffect, useCallback } from 'react';
import { FightEvent, Source, Promotion } from './types';
import { fetchUpcomingFights } from './services/geminiService';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import PromotionGrid from './components/PromotionGrid';
import PromotionView from './components/PromotionView';

const App: React.FC = () => {
  const [allEvents, setAllEvents] = useState<FightEvent[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

  const loadFights = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { events: generatedEvents, sources: fetchedSources } = await fetchUpcomingFights();

      const now = new Date();
      // Filter out events that ended more than 12 hours ago
      const upcomingEvents = generatedEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getTime() > (now.getTime() - 12 * 60 * 60 * 1000);
      });

      upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setAllEvents(upcomingEvents);
      setSources(fetchedSources);
    } catch (err) {
      setError('Live data search is currently unavailable. Please check back in a few minutes.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFights();
  }, [loadFights]);

  const handleSelectPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
  };

  const handleGoBack = () => {
    setSelectedPromotion(null);
  };

  const renderContent = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error && allEvents.length === 0) return <ErrorDisplay message={error} />;
    
    if (selectedPromotion) {
        const promotionEvents = allEvents.filter(event => event.promotion === selectedPromotion);
        return (
            <PromotionView 
                promotion={selectedPromotion}
                events={promotionEvents}
                sources={sources}
            />
        );
    }

    return <PromotionGrid events={allEvents} onSelectPromotion={handleSelectPromotion} />;
  }

  return (
    <div className="min-h-screen font-sans bg-[#37353E] text-[#D3DAD9]">
      <Header 
        selectedPromotion={selectedPromotion} 
        onBack={handleGoBack} 
      />
      <main className="container mx-auto p-4 md:p-6 pb-20">
        {renderContent()}
      </main>
      
      {/* Quick Refresh Indicator */}
      {!isLoading && !error && (
          <div className="fixed bottom-4 right-4 text-[10px] text-[#715A5A] font-bold uppercase tracking-widest opacity-40">
              Data Cached for 6h
          </div>
      )}
    </div>
  );
};

export default App;
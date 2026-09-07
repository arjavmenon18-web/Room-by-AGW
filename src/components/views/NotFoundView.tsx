import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMeeting } from '../../context/MeetingContext';

interface NotFoundViewProps {
  onGoHome?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome }) => {
  const { atmosphere, setView } = useMeeting();
  const isDark = atmosphere === 'obsidian';

  const handleHome = () => {
    try {
      window.history.pushState(null, '', '/');
    } catch (e) {
      // ignore
    }
    if (onGoHome) {
      onGoHome();
    } else {
      setView('home');
    }
  };

  return (
    <main id="not-found-view" className="flex-1 flex items-center justify-center p-6 sm:p-12 min-h-[calc(100vh-5rem)]">
      <div className={`max-w-md w-full rounded-2xl border p-8 sm:p-10 shadow-xl text-center space-y-6 transition-colors ${
        isDark 
          ? 'bg-[#181614] border-[#2f2b24] text-[#eae5dc]' 
          : 'bg-[#faf8f4] border-[#ded7ca] text-[#1a1917]'
      }`}>
        <div className="space-y-2.5">
          <h2 className={`font-serif text-2xl sm:text-3xl font-normal tracking-tight ${
            isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
          }`}>
            Page not found
          </h2>
          <p className={`text-sm sm:text-base leading-relaxed max-w-sm mx-auto ${
            isDark ? 'text-[#9c9485]' : 'text-[#6e685d]'
          }`}>
            The page you are looking for does not exist or may have been relocated.
          </p>
        </div>

        <div className="pt-4 border-t flex items-center justify-center border-[#eae3d5]/30">
          <button
            type="button"
            id="btn-not-found-home"
            onClick={handleHome}
            className={`inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-medium transition-colors shadow-sm ${
              isDark
                ? 'bg-[#f5f1ea] hover:bg-white text-[#141312] font-semibold'
                : 'bg-[#1a1917] hover:bg-[#2d2a26] text-white'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </main>
  );
};

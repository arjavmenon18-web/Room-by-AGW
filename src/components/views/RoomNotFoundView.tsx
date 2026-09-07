import React from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useMeeting } from '../../context/MeetingContext';

interface RoomNotFoundViewProps {
  roomCode?: string;
  onGoHome?: () => void;
  onCreateRoom?: () => void;
}

export const RoomNotFoundView: React.FC<RoomNotFoundViewProps> = ({
  roomCode,
  onGoHome,
  onCreateRoom,
}) => {
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

  const handleCreate = () => {
    if (onCreateRoom) {
      onCreateRoom();
    } else {
      setView('home');
    }
  };

  return (
    <main id="room-not-found-view" className="flex-1 flex items-center justify-center p-6 sm:p-12 min-h-[calc(100vh-5rem)]">
      <div className={`max-w-md w-full rounded-2xl border p-8 sm:p-10 shadow-xl text-center space-y-6 transition-colors ${
        isDark 
          ? 'bg-[#181614] border-[#2f2b24] text-[#eae5dc]' 
          : 'bg-[#faf8f4] border-[#ded7ca] text-[#1a1917]'
      }`}>
        {roomCode && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wide uppercase bg-[#148b94]/10 text-[#148b94] border border-[#148b94]/20">
            {roomCode}
          </div>
        )}

        <div className="space-y-2.5">
          <h2 className={`font-serif text-2xl sm:text-3xl font-normal tracking-tight ${
            isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
          }`}>
            Room not found
          </h2>
          <p className={`text-sm sm:text-base leading-relaxed max-w-sm mx-auto ${
            isDark ? 'text-[#9c9485]' : 'text-[#6e685d]'
          }`}>
            Check the invite link and try again.
          </p>
        </div>

        <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-center gap-3 border-[#eae3d5]/30">
          <button
            type="button"
            id="btn-return-home"
            onClick={handleHome}
            className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-colors border ${
              isDark
                ? 'border-[#36312a] bg-[#201d19] hover:bg-[#28251f] text-[#eae5dc]'
                : 'border-[#d8d2c5] bg-white hover:bg-[#f5f1ea] text-[#1a1917]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Return to Home</span>
          </button>

          <button
            type="button"
            id="btn-create-new-room"
            onClick={handleCreate}
            className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-colors shadow-sm ${
              isDark
                ? 'bg-[#f5f1ea] hover:bg-white text-[#141312] font-semibold'
                : 'bg-[#1a1917] hover:bg-[#2d2a26] text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Create a room</span>
          </button>
        </div>
      </div>
    </main>
  );
};

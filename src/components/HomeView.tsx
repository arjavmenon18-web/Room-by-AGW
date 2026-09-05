import React, { useState, useEffect } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Plus, ArrowRight, ArrowUpRight, Copy, Check } from 'lucide-react';

interface HomeViewProps {
  onOpenCreate?: () => void;
  onOpenJoin?: () => void;
  onCreateRoom?: () => void;
  onJoinRoom?: () => void;
}

interface SavedRoom {
  id: string;
  title: string;
  timestamp: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  onOpenCreate, 
  onOpenJoin,
  onCreateRoom,
  onJoinRoom
}) => {
  const handleOpenCreate = onOpenCreate || onCreateRoom || (() => {});
  const handleOpenJoin = onOpenJoin || onJoinRoom || (() => {});

  const { joinRoomById, atmosphere } = useMeeting();
  const isDark = atmosphere === 'obsidian';
  const [recentRoomsList, setRecentRoomsList] = useState<SavedRoom[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('room_user_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentRoomsList(parsed.slice(0, 5));
        }
      }
    } catch {
      setRecentRoomsList([]);
    }
  }, []);

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/join/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`min-h-[calc(100vh-65px)] room-surface-depth flex flex-col justify-between transition-colors duration-200 ${
      isDark 
        ? 'text-[#eae5dc] selection:bg-[#148b94]/30 selection:text-[#f5f1ea]' 
        : 'text-[#1a1917] selection:bg-[#148b94]/20 selection:text-[#1a1917]'
    }`}>
      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-20 pb-12 sm:pb-16">
        {/* Brand & Editorial Introduction */}
        <section className="space-y-4 mb-12 sm:mb-20">
          <div className="space-y-2">
            <div className={`text-[10px] sm:text-[11px] uppercase tracking-[0.24em] font-mono font-medium pl-1 select-none transition-colors ${
              isDark ? 'text-[#9c9588]' : 'text-[#968f82]'
            }`}>
              Armen GlobalWorks
            </div>
            <h1 className={`font-serif text-6xl sm:text-8xl md:text-[98px] font-normal tracking-[-0.035em] leading-[0.88] select-none transition-colors duration-200 ${
              isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
            }`}>
              ROOM
            </h1>
          </div>

          <p className={`text-base sm:text-lg font-light max-w-lg leading-relaxed pt-1.5 tracking-[-0.01em] transition-colors ${
            isDark ? 'text-[#b5ada1]' : 'text-[#696358]'
          }`}>
            A quiet space to meet, create, and collaborate.
          </p>
        </section>

        {/* Primary Actions: Crafted Material Surfaces */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-14 sm:mb-20">
          {/* Create Room Button (Warm Tactile Primary Action) */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className={`group text-left p-6 sm:p-7 rounded-2xl border hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[155px] sm:min-h-[175px] ${
              isDark
                ? 'bg-[#1a1816] hover:bg-[#22201c] border-[#2f2b24] hover:border-[#464036] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_24px_-6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'bg-[#f4f0e7] hover:bg-[#ece6d8] border-[#ded6c8] hover:border-[#c8bfaf] shadow-[0_1px_2px_rgba(45,38,28,0.04),0_8px_24px_-6px_rgba(45,38,28,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] hover:shadow-[0_2px_4px_rgba(45,38,28,0.05),0_12px_28px_-6px_rgba(45,38,28,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-8 h-8 rounded-full border shadow-sm flex items-center justify-center text-[#148b94] transition-colors ${
                isDark ? 'bg-[#25221d] border-[#38332a]' : 'bg-[#fdfcf9] border-[#ded8cc]'
              }`}>
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              </span>
              <ArrowRight className={`w-4 h-4 group-hover:translate-x-1 transition-all duration-150 ${
                isDark ? 'text-[#7d7669] group-hover:text-[#f5f1ea]' : 'text-[#8a8479] group-hover:text-[#1a1917]'
              }`} strokeWidth={1.5} />
            </div>

            <div className="space-y-1 pt-5 sm:pt-6">
              <h2 className={`text-[17px] sm:text-lg font-medium tracking-tight transition-colors ${
                isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
              }`}>
                Create a room
              </h2>
              <p className={`text-xs font-light leading-relaxed transition-colors ${
                isDark ? 'text-[#9e9688]' : 'text-[#706a60]'
              }`}>
                Start a private room and share the link.
              </p>
            </div>
          </button>

          {/* Join Room Button (Neutral Refined Action) */}
          <button
            type="button"
            onClick={handleOpenJoin}
            className={`group text-left p-6 sm:p-7 rounded-2xl border hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[155px] sm:min-h-[175px] ${
              isDark
                ? 'bg-[#161513] hover:bg-[#1d1b18] border-[#2a2620] hover:border-[#3e372e] shadow-[0_1px_2px_rgba(0,0,0,0.3),0_8px_20px_-6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]'
                : 'bg-[#faf8f3] hover:bg-[#f3efe5] border-[#e2dcd0] hover:border-[#cdc5b7] shadow-[0_1px_2px_rgba(45,38,28,0.03),0_8px_20px_-6px_rgba(45,38,28,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_2px_4px_rgba(45,38,28,0.04),0_12px_24px_-6px_rgba(45,38,28,0.05),inset_0_1px_0_rgba(255,255,255,0.95)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                isDark ? 'bg-[#22201c] border-[#332e26] text-[#ded7ca]' : 'bg-[#f1ede3] border-[#ded7ca] text-[#2d2b27]'
              }`}>
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
              </span>
              <ArrowRight className={`w-4 h-4 group-hover:translate-x-1 transition-all duration-150 ${
                isDark ? 'text-[#7d7669] group-hover:text-[#f5f1ea]' : 'text-[#8a8479] group-hover:text-[#1a1917]'
              }`} strokeWidth={1.5} />
            </div>

            <div className="space-y-1 pt-5 sm:pt-6">
              <h2 className={`text-[17px] sm:text-lg font-medium tracking-tight transition-colors ${
                isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
              }`}>
                Join a room
              </h2>
              <p className={`text-xs font-light leading-relaxed transition-colors ${
                isDark ? 'text-[#9e9688]' : 'text-[#706a60]'
              }`}>
                Enter with a room code or link.
              </p>
            </div>
          </button>
        </section>

        {/* Recent Rooms Section */}
        <section className={`space-y-4 pt-6 border-t transition-colors ${
          isDark ? 'border-[#27231e]' : 'border-[#e8e2d5]/80'
        }`}>
          <div className="flex items-center justify-between px-1">
            <h3 className={`text-[10px] uppercase tracking-[0.24em] font-mono font-medium select-none transition-colors ${
              isDark ? 'text-[#888173]' : 'text-[#948e82]'
            }`}>
              Recent
            </h3>
          </div>

          {recentRoomsList.length === 0 ? (
            <div className={`py-10 text-center rounded-2xl border transition-colors ${
              isDark 
                ? 'border-[#2a2620] bg-[#161513]/70 text-[#857e72]' 
                : 'border-[#ded7ca]/70 bg-[#faf8f4]/60 text-[#8c867a]'
            }`}>
              <p className="text-xs font-light">
                Your rooms will appear here.
              </p>
            </div>
          ) : (
            <div className={`divide-y rounded-2xl border overflow-hidden transition-colors ${
              isDark
                ? 'divide-[#24211c] border-[#292620] bg-[#171614] shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
                : 'divide-[#ebe4d7] border-[#ded7ca] bg-[#faf8f4] shadow-[0_1px_3px_rgba(45,38,28,0.03),inset_0_1px_0_rgba(255,255,255,0.7)]'
            }`}>
              {recentRoomsList.map((r) => (
                <div
                  key={r.id}
                  onClick={() => joinRoomById(r.id)}
                  className={`p-4 sm:px-5 flex items-center justify-between transition-colors cursor-pointer group ${
                    isDark ? 'hover:bg-[#201d19]' : 'hover:bg-[#f3efe6]/80'
                  }`}
                >
                  <div className="space-y-1 truncate pr-4">
                    <div className={`text-[14px] font-medium group-hover:text-[#148b94] transition-colors truncate ${
                      isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
                    }`}>
                      {r.title || 'Room'}
                    </div>
                    <div className={`text-[11px] font-mono tracking-wider transition-colors ${
                      isDark ? 'text-[#7d7669]' : 'text-[#857f72]'
                    }`}>
                      {r.id}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopy(r.id, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDark 
                          ? 'hover:bg-[#27231e] text-[#7d7669] hover:text-[#f5f1ea]' 
                          : 'hover:bg-[#eae3d5] text-[#8c867a] hover:text-[#1a1917]'
                      }`}
                      title="Copy link"
                    >
                      {copiedId === r.id ? (
                        <Check className="w-3.5 h-3.5 text-[#148b94]" strokeWidth={2} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                      )}
                    </button>
                    <span className="text-xs text-[#148b94] font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center space-x-1 pl-1">
                      <span>Enter</span>
                      <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Subtle Editorial Footer */}
      <footer className={`max-w-3xl w-full mx-auto px-6 py-8 text-[11px] border-t flex items-center justify-between select-none transition-colors ${
        isDark 
          ? 'border-[#26231e] text-[#7a7467]' 
          : 'border-[#e8e2d5]/80 text-[#9c9588]'
      }`}>
        <span className={`font-serif text-sm tracking-tight transition-colors ${
          isDark ? 'text-[#9c9486]' : 'text-[#787266]'
        }`}>
          ROOM
        </span>
        <span className="font-mono tracking-[0.16em] uppercase text-[10px]">
          Armen GlobalWorks
        </span>
      </footer>
    </div>
  );
};

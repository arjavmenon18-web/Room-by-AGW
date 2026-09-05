import React, { useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { X, ArrowRight } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose }) => {
  const { user, joinRoomById, atmosphere } = useMeeting();
  const isDark = atmosphere === 'obsidian';
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState(user.name);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    // Extract room code if full URL was pasted (path or query param)
    let cleanCode = roomCode.trim();
    const queryMatch = cleanCode.match(/[?&](?:room|code)=([A-Za-z0-9-_]+)/i);
    const pathMatch = cleanCode.match(/(?:room|join)\/([A-Za-z0-9-_]+)/i);
    if (queryMatch && queryMatch[1]) {
      cleanCode = queryMatch[1];
    } else if (pathMatch && pathMatch[1]) {
      cleanCode = pathMatch[1];
    }

    if (/^\d{4}$/.test(cleanCode)) {
      cleanCode = `Room-agw-${cleanCode}`;
    } else {
      const agwMatch = cleanCode.match(/^room-agw-(\d{4})$/i);
      if (agwMatch) {
        cleanCode = `Room-agw-${agwMatch[1]}`;
      }
    }

    // Save to real recent room history
    try {
      const stored = localStorage.getItem('room_user_history');
      const history = stored ? JSON.parse(stored) : [];
      const updated = [
        { id: cleanCode, title: 'Room Session', timestamp: Date.now() },
        ...history.filter((h: any) => h.id !== cleanCode),
      ].slice(0, 10);
      localStorage.setItem('room_user_history', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not update history:', err);
    }

    joinRoomById(cleanCode, displayName.trim() || user.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a09]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden room-grain transition-colors ${
        isDark 
          ? 'bg-[#181614] border-[#2f2b24] text-[#eae5dc]' 
          : 'bg-[#faf8f4] border-[#ded7ca] text-[#1a1917]'
      }`}>
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isDark ? 'border-[#28251f]' : 'border-[#eae3d5]'
        }`}>
          <h3 className={`font-serif text-xl sm:text-[22px] font-normal tracking-tight transition-colors ${
            isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
          }`}>
            Join a room
          </h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-[#8a8479] hover:text-[#f5f1ea] hover:bg-[#26231e]' : 'text-[#8a8479] hover:text-[#1a1917] hover:bg-[#ede7db]'
            }`}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className={`text-[11px] font-medium tracking-wide uppercase font-mono ${
              isDark ? 'text-[#8c8577]' : 'text-[#857e72]'
            }`}>
              Room code or link
            </label>
            <input
              type="text"
              placeholder="Room-agw-1042"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              required
              autoFocus
              className={`w-full border focus:border-[#148b94] focus:ring-1 focus:ring-[#148b94]/20 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-[#201d19] border-[#36312a] text-[#f5f1ea] placeholder-[#6e685f]' 
                  : 'bg-[#fdfcf9] border-[#d8d2c5] text-[#1a1917] placeholder-[#a6a094]'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={`text-[11px] font-medium tracking-wide uppercase font-mono ${
              isDark ? 'text-[#8c8577]' : 'text-[#857e72]'
            }`}>
              Your name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Your name"
              className={`w-full border focus:border-[#148b94] focus:ring-1 focus:ring-[#148b94]/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-[#201d19] border-[#36312a] text-[#f5f1ea] placeholder-[#6e685f]' 
                  : 'bg-[#fdfcf9] border-[#d8d2c5] text-[#1a1917] placeholder-[#a6a094]'
              }`}
            />
          </div>

          <div className={`pt-4 border-t flex items-center justify-end space-x-2.5 ${
            isDark ? 'border-[#28251f]' : 'border-[#eae3d5]'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs transition-colors ${
                isDark ? 'text-[#8c8577] hover:text-[#f5f1ea]' : 'text-[#7c7569] hover:text-[#1a1917]'
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!roomCode.trim()}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 shadow-sm ${
                isDark
                  ? 'bg-[#f5f1ea] hover:bg-white text-[#141312] font-semibold'
                  : 'bg-[#1a1917] hover:bg-[#2d2a26] text-white'
              }`}
            >
              <span>Join room</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

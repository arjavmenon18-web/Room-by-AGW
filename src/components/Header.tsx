import React from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Settings as SettingsIcon } from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { 
    view, 
    setView, 
    leaveRoom,
    user, 
    room, 
    firebaseUser, 
    signInWithGoogleAuth, 
    signOutFirebaseAuth,
    atmosphere,
  } = useMeeting();

  const isDark = atmosphere === 'obsidian';

  const handleBrandClick = () => {
    if (view === 'meeting') return;
    if (view === 'pre-join' || view === 'waiting-room') {
      leaveRoom(false);
    } else {
      setView('home');
    }
  };

  return (
    <header className={`w-full border-b bg-transparent px-6 sm:px-8 py-4 z-40 transition-colors ${
      isDark ? 'border-[#26231e]' : 'border-[#eae3d5]/80'
    }`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand: ROOM by Armen GlobalWorks */}
        <div 
          onClick={handleBrandClick}
          className={`flex flex-col select-none group ${view !== 'meeting' ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-baseline space-x-2.5">
            <span className={`font-serif text-2xl sm:text-[27px] tracking-[-0.03em] font-normal leading-none transition-colors ${
              isDark 
                ? 'text-[#f5f1ea] group-hover:text-white' 
                : 'text-[#1a1917] group-hover:text-[#000]'
            }`}>
              ROOM
            </span>
            <span className={`text-[10px] tracking-[0.2em] uppercase font-mono font-medium transition-colors ${
              isDark ? 'text-[#8c8577]' : 'text-[#968f82]'
            }`}>
              by Armen GlobalWorks
            </span>
          </div>
        </div>

        {/* Center: Subtle active room presence if in pre-join / waiting */}
        <div className="hidden sm:flex items-center space-x-2 text-xs text-[#8a8479]">
          {room && view !== 'home' && (
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border shadow-sm transition-colors ${
              isDark
                ? 'bg-[#1e1c19] border-[#312d26] text-[#eae5dc]'
                : 'bg-[#f3efe5]/80 border-[#ded7ca] text-[#2c2a26]'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#148b94]" />
              <span className="font-medium truncate max-w-xs">{room.title}</span>
            </div>
          )}
        </div>

        {/* Right side: Profile & Settings */}
        <div className="flex items-center space-x-3">
          {/* Settings Trigger */}
          <button
            onClick={() => (onOpenSettings ? onOpenSettings() : setView('settings'))}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-[#9c9588] hover:text-[#f5f1ea] hover:bg-[#25221d]'
                : 'text-[#7c7569] hover:text-[#1a1917] hover:bg-[#ede7db]/60'
            }`}
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {/* User Profile */}
          <div className={`flex items-center space-x-2.5 pl-2 border-l transition-colors ${
            isDark ? 'border-[#2e2a24]' : 'border-[#eae4d8]'
          }`}>
            {firebaseUser ? (
              <div className="flex items-center space-x-2">
                <img
                  src={user.avatar || firebaseUser.photoURL || undefined}
                  alt={user.name}
                  className={`w-7 h-7 rounded-full object-cover border ${
                    isDark ? 'border-[#38332a]' : 'border-[#ded8cc]'
                  }`}
                />
                <span className={`hidden md:inline text-xs font-medium ${
                  isDark ? 'text-[#eae5dc]' : 'text-[#2d2b27]'
                }`}>
                  {user.name}
                </span>
                <button
                  onClick={signOutFirebaseAuth}
                  className={`text-[11px] transition-colors ${
                    isDark ? 'text-[#8a8376] hover:text-[#f5f1ea]' : 'text-[#8a8479] hover:text-[#1a1917]'
                  }`}
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogleAuth}
                className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all font-medium ${
                  isDark
                    ? 'text-[#eae5dc] hover:text-white bg-[#1e1c19] hover:bg-[#282420] border-[#36312a] hover:border-[#4d463b] shadow-sm'
                    : 'text-[#4a463e] hover:text-[#1a1917] px-3.5 py-1.5 rounded-xl border border-[#ded8cc] hover:border-[#c8c0b2] bg-[#faf8f4] hover:bg-[#f3efe5] shadow-[0_1px_2px_rgba(40,35,28,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]'
                }`}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

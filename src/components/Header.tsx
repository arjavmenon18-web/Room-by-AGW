import React from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Settings as SettingsIcon, Search, MessageSquare, Bookmark, Video, Home } from 'lucide-react';
import { AppView } from '../types';

interface HeaderProps {
  onOpenSettings?: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenSearch }) => {
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

  const navLinks: { id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'keep', label: 'Keep', icon: Bookmark },
    { id: 'rooms', label: 'Rooms', icon: Video },
  ];

  return (
    <header className={`w-full border-b bg-transparent px-4 sm:px-8 py-3.5 z-40 transition-colors ${
      isDark ? 'border-[#26231e]' : 'border-[#eae3d5]/80'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center space-x-6 sm:space-x-8">
          <div 
            onClick={handleBrandClick}
            className={`flex flex-col select-none group ${view !== 'meeting' ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-baseline space-x-2">
              <span className={`font-serif text-xl sm:text-2xl tracking-[-0.03em] font-normal leading-none transition-colors ${
                isDark 
                  ? 'text-[#f5f1ea] group-hover:text-white' 
                  : 'text-[#1a1917] group-hover:text-[#000]'
              }`}>
                ROOM
              </span>
              <span className={`text-[10px] font-mono tracking-[0.16em] uppercase hidden sm:inline-block transition-colors ${
                isDark ? 'text-[#8a8275]' : 'text-[#948d80]'
              }`}>
                by Armen GlobalWorks
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          {view !== 'meeting' && (
            <nav className="flex items-center space-x-1 sm:space-x-1.5">
              {navLinks.map((link) => {
                const isActive = view === link.id;
                const IconComponent = link.icon;
                return (
                  <button
                    key={link.id}
                    onClick={() => setView(link.id)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 ${
                      isActive
                        ? isDark
                          ? 'bg-[#26221c] text-white shadow-xs'
                          : 'bg-[#ede7dc] text-[#1a1917] shadow-xs'
                        : isDark
                          ? 'text-[#8a8479] hover:text-[#ded8cc] hover:bg-[#1f1d1a]'
                          : 'text-[#6b6459] hover:text-[#1a1917] hover:bg-[#f4efe4]'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-[#148b94]' : ''}`} />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Center/Right: Unified Search & Profile & Settings */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Search Button */}
          {onOpenSearch && view !== 'meeting' && (
            <button
              onClick={onOpenSearch}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                isDark
                  ? 'bg-[#1e1c19] border-[#2e2a24] text-[#8a8479] hover:border-[#148b94] hover:text-[#ded8cc]'
                  : 'bg-[#faf8f5] border-[#ded8cc] text-[#706a60] hover:border-[#148b94] hover:text-[#1a1917]'
              }`}
              title="Search across Chat, Keep, and Meeting archives"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search everything</span>
              <kbd className={`hidden md:inline text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isDark ? 'bg-[#282520] text-[#706a60]' : 'bg-[#ece6da] text-[#8c8577]'
              }`}>
                ⌘K
              </kbd>
            </button>
          )}

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
                <span className={`hidden lg:inline text-xs font-medium ${
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
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${
                  isDark
                    ? 'text-[#eae5dc] hover:text-white bg-[#1e1c19] hover:bg-[#282420] border-[#36312a] hover:border-[#4d463b] shadow-sm'
                    : 'text-[#4a463e] hover:text-[#1a1917] border border-[#ded8cc] hover:border-[#c8c0b2] bg-[#faf8f4] hover:bg-[#f3efe5] shadow-xs'
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

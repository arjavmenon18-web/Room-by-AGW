import React, { useState, useEffect, useRef } from 'react';
import { MeetingProvider, useMeeting } from './context/MeetingContext';
import { ChatAndKeepProvider, useChatAndKeep } from './context/ChatAndKeepContext';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { PreJoinView } from './components/PreJoinView';
import { WaitingRoomView } from './components/WaitingRoomView';
import { MeetingRoom } from './components/MeetingRoom';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { SettingsModal } from './components/panels/SettingsModal';
import { RoomNotFoundView } from './components/views/RoomNotFoundView';
import { NotFoundView } from './components/views/NotFoundView';
import { ChatView } from './components/views/ChatView';
import { KeepView } from './components/views/KeepView';
import { RoomsView } from './components/views/RoomsView';
import { UnifiedSearchModal } from './components/modals/UnifiedSearchModal';
import { RoomRecapModal } from './components/modals/RoomRecapModal';

function parseRoute(pathname: string, search: string): { type: 'home' | 'join' | 'room' | 'chat' | 'keep' | 'rooms' | 'unknown'; code?: string } {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/') {
    const params = new URLSearchParams(search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam && roomParam.trim()) {
      return { type: 'join', code: roomParam.trim() };
    }
    return { type: 'home' };
  }

  if (cleanPath === '/chat') return { type: 'chat' };
  if (cleanPath === '/keep') return { type: 'keep' };
  if (cleanPath === '/rooms') return { type: 'rooms' };

  // Match /join/:roomCode (e.g. /join/Room-agw-3073)
  const joinMatch = cleanPath.match(/^\/join\/([A-Za-z0-9-_]+)$/i);
  if (joinMatch && joinMatch[1]) {
    return { type: 'join', code: joinMatch[1].trim() };
  }

  // Match /room/:roomId
  const roomMatch = cleanPath.match(/^\/room\/([A-Za-z0-9-_]+)$/i);
  if (roomMatch && roomMatch[1]) {
    return { type: 'room', code: roomMatch[1].trim() };
  }

  return { type: 'unknown' };
}

const AppContent: React.FC = () => {
  const { view, setView, joinRoomById, roomNotFoundCode, atmosphere } = useMeeting();
  const { showRoomRecapModal, closeRoomRecap, postMeetingRecapData } = useChatAndKeep();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Check URL route on initial mount and handle popstate
  const hasCheckedUrlRef = useRef(false);
  const joinRoomByIdRef = useRef(joinRoomById);
  joinRoomByIdRef.current = joinRoomById;

  useEffect(() => {
    if (hasCheckedUrlRef.current) return;
    hasCheckedUrlRef.current = true;

    const route = parseRoute(window.location.pathname, window.location.search);
    if (route.type === 'join' || route.type === 'room') {
      if (route.code) {
        joinRoomByIdRef.current(route.code);
      }
    } else if (route.type === 'chat') {
      setView('chat');
    } else if (route.type === 'keep') {
      setView('keep');
    } else if (route.type === 'rooms') {
      setView('rooms');
    } else if (route.type === 'unknown') {
      setView('not-found');
    }
  }, [setView]);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute(window.location.pathname, window.location.search);
      if (route.type === 'home') {
        setView('home');
      } else if (route.type === 'chat') {
        setView('chat');
      } else if (route.type === 'keep') {
        setView('keep');
      } else if (route.type === 'rooms') {
        setView('rooms');
      } else if (route.type === 'join' || route.type === 'room') {
        if (route.code) {
          joinRoomByIdRef.current(route.code);
        }
      } else {
        setView('not-found');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setView]);

  // Global ⌘K / Ctrl+K keyboard shortcut for Unified Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showSettings = isSettingsOpen || view === 'settings';

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-[#148b94]/20 selection:text-[#1a1917] transition-colors duration-200 ${
      atmosphere === 'obsidian'
        ? 'bg-[#141312] text-[#eae5dc]'
        : atmosphere === 'studio'
        ? 'bg-[#f7f6f3] text-[#141312]'
        : 'bg-[#faf8f5] text-[#1a1917]'
    }`}>
      {/* Header displayed on non-meeting views */}
      {view !== 'meeting' && (
        <Header 
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSearch={() => setIsSearchModalOpen(true)}
        />
      )}

      {(view === 'home' || view === 'settings') && (
        <HomeView
          onOpenCreate={() => setIsCreateModalOpen(true)}
          onOpenJoin={() => setIsJoinModalOpen(true)}
          onCreateRoom={() => setIsCreateModalOpen(true)}
          onJoinRoom={() => setIsJoinModalOpen(true)}
        />
      )}

      {view === 'chat' && <ChatView />}

      {view === 'keep' && <KeepView />}

      {view === 'rooms' && <RoomsView />}

      {view === 'pre-join' && <PreJoinView />}

      {view === 'waiting-room' && <WaitingRoomView />}

      {view === 'meeting' && <MeetingRoom />}

      {view === 'room-not-found' && (
        <RoomNotFoundView
          roomCode={roomNotFoundCode || undefined}
          onGoHome={() => {
            try {
              window.history.pushState(null, '', '/');
            } catch (e) {}
            setView('home');
          }}
          onCreateRoom={() => {
            try {
              window.history.pushState(null, '', '/');
            } catch (e) {}
            setView('home');
            setIsCreateModalOpen(true);
          }}
        />
      )}

      {view === 'not-found' && (
        <NotFoundView
          onGoHome={() => {
            try {
              window.history.pushState(null, '', '/');
            } catch (e) {}
            setView('home');
          }}
        />
      )}

      {/* Global Unified Search Modal (⌘K) */}
      <UnifiedSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />

      {/* Post-Meeting Room Recap Modal */}
      {postMeetingRecapData && (
        <RoomRecapModal
          isOpen={showRoomRecapModal}
          onClose={closeRoomRecap}
          record={postMeetingRecapData}
        />
      )}

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setIsSettingsOpen(false);
          if (view === 'settings') {
            setView('home');
          }
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <MeetingProvider>
      <ChatAndKeepProvider>
        <AppContent />
      </ChatAndKeepProvider>
    </MeetingProvider>
  );
}

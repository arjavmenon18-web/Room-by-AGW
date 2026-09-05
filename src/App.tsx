import React, { useState, useEffect, useRef } from 'react';
import { MeetingProvider, useMeeting } from './context/MeetingContext';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { PreJoinView } from './components/PreJoinView';
import { WaitingRoomView } from './components/WaitingRoomView';
import { MeetingRoom } from './components/MeetingRoom';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { SettingsModal } from './components/panels/SettingsModal';

const AppContent: React.FC = () => {
  const { view, setView, joinRoomById, atmosphere } = useMeeting();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check URL search parameters or path strictly ONCE on initial mount
  const hasCheckedUrlRef = useRef(false);
  const joinRoomByIdRef = useRef(joinRoomById);
  joinRoomByIdRef.current = joinRoomById;

  useEffect(() => {
    if (hasCheckedUrlRef.current) return;
    hasCheckedUrlRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      joinRoomByIdRef.current(roomParam.trim());
    } else {
      const match = window.location.pathname.match(/\/(room|join)\/([A-Za-z0-9-_]+)/i);
      if (match && match[2]) {
        joinRoomByIdRef.current(match[2].trim());
      }
    }
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
        <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      )}

      {(view === 'home' || view === 'settings') && (
        <HomeView
          onOpenCreate={() => setIsCreateModalOpen(true)}
          onOpenJoin={() => setIsJoinModalOpen(true)}
          onCreateRoom={() => setIsCreateModalOpen(true)}
          onJoinRoom={() => setIsJoinModalOpen(true)}
        />
      )}

      {view === 'pre-join' && <PreJoinView />}

      {view === 'waiting-room' && <WaitingRoomView />}

      {view === 'meeting' && <MeetingRoom />}

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
      <AppContent />
    </MeetingProvider>
  );
}

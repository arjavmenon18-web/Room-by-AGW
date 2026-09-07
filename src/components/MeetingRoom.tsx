import React, { useState, useEffect, useRef } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { VideoTile } from './VideoTile';
import { ParticipantsPanel } from './panels/ParticipantsPanel';
import { ChatPanel } from './panels/ChatPanel';
import { SettingsModal } from './panels/SettingsModal';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Share2, 
  Hand, 
  Smile, 
  MessageSquare, 
  Users, 
  MoreHorizontal, 
  LogOut, 
  Copy, 
  Check, 
  Maximize2, 
  Grid, 
  StopCircle,
  SlidersHorizontal
} from 'lucide-react';
import { Participant } from '../types';

export const MeetingRoom: React.FC = () => {
  const {
    room,
    user,
    isHost,
    durationFormatted,
    leaveRoom,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    localStream,
    displayStream,
    isScreenSharing,
    toggleScreenShare,
    screenSharePresenterName,
    localAudioLevel,
    isHandRaised,
    toggleRaiseHand,
    participants,
    waitingParticipants,
    admitParticipant,
    pinnedParticipantId,
    setPinnedParticipantId,
    activeSpeakerId,
    activeReactions,
    triggerReaction,
    activeDrawer,
    setActiveDrawer,
    unreadChatCount,
    videoLayout,
    setVideoLayout,
    shareableRoomUrl,
  } = useMeeting();

  const screenShareVideoRef = useRef<HTMLVideoElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevParticipantsRef = useRef<Participant[]>(participants);

  // Bind displayStream to screen share video element
  useEffect(() => {
    if (screenShareVideoRef.current && displayStream) {
      screenShareVideoRef.current.srcObject = displayStream;
    }
  }, [displayStream, isScreenSharing]);

  // Peer joined / left notifications
  useEffect(() => {
    const prev = prevParticipantsRef.current;
    if (participants.length > prev.length) {
      const added = participants.find((p) => !prev.some((op) => op.id === p.id));
      if (added) {
        setToastMessage(`${added.name} joined the room`);
      }
    } else if (participants.length < prev.length) {
      const removed = prev.find((p) => !participants.some((np) => np.id === p.id));
      if (removed) {
        setToastMessage(`${removed.name} left the room`);
      }
    }
    prevParticipantsRef.current = participants;
  }, [participants]);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleCopyLink = () => {
    const url = shareableRoomUrl || `${window.location.origin}/join/${room?.id || 'ROOM'}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Local user participant object
  const localParticipant: Participant = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    audioEnabled,
    videoEnabled,
    isSpeaking: localAudioLevel > 25 && audioEnabled,
    audioLevel: localAudioLevel,
    isScreenSharing,
    isHandRaised,
    isPinned: pinnedParticipantId === user.id || pinnedParticipantId === 'local-user',
    isWaiting: false,
    initials: user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'U',
    connectionQuality: 'excellent',
  };

  const allActiveParticipants = [localParticipant, ...participants.filter((p) => p.id !== user.id)];

  const targetSpotlight = pinnedParticipantId
    ? allActiveParticipants.find((p) => p.id === pinnedParticipantId)
    : allActiveParticipants.find((p) => p.id === activeSpeakerId) || allActiveParticipants[0];

  const reactionEmojis = ['👍', '❤️', '👏', '🎉', '😊'];

  return (
    <div className="relative w-screen h-screen bg-[#141312] text-[#faf8f5] flex flex-col justify-between overflow-hidden room-grain-dark select-none font-sans">
      {/* FLOATING REACTION PARTICLES */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {activeReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-20 text-3xl transition-all duration-1000 filter drop-shadow-md"
            style={{
              left: `${r.xPosition}%`,
              animation: 'floatUp 3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div className="flex flex-col items-center">
              <span>{r.emoji}</span>
              <span className="text-[10px] font-sans bg-black/60 text-[#faf8f5] px-2 py-0.5 rounded-full mt-1 border border-white/10">
                {r.senderName}
              </span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.85); opacity: 0; }
          12% { transform: translateY(-24px) scale(1.15); opacity: 1; }
          75% { transform: translateY(-200px) scale(1); opacity: 0.95; }
          100% { transform: translateY(-280px) scale(0.9); opacity: 0; }
        }
      `}</style>

      {/* SYSTEM NOTIFICATION TOAST */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#201e1b]/90 border border-[#302e2a] text-xs text-[#faf8f5] shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* TOP BAR: ROOM INFORMATION */}
      <header className="h-14 px-3 sm:px-6 bg-[#141312]/90 backdrop-blur-md border-b border-[#24221f] flex items-center justify-between z-30">
        {/* Left: Room Identity & Duration */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <span className="font-serif text-base sm:text-lg tracking-tight text-[#faf8f5] font-normal truncate max-w-[130px] sm:max-w-xs md:max-w-md">
            {room?.title || 'Project Discussion'}
          </span>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-[#8a8479] pl-3 border-l border-[#292723] flex-shrink-0">
            <span>{allActiveParticipants.length} {allActiveParticipants.length === 1 ? 'person' : 'people'}</span>
            <span>·</span>
            <span>{durationFormatted}</span>
          </div>
        </div>

        {/* Right: Quick Copy Link & Grid Switcher */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#201e1b] hover:bg-[#2a2824] border border-[#2e2b26] text-xs text-[#ded8cc] transition-colors"
            title="Copy invite link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#148b94]" />
                <span className="text-[#148b94] hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#8a8479]" />
                <span className="hidden sm:inline">Invite link</span>
              </>
            )}
          </button>

          <button
            onClick={() => setVideoLayout(videoLayout === 'grid' ? 'spotlight' : 'grid')}
            className="p-1.5 rounded-xl bg-[#201e1b] hover:bg-[#2a2824] border border-[#2e2b26] text-[#8a8479] hover:text-[#faf8f5] transition-colors"
            title={videoLayout === 'grid' ? 'Speaker spotlight' : 'Grid layout'}
          >
            {videoLayout === 'grid' ? <Maximize2 className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* WAITING ROOM ALERT FOR HOST */}
      {isHost && waitingParticipants.length > 0 && (
        <div className="bg-[#1c1b18] border-b border-[#2b2823] px-6 py-2 flex items-center justify-between text-xs z-30 animate-in slide-in-from-top duration-200">
          <span className="text-[#ded8cc]">
            <strong className="font-medium text-[#faf8f5]">{waitingParticipants[0].name}</strong>
            {waitingParticipants.length > 1 && ` and ${waitingParticipants.length - 1} others`} waiting to enter
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => admitParticipant(waitingParticipants[0].id)}
              className="px-3 py-1 rounded-lg bg-[#148b94] hover:bg-[#127981] text-white font-medium transition-colors"
            >
              Admit
            </button>
            <button
              onClick={() => setActiveDrawer('participants')}
              className="px-3 py-1 rounded-lg bg-[#262420] hover:bg-[#302e29] text-[#ded8cc] transition-colors"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIDEO STAGE AREA */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center items-center overflow-hidden">
          {/* SCENARIO A: SCREEN SHARING */}
          {isScreenSharing ? (
            <div className="w-full h-full flex flex-col space-y-3">
              {/* Primary Shared Canvas */}
              <div className="flex-1 w-full bg-[#181715] border border-[#262420] rounded-2xl overflow-hidden relative shadow-lg flex items-center justify-center">
                {displayStream ? (
                  <video
                    ref={screenShareVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-8 space-y-2">
                    <p className="text-sm font-medium text-[#faf8f5]">
                      Screen share active
                    </p>
                    <p className="text-xs text-[#8a8479]">
                      Sharing your screen with the room.
                    </p>
                  </div>
                )}

                {/* Quiet Screen Sharing Indicator */}
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#148b94]" />
                  <span className="text-[#faf8f5]">
                    {screenSharePresenterName || "You're sharing your screen"}
                  </span>
                </div>

                <button
                  onClick={toggleScreenShare}
                  className="absolute top-4 right-4 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-900/80 border border-rose-700/60 text-rose-200 hover:bg-rose-900 transition-colors text-xs"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Stop sharing</span>
                </button>
              </div>

              {/* Compact Filmstrip for Participants */}
              <div className="h-28 sm:h-32 w-full flex items-center space-x-3 overflow-x-auto py-1">
                {allActiveParticipants.map((p) => (
                  <div key={p.id} className="h-full aspect-video flex-shrink-0">
                    <VideoTile
                      participant={p}
                      isLocal={p.id === user.id || p.id === 'local-user'}
                      localStream={localStream}
                      isActiveSpeaker={p.id === activeSpeakerId}
                      isPinned={p.id === pinnedParticipantId}
                      onTogglePin={() =>
                        setPinnedParticipantId(pinnedParticipantId === p.id ? null : p.id)
                      }
                      aspectClass="h-full aspect-video"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : videoLayout === 'spotlight' && targetSpotlight ? (
            /* SCENARIO B: ACTIVE SPEAKER SPOTLIGHT */
            <div className="w-full h-full flex flex-col lg:flex-row gap-4">
              <div className="flex-1 h-full min-h-[300px]">
                <VideoTile
                  participant={targetSpotlight}
                  isLocal={targetSpotlight.id === user.id || targetSpotlight.id === 'local-user'}
                  localStream={localStream}
                  isActiveSpeaker={targetSpotlight.id === activeSpeakerId}
                  isPinned={targetSpotlight.id === pinnedParticipantId}
                  onTogglePin={() =>
                    setPinnedParticipantId(
                      pinnedParticipantId === targetSpotlight.id ? null : targetSpotlight.id
                    )
                  }
                  aspectClass="w-full h-full"
                />
              </div>

              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-60 max-h-full">
                {allActiveParticipants
                  .filter((p) => p.id !== targetSpotlight.id)
                  .map((p) => (
                    <div key={p.id} className="w-44 sm:w-52 lg:w-full aspect-video flex-shrink-0">
                      <VideoTile
                        participant={p}
                        isLocal={p.id === user.id || p.id === 'local-user'}
                        localStream={localStream}
                        isActiveSpeaker={p.id === activeSpeakerId}
                        isPinned={p.id === pinnedParticipantId}
                        onTogglePin={() =>
                          setPinnedParticipantId(pinnedParticipantId === p.id ? null : p.id)
                        }
                        aspectClass="w-full aspect-video"
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* SCENARIO C: NATURAL RESPONSIVE GRID */
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div
                className={`w-full grid gap-4 place-content-center ${
                  allActiveParticipants.length === 1
                    ? 'grid-cols-1 max-w-2xl max-h-[65vh]'
                    : allActiveParticipants.length === 2
                    ? 'grid-cols-1 md:grid-cols-2 max-w-4xl'
                    : allActiveParticipants.length <= 4
                    ? 'grid-cols-1 sm:grid-cols-2 max-w-5xl'
                    : 'grid-cols-2 md:grid-cols-3 max-w-6xl'
                }`}
              >
                {allActiveParticipants.map((p) => (
                  <VideoTile
                    key={p.id}
                    participant={p}
                    isLocal={p.id === user.id || p.id === 'local-user'}
                    localStream={localStream}
                    isActiveSpeaker={p.id === activeSpeakerId}
                    isPinned={p.id === pinnedParticipantId}
                    onTogglePin={() =>
                      setPinnedParticipantId(pinnedParticipantId === p.id ? null : p.id)
                    }
                    aspectClass="w-full aspect-video"
                  />
                ))}
              </div>

              {/* 1 Person State: Quiet Message & Link Copy */}
              {participants.length === 0 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 px-5 py-3 rounded-2xl bg-[#1c1a17]/90 border border-[#2b2823] text-xs shadow-sm animate-in fade-in duration-300">
                  <span className="text-[#a09a8f]">
                    Waiting for others to join…
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#282520] hover:bg-[#322f28] border border-[#38342c] text-[#faf8f5] transition-colors font-medium cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-[#148b94]" /> : <Copy className="w-3.5 h-3.5 text-[#8a8479]" />}
                    <span>{copiedLink ? 'Link copied' : 'Copy invite link'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDE PANELS */}
        {activeDrawer === 'participants' && <ParticipantsPanel />}
        {activeDrawer === 'chat' && <ChatPanel />}
      </main>

      {/* PRIMARY CONTROLS DOCK (BOTTOM CENTER) */}
      <footer className="h-18 sm:h-20 px-2 sm:px-6 bg-[#141312]/95 backdrop-blur-md border-t border-[#24221f] flex items-center justify-between z-40 relative">
        {/* Left: Understated Brand Mark */}
        <div className="hidden lg:flex items-center space-x-2 text-xs select-none">
          <span className="font-serif text-sm tracking-tight text-[#eae5dc]">ROOM</span>
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#8a8274]">by Armen GlobalWorks</span>
        </div>

        {/* Center: Essential Meeting Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 mx-auto max-w-full overflow-x-auto py-1">
          {/* Microphone */}
          <button
            onClick={toggleAudio}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-150 flex items-center justify-center flex-shrink-0 ${
              audioEnabled
                ? 'bg-[#201e1b] border-[#2e2b26] text-[#faf8f5] hover:bg-[#2b2824]'
                : 'bg-rose-900/80 border-rose-700 text-rose-100 hover:bg-rose-900'
            }`}
            title={audioEnabled ? 'Mute' : 'Unmute'}
          >
            {audioEnabled ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleVideo}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-150 flex items-center justify-center flex-shrink-0 ${
              videoEnabled
                ? 'bg-[#201e1b] border-[#2e2b26] text-[#faf8f5] hover:bg-[#2b2824]'
                : 'bg-rose-900/80 border-rose-700 text-rose-100 hover:bg-rose-900'
            }`}
            title={videoEnabled ? 'Stop video' : 'Start video'}
          >
            {videoEnabled ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Screen Share (desktop/tablet) */}
          <button
            onClick={toggleScreenShare}
            className={`hidden md:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-150 items-center justify-center flex-shrink-0 ${
              isScreenSharing
                ? 'bg-[#148b94] border-[#148b94] text-white'
                : 'bg-[#201e1b] border-[#2e2b26] text-[#faf8f5] hover:bg-[#2b2824]'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Raise Hand */}
          <button
            onClick={toggleRaiseHand}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-150 flex items-center justify-center flex-shrink-0 ${
              isHandRaised
                ? 'bg-[#148b94] border-[#148b94] text-white'
                : 'bg-[#201e1b] border-[#2e2b26] text-[#faf8f5] hover:bg-[#2b2824]'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* React */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowReactionsMenu(!showReactionsMenu)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-150 flex items-center justify-center ${
                showReactionsMenu
                  ? 'bg-[#2b2824] border-[#38342d] text-[#faf8f5]'
                  : 'bg-[#201e1b] border-[#2e2b26] text-[#faf8f5] hover:bg-[#2b2824]'
              }`}
              title="React"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {showReactionsMenu && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#1f1d1a] border border-[#2e2b26] rounded-full p-1.5 flex items-center space-x-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      triggerReaction(emoji);
                      setShowReactionsMenu(false);
                    }}
                    className="hover:scale-125 transition-transform p-2 text-lg rounded-full hover:bg-[#2a2723]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 sm:h-6 w-[1px] bg-[#292622] mx-0.5 sm:mx-1 flex-shrink-0" />

          {/* Chat */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'chat' ? null : 'chat')}
            className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-150 flex items-center justify-center flex-shrink-0 ${
              activeDrawer === 'chat'
                ? 'bg-[#2b2824] border-[#38342d] text-[#faf8f5]'
                : 'bg-[#201e1b] border-[#2e2b26] text-[#faf8f5] hover:bg-[#2b2824]'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadChatCount > 0 && activeDrawer !== 'chat' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#148b94] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* People */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'participants' ? null : 'participants')}
            className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-150 flex items-center justify-center flex-shrink-0 ${
              activeDrawer === 'participants'
                ? 'bg-[#2b2824] border-[#38342d] text-[#faf8f5]'
                : 'bg-[#201e1b] border-[#2e2b26] text-[#faf8f5] hover:bg-[#2b2824]'
            }`}
            title="People"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            {waitingParticipants.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#148b94] animate-pulse" />
            )}
          </button>

          {/* More */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition-all duration-150 flex items-center justify-center ${
                showMoreMenu
                  ? 'bg-[#2b2824] border-[#38342d] text-[#faf8f5]'
                  : 'bg-[#201e1b] border-[#2e2b26] text-[#faf8f5] hover:bg-[#2b2824]'
              }`}
              title="More"
            >
              <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {showMoreMenu && (
              <div className="absolute bottom-16 right-0 w-48 bg-[#1f1d1a] border border-[#2e2b26] rounded-xl shadow-2xl py-1 text-xs text-[#faf8f5] z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    toggleScreenShare();
                    setShowMoreMenu(false);
                  }}
                  className="md:hidden w-full px-3 py-2 text-left hover:bg-[#282521] flex items-center space-x-2 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#8a8479]" />
                  <span>{isScreenSharing ? 'Stop sharing' : 'Share screen'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowSettingsModal(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#282521] flex items-center space-x-2 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#8a8479]" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => {
                    handleCopyLink();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#282521] flex items-center space-x-2 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[#8a8479]" />
                  <span>Copy invite link</span>
                </button>
              </div>
            )}
          </div>

          {/* Leave Button */}
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-full bg-[#262421] hover:bg-rose-950/80 border border-[#38342c] hover:border-rose-800 text-[#faf8f5] hover:text-rose-200 text-xs transition-colors flex items-center space-x-1.5 flex-shrink-0"
            title="Leave room"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>

        {/* Right side spacer to keep center controls centered */}
        <div className="hidden lg:flex w-24 justify-end" />
      </footer>

      {/* LEAVE CONFIRMATION MODAL */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="bg-[#1a1917] border border-[#2e2b26] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <h3 className="font-serif text-2xl text-[#faf8f5] font-normal">
              Leave this room?
            </h3>
            <p className="text-xs text-[#a09a8f] leading-relaxed">
              You can rejoin at any time using the invite link.
            </p>

            <div className="pt-2 flex flex-col space-y-2">
              <button
                onClick={() => leaveRoom(false)}
                className="w-full py-2.5 rounded-xl bg-[#282622] hover:bg-[#322f29] text-xs font-medium text-[#faf8f5] transition-colors border border-[#38342c]"
              >
                Leave room
              </button>

              {isHost && (
                <button
                  onClick={() => leaveRoom(true)}
                  className="w-full py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-xs font-medium text-white transition-colors"
                >
                  End room for everyone
                </button>
              )}

              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="w-full py-2 text-xs text-[#706a60] hover:text-[#faf8f5] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};

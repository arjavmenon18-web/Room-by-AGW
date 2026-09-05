import React, { useState } from 'react';
import { useMeeting } from '../../context/MeetingContext';
import { X, Mic, MicOff, MoreVertical, Hand } from 'lucide-react';
import { Participant } from '../../types';

export const ParticipantsPanel: React.FC = () => {
  const {
    user,
    isHost,
    participants,
    waitingParticipants,
    admitParticipant,
    denyParticipant,
    muteParticipant,
    kickParticipant,
    setActiveDrawer,
    audioEnabled,
    videoEnabled,
    isHandRaised,
    localAudioLevel,
  } = useMeeting();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Local participant
  const localParticipant: Participant = {
    id: 'local-user',
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    audioEnabled,
    videoEnabled,
    isSpeaking: localAudioLevel > 25 && audioEnabled,
    audioLevel: localAudioLevel,
    isScreenSharing: false,
    isHandRaised,
    isPinned: false,
    isWaiting: false,
    initials: user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase(),
    connectionQuality: 'excellent',
  };

  const allActiveParticipants = [localParticipant, ...participants];

  return (
    <aside className="fixed inset-0 sm:relative sm:inset-auto w-full sm:w-80 h-full bg-[#181715] border-l border-[#262420] flex flex-col z-50 sm:z-30 select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#262420] flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#faf8f5]">
          People · {allActiveParticipants.length}
        </h3>
        <button
          onClick={() => setActiveDrawer(null)}
          className="p-1 rounded-lg text-[#8a8479] hover:text-[#faf8f5] hover:bg-[#24221f] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#22201d]">
        {/* Waiting Room Section for Host */}
        {isHost && waitingParticipants.length > 0 && (
          <div className="p-4 bg-[#1f1d1a] border-b border-[#2b2824] space-y-3">
            <div className="text-xs text-[#8a8479]">
              Waiting · {waitingParticipants.length}
            </div>

            <div className="space-y-2">
              {waitingParticipants.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-[#faf8f5] truncate pr-2">{p.name}</span>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => admitParticipant(p.id)}
                      className="px-2 py-1 rounded bg-[#148b94] hover:bg-[#127981] text-white font-medium transition-colors"
                    >
                      Admit
                    </button>
                    <button
                      onClick={() => denyParticipant(p.id)}
                      className="px-2 py-1 rounded hover:bg-[#2a2824] text-[#8a8479] hover:text-[#faf8f5] transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="p-2 space-y-1">
          {allActiveParticipants.map((p) => {
            const isLocal = p.id === 'local-user';
            const initials = p.initials || p.name.substring(0, 2).toUpperCase();

            return (
              <div
                key={p.id}
                className="px-3 py-2.5 rounded-xl hover:bg-[#201e1b] transition-colors flex items-center justify-between group relative"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-7 h-7 rounded-full bg-[#24221f] text-[#faf8f5] flex items-center justify-center text-xs font-serif flex-shrink-0">
                    {initials}
                  </div>

                  <div className="truncate space-y-0.5">
                    <div className="text-xs font-medium text-[#faf8f5] truncate">
                      {p.name} {isLocal && '(You)'}
                    </div>
                    <div className="text-[11px] text-[#8a8479]">
                      {p.role === 'host' ? 'Host' : 'Participant'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {p.isHandRaised && (
                    <span className="text-[#148b94]" title="Hand raised">
                      <Hand className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {!p.audioEnabled ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-[#6e685f]" />
                  )}

                  {/* Host Controls Menu */}
                  {isHost && !isLocal && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                        className="p-1 rounded text-[#8a8479] hover:text-[#faf8f5] hover:bg-[#282622] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeMenuId === p.id && (
                        <div className="absolute right-0 top-8 w-36 bg-[#1f1d1a] border border-[#2e2b26] rounded-xl shadow-xl py-1 text-xs text-[#faf8f5] z-50 animate-in fade-in duration-100">
                          {p.audioEnabled && (
                            <button
                              onClick={() => {
                                muteParticipant(p.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-[#282521] transition-colors"
                            >
                              Mute
                            </button>
                          )}
                          <button
                            onClick={() => {
                              kickParticipant(p.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-rose-400 hover:bg-[#282521] transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

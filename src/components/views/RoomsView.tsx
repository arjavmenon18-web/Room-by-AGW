import React, { useState, useEffect } from 'react';
import { useChatAndKeep } from '../../context/ChatAndKeepContext';
import { useMeeting } from '../../context/MeetingContext';
import { MeetingRecord } from '../../types';
import { 
  Video, 
  Plus, 
  Clock, 
  Users, 
  Bookmark, 
  MessageSquare, 
  Sparkles, 
  Copy,
  Check
} from 'lucide-react';

export const RoomsView: React.FC = () => {
  const { 
    meetingRecords, 
    activeMeetingRecordId, 
    setActiveMeetingRecordId,
    activeMeetingRecord,
    setActiveConversationId,
    extractKeepFromMeeting
  } = useChatAndKeep();

  const { startMeeting, joinRoomById, atmosphere, user } = useMeeting();

  const [instantRoomTitle, setInstantRoomTitle] = useState('');
  const [newRoomModalOpen, setNewRoomModalOpen] = useState(false);
  const [isExtractingMemories, setIsExtractingMemories] = useState(false);
  const [extractNotice, setExtractNotice] = useState<string | null>(null);
  const [userRooms, setUserRooms] = useState<{ id: string; title: string; timestamp: number }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isDark = atmosphere === 'obsidian';

  useEffect(() => {
    try {
      const stored = localStorage.getItem('room_user_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setUserRooms(parsed);
        }
      }
    } catch {
      setUserRooms([]);
    }
  }, []);

  const handleStartRoom = (title?: string) => {
    const name = title || instantRoomTitle.trim() || `${user.name || 'User'}'s Room`;
    startMeeting(name);
  };

  const handleCopyLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/join/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleContinueInChat = (record: MeetingRecord) => {
    if (record.associatedConversationId) {
      setActiveConversationId(record.associatedConversationId);
    }
  };

  const handleExtractMemories = async (record: MeetingRecord) => {
    setIsExtractingMemories(true);
    const extracted = await extractKeepFromMeeting({
      roomTitle: record.roomTitle,
      notes: record.notes,
      messages: record.chatMessages,
      participants: record.participants,
      projectTitle: record.projectTitle
    });
    setIsExtractingMemories(false);
    setExtractNotice(`Extracted ${extracted.length} memory suggestions to Keep.`);
    setTimeout(() => setExtractNotice(null), 4000);
  };

  const hasRooms = userRooms.length > 0 || meetingRecords.length > 0;

  return (
    <div className={`min-h-[calc(100vh-64px)] flex flex-col ${
      isDark ? 'bg-[#181715] text-[#f5f1ea]' : 'bg-[#faf8f5] text-[#1a1917]'
    }`}>
      {/* Toast Notice */}
      {extractNotice && (
        <div className="fixed top-20 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#148b94] text-white shadow-xl text-xs font-medium">
          <Sparkles className="w-4 h-4" />
          <span>{extractNotice}</span>
        </div>
      )}

      {/* Header */}
      <header className={`px-6 sm:px-10 py-5 border-b flex items-center justify-between gap-4 ${
        isDark ? 'border-[#292621] bg-[#1a1917]' : 'border-[#e6e0d4] bg-white'
      }`}>
        <div>
          <h1 className="font-serif text-2xl tracking-tight font-normal">
            Rooms
          </h1>
        </div>

        {/* Create Room Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setNewRoomModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create a room</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {!hasRooms ? (
        <main className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
          <Video className="w-10 h-10 text-[#8a8479] stroke-1" />
          <p className="text-base text-[#8a8479]">No rooms yet.</p>
          <button
            onClick={() => setNewRoomModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create a room</span>
          </button>
        </main>
      ) : (
        <div className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full space-y-10">
          {/* User's Created/Recent Rooms */}
          {userRooms.length > 0 && (
            <section className="space-y-4">
              <h2 className={`font-mono text-xs uppercase tracking-wider ${
                isDark ? 'text-[#7d776c]' : 'text-[#9e9689]'
              }`}>
                Your Rooms ({userRooms.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userRooms.map((room) => {
                  const lastActive = new Date(room.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div
                      key={room.id}
                      className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${
                        isDark ? 'bg-[#1e1c19] border-[#2e2a24]' : 'bg-white border-[#e3ded5] shadow-sm'
                      }`}
                    >
                      <div className="space-y-1.5 truncate pr-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#148b94]/10 text-[#148b94] border border-[#148b94]/20">
                            Room ID: {room.id}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm sm:text-base truncate">{room.title || 'Room'}</h3>
                        <div className="flex items-center space-x-3 text-xs text-[#8a8479]">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Last activity: {lastActive}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(room.id, e)}
                          className={`p-2 rounded-xl border transition-colors ${
                            isDark 
                              ? 'border-[#332f29] text-[#7d7669] hover:text-[#f5f1ea] hover:bg-[#25221d]' 
                              : 'border-[#ded8cc] text-[#8c867a] hover:text-[#1a1917] hover:bg-[#f2eee6]'
                          }`}
                          title="Copy room link"
                        >
                          {copiedId === room.id ? (
                            <Check className="w-3.5 h-3.5 text-[#148b94]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => joinRoomById(room.id)}
                          className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all shadow-sm"
                        >
                          Enter Room
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Section 2: Meeting Records */}
          {meetingRecords.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`font-mono text-xs uppercase tracking-wider ${
                    isDark ? 'text-[#7d776c]' : 'text-[#9e9689]'
                  }`}>
                    Meeting Records ({meetingRecords.length})
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Records List */}
                <div className="lg:col-span-4 space-y-3">
                  {meetingRecords.map((record) => {
                    const isSelected = record.id === activeMeetingRecordId;
                    return (
                      <div
                        key={record.id}
                        onClick={() => setActiveMeetingRecordId(record.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? isDark 
                              ? 'bg-[#24211e] border-[#148b94]' 
                              : 'bg-white border-[#148b94] shadow-md ring-1 ring-[#148b94]'
                            : isDark
                              ? 'bg-[#1e1c19] border-[#2e2a24] hover:border-[#3d372e]'
                              : 'bg-white border-[#e3ded5] hover:border-[#cbc5b8]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase text-[#148b94]">
                            {record.roomId}
                          </span>
                          <span className="text-[11px] text-[#8a8479] font-mono">
                            {record.date}
                          </span>
                        </div>

                        <h3 className="font-medium text-sm">{record.roomTitle}</h3>

                        <div className="flex items-center space-x-3 text-[11px] text-[#8a8479]">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{record.durationFormatted}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{record.participantCount}</span>
                          </span>
                          <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                            <Bookmark className="w-3 h-3" />
                            <span>{record.decisions?.length || 0} decisions</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Selected Meeting Record Detail */}
                <div className="lg:col-span-8">
                  {activeMeetingRecord ? (
                    <div className={`p-6 sm:p-8 rounded-2xl border space-y-6 ${
                      isDark ? 'bg-[#1c1a17] border-[#2e2a24]' : 'bg-white border-[#e3ded5] shadow-sm'
                    }`}>
                      {/* Record Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-current/10">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono uppercase text-[#148b94]">
                              {activeMeetingRecord.roomId} · {activeMeetingRecord.durationFormatted}
                            </span>
                          </div>
                          <h2 className="font-serif text-xl sm:text-2xl mt-1">
                            {activeMeetingRecord.roomTitle}
                          </h2>
                          <p className="text-xs text-[#8a8479] mt-0.5">
                            {activeMeetingRecord.date} · Host: {activeMeetingRecord.hostName}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleExtractMemories(activeMeetingRecord)}
                            disabled={isExtractingMemories}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
                              isDark 
                                ? 'bg-[#22201d] border-[#312d26] text-[#ded8cc] hover:text-[#148b94]' 
                                : 'bg-[#f4efe4] border-[#ddd6c8] text-[#423d34] hover:text-[#148b94]'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#148b94]" />
                            <span>{isExtractingMemories ? 'Extracting…' : 'Extract to Keep'}</span>
                          </button>

                          <button
                            onClick={() => handleContinueInChat(activeMeetingRecord)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1.5 shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        </div>
                      </div>

                      {/* Participants */}
                      <div className="space-y-2">
                        <span className="text-xs font-mono uppercase text-[#8a8479]">Participants</span>
                        <div className="flex flex-wrap gap-2">
                          {activeMeetingRecord.participants.map((p, i) => (
                            <span 
                              key={i} 
                              className={`text-xs px-2.5 py-1 rounded-full border ${
                                isDark ? 'bg-[#24211e] border-[#332e27]' : 'bg-[#f5f1e8] border-[#ddd6c8]'
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      {activeMeetingRecord.summary && (
                        <div className="space-y-2">
                          <span className="text-xs font-mono uppercase text-[#8a8479]">Summary</span>
                          <p className={`text-xs sm:text-sm leading-relaxed ${
                            isDark ? 'text-[#ded8cc]' : 'text-[#3d3830]'
                          }`}>
                            {activeMeetingRecord.summary}
                          </p>
                        </div>
                      )}

                      {/* Decisions */}
                      {activeMeetingRecord.decisions && activeMeetingRecord.decisions.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-mono uppercase text-[#8a8479]">Decisions</span>
                          <ul className="space-y-1.5">
                            {activeMeetingRecord.decisions.map((d, i) => (
                              <li key={i} className="text-xs flex items-start space-x-2">
                                <Bookmark className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Items */}
                      {activeMeetingRecord.tasks && activeMeetingRecord.tasks.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-mono uppercase text-[#8a8479]">Action Items</span>
                          <div className="space-y-1.5">
                            {activeMeetingRecord.tasks.map((item, i) => (
                              <div 
                                key={i}
                                className={`text-xs p-2.5 rounded-xl border flex items-center justify-between ${
                                  isDark ? 'bg-[#22201d] border-[#2e2a24]' : 'bg-[#faf7f2] border-[#e2dcd2]'
                                }`}
                              >
                                <span>{item.title}</span>
                                {item.assignee && (
                                  <span className="text-[11px] text-[#8a8479] font-mono">
                                    @{item.assignee}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-[#8a8479] text-xs">
                      Select a record to inspect its details.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* New Room Modal */}
      {newRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-[#181715] border-[#2e2a24]' : 'bg-[#faf8f5] border-[#ded8cc]'
          }`}>
            <h3 className="font-serif text-lg">Create a room</h3>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-[#8a8479]">Room Name</label>
              <input
                type="text"
                value={instantRoomTitle}
                onChange={(e) => setInstantRoomTitle(e.target.value)}
                placeholder="Room name (optional)"
                className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-[#1e1c19] border-[#312d26]' : 'bg-white border-[#ded8cc]'
                }`}
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setNewRoomModalOpen(false)}
                className="px-4 py-2 text-xs rounded-xl text-[#8a8479]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewRoomModalOpen(false);
                  handleStartRoom();
                }}
                className="px-4 py-2 text-xs rounded-xl bg-[#148b94] text-white font-medium hover:bg-[#10777f]"
              >
                Create a room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

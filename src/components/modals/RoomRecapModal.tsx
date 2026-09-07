import React, { useState } from 'react';
import { useChatAndKeep } from '../../context/ChatAndKeepContext';
import { useMeeting } from '../../context/MeetingContext';
import { MeetingRecord } from '../../types';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Clock, 
  Users, 
  Bookmark, 
  ArrowRight,
  ListTodo,
  Lightbulb
} from 'lucide-react';

interface RoomRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MeetingRecord | null;
}

export const RoomRecapModal: React.FC<RoomRecapModalProps> = ({ isOpen, onClose, record }) => {
  const { 
    keepItems, 
    confirmKeepSuggestion, 
    dismissKeepSuggestion,
    setActiveConversationId,
    setActiveMeetingRecordId
  } = useChatAndKeep();
  const { setView, atmosphere } = useMeeting();
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const isDark = atmosphere === 'obsidian';

  if (!isOpen || !record) return null;

  // Find suggested memories associated with this meeting or room
  const meetingSuggestions = keepItems.filter(k => 
    k.status === 'suggested' && 
    (k.source.id === record.id || k.source.roomId === record.roomId || k.source.title === record.roomTitle)
  );

  const handleConfirm = async (id: string) => {
    await confirmKeepSuggestion(id);
    setReviewedIds(prev => new Set(prev).add(id));
  };

  const handleDismiss = async (id: string) => {
    await dismissKeepSuggestion(id);
    setReviewedIds(prev => new Set(prev).add(id));
  };

  const handleContinueInChat = () => {
    onClose();
    if (record.associatedConversationId) {
      setActiveConversationId(record.associatedConversationId);
    }
    setView('chat');
  };

  const handleViewFullRecord = () => {
    onClose();
    setActiveMeetingRecordId(record.id);
    setView('rooms');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark 
            ? 'bg-[#181715] border-[#2e2a24] text-[#f5f1ea]' 
            : 'bg-[#faf8f5] border-[#e2dcd2] text-[#1a1917]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#2e2a24]' : 'border-[#e8e2d7]'
        }`}>
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#148b94]" />
              <span className="text-[11px] uppercase font-mono tracking-widest text-[#8a8479]">
                ROOM Session Ended
              </span>
            </div>
            <h2 className="font-serif text-xl tracking-tight font-normal mt-0.5">
              {record.roomTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-[#8a8479] hover:text-white hover:bg-[#25221d]' : 'text-[#8a8479] hover:text-black hover:bg-[#ebe5d9]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Metadata Row */}
          <div className={`grid grid-cols-3 gap-3 p-3.5 rounded-xl border text-center ${
            isDark ? 'bg-[#1e1c19] border-[#2e2a24]' : 'bg-[#f4efe4] border-[#dcd4c6]'
          }`}>
            <div>
              <div className="flex items-center justify-center space-x-1 text-xs text-[#8a8479]">
                <Clock className="w-3.5 h-3.5" />
                <span>Duration</span>
              </div>
              <p className="font-mono text-sm font-semibold mt-0.5">
                {record.durationFormatted}
              </p>
            </div>
            <div className="border-x border-current/10">
              <div className="flex items-center justify-center space-x-1 text-xs text-[#8a8479]">
                <Users className="w-3.5 h-3.5" />
                <span>Participants</span>
              </div>
              <p className="font-mono text-sm font-semibold mt-0.5">
                {record.participantCount}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center space-x-1 text-xs text-[#8a8479]">
                <Bookmark className="w-3.5 h-3.5" />
                <span>Decisions</span>
              </div>
              <p className="font-mono text-sm font-semibold mt-0.5 text-amber-600 dark:text-amber-400">
                {record.decisions?.length || 0}
              </p>
            </div>
          </div>

          {/* Executive Synthesis */}
          {record.summary && (
            <div className="space-y-1.5">
              <span className={`text-xs font-mono uppercase tracking-wider ${
                isDark ? 'text-[#8a8479]' : 'text-[#968e82]'
              }`}>
                Executive Summary
              </span>
              <p className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#ded8cc]' : 'text-[#383530]'
              }`}>
                {record.summary}
              </p>
            </div>
          )}

          {/* AI Memory Suggestions Pending Confirmation */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[#148b94]">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                  AI Memory Suggestions ({meetingSuggestions.length})
                </span>
              </div>
              <span className="text-[11px] text-[#8a8479]">
                Confirm to save permanently in Keep
              </span>
            </div>

            {meetingSuggestions.length === 0 ? (
              <p className={`text-xs p-3 rounded-xl border text-center ${
                isDark ? 'bg-[#1e1c19] border-[#2c2924] text-[#8a8479]' : 'bg-[#f7f4ee] border-[#e2dcd2] text-[#8a8479]'
              }`}>
                All extracted suggestions have been reviewed or confirmed.
              </p>
            ) : (
              meetingSuggestions.map((sug) => {
                const isReviewed = reviewedIds.has(sug.id);
                return (
                  <div
                    key={sug.id}
                    className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                      isReviewed 
                        ? 'opacity-50' 
                        : isDark ? 'bg-[#201e1b] border-[#312d26]' : 'bg-white border-[#e0dad0]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                            sug.category === 'decision' 
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                          }`}>
                            Possible {sug.category}
                          </span>
                          <span className="text-xs font-medium">{sug.title}</span>
                        </div>
                        <p className={`text-xs leading-relaxed ${
                          isDark ? 'text-[#a8a195]' : 'text-[#615a4f]'
                        }`}>
                          {sug.content}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleConfirm(sug.id)}
                          title="Confirm into Keep"
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Keep</span>
                        </button>
                        <button
                          onClick={() => handleDismiss(sug.id)}
                          title="Dismiss suggestion"
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'text-[#8a8479] hover:bg-[#2c2923] hover:text-white' : 'text-[#8a8479] hover:bg-[#eae4d8] hover:text-black'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer actions: Continuity */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDark ? 'border-[#2e2a24] bg-[#141312]' : 'border-[#e8e2d7] bg-[#f5f0e6]'
        }`}>
          <button
            onClick={handleViewFullRecord}
            className={`text-xs font-medium hover:underline ${
              isDark ? 'text-[#a69f92]' : 'text-[#6b6459]'
            }`}
          >
            View Full Meeting Archive →
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleContinueInChat}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Continue Conversation in Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

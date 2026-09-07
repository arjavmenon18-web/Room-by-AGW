import React, { useState, useEffect, useRef } from 'react';
import { useChatAndKeep } from '../../context/ChatAndKeepContext';
import { useMeeting } from '../../context/MeetingContext';
import { Search, X, Sparkles, MessageSquare, Bookmark, Video, ArrowRight, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { KeepCategory } from '../../types';

interface UnifiedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnifiedSearchModal: React.FC<UnifiedSearchModalProps> = ({ isOpen, onClose }) => {
  const { 
    performUnifiedSearch, 
    unifiedSearchResult, 
    isSearching, 
    clearUnifiedSearch,
    setActiveConversationId,
    setActiveMeetingRecordId,
    setActiveKeepFilter
  } = useChatAndKeep();
  const { setView, atmosphere } = useMeeting();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = atmosphere === 'obsidian';

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      clearUnifiedSearch();
    }
  }, [isOpen, clearUnifiedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    performUnifiedSearch(query.trim());
  };

  if (!isOpen) return null;

  const getCategoryBadge = (category?: KeepCategory) => {
    switch (category) {
      case 'decision':
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Decision</span>;
      case 'task':
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Task</span>;
      case 'idea':
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">Idea</span>;
      case 'question':
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Question</span>;
      case 'reference':
        return <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20">Reference</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark 
            ? 'bg-[#181715] border-[#2e2a24] text-[#f5f1ea]' 
            : 'bg-[#faf8f5] border-[#e2dcd2] text-[#1a1917]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <form onSubmit={handleSearchSubmit} className={`flex items-center px-4 py-3.5 border-b ${
          isDark ? 'border-[#2e2a24]' : 'border-[#e8e2d7]'
        }`}>
          <Search className={`w-5 h-5 mr-3 flex-shrink-0 ${
            isDark ? 'text-[#8a8479]' : 'text-[#9c9588]'
          }`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions, chat messages, and rooms..."
            className={`w-full bg-transparent text-sm sm:text-base outline-none placeholder:text-[#968f82] font-normal ${
              isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
            }`}
          />
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#148b94] mr-2" />
          ) : query ? (
            <button
              type="submit"
              className="text-xs px-2.5 py-1 rounded bg-[#148b94] text-white font-medium hover:bg-[#10777f] mr-2"
            >
              Search
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'text-[#8a8479] hover:text-white hover:bg-[#25221d]' : 'text-[#8a8479] hover:text-black hover:bg-[#ebe5d9]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Results Area */}
        <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick query pills if empty */}
          {!unifiedSearchResult && (
            <div className="space-y-3 py-3">
              <p className={`text-xs font-medium uppercase font-mono tracking-wider ${
                isDark ? 'text-[#7d776c]' : 'text-[#9e9689]'
              }`}>
                Suggested Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {['Decisions', 'Tasks', 'Notes', 'Roadmap'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item);
                      performUnifiedSearch(item);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      isDark
                        ? 'bg-[#22201d] border-[#332f29] text-[#ded8cc] hover:border-[#148b94]'
                        : 'bg-[#f0ebe1] border-[#ddd6c8] text-[#3d3a35] hover:border-[#148b94]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Synthesis Section */}
          {unifiedSearchResult && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark 
                ? 'bg-[#1e1c19] border-[#38332a]' 
                : 'bg-[#f4efe4] border-[#dcd4c6]'
            }`}>
              <div className="flex items-center space-x-2 text-[#148b94]">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider font-mono">
                  Armen Intelligence Synthesis
                </span>
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#ece7dd]' : 'text-[#2b2925]'
              }`}>
                {unifiedSearchResult.aiSynthesis}
              </p>
            </div>
          )}

          {/* Matching items */}
          {unifiedSearchResult && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono uppercase tracking-wider ${
                  isDark ? 'text-[#7d776c]' : 'text-[#968e82]'
                }`}>
                  Matching Records ({unifiedSearchResult.items.length})
                </span>
              </div>

              {unifiedSearchResult.items.length === 0 ? (
                <p className="text-xs text-[#8a8479] py-4 text-center">
                  No individual items directly matching "{query}".
                </p>
              ) : (
                unifiedSearchResult.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onClose();
                      if (item.type === 'keep') {
                        setView('keep');
                      } else if (item.type === 'meeting') {
                        setActiveMeetingRecordId(item.id);
                        setView('rooms');
                      } else if (item.type === 'chat') {
                        if (item.metadata?.conversationId) {
                          setActiveConversationId(item.metadata.conversationId);
                        }
                        setView('chat');
                      }
                    }}
                    className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between group ${
                      isDark 
                        ? 'bg-[#1e1c19] border-[#2d2923] hover:border-[#148b94]/60 hover:bg-[#23201c]' 
                        : 'bg-white border-[#e6e0d4] hover:border-[#148b94]/60 hover:bg-[#fbf9f6]'
                    }`}
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center space-x-2">
                        {item.type === 'keep' && <Bookmark className="w-3.5 h-3.5 text-[#148b94]" />}
                        {item.type === 'meeting' && <Video className="w-3.5 h-3.5 text-amber-600" />}
                        {item.type === 'chat' && <MessageSquare className="w-3.5 h-3.5 text-sky-600" />}

                        {getCategoryBadge(item.category)}

                        <span className={`text-xs font-medium ${
                          isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
                        }`}>
                          {item.title}
                        </span>
                      </div>

                      <p className={`text-xs line-clamp-2 leading-relaxed ${
                        isDark ? 'text-[#a69f92]' : 'text-[#6b6459]'
                      }`}>
                        {item.snippet}
                      </p>

                      <div className="flex items-center space-x-2 pt-0.5 text-[10px] text-[#8a8479]">
                        <span>{item.sourceContext}</span>
                        <span>·</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{item.date}</span>
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#8a8479] group-hover:text-[#148b94] group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-[#2e2a24] bg-[#141312] text-[#787267]' : 'border-[#e8e2d7] bg-[#f5f0e6] text-[#8c8577]'
        }`}>
          <span>Searches unified Chat, Keep memories, past Meeting records & transcripts</span>
          <span className="font-mono">ESC to exit</span>
        </div>
      </div>
    </div>
  );
};

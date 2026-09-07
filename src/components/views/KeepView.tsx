import React, { useState } from 'react';
import { useChatAndKeep } from '../../context/ChatAndKeepContext';
import { useMeeting } from '../../context/MeetingContext';
import { KeepItem, KeepCategory, ProjectTimelineItem } from '../../types';
import { 
  Bookmark, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Calendar, 
  User, 
  ExternalLink, 
  Trash2, 
  Filter, 
  History, 
  ChevronRight,
  ListTodo,
  Lightbulb,
  FileText,
  HelpCircle,
  Film,
  Check,
  Tag
} from 'lucide-react';
import { CaptureMemoryModal } from '../modals/CaptureMemoryModal';

export const KeepView: React.FC = () => {
  const { 
    keepItems, 
    activeKeepFilter, 
    setActiveKeepFilter, 
    keepSearchQuery, 
    setKeepSearchQuery,
    filteredKeepItems,
    confirmKeepSuggestion,
    dismissKeepSuggestion,
    deleteKeepItem,
    toggleTaskComplete,
    setActiveMeetingRecordId,
    setActiveConversationId,
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject
  } = useChatAndKeep();

  const { setView, atmosphere } = useMeeting();

  const [captureModalOpen, setCaptureModalOpen] = useState(false);
  const [timelineDrawerOpen, setTimelineDrawerOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<KeepItem | null>(null);

  const isDark = atmosphere === 'obsidian';

  const pendingSuggestions = keepItems.filter(k => k.status === 'suggested');
  const confirmedMemories = filteredKeepItems.filter(k => k.status === 'confirmed');

  const filterTabs: { id: any; label: string; count?: number }[] = [
    { id: 'all', label: 'All Intelligence' },
    { id: 'suggestions', label: 'AI Suggestions', count: pendingSuggestions.length },
    { id: 'decision', label: 'Decisions' },
    { id: 'task', label: 'Tasks' },
    { id: 'idea', label: 'Ideas' },
    { id: 'question', label: 'Questions' },
    { id: 'reference', label: 'References' },
  ];

  const getCategoryBadge = (category: KeepCategory, isAi?: boolean) => {
    switch (category) {
      case 'decision':
        return (
          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
            Decision
          </span>
        );
      case 'task':
        return (
          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
            Task
          </span>
        );
      case 'idea':
        return (
          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-medium">
            Idea
          </span>
        );
      case 'question':
        return (
          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">
            Question
          </span>
        );
      case 'reference':
        return (
          <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20 font-medium">
            Reference
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-[calc(100vh-64px)] flex flex-col ${
      isDark ? 'bg-[#181715] text-[#f5f1ea]' : 'bg-[#faf8f5] text-[#1a1917]'
    }`}>
      {/* Top Header */}
      <header className={`px-6 sm:px-10 py-5 border-b flex items-center justify-between gap-4 ${
        isDark ? 'border-[#292621] bg-[#1a1917]' : 'border-[#e6e0d4] bg-white'
      }`}>
        <div>
          <h1 className="font-serif text-2xl tracking-tight font-normal">
            Keep
          </h1>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-3">
          {keepItems.length > 0 && (
            <button
              onClick={() => setTimelineDrawerOpen(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
                isDark 
                  ? 'bg-[#22201d] border-[#332e27] text-[#ded8cc] hover:text-white' 
                  : 'bg-[#f0ebe1] border-[#ddd6c8] text-[#33302a] hover:text-black'
              }`}
            >
              <History className="w-3.5 h-3.5 text-[#148b94]" />
              <span>Timeline</span>
            </button>
          )}

          <button
            onClick={() => setCaptureModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </header>

      {keepItems.length === 0 ? (
        <main className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
          <Bookmark className="w-10 h-10 text-[#8a8479] stroke-1" />
          <p className="text-base text-[#8a8479]">Nothing saved yet.</p>
          <button
            onClick={() => setCaptureModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </main>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className={`px-6 sm:px-10 py-3.5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
            isDark ? 'border-[#292621] bg-[#1d1b18]' : 'border-[#e6e0d4] bg-[#f9f6f0]'
          }`}>
        {/* Category Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveKeepFilter(tab.id)}
              className={`text-xs px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 flex-shrink-0 ${
                activeKeepFilter === tab.id
                  ? isDark 
                    ? 'bg-[#2b2721] text-[#f5f1ea] font-medium shadow-sm' 
                    : 'bg-white text-[#1a1917] font-medium shadow-sm border border-[#dcd6c8]'
                  : 'text-[#8a8479] hover:text-current'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#148b94] text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className={`flex items-center px-3 py-1.5 rounded-xl border max-w-xs w-full ${
          isDark ? 'bg-[#181715] border-[#312d26]' : 'bg-white border-[#dcd6c8]'
        }`}>
          <Search className="w-3.5 h-3.5 text-[#8a8479] mr-2 flex-shrink-0" />
          <input
            type="text"
            value={keepSearchQuery}
            onChange={(e) => setKeepSearchQuery(e.target.value)}
            placeholder="Search memories or decisions..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-[#8a8479]"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full">
        {/* PENDING AI SUGGESTIONS SECTION (Clearly identified as AI suggestions until confirmed) */}
        {(activeKeepFilter === 'all' || activeKeepFilter === 'suggestions') && pendingSuggestions.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#148b94]" />
                <h2 className="font-mono text-xs uppercase tracking-wider font-semibold text-[#148b94]">
                  AI Memory Suggestions ({pendingSuggestions.length})
                </h2>
              </div>
              <span className="text-[11px] text-[#8a8479]">
                Detected from meeting conversations & notes. Confirm to lock into permanent archive.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  className={`p-5 rounded-2xl border space-y-3 transition-all relative ${
                    isDark 
                      ? 'bg-[#1f1d1a] border-[#332e27] hover:border-[#148b94]/60' 
                      : 'bg-white border-[#e0dad0] hover:border-[#148b94]/60 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#148b94]/30 bg-[#148b94]/10 text-[#148b94] font-medium flex items-center space-x-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>AI Suggestion: {sug.category}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#8a8479]">
                        {Math.round(sug.confidence * 100)}% match
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => confirmKeepSuggestion(sug.id)}
                        className="px-3 py-1 rounded-xl text-xs font-medium bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1"
                        title="Confirm into Keep"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Confirm</span>
                      </button>
                      <button
                        onClick={() => dismissKeepSuggestion(sug.id)}
                        className={`p-1.5 rounded-xl transition-colors ${
                          isDark ? 'text-[#8a8479] hover:bg-[#2a2620] hover:text-white' : 'text-[#8a8479] hover:bg-[#ebe5d9] hover:text-black'
                        }`}
                        title="Dismiss suggestion"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-sm sm:text-base leading-snug">
                      {sug.title}
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed mt-1.5 ${
                      isDark ? 'text-[#b0a99c]' : 'text-[#5e574c]'
                    }`}>
                      {sug.content}
                    </p>
                  </div>

                  {/* Attribution */}
                  <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[11px] text-[#8a8479]">
                    <div className="flex items-center space-x-1 truncate">
                      <span>Source: {sug.source.title}</span>
                      <span>·</span>
                      <span>{sug.source.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CONFIRMED KEEP ARCHIVE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`font-mono text-xs uppercase tracking-wider ${
              isDark ? 'text-[#7d776c]' : 'text-[#9e9689]'
            }`}>
              Confirmed Intelligence ({confirmedMemories.length})
            </h2>
          </div>

          {confirmedMemories.length === 0 ? (
            <div className="p-12 text-center space-y-2 border border-dashed rounded-2xl border-current/20">
              <Bookmark className="w-8 h-8 text-[#8a8479] mx-auto stroke-1" />
              <p className="font-serif text-base">No confirmed memories in this view</p>
              <p className="text-xs text-[#8a8479] max-w-sm mx-auto">
                Capture explicit decisions, ideas, or references from Chat, Meetings, or by clicking "Capture Memory".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {confirmedMemories.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all group ${
                    isDark 
                      ? 'bg-[#1e1c19] border-[#2e2a24] hover:border-[#3d372e]' 
                      : 'bg-white border-[#e3ded5] hover:border-[#cac3b6] shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Category Badge & Task Checkbox or Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getCategoryBadge(item.category)}
                        {item.isAiGenerated && (
                          <span className="text-[10px] font-mono text-[#8a8479] flex items-center space-x-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-[#148b94]" />
                            <span>AI Verified</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteKeepItem(item.id)}
                          className="p-1 text-[#8a8479] hover:text-red-500 rounded"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Task interactive checkbox */}
                    {item.category === 'task' ? (
                      <div className="flex items-start space-x-2.5">
                        <button
                          onClick={() => toggleTaskComplete(item.id)}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                            item.completed 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : isDark ? 'border-[#423d34]' : 'border-[#b8b1a4]'
                          }`}
                        >
                          {item.completed && <Check className="w-3 h-3" />}
                        </button>
                        <div>
                          <h3 className={`font-medium text-sm leading-snug ${
                            item.completed ? 'line-through text-[#8a8479]' : ''
                          }`}>
                            {item.title}
                          </h3>
                        </div>
                      </div>
                    ) : (
                      <h3 className="font-medium text-sm sm:text-base leading-snug">
                        {item.title}
                      </h3>
                    )}

                    {/* Content */}
                    <p className={`text-xs leading-relaxed ${
                      isDark ? 'text-[#aba395]' : 'text-[#615a4f]'
                    }`}>
                      {item.content}
                    </p>

                    {/* Task Assignee & Due Date */}
                    {item.category === 'task' && (item.assignedTo || item.dueDate) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#8a8479]">
                        {item.assignedTo && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{item.assignedTo}</span>
                          </span>
                        )}
                        {item.dueDate && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Due {item.dueDate}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.map(t => (
                          <span 
                            key={t}
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              isDark ? 'bg-[#24211e] border-[#332e27] text-[#9c9588]' : 'bg-[#f4efe4] border-[#ddd6c8] text-[#635d52]'
                            }`}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Source Attribution (Traceability) */}
                  <div className="pt-3 mt-4 border-t border-current/10 flex items-center justify-between text-[11px] text-[#8a8479]">
                    <div className="flex items-center space-x-1 truncate max-w-[75%]">
                      <span className="truncate">{item.source?.title || 'Studio Note'}</span>
                      <span>·</span>
                      <span className="flex-shrink-0">{item.source?.date}</span>
                    </div>

                    {/* Direct link to open meeting or chat */}
                    {item.source?.type === 'meeting' && (
                      <button
                        onClick={() => {
                          if (item.source?.id) setActiveMeetingRecordId(item.source.id);
                          setView('rooms');
                        }}
                        className="text-[#148b94] hover:underline flex items-center space-x-0.5 font-medium"
                      >
                        <span>Meeting</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}

                    {item.source?.type === 'chat' && (
                      <button
                        onClick={() => {
                          if (item.source?.conversationId) setActiveConversationId(item.source.conversationId);
                          setView('chat');
                        }}
                        className="text-[#148b94] hover:underline flex items-center space-x-0.5 font-medium"
                      >
                        <span>Chat</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      </>
      )}

      {/* PROJECT TIMELINE DRAWER */}
      {timelineDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-md h-full flex flex-col p-6 shadow-2xl overflow-y-auto ${
            isDark ? 'bg-[#181715] border-l border-[#2e2a24]' : 'bg-[#faf8f5] border-l border-[#ded8cc]'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-current/10">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#148b94]" />
                <h3 className="font-serif text-lg">Timeline</h3>
              </div>
              <button onClick={() => setTimelineDrawerOpen(false)} className="text-[#8a8479]">
                ✕
              </button>
            </div>

            <div className="py-4 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#8a8479]">Project Context</span>
              <h4 className="font-medium text-base">{activeProject?.title || 'General'}</h4>
              <p className="text-xs text-[#8a8479]">{activeProject?.description}</p>
            </div>

            {/* Chronological Evolution: Idea -> Discussion -> Decision -> Task -> Meeting */}
            <div className="space-y-4 pt-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8a8479]">
                Chronological Evolution
              </span>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-current/15">
                {(activeProject?.timeline || []).map((event) => (
                  <div key={event.id} className="relative space-y-1">
                    {/* Dot */}
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#148b94] ring-4 ring-[#181715]" />
                    <div className="flex items-center justify-between text-[11px] text-[#8a8479]">
                      <span className="uppercase font-mono font-medium text-[#148b94]">{event.type}</span>
                      <span>{event.date}</span>
                    </div>
                    <h5 className="font-medium text-xs sm:text-sm">{event.title}</h5>
                    <p className="text-xs text-[#8a8479]">{event.description}</p>
                    <div className="text-[10px] text-[#8a8479] pt-0.5">
                      <span>Source: {event.source}</span> · <span>By {event.author}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capture Memory Modal */}
      <CaptureMemoryModal
        isOpen={captureModalOpen}
        onClose={() => setCaptureModalOpen(false)}
      />
    </div>
  );
};

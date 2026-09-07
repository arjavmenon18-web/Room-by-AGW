import React, { useState, useRef, useEffect } from 'react';
import { useChatAndKeep } from '../../context/ChatAndKeepContext';
import { useMeeting } from '../../context/MeetingContext';
import { DirectChatMessage, Conversation, KeepCategory } from '../../types';
import { 
  Search, 
  Plus, 
  Pin, 
  BellOff, 
  Send, 
  Paperclip, 
  Smile, 
  Video, 
  Bookmark, 
  Sparkles, 
  MoreVertical, 
  Reply, 
  Check, 
  CheckCheck,
  ChevronDown,
  Hash,
  User,
  Users,
  Film,
  ExternalLink,
  Download,
  Clock,
  MessageSquare,
  X
} from 'lucide-react';
import { CaptureMemoryModal } from '../modals/CaptureMemoryModal';

export const ChatView: React.FC = () => {
  const { 
    conversations, 
    activeConversationId, 
    activeConversation, 
    setActiveConversationId,
    activeMessages,
    sendDirectMessage,
    createConversation,
    togglePinConversation,
    toggleMuteConversation,
    saveChatToKeep
  } = useChatAndKeep();

  const { startMeeting, setView, atmosphere, user } = useMeeting();

  const [filterType, setFilterType] = useState<'all' | 'direct' | 'project' | 'group'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<DirectChatMessage | null>(null);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatType, setNewChatType] = useState<'direct' | 'group' | 'project'>('direct');
  const [newChatMember, setNewChatMember] = useState('');
  
  // Quick "Save to Keep" modal state
  const [saveToKeepModalOpen, setSaveToKeepModalOpen] = useState(false);
  const [keepModalInitialText, setKeepModalInitialText] = useState('');
  const [keepModalSourceTitle, setKeepModalSourceTitle] = useState('');
  const [keepNotification, setKeepNotification] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = atmosphere === 'obsidian';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;
    const sizeMb = file.size / (1024 * 1024);
    const sizeFormatted = sizeMb >= 1 
      ? `${sizeMb.toFixed(1)} MB` 
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    sendDirectMessage(activeConversationId, '', {
      fileAttachment: {
        name: file.name,
        size: sizeFormatted,
        type: file.type || 'application/octet-stream',
      }
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const filteredConversations = conversations.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (searchFilter.trim()) {
      return c.title.toLowerCase().includes(searchFilter.toLowerCase());
    }
    return true;
  });

  const pinnedConversations = filteredConversations.filter(c => c.isPinned);
  const otherConversations = filteredConversations.filter(c => !c.isPinned);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConversationId) return;

    await sendDirectMessage(activeConversationId, inputText.trim(), {
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        content: replyingTo.content.substring(0, 80)
      } : undefined
    });

    setInputText('');
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Launch instant ROOM from this conversation
  const handleStartRoomFromChat = () => {
    if (!activeConversation) return;
    const roomTitle = `${activeConversation.title} — ROOM Session`;
    startMeeting(roomTitle);
  };

  // Save specific message to Keep
  const handleSaveMessageToKeep = async (msg: DirectChatMessage, category?: KeepCategory) => {
    const item = await saveChatToKeep(
      msg.content, 
      activeConversation?.title || 'Chat', 
      category, 
      {
        author: msg.senderName,
        conversationId: activeConversationId || undefined,
        projectId: activeConversation?.projectId
      }
    );
    setKeepNotification(`Saved "${item.title}" to Keep`);
    setTimeout(() => setKeepNotification(null), 3500);
  };

  // Open explicit capture modal prefilled
  const handleOpenExplicitSave = (content: string) => {
    setKeepModalInitialText(content);
    setKeepModalSourceTitle(`Chat: ${activeConversation?.title || 'Conversation'}`);
    setSaveToKeepModalOpen(true);
  };

  // Create new conversation
  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim()) return;
    await createConversation(
      newChatTitle.trim(), 
      newChatType, 
      newChatMember ? [newChatMember.trim()] : undefined
    );
    setNewChatTitle('');
    setNewChatMember('');
    setNewChatModalOpen(false);
  };

  return (
    <div className={`h-[calc(100vh-64px)] flex overflow-hidden ${
      isDark ? 'bg-[#181715] text-[#f5f1ea]' : 'bg-[#faf8f5] text-[#1a1917]'
    }`}>
      {/* Toast Notification */}
      {keepNotification && (
        <div className="fixed top-20 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#148b94] text-white shadow-xl text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <Bookmark className="w-4 h-4" />
          <span>{keepNotification}</span>
        </div>
      )}

      {/* LEFT COLUMN: Conversations List */}
      <aside className={`w-80 sm:w-96 flex-shrink-0 border-r flex flex-col h-full ${
        isDark ? 'bg-[#181715] border-[#292621]' : 'bg-[#f7f4ee] border-[#e6e0d4]'
      }`}>
        {/* Header & New Chat button */}
        <div className={`p-4 border-b space-y-3 ${
          isDark ? 'border-[#292621]' : 'border-[#e6e0d4]'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-lg tracking-tight font-normal">
                Chat
              </h1>
            </div>
            <button
              onClick={() => setNewChatModalOpen(true)}
              className="p-1.5 rounded-xl bg-[#148b94] text-white hover:bg-[#10777f] transition-all shadow-sm flex items-center space-x-1 text-xs px-2.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Search bar */}
          <div className={`flex items-center px-3 py-1.5 rounded-xl border ${
            isDark ? 'bg-[#1f1d1a] border-[#2e2a24]' : 'bg-white border-[#ded8cc]'
          }`}>
            <Search className="w-3.5 h-3.5 text-[#8a8479] mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-[#918a7e]"
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="text-[#8a8479] hover:text-current">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 pt-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'direct', label: 'Direct' },
              { id: 'project', label: 'Projects' },
              { id: 'group', label: 'Groups' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
                  filterType === tab.id
                    ? isDark 
                      ? 'bg-[#292621] text-[#f5f1ea] font-medium' 
                      : 'bg-[#e8e2d5] text-[#1a1917] font-medium'
                    : 'text-[#8a8479] hover:text-current'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <MessageSquare className="w-8 h-8 text-[#8a8479] stroke-1" />
            <p className="text-xs text-[#8a8479]">No conversations yet.</p>
            <button
              onClick={() => setNewChatModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#148b94] text-white hover:bg-[#10777f] transition-all text-xs font-medium flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New conversation</span>
            </button>
          </div>
        ) : (
          /* Conversations Scroll Area */
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Pinned Section */}
            {pinnedConversations.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-[#8a8479] space-x-1">
                  <Pin className="w-3 h-3" />
                  <span>Pinned</span>
                </div>
                {pinnedConversations.map(c => renderConversationItem(c))}
              </div>
            )}

            {/* All Conversations */}
            <div className="space-y-1">
              {pinnedConversations.length > 0 && otherConversations.length > 0 && (
                <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-[#8a8479]">
                  Conversations
                </div>
              )}
              {otherConversations.map(c => renderConversationItem(c))}

              {filteredConversations.length === 0 && (
                <p className="text-center text-xs text-[#8a8479] py-8">
                  No conversations found.
                </p>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* RIGHT COLUMN: Active Conversation Pane */}
      {activeConversation ? (
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Conversation Header */}
          <header className={`px-6 py-3.5 border-b flex items-center justify-between flex-shrink-0 ${
            isDark ? 'border-[#292621] bg-[#1a1917]' : 'border-[#e6e0d4] bg-white'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="relative">
                {activeConversation.type === 'direct' ? (
                  activeConversation.members[0]?.avatar ? (
                    <img 
                      src={activeConversation.members[0]?.avatar} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover border border-current/10" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#148b94]/20 text-[#148b94] flex items-center justify-center font-serif text-sm">
                      {activeConversation.title.substring(0, 2).toUpperCase()}
                    </div>
                  )
                ) : activeConversation.type === 'project' ? (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Film className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                )}
                {/* Presence indicator */}
                {activeConversation.members.some(m => m.status === 'online') && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#181715]" />
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="font-serif text-base font-normal">
                    {activeConversation.title}
                  </h2>
                  {activeConversation.isPinned && (
                    <Pin className="w-3 h-3 text-[#8a8479]" />
                  )}
                  {activeConversation.isMuted && (
                    <BellOff className="w-3 h-3 text-[#8a8479]" />
                  )}
                </div>
                <p className="text-xs text-[#8a8479]">
                  {activeConversation.type === 'direct' 
                    ? (activeConversation.members.find(m => m.name !== user.name)?.role || 'Team Member')
                    : `${activeConversation.members.length} members · Continuous Space`
                  }
                </p>
              </div>
            </div>

            {/* Actions: Start ROOM & Options */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleStartRoomFromChat}
                className="px-3.5 py-1.5 rounded-xl bg-[#148b94] text-white hover:bg-[#10777f] transition-all flex items-center space-x-1.5 text-xs font-medium shadow-sm"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Start a ROOM</span>
              </button>

              <button
                onClick={() => togglePinConversation(activeConversation.id)}
                title={activeConversation.isPinned ? 'Unpin' : 'Pin'}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-[#25221d] text-[#8a8479]' : 'hover:bg-[#f0ebe1] text-[#8a8479]'
                }`}
              >
                <Pin className={`w-4 h-4 ${activeConversation.isPinned ? 'text-[#148b94]' : ''}`} />
              </button>

              <button
                onClick={() => toggleMuteConversation(activeConversation.id)}
                title={activeConversation.isMuted ? 'Unmute' : 'Mute'}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-[#25221d] text-[#8a8479]' : 'hover:bg-[#f0ebe1] text-[#8a8479]'
                }`}
              >
                <BellOff className={`w-4 h-4 ${activeConversation.isMuted ? 'text-amber-500' : ''}`} />
              </button>
            </div>
          </header>

          {/* Active ROOM Banner if linked meeting is ongoing */}
          <div className={`px-6 py-2 border-b flex items-center justify-between text-xs ${
            isDark ? 'bg-[#1f1d1a] border-[#292621]' : 'bg-[#f4efe4] border-[#e6e0d4]'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[#8a8479]">
                Continuous Presence: Ready to meet or review live in ROOM
              </span>
            </div>
            <button
              onClick={handleStartRoomFromChat}
              className="text-[#148b94] hover:underline font-medium flex items-center space-x-1"
            >
              <span>Launch Suite</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                <p className="font-serif text-base">This is the start of your continuous conversation.</p>
                <p className="text-xs text-[#8a8479] max-w-sm">
                  Send messages, share scripts and references, or click "Start a ROOM" to launch a live meeting.
                </p>
              </div>
            ) : (
              activeMessages.map((msg, index) => {
                const isMe = msg.senderId === user.id || msg.senderName === user.name;
                return (
                  <div
                    key={msg.id}
                    className={`group flex items-start space-x-3 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    {msg.senderAvatar ? (
                      <img 
                        src={msg.senderAvatar} 
                        alt="" 
                        className="w-8 h-8 rounded-full object-cover border border-current/10 mt-0.5" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#148b94]/20 text-[#148b94] flex items-center justify-center text-xs font-serif font-medium mt-0.5">
                        {msg.senderName.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Message Bubble Container */}
                    <div className={`max-w-[78%] sm:max-w-[65%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* Sender metadata */}
                      <div className={`flex items-baseline space-x-2 text-xs ${isMe ? 'justify-end' : ''}`}>
                        <span className="font-medium text-xs">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        <span className="text-[10px] text-[#8a8479]">
                          {msg.timestamp}
                        </span>
                      </div>

                      {/* Quoted reply if any */}
                      {msg.replyTo && (
                        <div className={`text-xs p-2 rounded-lg border-l-2 mb-1 border-[#148b94] opacity-80 ${
                          isDark ? 'bg-[#22201d] text-[#c9c3b8]' : 'bg-[#ede7db] text-[#524c42]'
                        }`}>
                          <span className="font-medium text-[11px] block">{msg.replyTo.senderName}:</span>
                          <p className="truncate">{msg.replyTo.content}</p>
                        </div>
                      )}

                      {/* Main Message Text */}
                      <div className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed relative ${
                        isMe 
                          ? isDark 
                            ? 'bg-[#252320] text-[#faf8f5] border border-[#38332a] rounded-tr-sm' 
                            : 'bg-[#ede8dc] text-[#1a1917] border border-[#ded8cc] rounded-tr-sm'
                          : isDark 
                            ? 'bg-[#1f1d1a] text-[#f5f1ea] border border-[#2b2721] rounded-tl-sm' 
                            : 'bg-white text-[#1a1917] border border-[#e0d9cd] rounded-tl-sm shadow-sm'
                      }`}>
                        {msg.content}

                        {/* File Attachment preview */}
                        {msg.fileAttachment && (
                          <div className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between ${
                            isDark ? 'bg-[#181715] border-[#312d26]' : 'bg-[#faf8f5] border-[#d8d1c3]'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <Paperclip className="w-4 h-4 text-[#148b94]" />
                              <div>
                                <p className="font-medium text-xs truncate max-w-[200px]">
                                  {msg.fileAttachment.name}
                                </p>
                                <p className="text-[10px] text-[#8a8479]">
                                  {msg.fileAttachment.size}
                                </p>
                              </div>
                            </div>
                            <button className="p-1 rounded-lg text-[#8a8479] hover:text-current">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* ROOM Invite preview */}
                        {msg.roomInvite && (
                          <div className="mt-2.5 p-3 rounded-xl border border-[#148b94]/40 bg-[#148b94]/10 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5 text-[#148b94] font-medium text-xs">
                                <Video className="w-3.5 h-3.5" />
                                <span>ROOM Session Invitation</span>
                              </div>
                              <p className="text-xs">{msg.roomInvite.roomTitle}</p>
                            </div>
                            <button
                              onClick={() => startMeeting(msg.roomInvite?.roomTitle || 'Room Session')}
                              className="px-3 py-1 rounded-lg bg-[#148b94] text-white text-xs font-medium hover:bg-[#10777f]"
                            >
                              Join
                            </button>
                          </div>
                        )}

                        {/* Saved to Keep status badge */}
                        {msg.savedToKeepId && (
                          <div className="mt-2 flex items-center space-x-1 text-[10px] text-[#148b94]">
                            <Bookmark className="w-3 h-3 fill-current" />
                            <span>Saved to ROOM Keep</span>
                          </div>
                        )}
                      </div>

                      {/* Hover Actions Bar (Save to Keep, Reply, Reactions) */}
                      <div className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5 ${
                        isMe ? 'justify-end' : ''
                      }`}>
                        {/* Save to Keep */}
                        <div className="relative group/keep">
                          <button
                            onClick={() => handleSaveMessageToKeep(msg)}
                            className={`px-2 py-0.5 rounded-md text-[11px] flex items-center space-x-1 border transition-colors ${
                              isDark ? 'bg-[#22201d] border-[#312d26] text-[#a69f92] hover:text-[#148b94]' : 'bg-[#f0ebe1] border-[#d8d1c3] text-[#6b6459] hover:text-[#148b94]'
                            }`}
                            title="Save to Keep (Intelligent Memory)"
                          >
                            <Bookmark className="w-3 h-3" />
                            <span>Keep</span>
                          </button>
                          
                          {/* Quick category popover */}
                          <div className="hidden group-hover/keep:flex absolute bottom-full left-0 mb-1 z-30 p-1 rounded-xl shadow-lg border space-x-1 bg-[#181715] border-[#2e2a24] text-white">
                            {(['idea', 'decision', 'task', 'reference'] as KeepCategory[]).map(cat => (
                              <button
                                key={cat}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveMessageToKeep(msg, cat);
                                }}
                                className="px-2 py-1 text-[10px] uppercase font-mono rounded hover:bg-[#25221d] hover:text-[#148b94]"
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reply */}
                        <button
                          onClick={() => {
                            setReplyingTo(msg);
                            inputRef.current?.focus();
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isDark ? 'hover:bg-[#25221d] text-[#8a8479]' : 'hover:bg-[#ede7db] text-[#8a8479]'
                          }`}
                          title="Reply"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <footer className={`p-4 border-t flex-shrink-0 ${
            isDark ? 'border-[#292621] bg-[#1a1917]' : 'border-[#e6e0d4] bg-white'
          }`}>
            {/* Replying banner */}
            {replyingTo && (
              <div className={`px-3 py-1.5 mb-2 rounded-lg border-l-2 border-[#148b94] flex items-center justify-between text-xs ${
                isDark ? 'bg-[#22201d]' : 'bg-[#f5f0e6]'
              }`}>
                <div className="truncate">
                  <span className="font-medium text-[#148b94]">Replying to {replyingTo.senderName}: </span>
                  <span className="text-[#8a8479]">{replyingTo.content}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-[#8a8479] hover:text-current">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className={`rounded-2xl border p-2 flex flex-col space-y-2 transition-colors ${
              isDark ? 'bg-[#181715] border-[#312d26] focus-within:border-[#148b94]' : 'bg-[#faf8f5] border-[#dcd6c8] focus-within:border-[#148b94]'
            }`}>
              <textarea
                ref={inputRef}
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message… (Press Enter to send, Shift+Enter for newline)"
                className="w-full bg-transparent text-xs sm:text-sm outline-none resize-none px-2 pt-1 placeholder:text-[#918a7e]"
              />

              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (inputText.trim()) {
                        handleOpenExplicitSave(inputText.trim());
                      } else {
                        handleOpenExplicitSave('');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs flex items-center space-x-1 transition-colors ${
                      isDark ? 'text-[#a69f92] hover:bg-[#25221d] hover:text-[#148b94]' : 'text-[#6b6459] hover:bg-[#ede7db] hover:text-[#148b94]'
                    }`}
                    title="Remember this note into Keep"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Capture to Keep</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-1.5 rounded-lg text-[#8a8479] hover:text-current transition-colors ${
                      isDark ? 'hover:bg-[#25221d]' : 'hover:bg-[#ede7db]'
                    }`}
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  className={`p-2 rounded-xl text-white transition-all ${
                    inputText.trim() 
                      ? 'bg-[#148b94] hover:bg-[#10777f] shadow-sm' 
                      : 'bg-[#8a8479]/30 text-white/40 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </footer>
        </main>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
          <p className="font-serif text-lg">Select a conversation to start chatting</p>
        </div>
      )}

      {/* New Chat Modal */}
      {newChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isDark ? 'bg-[#181715] border-[#2e2a24]' : 'bg-[#faf8f5] border-[#ded8cc]'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg">New Conversation</h3>
              <button onClick={() => setNewChatModalOpen(false)} className="text-[#8a8479]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-[#8a8479]">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'direct', label: 'Direct' },
                    { id: 'project', label: 'Project' },
                    { id: 'group', label: 'Group' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewChatType(t.id as any)}
                      className={`py-2 rounded-xl text-xs font-medium border capitalize ${
                        newChatType === t.id
                          ? 'bg-[#148b94] text-white border-[#148b94]'
                          : isDark ? 'bg-[#22201d] border-[#312d26]' : 'bg-white border-[#ded8cc]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-[#8a8479]">
                  {newChatType === 'direct' ? 'Name' : 'Title'}
                </label>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder={newChatType === 'direct' ? 'Enter name' : 'Enter title'}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-[#1e1c19] border-[#312d26]' : 'bg-white border-[#ded8cc]'
                  }`}
                  autoFocus
                />
              </div>

              {newChatType !== 'direct' && (
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-[#8a8479]">Add Member (Optional)</label>
                  <input
                    type="text"
                    value={newChatMember}
                    onChange={(e) => setNewChatMember(e.target.value)}
                    placeholder="Enter name (optional)"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-[#1e1c19] border-[#312d26]' : 'bg-white border-[#ded8cc]'
                    }`}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewChatModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl text-[#8a8479]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-xl bg-[#148b94] text-white font-medium hover:bg-[#10777f]"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Capture Memory Modal */}
      <CaptureMemoryModal
        isOpen={saveToKeepModalOpen}
        onClose={() => setSaveToKeepModalOpen(false)}
        initialContent={keepModalInitialText}
        sourceTitle={keepModalSourceTitle}
      />
    </div>
  );

  function renderConversationItem(conv: Conversation) {
    const isActive = conv.id === activeConversationId;
    return (
      <div
        key={conv.id}
        onClick={() => setActiveConversationId(conv.id)}
        className={`p-3 rounded-2xl cursor-pointer transition-all flex items-start space-x-3 border ${
          isActive
            ? isDark
              ? 'bg-[#22201d] border-[#38332a]'
              : 'bg-white border-[#dcd6c8] shadow-sm'
            : isDark
              ? 'border-transparent hover:bg-[#1f1d1a]'
              : 'border-transparent hover:bg-[#ede7db]'
        }`}
      >
        {/* Avatar / Symbol */}
        <div className="relative flex-shrink-0 mt-0.5">
          {conv.type === 'direct' ? (
            conv.members[0]?.avatar ? (
              <img 
                src={conv.members[0]?.avatar} 
                alt="" 
                className="w-9 h-9 rounded-full object-cover border border-current/10" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#148b94]/20 text-[#148b94] flex items-center justify-center text-xs font-serif font-medium">
                {conv.title.substring(0, 2).toUpperCase()}
              </div>
            )
          ) : conv.type === 'project' ? (
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          )}
          {conv.members.some(m => m.status === 'online') && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#181715]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-xs truncate">
              {conv.title}
            </h4>
            <span className="text-[10px] text-[#8a8479] flex-shrink-0">
              {conv.lastMessage?.timestamp || ''}
            </span>
          </div>

          <p className="text-[11px] text-[#8a8479] truncate mt-0.5">
            {conv.lastMessage ? (
              <span>
                <span className="text-current">{conv.lastMessage.senderName.split(' ')[0]}: </span>
                {conv.lastMessage.text}
              </span>
            ) : (
              'No messages yet'
            )}
          </p>
        </div>

        {/* Unread badge / pin */}
        {conv.unreadCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#148b94] text-white">
            {conv.unreadCount}
          </span>
        )}
      </div>
    );
  }
};

import React, { useState, useRef, useEffect } from 'react';
import { useMeeting } from '../../context/MeetingContext';
import { useChatAndKeep } from '../../context/ChatAndKeepContext';
import { X, Send, Bookmark, Check } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const { chatMessages, sendChatMessage, setActiveDrawer, user, room } = useMeeting();
  const { saveChatToKeep } = useChatAndKeep();
  const [text, setText] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(text.trim());
    setText('');
  };

  const handleSaveToKeep = async (msg: any) => {
    await saveChatToKeep(
      msg.content || msg.text,
      `Meeting: ${room?.title || 'Session'}`,
      undefined,
      {
        author: msg.senderName,
        roomId: room?.id,
        projectId: room?.projectContext?.id
      }
    );
    setSavedIds(prev => new Set(prev).add(msg.id));
  };

  return (
    <aside className="fixed inset-0 sm:relative sm:inset-auto w-full sm:w-80 h-full bg-[#181715] border-l border-[#262420] flex flex-col z-50 sm:z-30 select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#262420] flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#faf8f5]">
          Chat
        </h3>
        <button
          onClick={() => setActiveDrawer(null)}
          className="p-1 rounded-lg text-[#8a8479] hover:text-[#faf8f5] hover:bg-[#24221f] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-1 select-none">
            <p className="text-sm text-[#faf8f5] font-normal">
              No messages yet.
            </p>
            <p className="text-xs text-[#8a8479]">
              Start the conversation.
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.senderId === user.id || msg.senderName === user.name;
            return (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-baseline space-x-2">
                  <span className="text-xs font-medium text-[#ded8cc]">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[10px] text-[#706a60]">
                    {msg.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="text-xs text-[#faf8f5] leading-relaxed bg-[#211f1c] px-3.5 py-2.5 rounded-xl border border-[#2b2824] inline-block max-w-[95%] break-words">
                    {msg.content || msg.text}
                  </div>
                  <button
                    onClick={() => handleSaveToKeep(msg)}
                    className={`ml-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                      savedIds.has(msg.id)
                        ? 'text-[#148b94] bg-[#148b94]/10 opacity-100'
                        : 'text-[#8a8479] hover:text-[#148b94] hover:bg-[#252320]'
                    }`}
                    title="Save message to Keep"
                  >
                    {savedIds.has(msg.id) ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#262420] bg-[#181715]">
        <div className="flex items-center space-x-2 bg-[#211f1c] border border-[#2e2b26] rounded-xl px-3 py-2 focus-within:border-[#148b94] transition-colors">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Send a message…"
            className="flex-1 bg-transparent text-xs text-[#faf8f5] placeholder-[#706a60] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-1.5 rounded-lg text-[#8a8479] hover:text-[#148b94] disabled:opacity-30 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
};

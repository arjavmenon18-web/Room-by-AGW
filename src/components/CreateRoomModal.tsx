import React, { useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { X, Copy, Check, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { RoomPermissions } from '../types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const { createInstantRoom, atmosphere } = useMeeting();
  const isDark = atmosphere === 'obsidian';

  const [roomTitle, setRoomTitle] = useState('Project Discussion');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [showOptionalSettings, setShowOptionalSettings] = useState(false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const numerical = Math.floor(1000 + Math.random() * 9000);
      const generatedId = `Room-agw-${numerical}`;
      setCreatedRoomId(generatedId);

      // Save to real recent room history
      try {
        const stored = localStorage.getItem('room_user_history');
        const history = stored ? JSON.parse(stored) : [];
        const updated = [
          { id: generatedId, title: roomTitle.trim(), timestamp: Date.now() },
          ...history.filter((h: any) => h.id !== generatedId),
        ].slice(0, 10);
        localStorage.setItem('room_user_history', JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not save room to local history:', err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareableUrl = createdRoomId
    ? `${window.location.origin}/join/${createdRoomId}`
    : '';

  const handleCopy = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEnterRoom = async () => {
    if (!createdRoomId) return;
    setIsSubmitting(true);
    try {
      const perms: Partial<RoomPermissions> = {
        waitingRoomEnabled,
        allowGuestScreenShare: true,
        allowGuestChat: true,
        muteOnEntry: false,
      };
      await createInstantRoom(roomTitle, perms, false, createdRoomId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCreatedRoomId(null);
    setRoomTitle('Project Discussion');
    setShowOptionalSettings(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a09]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden room-grain transition-colors ${
        isDark 
          ? 'bg-[#181614] border-[#2f2b24] text-[#eae5dc]' 
          : 'bg-[#faf8f4] border-[#ded7ca] text-[#1a1917]'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between ${
          isDark ? 'border-[#28251f]' : 'border-[#eae3d5]'
        }`}>
          <div>
            <h3 className={`font-serif text-xl sm:text-[22px] font-normal tracking-tight transition-colors ${
              isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
            }`}>
              {createdRoomId ? 'Your room is ready' : 'Create a room'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-[#8a8479] hover:text-[#f5f1ea] hover:bg-[#26231e]' : 'text-[#8a8479] hover:text-[#1a1917] hover:bg-[#ede7db]'
            }`}
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* State A: Room Ready */}
        {createdRoomId ? (
          <div className="p-6 space-y-6">
            <div className={`space-y-1.5 text-center py-5 rounded-xl border transition-colors ${
              isDark 
                ? 'bg-[#201d19] border-[#332f28]' 
                : 'bg-[#f4efe5] border-[#ded6c8]'
            }`}>
              <div className={`text-[10px] uppercase tracking-[0.2em] font-mono font-medium ${
                isDark ? 'text-[#8c8577]' : 'text-[#918a7d]'
              }`}>
                ROOM ID
              </div>
              <div className="font-mono text-2xl font-medium tracking-wider text-[#148b94]">
                {createdRoomId}
              </div>
              <div className={`text-xs pt-1 font-light ${
                isDark ? 'text-[#999285]' : 'text-[#706a60]'
              }`}>
                {roomTitle}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopy}
                className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-medium transition-all flex items-center justify-center space-x-2 shadow-sm ${
                  isDark
                    ? 'border-[#332f28] bg-[#201d19] hover:bg-[#28241f] text-[#eae5dc]'
                    : 'border-[#ded7ca] bg-[#faf8f4] hover:bg-[#f3efe5] text-[#2d2b27]'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#148b94]" strokeWidth={2} />
                    <span className="text-[#148b94]">Link copied</span>
                  </>
                ) : (
                  <>
                    <Copy className={`w-3.5 h-3.5 ${isDark ? 'text-[#8c8577]' : 'text-[#8a8479]'}`} strokeWidth={1.5} />
                    <span>Copy link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleEnterRoom}
                disabled={isSubmitting}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-2 shadow-sm ${
                  isDark
                    ? 'bg-[#f5f1ea] hover:bg-white text-[#141312] font-semibold'
                    : 'bg-[#1a1917] hover:bg-[#2e2b27] text-white'
                }`}
              >
                <span>Enter room</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ) : (
          /* State B: Create Form */
          <form onSubmit={handleCreate} className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium tracking-wide uppercase font-mono ${
                isDark ? 'text-[#8c8577]' : 'text-[#857e72]'
              }`}>
                Room name
              </label>
              <input
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder="Project Discussion"
                required
                autoFocus
                className={`w-full border focus:border-[#148b94] focus:ring-1 focus:ring-[#148b94]/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-[#201d19] border-[#36312a] text-[#f5f1ea] placeholder-[#6e685f]' 
                    : 'bg-[#fdfcf9] border-[#d8d2c5] text-[#1a1917] placeholder-[#a6a094]'
                }`}
              />
            </div>

            {/* Optional Settings */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowOptionalSettings(!showOptionalSettings)}
                className={`inline-flex items-center space-x-1.5 text-xs transition-colors ${
                  isDark ? 'text-[#999285] hover:text-[#f5f1ea]' : 'text-[#8a8479] hover:text-[#1a1917]'
                }`}
              >
                <span>Optional settings</span>
                {showOptionalSettings ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} /> : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </button>

              {showOptionalSettings && (
                <div className={`mt-3 p-3.5 rounded-xl border space-y-2 text-xs transition-colors ${
                  isDark ? 'bg-[#201d19] border-[#332f28] text-[#eae5dc]' : 'bg-[#f4efe5] border-[#ded6c8] text-[#403c35]'
                }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Require host approval to join (Waiting room)</span>
                    <input
                      type="checkbox"
                      checked={waitingRoomEnabled}
                      onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#148b94] cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className={`pt-3 border-t flex items-center justify-end space-x-2.5 ${
              isDark ? 'border-[#28251f]' : 'border-[#eae3d5]'
            }`}>
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 py-2 text-xs transition-colors ${
                  isDark ? 'text-[#8c8577] hover:text-[#f5f1ea]' : 'text-[#7c7569] hover:text-[#1a1917]'
                }`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !roomTitle.trim()}
                className={`px-5 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 shadow-sm ${
                  isDark
                    ? 'bg-[#f5f1ea] hover:bg-white text-[#141312] font-semibold'
                    : 'bg-[#1a1917] hover:bg-[#2d2a26] text-white'
                }`}
              >
                Create room
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

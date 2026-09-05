import React from 'react';
import { useMeeting } from '../context/MeetingContext';
import { Clock, LogOut, Mic, MicOff, Video, VideoOff } from 'lucide-react';

export const WaitingRoomView: React.FC = () => {
  const { room, user, setView, leaveRoom, audioEnabled, videoEnabled, toggleAudio, toggleVideo, atmosphere } = useMeeting();
  const isDark = atmosphere === 'obsidian';

  return (
    <div className={`min-h-screen room-surface-depth flex flex-col items-center justify-center p-6 text-center transition-colors duration-200 ${
      isDark ? 'text-[#eae5dc] selection:bg-[#148b94]/30' : 'text-[#1a1917] selection:bg-[#148b94]/20'
    }`}>
      <div className={`max-w-md w-full rounded-2xl p-8 space-y-6 shadow-xl border animate-in fade-in duration-200 transition-colors ${
        isDark 
          ? 'bg-[#181614] border-[#2f2b24] shadow-[0_12px_40px_rgba(0,0,0,0.5)]' 
          : 'bg-[#faf8f4] border-[#ded7ca] shadow-[0_8px_32px_-4px_rgba(45,38,28,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]'
      }`}>
        <div className={`w-13 h-13 rounded-full border flex items-center justify-center mx-auto text-[#148b94] transition-colors ${
          isDark ? 'bg-[#22201c] border-[#36312a]' : 'bg-[#f4efe5] border-[#ded6c8]'
        }`}>
          <Clock className="w-5 h-5 animate-pulse" strokeWidth={1.75} />
        </div>

        <div className="space-y-1.5">
          <span className={`font-mono text-[11px] tracking-wider uppercase ${
            isDark ? 'text-[#8f887b]' : 'text-[#857f72]'
          }`}>
            {room?.id || 'ROOM'}
          </span>
          <h2 className={`font-serif text-3xl font-normal tracking-tight transition-colors ${
            isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
          }`}>
            Waiting to enter
          </h2>
          <p className={`text-xs leading-relaxed font-light ${
            isDark ? 'text-[#a39c8f]' : 'text-[#706a60]'
          }`}>
            The host ({room?.hostName || 'the host'}) will let you in shortly.
          </p>
        </div>

        {/* Room metadata */}
        <div className={`border rounded-xl p-4 text-xs text-left space-y-2 transition-colors ${
          isDark 
            ? 'bg-[#1e1c19] border-[#332e27] text-[#aea79a]' 
            : 'bg-[#f4efe5] border-[#ded6c8] text-[#6e685f]'
        }`}>
          <div className="flex justify-between">
            <span className={isDark ? 'text-[#8f887b]' : 'text-[#857f72]'}>Room</span>
            <span className={`font-medium ${isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'}`}>
              {room?.title || 'Project Discussion'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-[#8f887b]' : 'text-[#857f72]'}>Joined as</span>
            <span className={`font-medium ${isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'}`}>
              {user.name}
            </span>
          </div>
        </div>

        {/* Audio / Video controls while waiting */}
        <div className="flex items-center justify-center space-x-3 pt-1">
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-3 rounded-full border transition-all shadow-sm ${
              !audioEnabled
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : isDark
                ? 'bg-[#22201c] border-[#36312a] text-[#eae5dc] hover:bg-[#2a2721]'
                : 'bg-[#faf8f4] border-[#ded7ca] text-[#2c2a26] hover:bg-[#f3efe6]'
            }`}
            title={audioEnabled ? 'Mute' : 'Unmute'}
          >
            {audioEnabled ? <Mic className="w-4 h-4" strokeWidth={1.5} /> : <MicOff className="w-4 h-4" strokeWidth={1.5} />}
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            className={`p-3 rounded-full border transition-all shadow-sm ${
              !videoEnabled
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : isDark
                ? 'bg-[#22201c] border-[#36312a] text-[#eae5dc] hover:bg-[#2a2721]'
                : 'bg-[#faf8f4] border-[#ded7ca] text-[#2c2a26] hover:bg-[#f3efe6]'
            }`}
            title={videoEnabled ? 'Stop video' : 'Start video'}
          >
            {videoEnabled ? <Video className="w-4 h-4" strokeWidth={1.5} /> : <VideoOff className="w-4 h-4" strokeWidth={1.5} />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className={`pt-3 border-t flex flex-col space-y-2 ${
          isDark ? 'border-[#2f2b24]' : 'border-[#eae3d5]'
        }`}>
          <button
            type="button"
            onClick={() => setView('meeting')}
            className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all shadow-sm ${
              isDark
                ? 'bg-[#f5f1ea] hover:bg-white text-[#141312] font-semibold'
                : 'bg-[#1a1917] hover:bg-[#2e2a26] text-white'
            }`}
          >
            Enter room
          </button>

          <button
            type="button"
            onClick={() => leaveRoom(false)}
            className={`w-full py-2 text-xs transition-colors inline-flex items-center justify-center space-x-1 ${
              isDark ? 'text-[#8f887b] hover:text-[#f5f1ea]' : 'text-[#8a8479] hover:text-[#1a1917]'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
};

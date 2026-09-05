import React, { useRef, useEffect } from 'react';
import { Participant } from '../types';
import { MicOff, Pin, Hand } from 'lucide-react';

interface VideoTileProps {
  participant: Participant;
  isLocal?: boolean;
  localStream?: MediaStream | null;
  isActiveSpeaker?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  aspectClass?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  participant,
  isLocal = false,
  localStream,
  isActiveSpeaker = false,
  isPinned = false,
  onTogglePin,
  aspectClass = 'aspect-video',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Bind video stream
  useEffect(() => {
    if (videoRef.current) {
      if (participant.videoEnabled) {
        if (isLocal && localStream) {
          videoRef.current.srcObject = localStream;
        } else if (!isLocal && participant.stream) {
          videoRef.current.srcObject = participant.stream;
        }
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [isLocal, localStream, participant.stream, participant.videoEnabled]);

  const initials = participant.initials || participant.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[#151413] border transition-all duration-300 group flex items-center justify-center select-none ${aspectClass} ${
        isActiveSpeaker && participant.audioEnabled
          ? 'active-speaker-ring border-[#148b94]'
          : 'border-[#262420] hover:border-[#3a3630]'
      }`}
    >
      {/* Video stream */}
      {participant.videoEnabled ? (
        isLocal ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : participant.stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#181715] flex flex-col items-center justify-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-[#23221f] text-[#faf8f5] flex items-center justify-center text-lg font-medium font-serif">
              {initials}
            </div>
            <span className="text-xs text-[#8a8479]">Connecting…</span>
          </div>
        )
      ) : (
        /* Camera Off Mode: Warm, deliberate monogram */
        <div className="w-full h-full bg-[#181715] flex flex-col items-center justify-center space-y-2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#23221f] border border-[#302e2a] text-[#faf8f5] flex items-center justify-center text-xl sm:text-2xl font-serif font-normal">
            {initials}
          </div>
        </div>
      )}

      {/* Hand Raised (Quiet, Polite) */}
      {participant.isHandRaised && (
        <div className="absolute top-3 left-3 bg-[#148b94] text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 shadow-sm animate-in fade-in duration-150">
          <Hand className="w-3.5 h-3.5" />
          <span className="text-[11px]">Raised hand</span>
        </div>
      )}

      {/* Pin button on hover */}
      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          className={`absolute top-3 right-3 p-1.5 rounded-lg backdrop-blur-md border transition-all opacity-0 group-hover:opacity-100 z-10 ${
            isPinned
              ? 'bg-[#148b94] border-[#148b94] text-white opacity-100'
              : 'bg-black/40 border-white/10 text-white/80 hover:text-white hover:bg-black/60'
          }`}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom Bar: Name label & Muted mic indicator */}
      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
        {/* Name label (small, quiet, lower-left) */}
        <div className="flex items-center space-x-1.5 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/5 max-w-[85%]">
          <span className="text-xs font-medium text-[#faf8f5] truncate">
            {participant.name} {isLocal && '(You)'}
          </span>

          {participant.role === 'host' && (
            <span className="text-[10px] text-[#a8a296] font-light">
              · Host
            </span>
          )}
        </div>

        {/* Microphone off indicator */}
        {!participant.audioEnabled && (
          <div className="p-1 rounded-md bg-black/45 backdrop-blur-md text-rose-400 border border-white/5">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
};

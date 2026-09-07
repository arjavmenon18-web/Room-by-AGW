import React, { useRef, useEffect, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Settings, 
  ArrowLeft, 
  Check, 
  SlidersHorizontal 
} from 'lucide-react';

export const PreJoinView: React.FC = () => {
  const {
    room,
    user,
    setUser,
    setView,
    leaveRoom,
    enterMeetingRoom,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    localStream,
    localAudioLevel,
    availableDevices,
    deviceSettings,
    updateDeviceSettings,
    atmosphere,
  } = useMeeting();

  const isDark = atmosphere === 'obsidian';
  const videoRef = useRef<HTMLVideoElement>(null);
  const isHost = Boolean(room && room.hostId === user.id) || user.role === 'host';

  const [displayName, setDisplayName] = useState(() => {
    if (isHost && user.name && user.name !== 'Guest User') {
      return user.name;
    }
    try {
      const sessSaved = sessionStorage.getItem('room_display_name');
      if (sessSaved && (!room?.hostName || sessSaved !== room.hostName)) return sessSaved;
      const localSaved = localStorage.getItem('room_display_name');
      if (localSaved && (!room?.hostName || localSaved !== room.hostName)) return localSaved;
    } catch {}
    if (!isHost) {
      if (user.name && user.name !== 'Guest User' && user.name !== room?.hostName) {
        return user.name;
      }
      return '';
    }
    return user.name || '';
  });
  const [showDeviceDrawer, setShowDeviceDrawer] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, videoEnabled]);

  const handleJoin = () => {
    const finalName = displayName.trim() || (isHost ? (user.name || 'Host') : 'Guest Participant');
    enterMeetingRoom(finalName);
  };

  return (
    <div className={`min-h-screen room-surface-depth flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200 ${
      isDark 
        ? 'text-[#eae5dc] selection:bg-[#148b94]/30 selection:text-[#f5f1ea]' 
        : 'text-[#1a1917] selection:bg-[#148b94]/20 selection:text-[#1a1917]'
    }`}>
      {/* Top Bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2 sm:py-3">
        <button
          onClick={() => leaveRoom(false)}
          className={`inline-flex items-center space-x-2 text-xs transition-colors p-2 -ml-2 rounded-lg ${
            isDark 
              ? 'text-[#9c9588] hover:text-[#f5f1ea] hover:bg-[#22201c]' 
              : 'text-[#7c7569] hover:text-[#1a1917] hover:bg-[#ede7db]/60'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Back</span>
        </button>

        <div className={`font-mono text-xs px-3 py-1 rounded-full border shadow-sm transition-colors ${
          isDark 
            ? 'text-[#9c9588] bg-[#201d19] border-[#312d26]' 
            : 'text-[#857f72] bg-[#f2ede3] border-[#ded7ca]'
        }`}>
          {room?.id || 'ROOM'}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto my-auto py-3 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Camera Preview (7 cols) */}
          <div className="md:col-span-7 space-y-3 sm:space-y-4">
            <div className="relative aspect-video max-h-[34vh] sm:max-h-none mx-auto w-full rounded-2xl bg-[#1a1917] border border-[#ded7ca] overflow-hidden shadow-[0_4px_20px_-4px_rgba(45,38,28,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] flex items-center justify-center">
              {videoEnabled && localStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${deviceSettings.mirrorVideo ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 select-none">
                  <div className="w-16 h-16 rounded-full bg-[#2a2825] border border-white/10 flex items-center justify-center text-xl font-normal text-[#faf8f5]">
                    {displayName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'RM'}
                  </div>
                  <p className="text-xs text-[#a09a8f] font-light">Camera is off</p>
                </div>
              )}

              {/* Quiet Audio Level Indicator */}
              {audioEnabled && (
                <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-[#151413]/70 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white/80 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#148b94]" />
                  <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#148b94] transition-all duration-75"
                      style={{ width: `${Math.min(100, localAudioLevel * 2)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Small Controls Beneath Camera Preview */}
            <div className="flex items-center justify-center space-x-3 pt-1">
              <button
                type="button"
                onClick={toggleAudio}
                className={`w-11 h-11 sm:w-10 sm:h-10 rounded-full border transition-all duration-150 flex items-center justify-center shadow-sm ${
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
                className={`w-11 h-11 sm:w-10 sm:h-10 rounded-full border transition-all duration-150 flex items-center justify-center shadow-sm ${
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

              <button
                type="button"
                onClick={() => setShowDeviceDrawer(!showDeviceDrawer)}
                className={`w-11 h-11 sm:w-10 sm:h-10 rounded-full border transition-all duration-150 flex items-center justify-center shadow-sm ${
                  showDeviceDrawer
                    ? 'bg-[#148b94]/20 border-[#148b94] text-[#148b94]'
                    : isDark
                    ? 'bg-[#22201c] border-[#36312a] text-[#eae5dc] hover:bg-[#2a2721]'
                    : 'bg-[#faf8f4] border-[#ded7ca] text-[#2c2a26] hover:bg-[#f3efe6]'
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Collapsible Simple Hardware Settings */}
            {showDeviceDrawer && (
              <div className={`p-4 rounded-xl border space-y-3 text-xs animate-in fade-in duration-150 shadow-sm ${
                isDark 
                  ? 'bg-[#1c1a17] border-[#332e27] text-[#eae5dc]' 
                  : 'bg-[#f4efe5] border-[#ded6c8] text-[#1a1917]'
              }`}>
                <div className="space-y-1">
                  <label className={`text-[11px] font-medium tracking-wide uppercase font-mono ${
                    isDark ? 'text-[#8f887b]' : 'text-[#857e72]'
                  }`}>Microphone</label>
                  <select
                    value={deviceSettings.audioInputId}
                    onChange={(e) => updateDeviceSettings({ audioInputId: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#148b94] ${
                      isDark 
                        ? 'bg-[#24211d] border-[#3d372e] text-[#f5f1ea]' 
                        : 'bg-[#fdfcf9] border-[#d8d2c5] text-[#1a1917]'
                    }`}
                  >
                    <option value="default">Default Microphone</option>
                    {availableDevices.audioInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-[11px] font-medium tracking-wide uppercase font-mono ${
                    isDark ? 'text-[#8f887b]' : 'text-[#857e72]'
                  }`}>Camera</label>
                  <select
                    value={deviceSettings.videoInputId}
                    onChange={(e) => updateDeviceSettings({ videoInputId: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#148b94] ${
                      isDark 
                        ? 'bg-[#24211d] border-[#3d372e] text-[#f5f1ea]' 
                        : 'bg-[#fdfcf9] border-[#d8d2c5] text-[#1a1917]'
                    }`}
                  >
                    <option value="default">Default Camera</option>
                    {availableDevices.videoInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-1">
                  <label className={`flex items-center space-x-2 cursor-pointer ${
                    isDark ? 'text-[#a39c8f]' : 'text-[#6e685f]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={deviceSettings.mirrorVideo}
                      onChange={(e) => updateDeviceSettings({ mirrorVideo: e.target.checked })}
                      className="accent-[#148b94]"
                    />
                    <span>Mirror my camera</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Room Info & Join Panel (5 cols) */}
          <div className="md:col-span-5 space-y-6">
            <div className="space-y-2">
              <span className={`font-mono text-xs tracking-wider ${
                isDark ? 'text-[#8f887b]' : 'text-[#857f72]'
              }`}>
                {room?.id || 'ROOM'}
              </span>

              <h2 className={`font-serif text-3xl sm:text-4xl font-normal leading-tight tracking-tight transition-colors ${
                isDark ? 'text-[#f5f1ea]' : 'text-[#1a1917]'
              }`}>
                {room?.title || 'Project Discussion'}
              </h2>

              <p className={`text-sm font-light ${
                isDark ? 'text-[#a39c8f]' : 'text-[#7c7569]'
              }`}>
                {isHost ? 'You are the host of this room' : `Hosted by ${room?.hostName || 'Host'}`}
              </p>
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium tracking-wide uppercase font-mono ${
                isDark ? 'text-[#8f887b]' : 'text-[#857e72]'
              }`}>
                {isHost ? 'Host name' : 'Your name'}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={isHost ? 'Your host name' : 'Your name'}
                className={`w-full border focus:border-[#148b94] focus:ring-1 focus:ring-[#148b94]/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                  isDark 
                    ? 'bg-[#1c1a17] border-[#36312a] text-[#f5f1ea] placeholder-[#6e685f]' 
                    : 'bg-[#fdfcf9] border-[#d8d2c5] text-[#1a1917]'
                }`}
              />
            </div>

            {/* Join Action Button */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleJoin}
                className={`w-full py-3 px-6 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center justify-center space-x-2 ${
                  isDark
                    ? 'bg-[#f5f1ea] hover:bg-white text-[#141312] font-semibold'
                    : 'bg-[#1a1917] hover:bg-[#2d2a26] text-white'
                }`}
              >
                <span>{isHost ? 'Enter room' : 'Join room'}</span>
              </button>

              {(!audioEnabled || !videoEnabled) && (
                <p className={`text-center text-xs font-light ${
                  isDark ? 'text-[#8f887b]' : 'text-[#8a8479]'
                }`}>
                  You can turn your camera and microphone on or off at any time.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`max-w-4xl w-full mx-auto text-xs py-3 select-none flex items-center justify-between border-t transition-colors ${
        isDark ? 'border-[#26231e] text-[#7a7467]' : 'border-[#e8e2d5]/80 text-[#9c9588]'
      }`}>
        <span className="font-serif text-sm">ROOM</span>
        <span className="font-mono text-[10px] tracking-widest uppercase opacity-75">AGW</span>
      </footer>
    </div>
  );
};
